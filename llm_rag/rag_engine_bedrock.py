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

            dist = None
            lat2, lon2 = meta.get('latitud'), meta.get('longitud')
            if has_location and lat2 is not None and lon2 is not None:
                dist = calculate_distance(user_lat, user_lon, lat2, lon2)
                if dist > MAX_DISTANCE_METERS:
                    continue
                lines = doc.split('\n')
                lines.insert(2, f"DISTANCIA: {dist:.0f} metros")
                doc = '\n'.join(lines)

            results.append((dist, doc))

        # Con ubicación, el modelo recibe las cafeterías de la más cercana a la más lejana
        # (sort estable: dentro de la misma cafetería se conserva el orden por relevancia)
        if has_location:
            results.sort(key=lambda r: r[0] if r[0] is not None else float('inf'))

        return [doc for _, doc in results[:k]]

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
        places = find_locations(question) or find_locations(search_query)
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
6. Si preguntan "más barato", busca precios menores
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
