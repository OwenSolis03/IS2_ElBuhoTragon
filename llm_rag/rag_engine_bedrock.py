"""
El Búho Tragón - Sistema RAG sobre Amazon Bedrock
Misma interfaz que BuhoRAG (rag_engine_hpc.py), sin GPU ni modelos locales:
- Embeddings: Amazon Titan Text Embeddings V2
- Búsqueda: similitud coseno con numpy (los ~60 documentos caben en memoria)
- Generación: Converse API (por defecto Amazon Nova 2 Lite; reformulación con Nova Micro)

Variables de entorno:
    BEDROCK_REGION              Región de Bedrock (default: us-east-2)
    BEDROCK_MODEL_ID            Modelo para responder (default: us.amazon.nova-2-lite-v1:0)
    BEDROCK_REFORMULATE_MODEL   Modelo para reformular la pregunta (default: us.amazon.nova-micro-v1:0)
    BEDROCK_EMBED_MODEL         Modelo de embeddings (default: amazon.titan-embed-text-v2:0)
"""

import hashlib
import json
import logging
import os
import re
import unicodedata
from typing import List, Dict, Optional, Tuple

import boto3
import numpy as np
from botocore.config import Config

from .rag_utils import CAMPUS_CENTER, calculate_distance, find_locations, is_on_campus

logger = logging.getLogger(__name__)

# Incrementar al cambiar la construcción de documentos, para invalidar el caché de embeddings
CACHE_VERSION = "bedrock-v1"
EMBED_DIMENSIONS = 512
MAX_DISTANCE_METERS = 2500
MAX_DOCS_PER_STORE = 3
NEAREST_STORES = 3


def build_documents(data: Dict) -> Tuple[List[str], List[Dict]]:
    """Un documento por cafetería y categoría de menú, igual que el motor HPC."""
    documents, metadata = [], []

    menus_by_store = {}
    for menu in data.get('menus', []):
        menus_by_store.setdefault(menu.get('id_tiendita'), []).append(menu)

    for tienda in data.get('tienditas', []):
        tid = tienda.get('id_tiendita')
        nombre_limpio = re.sub(r'([a-z])([A-Z])', r'\1 \2', tienda.get('nombre', 'Desconocida'))
        meta = {
            'id': tid,
            'name': nombre_limpio,
            'latitud': tienda.get('latitud'),
            'longitud': tienda.get('longitud'),
        }

        base_lines = [f"CAFETERÍA: {nombre_limpio}"]
        base_lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")
        if tienda.get('hora_apertura'):
            base_lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

        store_menus = menus_by_store.get(tid, [])
        if not store_menus:
            documents.append("\n".join(base_lines + ["\nMENÚ:", "(Sin menú disponible)"]))
            metadata.append(meta)
            continue

        cats = {}
        for m in store_menus:
            cats.setdefault(m.get('categoria') or 'Varios', []).append(m)

        for cat, items in cats.items():
            lines = list(base_lines)
            lines.append(f"\nMENÚ ({cat.upper()}):")
            for m in items:
                try:
                    precio = float(m['precio'])
                    nombre_platillo = m['nombre'].strip().replace("\n", " ")
                    lines.append(f"- {nombre_platillo} (${precio:.0f} MXN)")
                except (TypeError, ValueError, KeyError) as e:
                    logger.warning(f"Item de menu invalido en tiendita {tid}: {e}")
            documents.append("\n".join(lines))
            metadata.append(meta)

    return documents, metadata


MENU_ITEM_PRICE = re.compile(r'^- .*\(\$(\d+(?:\.\d+)?) MXN\)$')


def filter_by_budget(docs: List[str], budget: float) -> List[str]:
    """
    Quita los platillos que exceden el presupuesto. Se hace antes de llamar al
    modelo porque los LLM pequeños no siempre respetan el límite por sí solos.
    """
    filtered = []
    for doc in docs:
        lines = []
        kept_items = 0
        for line in doc.split('\n'):
            match = MENU_ITEM_PRICE.match(line)
            if match:
                if float(match.group(1)) > budget:
                    continue
                kept_items += 1
            lines.append(line)
        if kept_items:
            filtered.append('\n'.join(lines))
    return filtered


CHEAPEST_INTENT = re.compile(r'm[aá]s\s+(barat|econ[oó]mic|accesible)|menor precio|lo barato', re.IGNORECASE)
MAX_PRICE_LIST_ITEMS = 8

