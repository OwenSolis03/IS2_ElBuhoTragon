"""
🦉 El Búho Tragón - Sistema RAG para Chatbot Web
Versión: 3.0 (Producción - Alias + Distancias + Contexto)
Optimizado para: AMD GPU (ROCm)
"""

import json
import logging
import os
import re
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional, Tuple

import faiss
import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

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
        logger.info("🦉 Inicializando El Búho Tragón RAG System v3.0...")

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
        self.llm_pipeline = None
        self.tokenizer = None
        self.device = None

        # Cache de ubicación
        self.current_user_lat = None
        self.current_user_lon = None

        # 📍 MAPA MENTAL DEL CAMPUS (Con Alias Estudiantiles)
        self.known_locations = {
            # Ciencias Exactas
            "exactas": (29.081527, -110.960999),
            "matematicas": (29.081527, -110.960999),
            "mates": (29.081527, -110.960999),  # ALIAS
            "fisica": (29.081527, -110.960999),
            "geologia": (29.081527, -110.960999),
            "quimico": (29.081527, -110.960999),
            "biologicas": (29.081355, -110.968206),

            # Humanidades y Artes
            "artes": (29.081607, -110.958986),
            "bellas artes": (29.081607, -110.958986),
            "musica": (29.081607, -110.958986),
            "teatro": (29.081607, -110.958986),
            "arquitectura": (29.081607, -110.958986),
            "diseño": (29.081607, -110.958986),

            # Letras
            "letras": (29.082632, -110.960454),
            "letritas": (29.082632, -110.960454), # ALIAS
            "linguistica": (29.082632, -110.960454),
            "idiomas": (29.082632, -110.960454),
            "lenguas": (29.082632, -110.960454),

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
            "sociologia": (29.085566, -110.965056),
            "trabajo social": (29.085566, -110.965056),
            "servicio social": (29.085566, -110.965056), # ✅ ALIAS CRÍTICO
            "psicologia": (29.085566, -110.965056),
            "comunicacion": (29.085566, -110.965056),
            "historia": (29.085566, -110.965056),
            "educacion": (29.085566, -110.965056),

            # Otros
            "contabilidad": (29.084019, -110.964915),
            "conta": (29.084019, -110.964915),
            "gimnasio": (29.082979, -110.964557),
            "deporte": (29.082979, -110.964557),
            "medicina": (29.081355, -110.968206),
            "salud": (29.081355, -110.968206),
            "vicerrectoria": (29.0822, -110.9615),
            "rectoria": (29.0822, -110.9615),
            "biblioteca": (29.0833, -110.9630),
        }

        logger.info("✅ RAG System inicializado correctamente")

    def _detect_device(self):
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            backend = "ROCm" if "AMD" in device_name or "Radeon" in device_name else "CUDA"
            logger.info(f"🎮 GPU detectada: {device_name} ({backend})")
            return "cuda:0", torch.float16
        else:
            logger.warning("⚠️ Usando CPU")
            return "cpu", torch.float32

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"No se encontró {self.data_path}")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        logger.info(f"📂 Datos cargados: {len(self.data.get('tienditas', []))} cafeterías")

    def _load_models(self):
        if self.device is None:
            self.device, self.dtype = self._detect_device()

        if self.embedding_model is None:
            logger.info("📥 Cargando embeddings...")
            self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')

        if self.llm_pipeline is None:
            logger.info("📥 Cargando LLM Qwen 14B...")
            model_id = "Qwen/Qwen2.5-14B-Instruct"
            self.tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                model_id, torch_dtype=self.dtype, device_map=self.device, trust_remote_code=True,
                low_cpu_mem_usage=True, attn_implementation="eager"
            )
            self.llm_pipeline = pipeline("text-generation", model=model, tokenizer=self.tokenizer, torch_dtype=self.dtype)
            logger.info("✅ LLM cargado")

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        if not all([lat1, lon1, lat2, lon2]): return 99999
        R = 6371000
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        a = sin((lat2-lat1)/2)**2 + cos(lat1) * cos(lat2) * sin((lon2-lon1)/2)**2
        return R * (2 * atan2(sqrt(a), sqrt(1-a)))

    def get_coords_from_query(self, query: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
        query_lower = query.lower()
        if any(x in query_lower for x in ['caborca', 'navojoa', 'nogales', 'cajeme', 'santa ana']):
            return None, None, None

        for place, coords in self.known_locations.items():
            if place in query_lower:
                logger.info(f"📍 Ubicación detectada: '{place}'")
                return coords[0], coords[1], place
        return None, None, None

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
                t['distancia_temp'] = self.calculate_distance(ref_lat, ref_lon, t.get('latitud'), t.get('longitud'))
            tienditas.sort(key=lambda x: x.get('distancia_temp', 9999999))
            logger.info("📍 Cafeterías reordenadas por distancia")

        for tienda in tienditas:
            tid = tienda.get('id_tiendita')
            # Limpiar nombre (CamelCase -> Espacios)
            nombre_limpio = re.sub(r'([a-z])([A-Z])', r'\1 \2', tienda.get('nombre', 'Desconocida'))

            lines = [f"CAFETERÍA: {nombre_limpio}"]
            lines.append(f"UBICACIÓN: {tienda.get('direccion', '')}, {tienda.get('facultad_nombre', '')}")

            if 'distancia_temp' in tienda:
                dist = tienda['distancia_temp']
                lines.append(f"DISTANCIA: {dist:.0f} metros") # Formato simple para el LLM

            if tienda.get('hora_apertura'):
                lines.append(f"HORARIO: {str(tienda['hora_apertura'])[:5]} - {str(tienda['hora_cierre'])[:5]}")

            lines.append("\nMENÚ:")
            if menus_by_store.get(tid):
                for m in menus_by_store[tid][:50]:
                    try:
                        precio = float(m['precio'])
                        nombre_platillo = m['nombre'].strip().replace("\n", " ")
                        lines.append(f"- {nombre_platillo} (${precio:.0f} MXN)")
                    except: pass
            else:
                lines.append("(Sin menú disponible)")

            self.documents.append("\n".join(lines))

        embeddings = self.embedding_model.encode(self.documents, show_progress_bar=False)
        self.faiss_index = faiss.IndexFlatL2(embeddings.shape[1])
        self.faiss_index.add(np.array(embeddings).astype('float32'))
        logger.info("✅ Índice FAISS actualizado")

    def _retrieve_context(self, query: str, k: int = 8) -> List[str]:
        q_emb = self.embedding_model.encode([query])
        D, I = self.faiss_index.search(np.array(q_emb).astype('float32'), k)
        return [self.documents[i] for i in I[0]]

    def query(self, question: str, user_lat=None, user_lon=None) -> Dict:
        logger.info(f"💬 Consulta: {question[:50]}...")

        # 1. Detectar Presupuesto
        budget_match = re.search(r'(\d+)\s*(pesos|mxn|\$)', question.lower())
        budget_val = float(budget_match.group(1)) if budget_match else None

        # 2. Gestionar Ubicación (GPS vs Texto)
        target_lat, target_lon = user_lat, user_lon
        location_name = "Ubicación GPS" if user_lat else None

        if not target_lat:
            # Buscar en texto con alias
            found_lat, found_lon, found_name = self.get_coords_from_query(question)
            if found_lat:
                target_lat, target_lon = found_lat, found_lon
                location_name = found_name.upper() # Ej: "SERVICIO SOCIAL"

        # 3. Actualizar Índice si es necesario
        if not self.faiss_index: self.build_index()

        if target_lat and target_lon:
            # Reconstruir solo si nos movimos significativamente o es la primera vez con ubicación
            should_rebuild = False
            if self.current_user_lat is None: should_rebuild = True
            elif target_lat != self.current_user_lat or target_lon != self.current_user_lon: should_rebuild = True

            if should_rebuild:
                logger.info(f"📍 Moviendo referencia a: {location_name}")
                self.build_index(target_lat, target_lon)
                self.current_user_lat = target_lat
                self.current_user_lon = target_lon

        # 4. Generar Respuesta
        self._load_models()
        context_docs = self._retrieve_context(question, k=10)

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

INSTRUCCIONES DE UBICACIÓN:
{loc_ctx if location_name else "Ubicación desconocida."}
Si preguntan "¿Qué tan lejos?", lee el campo "DISTANCIA" de la cafetería destino.
"Servicio Social" = "Trabajo Social".

INSTRUCCIONES DE FORMATO (ESTRICTO):
1. NO uses negritas (asteriscos **). Escribe solo texto plano.
2. Cuando menciones varias opciones (cafeterías o platillos), usa SIEMPRE una lista vertical con viñetas.
3. Coloca cada opción en una línea nueva. NO escribas todo en un solo párrafo.

INSTRUCCIONES DE RESPUESTA:
1. Sé conciso y natural.
2. Si el usuario pide "algo más barato", busca en el menú precios menores a lo anterior.
{f"3. PRESUPUESTO USUARIO: ${budget_val} pesos." if budget_val else ""}

<|im_end|>
<|im_start|>user
HISTORIAL RECIENTE:
{history_str}

INFORMACIÓN DISPONIBLE:
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

        # --- NUEVA LIMPIEZA DE FORMATO ---
        # 1. Eliminar asteriscos de negritas
        answer = answer.replace("**", "").replace("__", "")

        # Si el modelo escribe ": -", forzamos un salto de línea ahí
        answer = answer.replace(": -", ":\n-")

        # Si el modelo escribe " - " (espacio guion espacio), lo convertimos en salto de línea + guion
        # Esto separa los elementos que están pegados
        answer = answer.replace(" - ", "\n- ")

        # Limpieza final de espacios extra y etiquetas
        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE).strip()

        self.chat_history.append((question, answer))
        if len(self.chat_history) > 10: self.chat_history = self.chat_history[-10:]

        logger.info(f"✅ Respuesta: {answer[:50]}...")
        return {'answer': answer, 'context': context_docs}

    def reset_conversation(self):
        self.chat_history = []
        logger.info("🔄 Reset")