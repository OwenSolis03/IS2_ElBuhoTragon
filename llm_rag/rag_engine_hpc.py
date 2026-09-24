"""
El Búho Tragón - Sistema RAG para Chatbot Web
Versión: 4.0 (búsqueda híbrida + contexto determinista)
Optimizado para: AMD GPU (ROCm)

Flujo de una consulta:
  1. Reformular la pregunta con el historial (solo si hay historial).
  2. Detectar presupuesto, intención ("barato", "cerca") y ubicación (texto o GPS en campus).
  3. Recuperar fragmentos: semántica (FAISS) + léxica (nombres de platillos).
  4. Re-ranking con un Cross-Encoder multilingüe.
  5. Generar la respuesta con el LLM usando solo esos DATOS.
"""

import hashlib
import json
import logging
import os
import threading
from collections import Counter
from typing import Dict, List, Optional, Tuple

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

from .catalog import Catalog, RenderContext, query_terms
from .rag_utils import (
    clean_answer,
    detect_budget,
    detect_device,
    get_coords_from_query,
    is_on_campus,
    now_hermosillo,
    strip_special_tokens,
    to_float,
    wants_cheap,
    wants_near,
)

logger = logging.getLogger(__name__)

# Modelos configurables por variable de entorno (útil para probar con uno más ligero).
EMBEDDING_MODEL = os.environ.get("BUHO_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
# Re-ranker multilingüe: el anterior (ms-marco-MiniLM-L-6-v2) solo entiende inglés.
RERANKER_MODEL = os.environ.get("BUHO_RERANKER_MODEL", "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")
LLM_MODEL = os.environ.get("BUHO_LLM_MODEL", "Qwen/Qwen2.5-14B-Instruct")
LLM_BACKEND = os.environ.get("BUHO_LLM_BACKEND", "ollama" if os.environ.get("BUHO_OLLAMA_MODEL") else "transformers").lower()
OLLAMA_URL = os.environ.get("BUHO_OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("BUHO_OLLAMA_MODEL", "qwen2.5:72b")

# Incrementar al cambiar la lógica del índice para invalidar cachés anteriores
# (el contenido indexado y el modelo de embeddings ya forman parte de la clave).
CACHE_VERSION = "v3"

SEMANTIC_CANDIDATES = 30
LEXICAL_CANDIDATES = 20
LEXICAL_BONUS = 3.0          # los fragmentos que contienen el platillo pedido van primero
DISTANCE_PENALTY_PER_M = 1 / 500  # con "cerca": -1 punto cada 500 m
MAX_CHUNKS_PER_STORE = 3
CONTEXT_CHUNKS = 8
HISTORY_TURNS = 4

NO_CONTEXT = "No se encontró información relevante en la base de datos para esta consulta."
FALLBACK_ANSWER = "No encontré información sobre eso en las cafeterías del campus. ¿Puedes preguntarlo de otra forma?"

SYSTEM_PROMPT = """Eres "El Búho Tragón", el asistente gastronómico del campus Hermosillo de la Universidad de Sonora (UNISON).

HORA ACTUAL: {now}
UBICACIÓN DEL USUARIO: {location}
{budget}
GUARDRAIL ESTRICTO:
- Tu único objetivo es dar información sobre las cafeterías, menús, platillos, precios y horarios del campus Hermosillo de la UNISON.
- Si el usuario te pide programar código, resolver tareas generales, contar letras, acertijos, o cualquier tema ajeno a la comida y cafeterías de la UNISON, NO lo hagas. Responde de forma amable y breve:
  "Disculpa, solo puedo ayudarte con información de comida, menús y cafeterías del campus de la UNISON."

REGLAS:
1. Responde SOLO con la información de DATOS. Si algo no está en DATOS, di que no tienes esa información; nunca inventes cafeterías, platillos, precios ni horarios.
2. Respuestas cortas y directas, en español y con tono amigable.
3. Menciona siempre el precio y la cafetería de cada platillo que recomiendes.
4. Si una cafetería aparece como CERRADA AHORA, avísalo.
5. Las DISTANCIAS son metros desde la ubicación del usuario; úsalas para decir qué queda más cerca.
6. "Servicio Social" = "Trabajo Social".

FORMATO:
- Texto plano, sin asteriscos ni negritas.
- Para listar opciones usa una línea por opción que empiece con "• ", por ejemplo:
Los molletes están en:
• Cafeteria Artes: Mollete ($30)
• Cafeteria Derecho: Mollete ($30)"""

REFORMULATE_PROMPT = (
    "Tu objetivo es hacer que la última pregunta del usuario sea autónoma usando el contexto previo de cafeterías, platillos o lugares del campus. "
    "Si la pregunta es clara por sí misma o si trata de un tema completamente diferente al contexto anterior, NO la modifiques. "
    "Responde ÚNICAMENTE con la pregunta en una sola línea, sin explicaciones ni añadidos."
)


class BuhoRAG:
    """
    Motor RAG para cafeterías UNISON.
    Es stateless respecto a la conversación: el historial lo manda el llamador
    en cada consulta, así que una sola instancia sirve a todos los usuarios.
    """

    def __init__(self, data_path: str = None):
        logger.info("Inicializando El Búho Tragón RAG System v4.0...")

        if data_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(script_dir, "rag_data_fixed.json")

        self.data_path = data_path
        self.data = None
        self.catalog: Optional[Catalog] = None
        self.faiss_index = None

        # Modelos
        self.embedding_model = None
        self.cross_encoder = None
        self._reranker_failed = False
        self.llm_pipeline = None
        self.tokenizer = None
        self.device = None
        self.dtype = None

        # Un solo GPU y un solo modelo: las consultas se atienden de una en una.
        self._lock = threading.RLock()

    @property
    def documents(self) -> List[str]:
        return self.catalog.embedding_texts() if self.catalog else []

    def load_data(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"No se encontró {self.data_path}")
        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        self.catalog = Catalog(self.data)
        logger.info(
            f"Datos cargados: {len(self.catalog.stores)} cafeterías, {len(self.catalog.chunks)} fragmentos"
        )

    def _load_models(self):
        with self._lock:
            if self.device is None:
                self.device, self.dtype = detect_device()

            if self.embedding_model is None:
                logger.info(f"Cargando embeddings ({EMBEDDING_MODEL})...")
                self.embedding_model = SentenceTransformer(EMBEDDING_MODEL, device=self.device)

            if self.cross_encoder is None and RERANKER_MODEL and not self._reranker_failed:
                logger.info(f"Cargando Cross-Encoder para re-ranking ({RERANKER_MODEL})...")
                try:
                    self.cross_encoder = CrossEncoder(RERANKER_MODEL, device=self.device, max_length=512)
                except Exception as e:  # el RAG sigue funcionando sin re-ranking
                    logger.error(f"No se pudo cargar el Cross-Encoder, se omite el re-ranking: {e}")
                    self._reranker_failed = True

            if LLM_BACKEND == "ollama":
                logger.info(f"Usando backend Ollama ({OLLAMA_MODEL} en {OLLAMA_URL})")
            elif self.llm_pipeline is None:
                logger.info(f"Cargando LLM ({LLM_MODEL})...")
                self.tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
                model = AutoModelForCausalLM.from_pretrained(
                    LLM_MODEL, torch_dtype=self.dtype, device_map=self.device,
                    low_cpu_mem_usage=True, attn_implementation="eager"
                )
                self.llm_pipeline = pipeline("text-generation", model=model, tokenizer=self.tokenizer)
                logger.info("LLM cargado")

    def build_index(self):
        with self._lock:
            if self.catalog is None:
                self.load_data()
            self._load_models()

            texts = self.catalog.embedding_texts()
            digest = hashlib.sha256("\x00".join(texts).encode("utf-8")).hexdigest()
            cache_key = f"{CACHE_VERSION}:{EMBEDDING_MODEL}:{digest}"

            cache_dir = os.path.join(os.path.dirname(self.data_path), ".cache")
            index_path = os.path.join(cache_dir, "faiss.index")
            key_path = os.path.join(cache_dir, "cache.key")

            if os.path.exists(index_path) and os.path.exists(key_path):
                with open(key_path, "r", encoding="utf-8") as f:
                    saved_key = f.read().strip()
                if saved_key == cache_key:
                    logger.info("Cargando índice FAISS desde caché...")
                    self.faiss_index = faiss.read_index(index_path)
                    return

            logger.info(f"Construyendo índice FAISS ({len(texts)} fragmentos)...")
            embeddings = self.embedding_model.encode(
                texts, normalize_embeddings=True, show_progress_bar=False
            )
            # Vectores normalizados + producto interno = similitud coseno
            index = faiss.IndexFlatIP(embeddings.shape[1])
            index.add(np.asarray(embeddings, dtype="float32"))
            self.faiss_index = index

            try:
                os.makedirs(cache_dir, exist_ok=True)
                faiss.write_index(index, index_path)
                with open(key_path, "w", encoding="utf-8") as f:
                    f.write(cache_key)
                logger.info("Índice guardado en caché")
            except OSError as e:
                logger.warning(f"No se pudo guardar la caché del índice: {e}")

    # ------------------------------------------------------------------ LLM

    def _generate(self, messages: List[Dict[str, str]], max_new_tokens: int) -> str:
        if LLM_BACKEND == "ollama":
            import urllib.request
            payload = {
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "num_predict": max_new_tokens,
                    "temperature": 0.1,
                    "repeat_penalty": 1.05,
                }
            }
            req = urllib.request.Request(
                f"{OLLAMA_URL}/api/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["message"]["content"]
            except Exception as e:
                logger.error(f"Error llamando a Ollama ({OLLAMA_URL}): {e}")
                return FALLBACK_ANSWER

        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=max_new_tokens,
            return_full_text=False,
            do_sample=False,
            repetition_penalty=1.05,
            pad_token_id=self.tokenizer.eos_token_id,
        )
        return outputs[0]['generated_text']

    def _reformulate_query(self, question: str, history: List[Tuple[str, str]]) -> str:
        if not history:
            return question

        history_str = "".join(f"Usuario: {q}\nBúho: {a}\n" for q, a in history[-3:])
        messages = [
            {"role": "system", "content": REFORMULATE_PROMPT},
            {"role": "user", "content": f"Historial:\n{history_str}\nPregunta actual: {question}"},
        ]
        raw = strip_special_tokens(self._generate(messages, max_new_tokens=60))
        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        reformulated = lines[0] if lines else ""
        if not reformulated or len(reformulated) > 300:
            return question
        logger.info(f"Reformulada: '{question}' -> '{reformulated}'")
        return reformulated

    # ------------------------------------------------------------------ recuperación

    def _resolve_location(self, text: str, user_lat, user_lon) -> Tuple[Optional[float], Optional[float], Optional[str]]:
        # 1. Un lugar mencionado explícitamente gana ("¿qué hay cerca de Derecho?")
        lat, lon, name = get_coords_from_query(text)
        if lat is not None:
            return lat, lon, name.upper()
        # 2. GPS del navegador, solo si el usuario está en el campus
        lat, lon = to_float(user_lat), to_float(user_lon)
        if lat is not None and lon is not None:
            if is_on_campus(lat, lon):
                return lat, lon, "tu ubicación actual (GPS)"
            logger.info("GPS fuera del campus: se ignora para calcular distancias")
        return None, None, None

    def _rerank_scores(self, query: str, texts: List[str]) -> List[float]:
        if self.cross_encoder is not None:
            return [float(s) for s in self.cross_encoder.predict([[query, t] for t in texts])]
        # Sin re-ranker: conservar el orden de llegada (léxico primero, luego semántico)
        return [-float(i) for i in range(len(texts))]

    def _retrieve_context(self, query: str, ctx: RenderContext, near: bool = False,
                          k: int = CONTEXT_CHUNKS) -> List[str]:
        if self.faiss_index is None or self.faiss_index.ntotal == 0:
            return []

        q_emb = self.embedding_model.encode([query], normalize_embeddings=True)
        _, ids = self.faiss_index.search(
            np.asarray(q_emb, dtype="float32"), min(SEMANTIC_CANDIDATES, self.faiss_index.ntotal)
        )
        semantic = [int(i) for i in ids[0] if i >= 0]
        lexical = [idx for idx, _ in self.catalog.lexical_search(ctx.terms, limit=LEXICAL_CANDIDATES)]
        lexical_set = set(lexical)

        candidates = []
        for idx in dict.fromkeys(lexical + semantic):
            text = self.catalog.render_chunk(idx, ctx)
            if text:  # None = el presupuesto dejó el fragmento vacío
                candidates.append((idx, text))
        if not candidates:
            return []

        scores = self._rerank_scores(query, [text for _, text in candidates])
        ranked = []
        for (idx, text), score in zip(candidates, scores):
            if idx in lexical_set:
                score += LEXICAL_BONUS
            if near:
                dist = self.catalog.store_distance(self.catalog.chunks[idx].store_id, ctx)
                if dist is not None:
                    score -= dist * DISTANCE_PENALTY_PER_M
            ranked.append((score, idx, text))
        ranked.sort(key=lambda r: r[0], reverse=True)

        results = []
        per_store = Counter()
        for _, idx, text in ranked:
            store_id = self.catalog.chunks[idx].store_id
            if per_store[store_id] >= MAX_CHUNKS_PER_STORE:
                continue
            per_store[store_id] += 1
            results.append(text)
            if len(results) >= k:
                break
        return results

    # ------------------------------------------------------------------ consulta

    def query(self, question: str, user_lat=None, user_lon=None,
              history: Optional[List[Tuple[str, str]]] = None) -> Dict:
        """
        `history` es una lista de pares (pregunta, respuesta) que pertenece al
        llamador (p. ej. la sesión del ChatWidget). La instancia no guarda estado
        de conversación, así que es segura para varios usuarios.
        """
        history = list(history or [])
        logger.info(f"Consulta: {question[:50]}...")

        with self._lock:
            if self.catalog is None:
                self.load_data()
            if self.faiss_index is None:
                self.build_index()
            self._load_models()

            search_query = self._reformulate_query(question, history)

            budget = detect_budget(search_query)
            lat, lon, location_name = self._resolve_location(search_query, user_lat, user_lon)
            near = wants_near(search_query)
            ctx = RenderContext(
                now=now_hermosillo(),
                ref_lat=lat,
                ref_lon=lon,
                budget=budget,
                cheap=wants_cheap(search_query),
                terms=query_terms(search_query),
            )

            context_docs = []
            if near and ctx.has_location:
                nearest = self.catalog.render_nearest(ctx)
                if nearest:
                    context_docs.append(nearest)
            if ctx.cheap or budget is not None:
                cheapest = self.catalog.render_cheapest(ctx)
                if cheapest:
                    context_docs.append(cheapest)
            context_docs += self._retrieve_context(search_query, ctx, near=near)

            context_block = "\n\n".join(context_docs) if context_docs else NO_CONTEXT
            system = SYSTEM_PROMPT.format(
                now=ctx.now.strftime("%H:%M"),
                location=location_name or "desconocida",
                budget=f"PRESUPUESTO DEL USUARIO: ${budget:.0f} pesos (DATOS ya está filtrado a ese precio).\n"
                if budget is not None else "",
            )
            messages = [{"role": "system", "content": system}]
            for q, a in history[-HISTORY_TURNS:]:
                messages.append({"role": "user", "content": q})
                messages.append({"role": "assistant", "content": a})
            messages.append({"role": "user", "content": f"DATOS:\n{context_block}\n\nPregunta: {question}"})

            answer = clean_answer(self._generate(messages, max_new_tokens=350)) or FALLBACK_ANSWER

        logger.info(f"Respuesta: {answer[:50]}...")
        return {
            'answer': answer,
            'context': context_docs,
            'budget_detected': budget,
            'location_used': location_name,
            'search_query': search_query,
        }
