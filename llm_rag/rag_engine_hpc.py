"""
Production RAG Engine - El Búho Tragón
Target: HPC Cluster 'Yuca' (AMD MI210 GPU)
Model: Qwen2.5-14B-Instruct (FP16)
Features: Smart Budgeting + Geo-Awareness + CONVERSATIONAL MEMORY
"""

import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional, Tuple
import torch
import os
import re

class BuhoRAG:
    def __init__(self, data_path: str = "rag_data_fixed.json"):
        print("🦉 Initializing El Búho Tragón RAG System (Memory Edition)...")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.faiss_index = None
        self.chat_history = [] # 🧠 AQUÍ GUARDAMOS LA MEMORIA

        # 📍 MAPA MENTAL DEL BÚHO (Campus Hermosillo) 📍
        self.known_locations = {
            "exactas": (29.081527, -110.960999),
            "matematicas": (29.081527, -110.960999),
            "fisica": (29.081527, -110.960999),
            "geologia": (29.081527, -110.960999),
            "quimico": (29.081527, -110.960999),
            "alimentos": (29.081527, -110.960999),
            "artes": (29.081607, -110.958986),
            "bellas artes": (29.081607, -110.958986),
            "musica": (29.081607, -110.958986),
            "teatro": (29.081607, -110.958986),
            "letras": (29.082632, -110.960454),
            "linguistica": (29.082632, -110.960454),
            "idiomas": (29.082632, -110.960454),
            "lenguas": (29.082632, -110.960454),
            "arquitectura": (29.081607, -110.958986),
            "diseño": (29.081607, -110.958986),
            "ingenieria": (29.081694, -110.962732),
            "civil": (29.081694, -110.962732),
            "minas": (29.081694, -110.962732),
            "industrial": (29.081694, -110.962732),
            "metalurgia": (29.081694, -110.962732),
            "polimeros": (29.081694, -110.962732),
            "quimica": (29.081694, -110.962732),
            "derecho": (29.084896, -110.963255),
            "economia": (29.084896, -110.963255),
            "enfermeria": (29.084896, -110.963255),
            "administrativas": (29.084896, -110.963255),
            "sociales": (29.085566, -110.965056),
            "psicologia": (29.085566, -110.965056),
            "comunicacion": (29.085566, -110.965056),
            "historia": (29.085566, -110.965056),
            "antropologia": (29.085566, -110.965056),
            "sociologia": (29.085566, -110.965056),
            "trabajo social": (29.085566, -110.965056),
            "educacion": (29.085566, -110.965056),
            "administracion": (29.085566, -110.965056),
            "contabilidad": (29.084019, -110.964915),
            "conta": (29.084019, -110.964915),
            "mecatronica": (29.082979, -110.964557),
            "gimnasio": (29.082979, -110.964557),
            "deporte": (29.082979, -110.964557),
            "medicina": (29.081355, -110.968206),
            "biologicas": (29.081355, -110.968206),
            "salud": (29.081355, -110.968206),
        }

        # Models
        self.embedding_model = None
        self.llm_pipeline = None
        self.tokenizer = None

        # Cache
        self.current_user_lat = None
        self.current_user_lon = None

        print("✅ RAG System initialized")

    def _load_models(self):
        if self.embedding_model is None:
            print("📥 Loading embedding model (CPU)...")
            self.embedding_model = SentenceTransformer(
                'sentence-transformers/all-MiniLM-L6-v2', device='cpu'
            )

        if self.llm_pipeline is None:
            print("📥 Loading LLM (Qwen2.5-14B) on AMD GPU...")
            model_id = "Qwen/Qwen2.5-14B-Instruct"
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float16,
                device_map="auto",
                low_cpu_mem_usage=True
            )
            self.llm_pipeline = pipeline(
                "text-generation", model=model, tokenizer=self.tokenizer
            )
            print(f"✅ LLM loaded on: {model.device}")

    def load_data(self):
        if not os.path.exists(self.data_path):
            print(f"❌ Error: File {self.data_path} not found.")
            return
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        if not lat1 or not lon1 or not lat2 or not lon2: return 99999
        R = 6371000
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c

    def get_coords_from_query(self, query: str) -> Tuple[Optional[float], Optional[float]]:
        query_lower = query.lower()
        if any(x in query_lower for x in ['caborca', 'navojoa', 'nogales', 'cajeme', 'santa ana']):
            return None, None

        for place, coords in self.known_locations.items():
            if place in query_lower:
                print(f"📍 Referencia detectada: '{place.upper()}' -> Coordenadas {coords}")
                return coords
        return None, None

    def build_index(self, ref_lat: Optional[float] = None, ref_lon: Optional[float] = None):
        if not self.data: self.load_data()
        self._load_models()

        self.documents = []

        menus_by_store = {}
        for menu in self.data.get('menus', []):
            tid = menu.get('id_tiendita')
            if tid not in menus_by_store: menus_by_store[tid] = []
            menus_by_store[tid].append(menu)

        tienditas = self.data.get('tienditas', [])

        if ref_lat and ref_lon:
            for t in tienditas:
                dist = self.calculate_distance(ref_lat, ref_lon, t.get('latitud'), t.get('longitud'))
                t['distancia_temp'] = dist
            tienditas.sort(key=lambda x: x.get('distancia_temp', 9999999))
            print("📍 Cafeterías reordenadas por proximidad.")

        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            store_menus = menus_by_store.get(tid, [])

            lines = [f"CAFETERÍA: {tienda.get('nombre', 'Desconocida')}"]
            lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            # --- LÓGICA DE PROXIMIDAD REFINADA (SEMÁNTICA) ---
            if 'distancia_temp' in tienda:
                dist = tienda['distancia_temp']
                if dist < 60: # Muy cerca
                    lines.append(f"DISTANCIA: ESTÁ EN TU MISMA FACULTAD/ZONA (A solo {dist:.0f} metros)")
                elif dist < 250:
                    lines.append(f"DISTANCIA: MUY CERCA CAMINANDO (A {dist:.0f} metros)")
                elif dist < 1500:
                    lines.append(f"DISTANCIA: A {dist:.0f} metros.")
            # -------------------------------------------------

            if tienda.get('hora_apertura'):
                lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

            lines.append("\nMENÚ:")
            if not store_menus:
                lines.append("(Sin menú)")
            else:
                for m in store_menus:
                    try:
                        price = float(m['precio'])
                        lines.append(f" - {m['nombre']}: ${price:.2f}")
                    except:
                        pass

            full_doc = "\n".join(lines)
            self.documents.append(full_doc)

        print(f"📝 Index built with {len(self.documents)} documents")

        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)
        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))

    def _retrieve_context(self, query: str, k: int = 12) -> List[str]:
        if not self.faiss_index: raise ValueError("Index not built.")
        q_emb = self.embedding_model.encode([query])
        D, I = self.faiss_index.search(np.array(q_emb).astype('float32'), k)
        return [self.documents[i] for i in I[0]]

    def query(self, question: str, user_lat=None, user_lon=None):
        budget_match = re.search(r'(\d+)\s*(pesos|mxn|\$)', question.lower())
        budget_val = float(budget_match.group(1)) if budget_match else None

        target_lat, target_lon = user_lat, user_lon
        if not target_lat:
            target_lat, target_lon = self.get_coords_from_query(question)

        # Si cambian las coordenadas, reconstruimos.
        # IMPORTANTE: Si el usuario NO cambia de ubicación (ya está en chat_history), mantenemos las coordenadas actuales.
        if target_lat and target_lon:
            self.build_index(target_lat, target_lon)
            self.current_user_lat = target_lat
            self.current_user_lon = target_lon
        elif self.current_user_lat and self.current_user_lon:
            # Mantener ubicación anterior si el usuario sigue hablando del mismo tema
            pass
        elif not self.faiss_index:
            self.build_index()

        self._load_models()

        context_docs = self._retrieve_context(question, k=15)
        context_str = "\n\n".join(context_docs)

        # --- MEMORIA CONVERSACIONAL ---
        history_str = ""
        # Tomamos los últimos 3 turnos para dar contexto sin saturar
        for q, a in self.chat_history[-3:]:
            history_str += f"Usuario: {q}\nBúho: {a}\n---\n"

        budget_instruction = ""
        if budget_val:
            budget_instruction = f"\n⚠️ REGLA DE PRESUPUESTO: El usuario tiene ${budget_val} pesos. Muestra SOLO lo que pueda comprar con esa cantidad."

        prompt = f"""<|im_start|>system
Eres El Buhito, experto en cafeterías de la UNISON (Campus Hermosillo).

CONTEXTO ANTERIOR (MEMORIA):
{history_str}

REGLAS DE ORO:
1. Usa SOLO la información provista abajo.{budget_instruction}
2. Si dice "ESTÁ EN TU MISMA FACULTAD/ZONA", dile que esa es su opción más inmediata, NO le digas "estás en la cafetería", dile "la cafetería está en tu zona".
3. Copia los nombres de los platillos EXACTAMENTE.
4. Menciona el nombre de la cafetería SIEMPRE junto al precio.
5. Usa el historial para entender el contexto (ej. si pregunta "y qué más?", se refiere a la pregunta anterior).

<|im_start|>user
INFORMACIÓN ACTUALIZADA:
{context_str}

Pregunta: {question}<|im_end|>
<|im_start|>assistant
"""

        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=400,
            return_full_text=False,
            temperature=0.1,
            top_p=0.9,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )

        answer = outputs[0]['generated_text'].strip()

        for tag in ["<|im_end|>", "<|im_start|>", "assistant", "user", "system"]:
            answer = answer.replace(tag, "")

        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\[[\d,\s]+\]', '', answer)
        answer = re.sub(r'INFORMACIÓN ACTUALIZADA.*?:', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\s+', ' ', answer).strip()

        # Guardar en memoria
        self.chat_history.append((question, answer))

        return {'answer': answer, 'context': context_docs}

if __name__ == "__main__":
    print("="*70)
    print("🦉 EL BÚHO TRAGÓN - MODO INTELIGENTE (MEMORIA + GEO)")
    print("="*70)

    rag = BuhoRAG()
    rag.load_data()
    rag.build_index()

    print("\n✅ Listo. ¡Ya tengo memoria! Prueba conversar conmigo.")

    while True:
        try:
            print("\n" + "-"*50)
            user_input = input("🗣️  Pregunta: ")
            if user_input.lower() in ['salir', 'exit']: break
            if not user_input.strip(): continue

            print("🦉 Pensando...")
            result = rag.query(user_input)
            print(f"🦉 Respuesta: {result['answer']}")
        except KeyboardInterrupt:
            print("\n👋 ¡Bye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")