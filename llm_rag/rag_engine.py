"""
Production RAG Engine - El Búho Tragón
Optimized for Qwen2.5 (CPU)
Groups data by Cafeteria to avoid fragmentation
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

    def query(self, question: str, user_lat=None, user_lon=None):
        if not self.faiss_index:
            self.build_index(user_lat, user_lon)

        # If location changed, rebuild (simple approach)
        if user_lat and user_lon and (user_lat != self.current_user_lat or user_lon != self.current_user_lon):
            self.build_index(user_lat, user_lon)
            self.current_user_lat = user_lat
            self.current_user_lon = user_lon

        self._load_models()

        # Retrieve Top-3 relevant cafeterias
        q_emb = self.embedding_model.encode([question])
        D, I = self.faiss_index.search(np.array(q_emb).astype('float32'), k=3)

        context_str = "\n\n".join([f"[OPCIÓN {i+1}]\n{self.documents[idx]}" for i, idx in enumerate(I[0])])

        system_prompt = """Eres 'El Búho Tragón', un experto en cafeterías de la UNISON.
Usa la información proporcionada para responder. 
- Si preguntan precios, compara entre las opciones encontradas.
- Si preguntan ubicación, sé preciso.
- Responde de forma natural y útil."""

        user_prompt = f"""INFORMACIÓN DE CAFETERÍAS:
{context_str}

PREGUNTA DEL ESTUDIANTE: {question}

Respuesta:"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        outputs = self.llm_pipeline(
            messages,
            max_new_tokens=250,
            temperature=0.3,
            do_sample=True,
        )

        return {
            'answer': outputs[0]['generated_text'],
            'context': [self.documents[i] for i in I[0]]
        }

if __name__ == "__main__":
    rag = BuhoRAG()
    # Force build to see the count
    rag.build_index()

    print("\n--- PRUEBA DE CONSULTA ---")
    print(rag.query("¿Dónde venden Torta Cubana?")['answer'])