"""
Production RAG Engine - El Búho Tragón
Optimized for Qwen2.5 (CPU)
FINAL VERSION: Grouped Indexing + Strict Prompting + Extended Search (k=7)
"""

import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional
import torch
import os
import re

class BuhoRAG:
    """
    Production RAG system for El Búho Tragón.
    Grouping Strategy: One document per Cafeteria containing its full menu.
    """

    def __init__(self, data_path: str = "rag_data_fixed.json"):
        print("🦉 Initializing El Búho Tragón RAG System...")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.metadata = []
        self.faiss_index = None

        # Models
        self.embedding_model = None
        self.llm_pipeline = None
        self.tokenizer = None

        # Location cache
        self.current_user_lat = None
        self.current_user_lon = None

        print("✅ RAG System initialized")

    def _load_models(self):
        """Lazy load models"""
        if self.embedding_model is None:
            print("📥 Loading embedding model...")
            self.embedding_model = SentenceTransformer(
                'sentence-transformers/all-MiniLM-L6-v2'
            )

        if self.llm_pipeline is None:
            print("📥 Loading LLM (Qwen2.5)...")
            model_id = "Qwen/Qwen2.5-1.5B-Instruct"

            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                device_map="cpu",
                low_cpu_mem_usage=True
            )

            self.llm_pipeline = pipeline(
                "text-generation",
                model=model,
                tokenizer=self.tokenizer,
            )
            print("✅ Models loaded successfully")

    def load_data(self):
        """Load data from JSON file"""
        if not os.path.exists(self.data_path):
            print(f"❌ Error: File {self.data_path} not found.")
            return

        print(f"📊 Loading data from {self.data_path}...")
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

    def build_index(self, user_lat: Optional[float] = None, user_lon: Optional[float] = None):
        """
        Build search index grouping menus by cafeteria
        """
        if not self.data:
            self.load_data()

        self._load_models()
        print("🔨 Building search index (Grouped Strategy)...")

        self.documents = []
        self.metadata = []

        # 1. Pre-process: Group menus by store ID
        menus_by_store = {}
        for menu in self.data.get('menus', []):
            tid = menu.get('id_tiendita')
            if tid not in menus_by_store:
                menus_by_store[tid] = []
            menus_by_store[tid].append(menu)

        # 2. Process Tienditas (Main Documents)
        tienditas = self.data.get('tienditas', [])

        # Calculate distances if user location provided
        if user_lat and user_lon:
            for t in tienditas:
                if t.get('latitud') and t.get('longitud'):
                    t['distancia'] = self.calculate_distance(
                        user_lat, user_lon,
                        float(t['latitud']), float(t['longitud'])
                    )
            # Sort by distance
            tienditas.sort(key=lambda x: x.get('distancia', 9999999))

        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            store_menus = menus_by_store.get(tid, [])

            # --- BUILD THE BIG DOCUMENT ---
            lines = []
            lines.append(f"CAFETERÍA: {tienda.get('nombre', 'Desconocida')}")
            lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            if tienda.get('hora_apertura'):
                lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

            if 'distancia' in tienda:
                lines.append(f"DISTANCIA: A {tienda['distancia']:.0f} metros de ti.")

            lines.append("\nMENÚ COMPLETO:")
            if not store_menus:
                lines.append("(No hay menú registrado)")
            else:
                # Group by category for better reading
                cats = {}
                for m in store_menus:
                    c = m.get('categoria', 'Varios')
                    if c not in cats: cats[c] = []
                    cats[c].append(m)

                for cat, items in cats.items():
                    lines.append(f"--- {cat} ---")
                    for m in items:
                        lines.append(f"- {m['nombre']}: ${float(m['precio']):.2f}")

            full_doc = "\n".join(lines)

            self.documents.append(full_doc)
            self.metadata.append({'type': 'tiendita_full', 'id': tid, 'name': tienda.get('nombre')})

        # 3. Add Faculties as separate documents (Context)
        for fac in self.data.get('facultades', []):
            doc = f"FACULTAD: {fac.get('nombre')}\nDESCRIPCIÓN: {fac.get('descripcion')}"
            self.documents.append(doc)
            self.metadata.append({'type': 'facultad', 'id': fac.get('id_facultad')})

        print(f"📝 Created {len(self.documents)} consolidated documents (1 per cafeteria + faculties)")

        # Generate embeddings
        print("🔢 Generating embeddings...")
        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)

        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))
        print(f"✅ Index built with {self.faiss_index.ntotal} vectors")

    def _retrieve_context(self, query: str, k: int = 7) -> List[str]:
        """Retrieve relevant documents for query. k=7 ensures broad coverage."""
        if not self.faiss_index:
            raise ValueError("Index not built.")
        query_embedding = self.embedding_model.encode([query])
        distances, indices = self.faiss_index.search(
            np.array(query_embedding).astype('float32'), k
        )
        return [self.documents[i] for i in indices[0]]

    def query(self, question: str, user_lat=None, user_lon=None):
        # 1. Lógica de Ubicación
        location_keywords = ['cercana', 'cerca', 'cerca de', 'más cerca', 'closest', 'nearest']
        asking_location = any(keyword in question.lower() for keyword in location_keywords)

        if asking_location and not (user_lat and user_lon):
            return {
                'answer': 'Necesito tu ubicación para encontrar la cafetería más cercana. ¿Me puedes compartir tu ubicación?',
                'context': []
            }

        if not self.faiss_index:
            self.build_index(user_lat, user_lon)

        if user_lat and user_lon and (user_lat != self.current_user_lat or user_lon != self.current_user_lon):
            self.build_index(user_lat, user_lon)
            self.current_user_lat = user_lat
            self.current_user_lon = user_lon

        self._load_models()

        # 2. Retrieve Extended Context (k=7)
        context_docs = self._retrieve_context(question, k=7)

        clean_context = []
        for doc in context_docs:
            clean_context.append(doc)

        context_str = "\n\n".join(clean_context)

        # 3. Prompt Estricto
        prompt = f"""<|im_start|>system
Eres El Buhito, asistente de cafeterías de la UNISON.

REGLAS OBLIGATORIAS:
1. Usa SOLO la información de abajo.
2. Si das un precio, TIENES QUE DECIR EL NOMBRE DE LA CAFETERÍA.
   - MAL: "Cuesta $50 en todas".
   - BIEN: "Cuesta $50 en Cafetería Artes y Cafetería Derecho".
3. Si la lista es larga, usa viñetas.
4. Si no sabes la respuesta, di "No tengo información sobre ese producto".<|im_end|>
<|im_start|>user
INFORMACIÓN DISPONIBLE:
{context_str}

Pregunta: {question}<|im_end|>
<|im_start|>assistant
"""

        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=200,
            return_full_text=False,
            temperature=0.1,
            top_p=0.8,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )

        # 4. Limpieza Estricta
        answer = outputs[0]['generated_text'].strip()

        answer = answer.replace("<|im_end|>", "")
        answer = answer.replace("<|im_start|>", "")
        answer = answer.replace("assistant", "")
        answer = answer.replace("user", "")
        answer = answer.replace("system", "")

        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'La respuesta es:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\[[\d,\s]+\]', '', answer)
        answer = re.sub(r'INFORMACIÓN DISPONIBLE.*?:', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\s+', ' ', answer).strip()

        return {
            'answer': answer,
            'context': context_docs
        }


# Singleton instance for production use
_rag_instance = None

def get_rag_engine(data_path: str = "rag_data_fixed.json") -> BuhoRAG:
    """
    Get or create RAG engine singleton
    """
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = BuhoRAG(data_path=data_path)
        _rag_instance.load_data()
        _rag_instance.build_index()
    return _rag_instance


# Example usage and testing
if __name__ == "__main__":
    print("="*70)
    print("Testing RAG Engine with Qwen2.5 (Final Version)")
    print("="*70)

    rag = BuhoRAG()
    rag.load_data()

    print("\n⚠️  Construyendo índice SIN ubicación de usuario...")
    rag.build_index()  # Sin lat/lon

    test_questions = [
        "¿Cuánto cuesta la Torta Cubana?",
        "¿Dónde venden pizzas?",
        "¿A qué hora abre la Cafetería de Derecho?",
        "¿Cuánto cuesta un licuado?",
    ]

    for i, q in enumerate(test_questions, 1):
        print(f"\n[{i}/{len(test_questions)}] {q}")
        print("-" * 70)
        result = rag.query(q)
        print(f"🦉 {result['answer']}")

    print("\n" + "="*70)
    print("✅ Testing complete")
    print("="*70)