"""
El Búho Tragón - Sistema RAG para Chatbot Web
Versión: 3.0 (Producción - Alias + Distancias + Contexto)
Optimizado para: AMD GPU (ROCm)
"""

import json
import logging
import os
import re
from typing import List, Dict, Optional, Tuple

import faiss
import numpy as np
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

from rag_utils import detect_device, calculate_distance, get_coords_from_query

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BuhoRAG:
    """
    Motor RAG inteligente para cafeterías UNISON.
    Incluye: Búsqueda semántica, Geoposicionamiento, Alias de lugares y Memoria.
    """

    def __init__(self, data_path: str = None):
        logger.info("Inicializando El Búho Tragón RAG System v3.0...")

        if data_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(script_dir, "rag_data_fixed.json")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.faiss_index = None
        self.chat_history = []

        # Modelos
        self.embedding_model = None
        self.cross_encoder = None
        self.llm_pipeline = None
        self.tokenizer = None
        self.device = None

        # Cache de ubicación
        self.current_user_lat = None
        self.current_user_lon = None

        logger.info("RAG System inicializado correctamente")

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"No se encontró {self.data_path}")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        logger.info(f"Datos cargados: {len(self.data.get('tienditas', []))} cafeterías")

    def _load_models(self):
        if self.device is None:
            self.device, self.dtype = detect_device()

        if self.embedding_model is None:
            logger.info("Cargando embeddings...")
            self.embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', device=self.device)

        if getattr(self, 'cross_encoder', None) is None:
            logger.info("Cargando modelo Cross-Encoder para Re-ranking...")
            self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', device=self.device)

        if self.llm_pipeline is None:
            logger.info("Cargando LLM Qwen 14B...")
            model_id = "Qwen/Qwen2.5-14B-Instruct"
            self.tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                model_id, torch_dtype=self.dtype, device_map=self.device, trust_remote_code=True,
                low_cpu_mem_usage=True, attn_implementation="eager"
            )
            self.llm_pipeline = pipeline("text-generation", model=model, tokenizer=self.tokenizer, torch_dtype=self.dtype)
            logger.info("LLM cargado")

    def build_index(self):
        if not self.data: self.load_data()
        self._load_models()
        
        # --- CACHÉ DE FAISS ---
        import pickle
        cache_dir = os.path.join(os.path.dirname(self.data_path), ".cache")
        os.makedirs(cache_dir, exist_ok=True)
        
        # Usar la fecha de modificación del json como clave de validación
        mtime = os.path.getmtime(self.data_path)
        cache_key = f"{mtime}"
        
        index_path = os.path.join(cache_dir, "faiss.index")
        meta_path = os.path.join(cache_dir, "docs_meta.pkl")
        key_path = os.path.join(cache_dir, "cache.key")
        
        if os.path.exists(index_path) and os.path.exists(meta_path) and os.path.exists(key_path):
            with open(key_path, "r") as f:
                saved_key = f.read().strip()
            if saved_key == cache_key:
                logger.info("Cargando índice FAISS y documentos desde caché...")
                self.faiss_index = faiss.read_index(index_path)
                with open(meta_path, "rb") as f:
                    cached_data = pickle.load(f)
                    self.documents = cached_data["documents"]
                    self.doc_metadata = cached_data["doc_metadata"]
                return
        
        logger.info("Reconstruyendo índice FAISS desde cero...")
        
        self.documents = []
        self.doc_metadata = []

        menus_by_store = {}
        for menu in self.data.get('menus', []):
            tid = menu.get('id_tiendita')
            if tid not in menus_by_store: menus_by_store[tid] = []
            menus_by_store[tid].append(menu)

        tienditas = self.data.get('tienditas', [])

        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            nombre_limpio = re.sub(r'([a-z])([A-Z])', r'\1 \2', tienda.get('nombre', 'Desconocida'))

            base_lines = [f"CAFETERÍA: {nombre_limpio}"]
            base_lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            if tienda.get('hora_apertura'):
                base_lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

            store_menus = menus_by_store.get(tid, [])

            if not store_menus:
                lines = list(base_lines)
                lines.append("\nMENÚ:")
                lines.append("(Sin menú disponible)")
                self.documents.append("\n".join(lines))
                self.doc_metadata.append({
                    'id': tid,
                    'name': nombre_limpio,
                    'latitud': tienda.get('latitud'),
                    'longitud': tienda.get('longitud')
                })
            else:
                cats = {}
                for m in store_menus:
                    c = m.get('categoria', 'Varios')
                    if c not in cats: cats[c] = []
                    cats[c].append(m)

                for cat, items in cats.items():
                    lines = list(base_lines)
                    lines.append(f"\nMENÚ ({cat.upper()}):")
                    for m in items:
                        try:
                            precio = float(m['precio'])
                            nombre_platillo = m['nombre'].strip().replace("\n", " ")
                            lines.append(f"- {nombre_platillo} (${precio:.0f} MXN)")
                        except: pass
                    
                    self.documents.append("\n".join(lines))
                    self.doc_metadata.append({
                        'id': tid,
                        'name': nombre_limpio,
                        'latitud': tienda.get('latitud'),
                        'longitud': tienda.get('longitud')
                    })

        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)
        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))
        logger.info("Índice FAISS estático construido")
        
        # Guardar en caché
        logger.info("Guardando índice en caché...")
        faiss.write_index(self.faiss_index, index_path)
        with open(meta_path, "wb") as f:
            pickle.dump({"documents": self.documents, "doc_metadata": self.doc_metadata}, f)
        with open(key_path, "w") as f:
            f.write(cache_key)
        logger.info("Caché guardado exitosamente")

    def _retrieve_context(self, query: str, user_lat: Optional[float] = None, user_lon: Optional[float] = None, k: int = 8) -> List[str]:
        q_emb = self.embedding_model.encode([query])
        
        search_k = min(k * 5, self.faiss_index.ntotal) if self.faiss_index.ntotal > 0 else k
        D, I = self.faiss_index.search(np.array(q_emb).astype('float32'), search_k)
        
        results = []
        seen_cafeterias = {}

        for idx in I[0]:
            if len(results) >= k:
                break
                
            if idx == -1: continue
            
            doc = self.documents[idx]
            
            if hasattr(self, 'doc_metadata'):
                meta = self.doc_metadata[idx]
                store_id = meta.get('id')
                
                if store_id:
                    if seen_cafeterias.get(store_id, 0) >= 3:
                        continue
                    seen_cafeterias[store_id] = seen_cafeterias.get(store_id, 0) + 1
                
                lat2, lon2 = meta.get('latitud'), meta.get('longitud')
                if user_lat and user_lon and lat2 and lon2:
                    dist = calculate_distance(user_lat, user_lon, lat2, lon2)
                    
                    if dist > 2500:
                        continue
                        
                    lines = doc.split('\n')
                    lines.insert(2, f"DISTANCIA: {dist:.0f} metros")
                    doc = '\n'.join(lines)
                    
            results.append(doc)
            
        if not results:
            return []

        # Re-ranking con CrossEncoder
        cross_inp = [[query, doc] for doc in results]
        scores = self.cross_encoder.predict(cross_inp)
        
        doc_score_pairs = list(zip(results, scores))
        doc_score_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, score in doc_score_pairs[:k]]

    def _reformulate_query(self, question: str) -> str:
        if not self.chat_history:
            return question

        history_str = ""
        for q, a in self.chat_history[-3:]:
            history_str += f"Usuario: {q}\nBúho: {a}\n"

        prompt = f"""<|im_start|>system
Eres un asistente que reescribe la última pregunta del usuario para que sea entendible por sí sola, usando el historial del chat.
Si la pregunta actual ya es clara e independiente, devuélvela exactamente igual. Responde ÚNICAMENTE con la pregunta reformulada, sin dar explicaciones ni comentarios extra.
<|im_end|>
<|im_start|>user
Historial:
{history_str}
Pregunta actual: {question}
<|im_end|>
<|im_start|>assistant
"""
        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=60,
            return_full_text=False,
            temperature=0.1,
            top_p=0.9,
            do_sample=False,
            pad_token_id=self.tokenizer.eos_token_id
        )
        reformulated = outputs[0]['generated_text'].strip()
        
        for tag in ["<|im_end|>", "<|im_start|>", "assistant", "user", "system"]:
            reformulated = reformulated.replace(tag, "")
            
        reformulated = reformulated.strip()
        logger.info(f"Reformulada: '{question}' -> '{reformulated}'")
        return reformulated if reformulated else question

    def query(self, question: str, user_lat=None, user_lon=None) -> Dict:
        logger.info(f"Consulta: {question[:50]}...")

        self._load_models()
        search_query = self._reformulate_query(question)

        # 1. Detectar Presupuesto
        budget_match = re.search(r'(\d+)\s*(pesos|mxn|\$)', search_query.lower())
        budget_val = float(budget_match.group(1)) if budget_match else None

        # 2. Gestionar Ubicación (GPS vs Texto)
        target_lat, target_lon = user_lat, user_lon
        location_name = "Ubicación GPS" if user_lat else None

        if not target_lat:
            # Buscar en texto con alias
            found_lat, found_lon, found_name = get_coords_from_query(search_query)
            if found_lat:
                target_lat, target_lon = found_lat, found_lon
                location_name = found_name.upper() # Ej: "SERVICIO SOCIAL"

        # 3. Construir Índice (Solo una vez)
        if not self.faiss_index: 
            self.build_index()

        if target_lat and target_lon:
            self.current_user_lat = target_lat
            self.current_user_lon = target_lon
            logger.info(f"Usando referencia de: {location_name}")

        # 4. Generar Respuesta
        context_docs = self._retrieve_context(search_query, target_lat, target_lon, k=10)

        # Historial de 6 turnos
        history_str = ""
        for q, a in self.chat_history[-6:]:
            history_str += f"Usuario: {q}\nBúho: {a}\n---\n"

        # Inyección de contexto
        loc_ctx = ""
        if location_name:
            loc_ctx = f"USUARIO ESTÁ EN: {location_name}. Las 'DISTANCIAS' en el menú son metros desde ahí."

        prompt = f"""<|im_start|>system
Eres "El Búho Tragón", asistente experto de UNISON.

UBICACIÓN:
{loc_ctx if location_name else "Ubicación desconocida."}
"Servicio Social" = "Trabajo Social".

FORMATO OBLIGATORIO:
- NO uses asteriscos ** ni negritas
- Cuando listes cafeterías o platillos, SIEMPRE formato así:

Ejemplo correcto:
"Los molletes están en:

• Cafeteria Artes: Mollete ($30)
• Cafeteria Derecho: Mollete ($30)
• Cafeteria Historia: Mollete ($50)"

NUNCA escribas: "- Cafeteria X: ... - Cafeteria Y: ..."
SIEMPRE usa salto de línea + bullet (•) antes de cada opción.

REGLAS:
1. Respuestas cortas y directas
2. Si preguntan "más barato", busca precios menores
{f"3. PRESUPUESTO: ${budget_val} pesos" if budget_val else ""}

<|im_end|>
<|im_start|>user
HISTORIAL:
{history_str}

DATOS:
{chr(10).join(context_docs)}

Pregunta: {question}
<|im_end|>
<|im_start|>assistant
"""

        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=250,
            return_full_text=False,
            temperature=0.1,
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.05,
            pad_token_id=self.tokenizer.eos_token_id
        )

        answer = outputs[0]['generated_text'].strip()

        # Limpieza de tags del modelo
        for tag in ["<|im_end|>", "<|im_start|>", "assistant", "user", "system"]:
            answer = answer.replace(tag, "")

        # --- LIMPIEZA DE FORMATO DEFINITIVA ---

        # 1. Eliminar asteriscos de negritas (Markdown)
        answer = answer.replace("**", "").replace("__", "")

        # 2. Forzar salto de línea antes de cualquier Bullet (•)
        # Si encuentra un bullet precedido de espacio, lo cambia por \n•
        answer = answer.replace(" •", "\n•")
        answer = answer.replace("• ", "\n• ") # Por si el LLM pone el bullet pegado

        # 3. Forzar salto de línea antes de guiones usados como lista
        # (Solo si hay espacio antes y después, para no romper palabras compuestas)
        answer = re.sub(r'(\s)-\s', r'\n- ', answer)

        # 4. Arreglar el inicio de la lista (después de los dos puntos)
        # Convierte "están en: •" en "están en:\n•"
        answer = answer.replace(": •", ":\n•").replace(": -", ":\n-")

        # 5. Eliminar saltos de línea dobles o triples que hayan quedado
        answer = re.sub(r'\n\s*\n', '\n', answer)

        # Limpieza final
        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE).strip()

        self.chat_history.append((question, answer))
        if len(self.chat_history) > 10: self.chat_history = self.chat_history[-10:]

        logger.info(f"Respuesta: {answer[:50]}...")
        return {'answer': answer, 'context': context_docs}

    def reset_conversation(self):
        self.chat_history = []
        logger.info("Reset")