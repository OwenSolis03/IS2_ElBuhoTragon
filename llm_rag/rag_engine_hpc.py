"""
🦉 El Búho Tragón - Sistema RAG para Chatbot Web
Versión: 2.0 (Producción)
Optimizado para: Respuestas rápidas, contexto conversacional, integración web
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
import logging
from datetime import datetime

# Configurar logging profesional
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BuhoRAG:
    """
    Motor RAG inteligente para recomendaciones de cafeterías UNISON.

    Características:
    - Búsqueda semántica con FAISS
    - Conciencia geográfica (proximidad)
    - Memoria conversacional
    - Filtrado por presupuesto
    - Respuestas naturales y concisas
    """

    def __init__(self, data_path: str = "rag_data_fixed.json"):
        logger.info("🦉 Inicializando El Búho Tragón RAG System...")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.faiss_index = None
        self.chat_history = []

        # Modelos (se cargan bajo demanda)
        self.embedding_model = None
        self.llm_pipeline = None
        self.tokenizer = None

        # Cache de ubicación
        self.current_user_lat = None
        self.current_user_lon = None

        # 📍 MAPA MENTAL DEL CAMPUS HERMOSILLO
        self.known_locations = {
            # Ciencias Exactas y Naturales
            "exactas": (29.081527, -110.960999),
            "matematicas": (29.081527, -110.960999),
            "fisica": (29.081527, -110.960999),
            "geologia": (29.081527, -110.960999),
            "quimico": (29.081527, -110.960999),

            # Artes y Humanidades
            "artes": (29.081607, -110.958986),
            "bellas artes": (29.081607, -110.958986),
            "musica": (29.081607, -110.958986),
            "teatro": (29.081607, -110.958986),
            "arquitectura": (29.081607, -110.958986),
            "diseño": (29.081607, -110.958986),

            # Letras
            "letras": (29.082632, -110.960454),
            "linguistica": (29.082632, -110.960454),
            "idiomas": (29.082632, -110.960454),

            # Ingeniería
            "ingenieria": (29.081694, -110.962732),
            "civil": (29.081694, -110.962732),
            "minas": (29.081694, -110.962732),
            "industrial": (29.081694, -110.962732),
            "quimica": (29.081694, -110.962732),

            # Ciencias Sociales
            "derecho": (29.084896, -110.963255),
            "economia": (29.084896, -110.963255),
            "enfermeria": (29.084896, -110.963255),
            "administrativas": (29.084896, -110.963255),
            "sociales": (29.085566, -110.965056),
            "psicologia": (29.085566, -110.965056),
            "comunicacion": (29.085566, -110.965056),
            "historia": (29.085566, -110.965056),
            "sociologia": (29.085566, -110.965056),
            "trabajo social": (29.085566, -110.965056),
            "educacion": (29.085566, -110.965056),

            # Otras áreas
            "contabilidad": (29.084019, -110.964915),
            "conta": (29.084019, -110.964915),
            "gimnasio": (29.082979, -110.964557),
            "deporte": (29.082979, -110.964557),
            "medicina": (29.081355, -110.968206),
            "biologicas": (29.081355, -110.968206),
            "salud": (29.081355, -110.968206),
        }

        logger.info("✅ RAG System inicializado correctamente")

    def load_data(self):
        """Carga datos de cafeterías desde JSON"""
        if not os.path.exists(self.data_path):
            logger.error(f"❌ Archivo {self.data_path} no encontrado")
            raise FileNotFoundError(f"No se encontró {self.data_path}")

        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

        logger.info(f"📂 Datos cargados: {len(self.data.get('tienditas', []))} cafeterías")

    def _load_models(self):
        """Carga los modelos de ML (lazy loading para optimizar memoria)"""
        if self.embedding_model is None:
            logger.info("📥 Cargando modelo de embeddings...")
            self.embedding_model = SentenceTransformer(
                'sentence-transformers/all-MiniLM-L6-v2',
                device='cpu'
            )
            logger.info("✅ Modelo de embeddings listo")

        if self.llm_pipeline is None:
            logger.info("📥 Cargando LLM (esto puede tardar 1-2 minutos)...")
            model_id = "Qwen/Qwen2.5-14B-Instruct"

            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float16,
                device_map="auto",
                low_cpu_mem_usage=True
            )

            self.llm_pipeline = pipeline(
                "text-generation",
                model=model,
                tokenizer=self.tokenizer
            )
            logger.info(f"✅ LLM cargado en: {model.device}")

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """Calcula distancia en metros entre dos coordenadas (Haversine)"""
        if not all([lat1, lon1, lat2, lon2]):
            return 99999

        R = 6371000  # Radio de la Tierra en metros
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

    def get_coords_from_query(self, query: str) -> Tuple[Optional[float], Optional[float]]:
        """Extrae coordenadas de referencias geográficas en la consulta"""
        query_lower = query.lower()

        # Ignorar campus externos
        if any(x in query_lower for x in ['caborca', 'navojoa', 'nogales', 'cajeme', 'santa ana']):
            return None, None

        # Buscar coincidencias
        for place, coords in self.known_locations.items():
            if place in query_lower:
                logger.info(f"📍 Ubicación detectada: '{place}' -> {coords}")
                return coords

        return None, None

    def build_index(self, ref_lat: Optional[float] = None, ref_lon: Optional[float] = None):
        """Construye el índice FAISS con documentos enriquecidos"""
        if not self.data:
            self.load_data()

        self._load_models()

        self.documents = []

        # Agrupar menús por cafetería
        menus_by_store = {}
        for menu in self.data.get('menus', []):
            tid = menu.get('id_tiendita')
            if tid not in menus_by_store:
                menus_by_store[tid] = []
            menus_by_store[tid].append(menu)

        tienditas = self.data.get('tienditas', [])

        # Ordenar por proximidad si hay coordenadas
        if ref_lat and ref_lon:
            for t in tienditas:
                dist = self.calculate_distance(ref_lat, ref_lon, t.get('latitud'), t.get('longitud'))
                t['distancia_temp'] = dist

            tienditas.sort(key=lambda x: x.get('distancia_temp', 9999999))
            logger.info("📍 Cafeterías ordenadas por proximidad")

        # Crear documentos enriquecidos
        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            store_menus = menus_by_store.get(tid, [])

            lines = [f"CAFETERÍA: {tienda.get('nombre', 'Desconocida')}"]
            lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            # Info de proximidad semántica
            if 'distancia_temp' in tienda:
                dist = tienda['distancia_temp']
                if dist < 60:
                    lines.append(f"DISTANCIA: MUY CERCA - En tu misma zona ({dist:.0f}m)")
                elif dist < 250:
                    lines.append(f"DISTANCIA: A {dist:.0f} metros caminando")
                elif dist < 1500:
                    lines.append(f"DISTANCIA: A {dist:.0f} metros")

            # Horarios
            if tienda.get('hora_apertura'):
                ha = str(tienda['hora_apertura'])[:5]
                hc = str(tienda['hora_cierre'])[:5]
                lines.append(f"HORARIO: {ha} - {hc}")

            # Menú
            lines.append("\nMENÚ:")
            if not store_menus:
                lines.append("(Sin información de menú)")
            else:
                for m in store_menus[:50]:  # Límite para no saturar
                    try:
                        precio = float(m['precio'])
                        categoria = m.get('categoria', '')
                        cat_tag = f"[{categoria}] " if categoria else ""
                        lines.append(f" - {cat_tag}{m['nombre']}: ${precio:.2f}")
                    except:
                        pass

            full_doc = "\n".join(lines)
            self.documents.append(full_doc)

        logger.info(f"📝 Creados {len(self.documents)} documentos")

        # Crear índice FAISS
        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)
        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))

        logger.info("✅ Índice FAISS construido")

    def _retrieve_context(self, query: str, k: int = 8) -> List[str]:
        """Recupera los k documentos más relevantes"""
        if not self.faiss_index:
            raise ValueError("El índice no ha sido construido")

        q_emb = self.embedding_model.encode([query])
        D, I = self.faiss_index.search(np.array(q_emb).astype('float32'), k)

        return [self.documents[i] for i in I[0]]

    def query(self, question: str, user_lat=None, user_lon=None) -> Dict:
        """
        Procesa una consulta y devuelve una respuesta inteligente.

        Args:
            question: Pregunta del usuario
            user_lat: Latitud del usuario (opcional)
            user_lon: Longitud del usuario (opcional)

        Returns:
            Dict con 'answer' y 'context'
        """
        logger.info(f"💬 Consulta: {question[:50]}...")

        # 1. Detectar presupuesto
        budget_match = re.search(r'(\d+)\s*(pesos|mxn|\$)', question.lower())
        budget_val = float(budget_match.group(1)) if budget_match else None

        # 2. Detectar ubicación en la consulta
        target_lat, target_lon = user_lat, user_lon
        if not target_lat:
            target_lat, target_lon = self.get_coords_from_query(question)

        # 3. Reconstruir índice si cambió la ubicación
        if target_lat and target_lon:
            if (target_lat != self.current_user_lat or target_lon != self.current_user_lon):
                self.build_index(target_lat, target_lon)
                self.current_user_lat = target_lat
                self.current_user_lon = target_lon
        elif not self.faiss_index:
            self.build_index()

        # 4. Cargar modelos
        self._load_models()

        # 5. Recuperar contexto relevante
        context_docs = self._retrieve_context(question, k=10)
        context_str = "\n\n".join(context_docs)

        # 6. Construir historial conversacional
        history_str = ""
        for q, a in self.chat_history[-2:]:  # Últimas 2 interacciones
            history_str += f"Usuario: {q}\nBúho: {a}\n---\n"

        # 7. Instrucción de presupuesto
        budget_instruction = ""
        if budget_val:
            budget_instruction = f"\n⚠️ IMPORTANTE: El usuario tiene ${budget_val} pesos. Solo menciona platillos que pueda comprar."

        # 8. Construir prompt optimizado
        prompt = f"""<|im_start|>system