# Palabras de las preguntas que también aparecen en nombres de platillos y no son un platillo
DISH_STOPWORDS = {
    'algo', 'barat', 'cafeteria', 'cerca', 'comer', 'comida', 'cosa', 'donde', 'economic', 'grande',
    'chica', 'chico', 'mediana', 'orden', 'peso', 'precio', 'quiero', 'sencill', 'tienda', 'venden',
    # Categorías del menú, no platillos
    'desayuno', 'bebida', 'postr', 'snack',
}


def _stems(text: str) -> set:
    """Palabras de 4+ letras sin acentos ni plural: "Molletes" y "mollete" -> "mollet"."""
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return {re.sub(r'e$', '', re.sub(r's$', '', w)) for w in re.findall(r'[a-zñ]+', text) if len(w) >= 4}


def build_menu_items(data: Dict) -> List[Dict]:
    """Lista plana de platillos con su cafetería, para búsquedas por nombre y precio."""
    stores = {t.get('id_tiendita'): t for t in data.get('tienditas', [])}
    items = []
    for m in data.get('menus', []):
        store = stores.get(m.get('id_tiendita'))
        try:
            price = float(m['precio'])
        except (TypeError, ValueError, KeyError):
            continue
        if not store:
            continue
        name = m['nombre'].strip().replace("\n", " ")
        items.append({
            'name': name, 'price': price, 'stems': _stems(name),
            'store': re.sub(r'([a-z])([A-Z])', r'\1 \2', store.get('nombre', 'Desconocida')),
            'latitud': store.get('latitud'), 'longitud': store.get('longitud'),
        })
    return items


def find_dish_terms(text: str, items: List[Dict]) -> List[str]:
    """Raíces de la pregunta que nombran platillos de los datos ("molletes" -> ["mollet"])."""
    vocabulary = set().union(*(i['stems'] for i in items)) if items else set()
    return sorted((_stems(text) & vocabulary) - DISH_STOPWORDS)


def price_list_doc(items: List[Dict], terms: List[str], cheapest: bool, budget: Optional[float] = None,
                   origin: Optional[Tuple[float, float]] = None) -> Optional[str]:
    """
    Documento con los platillos que coinciden, de menor a mayor precio. La búsqueda por
    similitud no garantiza traer la opción más barata (los Mollete Sencillo de $30 no
    salían en "¿dónde venden molletes?"), así que se arma en código desde los datos.
    """
    if terms:
        # Primero los que tienen todas las palabras ("torta de jamón"); si ninguno, cualquiera
        matches = [i for i in items if set(terms) <= i['stems']] or \
                  [i for i in items if set(terms) & i['stems']]
        header = "PLATILLOS QUE COINCIDEN CON LA PREGUNTA, de menor a mayor precio (el primero es el más barato):"
    elif cheapest:
        matches = list(items)
        header = "PLATILLOS MÁS BARATOS DE TODAS LAS CAFETERÍAS, de menor a mayor precio:"
    else:
        return None

    if budget:
        matches = [i for i in matches if i['price'] <= budget]
    lines = []
    for i in sorted(matches, key=lambda i: i['price']):
        where = i['store']
        if origin:
            dist = calculate_distance(origin[0], origin[1], i['latitud'], i['longitud'])
            if dist > MAX_DISTANCE_METERS:
                continue
            where += f", a {dist:.0f} metros"
        lines.append(f"- {i['name']} en {where} (${i['price']:.0f} MXN)")
        if len(lines) >= MAX_PRICE_LIST_ITEMS:
            break
    return "\n".join([header] + lines) if lines else None


def clean_answer(answer: str) -> str:
    """Normaliza el formato de lista con viñetas que espera el ChatWidget."""
    answer = answer.replace("**", "").replace("__", "")
    answer = answer.replace(" •", "\n•")
    answer = answer.replace("• ", "\n• ")
    answer = re.sub(r'(\s)-\s', r'\n- ', answer)
    answer = answer.replace(": •", ":\n•").replace(": -", ":\n-")
    answer = re.sub(r'\n\s*\n', '\n', answer)
    return re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE).strip()


