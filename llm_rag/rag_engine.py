"""
Production RAG Engine - El Buho Tragon
Optimized for Qwen2.5 (CPU) via llama.cpp
FINAL VERSION: Category Chunking + Fuzzy Location + Cross-Encoder Re-ranking
"""

import json
import logging
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer, CrossEncoder
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional, Tuple
from thefuzz import fuzz, process
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
import os
import re

logger = logging.getLogger(__name__)


class BuhoRAG:
    """
    Production RAG system for El Buho Tragon.
    Category-based chunking with fuzzy location matching.
    """

    def __init__(self, data_path: str = None):
        logger.info("[Buho] Initializing RAG System...")

        if data_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(script_dir, "rag_data_fixed.json")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.metadata = []
        self.faiss_index = None
        self.chat_history = []

        # Models
        self.embedding_model = None
        self.cross_encoder = None
        self.llm_pipeline = None
        self.device = None
        self.dtype = None

        # Location cache
        self.current_user_lat = None
        self.current_user_lon = None

        self.known_locations = {
            "exactas": (29.081527, -110.960999),
            "matematicas": (29.081527, -110.960999),
            "mates": (29.081527, -110.960999),
            "fisica": (29.081527, -110.960999),
            "geologia": (29.081527, -110.960999),
            "quimico": (29.081527, -110.960999),
            "biologicas": (29.081355, -110.968206),
            "artes": (29.081607, -110.958986),
            "bellas artes": (29.081607, -110.958986),
            "musica": (29.081607, -110.958986),
            "teatro": (29.081607, -110.958986),
            "arquitectura": (29.081607, -110.958986),
            "diseno": (29.081607, -110.958986),
            "letras": (29.082632, -110.960454),
            "letritas": (29.082632, -110.960454),
            "linguistica": (29.082632, -110.960454),
            "idiomas": (29.082632, -110.960454),
            "lenguas": (29.082632, -110.960454),
            "ingenieria": (29.081694, -110.962732),
            "civil": (29.081694, -110.962732),
            "minas": (29.081694, -110.962732),
            "industrial": (29.081694, -110.962732),
            "quimica": (29.081694, -110.962732),
            "derecho": (29.084896, -110.963255),
            "economia": (29.084896, -110.963255),
            "enfermeria": (29.084896, -110.963255),
            "administrativas": (29.084896, -110.963255),
            "sociales": (29.085566, -110.965056),
            "sociologia": (29.085566, -110.965056),
            "trabajo social": (29.085566, -110.965056),
            "servicio social": (29.085566, -110.965056),
            "psicologia": (29.085566, -110.965056),
            "comunicacion": (29.085566, -110.965056),
            "historia": (29.085566, -110.965056),
            "educacion": (29.085566, -110.965056),
            "contabilidad": (29.084019, -110.964915),
            "conta": (29.084019, -110.964915),
            "gimnasio": (29.082979, -110.964557),
            "deporte": (29.082979, -110.964557),
            "medicina": (29.081355, -110.968206),
            "salud": (29.081355, -110.968206),
            "vicerrectoria": (29.0822, -110.9615),
            "rectoria": (29.0822, -110.9615),
            "biblioteca": (29.0833, -110.9630)
        }

        logger.info("[OK] RAG System initialized")

    def _detect_device(self):
        return "cpu", None

    def _load_models(self):
        if self.device is None:
            self.device, self.dtype = self._detect_device()

        if self.embedding_model is None:
            logger.info("[Load] Loading multilingual embedding model...")
            self.embedding_model = SentenceTransformer(
                'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
                device='cpu'
            )

        if getattr(self, 'cross_encoder', None) is None:
            logger.info("[Load] Loading Cross-Encoder for Re-ranking...")
            self.cross_encoder = CrossEncoder(
                'cross-encoder/ms-marco-MiniLM-L-6-v2',
                device='cpu'
            )

        if self.llm_pipeline is None:
            logger.info("[Load] Downloading/Loading LLM (GGUF Quantized)...")

            model_path = hf_hub_download(
                repo_id="Qwen/Qwen2.5-1.5B-Instruct-GGUF",
                filename="qwen2.5-1.5b-instruct-q4_k_m.gguf"
            )

            self.llm_pipeline = Llama(
                model_path=model_path,
                n_ctx=4096,
                n_threads=4,
                verbose=False
            )
            logger.info("[OK] LLM loaded (llama.cpp)")

    def load_data(self):
        """Load data from JSON file"""
        if not os.path.exists(self.data_path):
            logger.error(f"Error: File {self.data_path} not found.")
            return

        logger.info(f"[Data] Loading data from {self.data_path}...")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        R = 6371000
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c

    def get_coords_from_query(self, query: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
        query_lower = query.lower()
        if any(x in query_lower for x in ['caborca', 'navojoa', 'nogales', 'cajeme', 'santa ana']):
            return None, None, None

        words = query_lower.replace('?', '').replace(',', '').replace('.', '').split()
        bigrams = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
        tokens = words + bigrams

        aliases = list(self.known_locations.keys())
        best_score = 0
        best_match = None

        for token in tokens:
            if len(token) < 4:
                continue
            match, score = process.extractOne(token, aliases, scorer=fuzz.ratio)
            if score > best_score:
                best_score = score
                best_match = match

        if best_score > 85:
            logger.info(f"[Location] Fuzzy match: '{best_match}' (score: {best_score}%%)")
            coords = self.known_locations[best_match]
            return coords[0], coords[1], best_match

        return None, None, None

    def build_index(self):
        """Build search index with category-based chunking (Static)"""
        if not self.data:
            self.load_data()

        self._load_models()
        logger.info("[Index] Building static search index...")

        self.documents = []
        self.metadata = []

        # 1. Pre-process: Group menus by store ID
        menus_by_store = {}
        for menu in self.data.get('menus', []):
            tid = menu.get('id_tiendita')
            if tid not in menus_by_store:
                menus_by_store[tid] = []
            menus_by_store[tid].append(menu)

        # 2. Process Tienditas - one chunk per category
        tienditas = self.data.get('tienditas', [])

        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            store_menus = menus_by_store.get(tid, [])

            base_lines = [f"CAFETERIA: {tienda.get('nombre', 'Desconocida')}"]
            base_lines.append(f"UBICACION: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            if tienda.get('hora_apertura'):
                base_lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

            if not store_menus:
                lines = list(base_lines)
                lines.append("\nMENU:")
                lines.append("(No hay menu registrado)")
                self.documents.append("\n".join(lines))
                self.metadata.append({
                    'type': 'tiendita_chunk',
                    'id': tid,
                    'name': tienda.get('nombre'),
                    'latitud': tienda.get('latitud'),
                    'longitud': tienda.get('longitud'),
                    'categoria': 'Sin Menu'
                })
            else:
                cats = {}
                for m in store_menus:
                    c = m.get('categoria', 'Varios')
                    if c not in cats:
                        cats[c] = []
                    cats[c].append(m)

                for cat, items in cats.items():
                    lines = list(base_lines)
                    lines.append(f"\nMENU ({cat.upper()}):")
                    for m in items:
                        lines.append(f"- {m['nombre']}: ${float(m['precio']):.2f}")

                    self.documents.append("\n".join(lines))
                    self.metadata.append({
                        'type': 'tiendita_chunk',
                        'id': tid,
                        'name': tienda.get('nombre'),
                        'latitud': tienda.get('latitud'),
                        'longitud': tienda.get('longitud'),
                        'categoria': cat
                    })

        # 3. Add Faculties as separate documents
        for fac in self.data.get('facultades', []):
            doc = f"FACULTAD: {fac.get('nombre')}\nDESCRIPCION: {fac.get('descripcion')}"
            self.documents.append(doc)
            self.metadata.append({'type': 'facultad', 'id': fac.get('id_facultad')})

        logger.info(f"[Index] Created {len(self.documents)} chunks")

        # Generate embeddings
        logger.info("[Index] Generating embeddings...")
        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)

        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))
        logger.info(f"[OK] Static index built with {self.faiss_index.ntotal} vectors")

    def _retrieve_context(self, query: str, user_lat: Optional[float] = None, user_lon: Optional[float] = None, k: int = 7) -> List[str]:
        """Retrieve relevant documents with metadata filtering and re-ranking."""
        if not self.faiss_index:
            raise ValueError("Index not built.")
        query_embedding = self.embedding_model.encode([query])

        search_k = min(k * 5, self.faiss_index.ntotal) if self.faiss_index.ntotal > 0 else k
        distances, indices = self.faiss_index.search(
            np.array(query_embedding).astype('float32'), search_k
        )

        results = []
        seen_cafeterias = {}

        for idx in indices[0]:
            if len(results) >= k:
                break

            if idx == -1:
                continue

            doc = self.documents[idx]
            meta = self.metadata[idx]

            store_id = meta.get('id')
            if store_id:
                if seen_cafeterias.get(store_id, 0) >= 3:
                    continue
                seen_cafeterias[store_id] = seen_cafeterias.get(store_id, 0) + 1

            if user_lat and user_lon and meta.get('type') in ['tiendita_full', 'tiendita_chunk']:
                lat2, lon2 = meta.get('latitud'), meta.get('longitud')
                if lat2 and lon2:
                    dist = self.calculate_distance(user_lat, user_lon, float(lat2), float(lon2))

                    if dist > 2500:
                        continue

                    lines = doc.split('\n')
                    lines.insert(2, f"DISTANCIA: A {dist:.0f} metros de ti.")
                    doc = '\n'.join(lines)

            results.append(doc)

        if not results:
            return []

        # Re-ranking with CrossEncoder
        cross_inp = [[query, doc] for doc in results]
        scores = self.cross_encoder.predict(cross_inp)

        doc_score_pairs = list(zip(results, scores))
        doc_score_pairs.sort(key=lambda x: x[1], reverse=True)

        return [doc for doc, score in doc_score_pairs[:k]]

    def _reformulate_query(self, question: str) -> str:
        """Rewrite ambiguous follow-up questions using chat history."""
        if not hasattr(self, 'chat_history') or not self.chat_history:
            return question

        history_str = ""
        for q, a in self.chat_history[-3:]:
            history_str += f"Usuario: {q}\nAsistente: {a}\n"

        prompt = f"""<|im_start|>system
Reescribe la pregunta del usuario para que sea clara por si sola. Si ya es clara, devuelvela igual. Solo responde con la pregunta, nada mas.
<|im_end|>
<|im_start|>user
Historial:
{history_str}
Pregunta actual: {question}
<|im_end|>
<|im_start|>assistant
"""
        outputs = self.llm_pipeline.create_completion(
            prompt,
            max_tokens=60,
            temperature=0.1,
            top_p=0.9,
            stop=["<|im_end|>"]
        )
        reformulated = outputs['choices'][0]['text'].strip()

        for tag in ["<|im_end|>", "<|im_start|>", "assistant", "user", "system"]:
            reformulated = reformulated.replace(tag, "")

        return reformulated.strip() if reformulated.strip() else question

    def query(self, question: str, user_lat=None, user_lon=None):
        self._load_models()
        search_query = self._reformulate_query(question)

        # 1. Location logic
        target_lat, target_lon = user_lat, user_lon
        location_name = "GPS" if user_lat else None

        location_keywords = ['cercana', 'cerca', 'cerca de', 'mas cerca', 'closest', 'nearest']
        asking_location = any(keyword in search_query.lower() for keyword in location_keywords)

        if not target_lat:
            found_lat, found_lon, found_name = self.get_coords_from_query(search_query)
            if found_lat:
                target_lat, target_lon = found_lat, found_lon
                location_name = found_name.upper()

        if asking_location and not (target_lat and target_lon):
            return {
                'answer': 'Necesito tu ubicacion para encontrar la cafeteria mas cercana. Puedes compartir tu ubicacion?',
                'context': []
            }

        if not self.faiss_index:
            self.build_index()

        if target_lat and target_lon:
            self.current_user_lat = target_lat
            self.current_user_lon = target_lon

        # 2. Retrieve context
        context_docs = self._retrieve_context(search_query, target_lat, target_lon, k=7)
        context_str = "\n\n".join(context_docs)

        # 3. Build prompt - optimized for small models
        prompt = f"""<|im_start|>system
Eres El Buhito, asistente de cafeterias de la UNISON.
Responde usando SOLO los datos de abajo. Menciona siempre el nombre de la cafeteria y el precio.
Si el usuario menciona un presupuesto, busca opciones que cuesten igual o menos.
Si no encuentras el producto exacto, sugiere productos similares que SI aparezcan en los datos.<|im_end|>
<|im_start|>user
DATOS DE CAFETERIAS:
{context_str}

Pregunta: {question}<|im_end|>
<|im_start|>assistant
"""

        outputs = self.llm_pipeline.create_completion(
            prompt,
            max_tokens=250,
            temperature=0.3,
            top_p=0.9,
            stop=["<|im_end|>"]
        )

        # 4. Clean response
        answer = outputs['choices'][0]['text'].strip()

        answer = answer.replace("<|im_end|>", "")
        answer = answer.replace("<|im_start|>", "")
        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'La respuesta es:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\[[\d,\s]+\]', '', answer)
        answer = re.sub(r'DATOS DE CAFETERIAS.*?:', '', answer, flags=re.IGNORECASE)
        answer = answer.strip()

        if not hasattr(self, 'chat_history'):
            self.chat_history = []
        self.chat_history.append((question, answer))
        if len(self.chat_history) > 10:
            self.chat_history = self.chat_history[-10:]

        return {
            'answer': answer,
            'context': context_docs
        }

    def reset_conversation(self):
        self.chat_history = []
        logger.info("[Reset] Conversation cleared")


# Singleton instance for production use
_rag_instance = None

def get_rag_engine(data_path: str = None) -> BuhoRAG:
    """Get or create RAG engine singleton"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = BuhoRAG(data_path=data_path)
        _rag_instance.load_data()
        _rag_instance.build_index()
    return _rag_instance


if __name__ == "__main__":
    print("=" * 70)
    print("Testing RAG Engine (Final Version)")
    print("=" * 70)

    rag = BuhoRAG()
    rag.load_data()
    rag.build_index()

    test_questions = [
        "Cuanto cuesta la Torta Cubana?",
        "Donde venden pizzas?",
        "tengo 30 pesos cerca de matematicas, que puedo comprar?",
        "Cuanto cuesta un licuado?",
    ]

    for i, q in enumerate(test_questions, 1):
        print(f"\n[{i}/{len(test_questions)}] {q}")
        print("-" * 70)
        result = rag.query(q)
        print(f">> {result['answer']}")

    print("\n" + "=" * 70)
    print("Testing complete")
    print("=" * 70)