Eres El Buhito, asistente experto en cafeterías UNISON (Campus Hermosillo).

CONTEXTO PREVIO:
{history_str if history_str else "(Primera interacción)"}

REGLAS ESTRICTAS:
1. Usa SOLO la información provista abajo.{budget_instruction}
2. Si mencionas "ESTÁ EN TU MISMA ZONA", explica que la cafetería está muy cerca del usuario.
3. Copia nombres de platillos EXACTAMENTE como aparecen.
4. Siempre menciona el nombre de la cafetería junto al precio.
5. Sé breve y natural (máximo 3-4 oraciones).
6. Si preguntan por algo que no existe, di "No encontré eso, ¿te interesa otra cosa?".
7. Si la pregunta no es sobre comida, responde amablemente que solo ayudas con cafeterías.

<|im_start|>user
INFORMACIÓN:
{context_str}

Pregunta: {question}<|im_end|>
<|im_start|>assistant
"""

        # 9. Generar respuesta
        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=200,  # Respuestas más cortas
            return_full_text=False,
            temperature=0.3,  # Más determinista
            top_p=0.85,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )

        answer = outputs[0]['generated_text'].strip()

        # 10. Limpieza de respuesta
        for tag in ["<|im_end|>", "<|im_start|>", "assistant", "user", "system"]:
            answer = answer.replace(tag, "")

        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\[[\d,\s]+\]', '', answer)
        answer = re.sub(r'\s+', ' ', answer).strip()

        # Limitar longitud
        sentences = answer.split('.')
        if len(sentences) > 4:
            answer = '. '.join(sentences[:4]) + '.'

        # 11. Guardar en memoria
        self.chat_history.append((question, answer))
        if len(self.chat_history) > 10:  # Límite de memoria
            self.chat_history = self.chat_history[-10:]

        logger.info(f"✅ Respuesta generada ({len(answer)} caracteres)")

        return {
            'answer': answer,
            'context': context_docs,
            'budget_detected': budget_val,
            'location_used': bool(target_lat and target_lon)
        }

    def reset_conversation(self):
        """Reinicia el historial conversacional"""
        self.chat_history = []
        logger.info("🔄 Historial de conversación reiniciado")


# ========================================
# PRUEBAS EN CONSOLA (OPCIONAL)
# ========================================
if __name__ == "__main__":
    print("="*70)
    print("🦉 EL BÚHO TRAGÓN - MODO PRODUCCIÓN")
    print("="*70)

    rag = BuhoRAG()
    rag.load_data()
    rag.build_index()

    print("\n✅ Sistema listo. Escribe 'salir' para terminar.\n")

    while True:
        try:
            user_input = input("🗣️  Tú: ")
            if user_input.lower() in ['salir', 'exit', 'quit']:
                break

            if not user_input.strip():
                continue

            print("🦉 Pensando...")
            result = rag.query(user_input)
            print(f"🦉 Buhito: {result['answer']}\n")

        except KeyboardInterrupt:
            print("\n👋 ¡Hasta pronto!")
            break
        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"❌ Error: {e}\n")