class BuhoRAGBedrock:
    """Motor RAG de El Búho Tragón usando Amazon Bedrock."""

    def __init__(self, data_path: str = None):
        if data_path is None:
            data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rag_data_fixed.json")

        self.data_path = data_path
        self.data = None
        self.documents: List[str] = []
        self.doc_metadata: List[Dict] = []
        self.embeddings: Optional[np.ndarray] = None
        self.menu_items: List[Dict] = []
        self.chat_history: List[Tuple[str, str]] = []

        # Nova 2 Lite: en pruebas fue el único modelo económico que no inventó precios
        self.model_id = os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")
        self.reformulate_model_id = os.getenv("BEDROCK_REFORMULATE_MODEL", "us.amazon.nova-micro-v1:0")
        self.embed_model_id = os.getenv("BEDROCK_EMBED_MODEL", "amazon.titan-embed-text-v2:0")

        # Un solo cliente reutilizable (es thread-safe); las credenciales vienen del
        # rol de la instancia EC2 en producción o de AWS_PROFILE en local
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=os.getenv("BEDROCK_REGION", "us-east-2"),
            config=Config(
                retries={"total_max_attempts": 3, "mode": "adaptive"},
                connect_timeout=5,
                read_timeout=30,
            ),
        )

    # --- Datos e índice ---

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"No se encontró {self.data_path}")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        logger.info(f"Datos cargados: {len(self.data.get('tienditas', []))} cafeterías")

    def _embed(self, text: str) -> np.ndarray:
        response = self.client.invoke_model(
            modelId=self.embed_model_id,
            body=json.dumps({"inputText": text, "dimensions": EMBED_DIMENSIONS, "normalize": True}),
        )
        return np.array(json.loads(response["body"].read())["embedding"], dtype=np.float32)

    def build_index(self):
        if not self.data:
            self.load_data()

        self.documents, self.doc_metadata = build_documents(self.data)
        self.menu_items = build_menu_items(self.data)

        # Caché en disco: solo se recalculan los embeddings si cambian los documentos o el modelo
        fingerprint = hashlib.sha256(
            json.dumps([CACHE_VERSION, self.embed_model_id, EMBED_DIMENSIONS, self.documents]).encode()
        ).hexdigest()
        cache_dir = os.path.join(os.path.dirname(self.data_path), ".cache")
        cache_path = os.path.join(cache_dir, "bedrock_embeddings.npz")

        if os.path.exists(cache_path):
            cached = np.load(cache_path)
            if str(cached["fingerprint"]) == fingerprint:
                self.embeddings = cached["embeddings"]
                logger.info(f"Embeddings cargados desde caché ({len(self.documents)} documentos)")
                return

        logger.info(f"Calculando embeddings de {len(self.documents)} documentos con Bedrock...")
        self.embeddings = np.stack([self._embed(doc) for doc in self.documents])
        os.makedirs(cache_dir, exist_ok=True)
        np.savez(cache_path, embeddings=self.embeddings, fingerprint=np.array(fingerprint))
        logger.info("Embeddings guardados en caché")

    # --- Recuperación ---

    def _retrieve_context(self, query: str, user_lat: Optional[float] = None,
                          user_lon: Optional[float] = None, k: int = 10) -> List[str]:
        # Vectores normalizados: el producto punto es la similitud coseno
        scores = self.embeddings @ self._embed(query)

        has_location = user_lat is not None and user_lon is not None
        # Con ubicación se junta un grupo más amplio de documentos relevantes y luego se
        # quedan los k más cercanos; si no, "cerca de X" ignoraría la cafetería de al lado
        pool_size = k * 3 if has_location else k

        results = []  # (distancia, documento)
        seen_stores = {}
        for idx in np.argsort(-scores):
            if len(results) >= pool_size:
                break

            doc = self.documents[idx]
            meta = self.doc_metadata[idx]
            store_id = meta.get('id')

            if store_id:
                if seen_stores.get(store_id, 0) >= MAX_DOCS_PER_STORE:
                    continue
                seen_stores[store_id] = seen_stores.get(store_id, 0) + 1

            dist, doc = self._with_distance(idx, user_lat, user_lon)
            if dist is not None and dist > MAX_DISTANCE_METERS:
                continue
            results.append((dist, doc))

        if has_location:
            # Las cafeterías más cercanas entran aunque no estén entre las más similares
            # ("cosas por 50 pesos cerca de economía" dejaba fuera a la de al lado)
            for store_id in self._nearest_store_ids(user_lat, user_lon):
                if store_id in seen_stores:
                    continue
                seen_stores[store_id] = 1
                best = max((i for i, m in enumerate(self.doc_metadata) if m.get('id') == store_id),
                           key=lambda i: scores[i])
                results.append(self._with_distance(best, user_lat, user_lon))

        # Con ubicación, el modelo recibe las cafeterías de la más cercana a la más lejana
        # (sort estable: dentro de la misma cafetería se conserva el orden por relevancia)
        if has_location:
            results.sort(key=lambda r: r[0] if r[0] is not None else float('inf'))

        return [doc for _, doc in results[:k]]

    def _with_distance(self, idx: int, user_lat, user_lon) -> Tuple[Optional[float], str]:
        """El documento con su línea de DISTANCIA, si hay ubicación y coordenadas."""
        doc, meta = self.documents[idx], self.doc_metadata[idx]
        lat2, lon2 = meta.get('latitud'), meta.get('longitud')
        if user_lat is None or user_lon is None or lat2 is None or lon2 is None:
            return None, doc
        dist = calculate_distance(user_lat, user_lon, lat2, lon2)
        lines = doc.split('\n')
        lines.insert(2, f"DISTANCIA: {dist:.0f} metros")
        return dist, '\n'.join(lines)

    def _nearest_store_ids(self, lat, lon, n: int = NEAREST_STORES) -> List:
        stores = {}
        for meta in self.doc_metadata:
            if meta.get('latitud') is not None and meta.get('longitud') is not None:
                stores[meta['id']] = calculate_distance(lat, lon, meta['latitud'], meta['longitud'])
        nearest = sorted((d, sid) for sid, d in stores.items() if d <= MAX_DISTANCE_METERS)
        return [sid for _, sid in nearest[:n]]

    # --- Generación ---

    def _converse(self, model_id: str, system: str, messages: List[Dict], max_tokens: int) -> str:
        response = self.client.converse(
            modelId=model_id,
            system=[{"text": system}],
            messages=messages,
            # Solo temperature: los modelos Claude 4.5 rechazan temperature y topP juntos
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0.1},
        )
        return response["output"]["message"]["content"][0]["text"].strip()

    @staticmethod
    def _history_messages(history: List[Tuple[str, str]]) -> List[Dict]:
        messages = []
        for q, a in history:
            messages.append({"role": "user", "content": [{"text": q}]})
            messages.append({"role": "assistant", "content": [{"text": a}]})
        return messages

    def _reformulate_query(self, question: str, history: List[Tuple[str, str]]) -> str:
        if not history:
            return question

        history_str = "".join(f"Usuario: {q}\nBúho: {a}\n" for q, a in history[-3:])
        system = (
            "Eres un asistente que reescribe la última pregunta del usuario para que sea entendible "
            "por sí sola, usando el historial del chat. Si la pregunta actual ya es clara e independiente, "
            "devuélvela exactamente igual. Responde ÚNICAMENTE con la pregunta reformulada, sin explicaciones."
        )
        user = f"Historial:\n{history_str}\nPregunta actual: {question}"
        reformulated = self._converse(
            self.reformulate_model_id, system, [{"role": "user", "content": [{"text": user}]}], max_tokens=60
        )
        logger.info(f"Reformulada: '{question}' -> '{reformulated}'")
        return reformulated or question

    def query(self, question: str, user_lat=None, user_lon=None,
              history: Optional[List[Tuple[str, str]]] = None) -> Dict:
        """
        Igual que BuhoRAG.query: si se pasa `history`, la llamada no guarda estado;
        si es None, usa y actualiza `self.chat_history` (modo de un solo usuario).
        """
        logger.info(f"Consulta: {question[:50]}...")

        if self.embeddings is None:
            self.build_index()

        effective_history = self.chat_history if history is None else history
        search_query = self._reformulate_query(question, effective_history)

        # 1. Presupuesto
        budget_match = re.search(r'(\d+)\s*(pesos|mxn|\$)', search_query.lower())
        budget_val = float(budget_match.group(1)) if budget_match else None

        # 2. Ubicación. Prioridad: el lugar escrito en la pregunta ("cerca de economía")
        # y después el GPS, solo si está dentro del campus: desde casa, las distancias al
        # GPS descartarían todas las cafeterías.
        target_lat = target_lon = location_name = None
        # Solo lo que escribió el usuario: la pregunta reformulada puede traer una cafetería
        # de las respuestas anteriores del asistente y convertirla en "ubicación".
        places = find_locations(question)
        for previous_question, _ in reversed(effective_history[-3:]):
            if places:
                break
            places = find_locations(previous_question)
        location_notes = []
        if places:
            name, target_lat, target_lon = places[0]
            location_name = name.upper()
            location_notes.append(f"EL USUARIO PREGUNTA DESDE: {location_name}. "
                                  "Las 'DISTANCIAS' en los DATOS son metros desde ahí.")
        elif user_lat is not None and user_lon is not None:
            if is_on_campus(user_lat, user_lon):
                target_lat, target_lon, location_name = user_lat, user_lon, "Ubicación GPS"
                location_notes.append("EL USUARIO ESTÁ EN EL CAMPUS (GPS). "
                                      "Las 'DISTANCIAS' en los DATOS son metros desde su posición.")
            else:
                km = calculate_distance(user_lat, user_lon, *CAMPUS_CENTER) / 1000
                location_notes.append(
                    f"El usuario está FUERA del campus (a {km:.1f} km). No digas que está cerca de ninguna "
                    "cafetería ni inventes distancias desde su posición; si pregunta qué le queda cerca, "
                    "sugiérele decir en qué facultad o edificio estará.")

        # Distancia entre lugares mencionados ("¿qué tan lejos está Medicina de Artes?")
        for (a, lat_a, lon_a), (b, lat_b, lon_b) in zip(places, places[1:]):
            meters = calculate_distance(lat_a, lon_a, lat_b, lon_b)
            location_notes.append(f"DISTANCIA ENTRE {a.upper()} Y {b.upper()}: {meters:.0f} metros "
                                  f"(unos {max(1, round(meters / 80))} min caminando).")

        # 3. Contexto
        context_docs = self._retrieve_context(search_query, target_lat, target_lon, k=10)
        if budget_val:
            context_docs = filter_by_budget(context_docs, budget_val)
        # Platillo concreto o "el más barato": lista por precio armada en código, al principio
        dish_terms = find_dish_terms(question, self.menu_items) or find_dish_terms(search_query, self.menu_items)
        wants_cheapest = bool(CHEAPEST_INTENT.search(question) or CHEAPEST_INTENT.search(search_query))
        origin = (target_lat, target_lon) if target_lat is not None else None
        price_doc = price_list_doc(self.menu_items, dish_terms, wants_cheapest, budget_val, origin)
        if price_doc:
            context_docs.insert(0, price_doc)
        context_block = "\n\n".join(context_docs) if context_docs else \
            "No se encontró información relevante en la base de datos para esta consulta."

        loc_ctx = "\n".join(location_notes) or "Ubicación desconocida."

        system = f"""Eres "El Búho Tragón", asistente experto en las cafeterías de la Universidad de Sonora (UNISON).
Responde solo con la información de DATOS; si algo no está ahí, dilo.

UBICACIÓN:
{loc_ctx}
"Servicio Social" = "Trabajo Social".

FORMATO OBLIGATORIO:
- NO uses asteriscos ** ni negritas
- Cuando listes cafeterías o platillos, SIEMPRE usa un salto de línea y una viñeta (•) antes de cada opción,
  con la cafetería y el platillo en la misma línea:

Los molletes están en:
• Cafeteria Artes: Mollete ($30)
• Cafeteria Derecho: Mollete ($30)

REGLAS:
1. Respuestas cortas y directas, en una oración seguida de la lista
2. NUNCA copies los DATOS tal cual (sin "CAFETERÍA:", "UBICACIÓN:", "MENÚ"); resúmelos con el formato de arriba
3. Si hay DISTANCIA, menciona los metros y respeta el orden de los DATOS (ya van de más cerca a más lejos)
4. Máximo 3 cafeterías y 4 platillos por cafetería; elige los más relevantes para la pregunta
5. Usa los precios EXACTOS de los DATOS; nunca inventes ni redondees un precio
6. Si los DATOS traen una lista de PLATILLOS de menor a mayor precio, úsala para "el más barato" y para decir dónde venden un platillo
{f"7. PRESUPUESTO: ${budget_val:.0f} pesos; no sugieras nada más caro" if budget_val else ""}"""

        messages = self._history_messages(effective_history[-6:])
        messages.append({"role": "user", "content": [{"text": f"DATOS:\n{context_block}\n\nPregunta: {question}"}]})

        answer = clean_answer(self._converse(self.model_id, system, messages, max_tokens=300))

        if history is None:
            self.chat_history.append((question, answer))
            self.chat_history = self.chat_history[-10:]

        logger.info(f"Respuesta: {answer[:50]}...")
        return {'answer': answer, 'context': context_docs, 'budget_detected': budget_val,
                'location_used': location_name}

    def reset_conversation(self):
        self.chat_history = []
