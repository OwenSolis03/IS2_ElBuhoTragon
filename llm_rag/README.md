# 🦉 El Búho Tragón - Sistema RAG

Asistente conversacional para consultar las cafeterías del campus Hermosillo de UNISON.

## 📁 Estructura

```
llm_rag/
├── __init__.py            # Singleton thread-safe: get_rag_engine()
├── __main__.py            # Chat interactivo: python -m llm_rag
├── rag_engine_hpc.py      # Motor: modelos, índice FAISS, recuperación y generación
├── catalog.py             # Fragmentos indexados, búsqueda léxica y render del contexto
├── rag_utils.py           # Lugares del campus, presupuesto, intención, horarios, formato
├── rag_data_fixed.json    # Datos de cafeterías (exportados de la BD)
├── data_utils/            # Scripts auxiliares de datos
├── tests/                 # Pruebas de la lógica determinista (pytest)
└── requirements.txt
```

## ⚙️ Cómo responde una pregunta

1. **Reformulación**: si hay historial, el LLM reescribe la pregunta para que sea independiente
   ("¿y en Derecho?" → "¿Dónde venden molletes en Derecho?").
2. **Análisis determinista** (sin LLM): presupuesto (`$50`, `tengo 80`, `menos de 60`),
   intención (`barato`, `cerca`), ubicación (alias del campus con fuzzy matching, o el GPS
   del navegador **solo si el usuario está en el campus**) y hora actual de Hermosillo.
3. **Recuperación híbrida**:
   - Semántica: FAISS (coseno) sobre fragmentos de ≤6 platillos por categoría + una ficha por cafetería.
   - Léxica: coincidencia de nombres de platillos/cafeterías ("molletes" → fragmentos con "Mollete").
   - Re-ranking con un Cross-Encoder multilingüe, bono a coincidencias léxicas y penalización
     por distancia cuando se pide algo "cerca".
4. **Contexto calculado por código**: horario con `ABIERTA AHORA`/`CERRADA AHORA`, distancia en
   metros, platillos filtrados por presupuesto y bloques de "más cercanas" / "más baratas".
5. **Generación** con Qwen2.5-14B-Instruct (plantilla de chat oficial, decodificación greedy) y
   limpieza del formato para el ChatWidget.

El motor **no guarda estado de conversación**: el historial lo manda el cliente en cada consulta,
así que una sola instancia atiende a todos los usuarios sin mezclar conversaciones. Las consultas
se serializan con un lock (un solo GPU / un solo modelo).

## 🚀 Uso

```bash
# Desde la raíz del repo
pip install -r llm_rag/requirements.txt

python -m llm_rag --debug                              # chat interactivo, muestra el contexto
python -m llm_rag --lat 29.0848 --lon -110.9632        # simulando estar en Derecho
python -m pytest llm_rag/tests                         # pruebas (no cargan modelos)
```

En código:

```python
from llm_rag import get_rag_engine

rag = get_rag_engine()   # carga datos, modelos e índice una sola vez
result = rag.query("¿Dónde venden molletes baratos?", user_lat=29.0848, user_lon=-110.9632,
                   history=[("¿Qué hay en Artes?", "En Cafeteria Artes hay...")])
result["answer"]            # texto para el usuario
result["context"]           # fragmentos que vio el LLM
result["budget_detected"]   # 50.0 | None
result["location_used"]     # "DERECHO" | "tu ubicación actual (GPS)" | None
result["search_query"]      # pregunta reformulada
```

Django lo usa en `backend/apps/cafeteria/views.py` (`POST /api/chatbot/`). Para evitar que la
primera petición tarde minutos, precarga todo antes de levantar el servidor:

```bash
cd backend
python manage.py warmup_rag
python manage.py runserver
```

## 🔧 Configuración

Variables de entorno opcionales:

| Variable | Default | Uso |
|---|---|---|
| `BUHO_LLM_MODEL` | `Qwen/Qwen2.5-14B-Instruct` | Usa `Qwen/Qwen2.5-3B-Instruct` para probar con poca memoria |
| `BUHO_EMBEDDING_MODEL` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Embeddings |
| `BUHO_RERANKER_MODEL` | `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | Re-ranker multilingüe (vacío = sin re-ranking) |

El índice FAISS se guarda en `llm_rag/.cache/` y se invalida solo cuando cambia el contenido
indexado, el modelo de embeddings o `CACHE_VERSION`.

## 🔄 Actualizar datos

```bash
cd backend
python export_for_rag.py                       # genera rag_data.json
cp rag_data.json ../llm_rag/rag_data_fixed.json
# reiniciar Django: el índice se reconstruye automáticamente
```

## 🌐 Despliegue (clúster Yuca, ACARUS)

| Métrica | Valor |
|---|---|
| Hardware | AMD Instinct MI210 (64 GB VRAM, ROCm) |
| Modelo | Qwen2.5-14B-Instruct float16 (~28 GB) |
| Primera carga | varios minutos (descarga + carga en VRAM) |
| Consulta | ~2-6 s (+1 llamada corta al LLM si hay historial) |

```bash
# Túnel al backend corriendo en Yuca
ssh -L 8000:localhost:8000 <usuario>@<host-de-yuca>
```

## 🐛 Troubleshooting

- **`/api/chatbot/` responde 503**: el import de `llm_rag` falló; el motivo aparece en el log
  (`RAG no disponible: ...`). Normalmente falta una dependencia de `requirements.txt`.
- **Out of memory**: usa `BUHO_LLM_MODEL=Qwen/Qwen2.5-3B-Instruct`.
- **Respuestas sin datos de distancia**: el GPS del navegador está fuera del campus (se ignora)
  y la pregunta no menciona ningún lugar conocido (ver `KNOWN_LOCATIONS` en `rag_utils.py`).
- **429 en el chat**: límite de 15 consultas/minuto por usuario (`ChatbotRateThrottle`).
