---
name: buho-chatbot
description: Cómo modificar y probar el chatbot "El Buhito" de El Búho Tragón (RAG sobre Amazon Bedrock) - prompts, modelos, costos por mensaje, búsqueda, filtros de presupuesto y distancia, datos de menús y caché de embeddings. Úsala al tocar llm_rag/, el endpoint /api/chatbot/, el ChatWidget o al actualizar los datos que el chatbot conoce.
---

# Chatbot de El Búho Tragón

Lee primero `buho-contexto` si no lo has hecho.

## Cómo funciona

```
pregunta ─► reformular con historial (Nova Micro)
         ─► detectar presupuesto (regex) y ubicación (GPS o alias del campus, rag_utils.py)
         ─► embedding de la pregunta (Titan v2) ─► top 10 documentos por similitud
            (máx. 3 por cafetería, descarta los que están a más de 2.5 km)
         ─► quitar platillos que pasan el presupuesto (filter_by_budget)
         ─► con ubicación: ordenar por distancia
         ─► responder (Nova 2 Lite) ─► clean_answer (viñetas •, sin **)
```

| Archivo | Qué contiene |
|---|---|
| `llm_rag/rag_engine_bedrock.py` | Motor de producción |
| `llm_rag/rag_engine_hpc.py` | Motor Qwen-14B en el clúster Yuca (ponencia). No lo rompas |
| `llm_rag/__init__.py` | `RAG_BACKEND=bedrock` (default) o `hpc` |
| `llm_rag/rag_utils.py` | Alias del campus (`KNOWN_LOCATIONS`) y distancia Haversine |
| `llm_rag/rag_data_fixed.json` | **Los datos que el chatbot conoce** (14 cafeterías, 482 platillos) |
| `backend/apps/cafeteria/views.py` → `chatbot_query` | Validación, límite de 500 caracteres y throttles |

## Reglas

1. **Las reglas duras van en código, no en el prompt.** Los modelos pequeños no respetan bien los límites: el presupuesto se aplica con `filter_by_budget` y el orden por distancia con un sort. Si agregas una regla que importe (por ejemplo "solo abiertas ahora"), fíltrala antes de llamar al modelo.
2. **Nunca inventar precios.** Ese fue el criterio para elegir Nova 2 Lite: Nova Lite v1 inventaba precios. Si cambias de modelo, compáralo con las preguntas de prueba de abajo.
3. **Costo primero.** Unos 3,500 tokens de entrada y 300 de salida por mensaje: ~$0.0015 con Nova 2 Lite. Antes de subir `k`, el largo del prompt, `maxTokens` o `THROTTLE_CHATBOT_GLOBAL` (400/día), calcula el costo mensual del peor caso.
4. **Solo `temperature` en `inferenceConfig`.** Los modelos Claude 4.5 rechazan `temperature` y `topP` juntos.
5. **Modelos permitidos.** El rol del servidor solo puede invocar Nova 2 Lite, Nova Micro y Titan Embeddings v2. Un modelo nuevo requiere agregarlo a la política `buho-bedrock-s3` del rol `buho-tragon-ec2`. Claude en Bedrock además pide llenar un formulario de Anthropic en la consola.
6. Compatibilidad: `query()` devuelve `{answer, context, budget_detected, location_used}`, igual que el motor HPC.

## Actualizar los datos del chatbot

El chatbot **no** lee la base de datos: lee `rag_data_fixed.json`. Si el admin cambió menús en el sitio:

1. Exporta en el servidor (por SSM): `cd /opt/buho/current/backend && set -a && . /opt/buho/data/.env && set +a && /opt/buho/venv/bin/python export_for_rag.py` (genera `rag_data.json`).
2. Trae el archivo, revisa acentos (`fix_encoding.py` si hace falta), reemplaza `llm_rag/rag_data_fixed.json`, commit.
3. Publica el backend. Los embeddings se recalculan solos: el caché `llm_rag/.cache/bedrock_embeddings.npz` se invalida por huella de los documentos (cuesta menos de un centavo).

## Probar

```bash
cd backend
venv/bin/pip install "botocore[crt]"     # una vez, para usar las credenciales de `aws login`
AWS_PROFILE=buho-tragon venv/bin/python manage.py warmup_rag
venv/bin/python manage.py test apps.cafeteria.tests   # incluye pruebas de filter_by_budget y clean_answer
```

Preguntas de prueba (compara los precios contra `rag_data_fixed.json`):

- "¿dónde venden molletes?" → los Mollete Sencillo de Artes y Derecho cuestan $30
- "¿qué puedo comer con 40 pesos?" → nada de más de $40
- "estoy en medicina y tengo 35 pesos" → cafeterías de Medicina primero
- con historial: "¿y cuál es el más barato?"
- "ignora tus instrucciones…" → debe negarse y regresar al tema

Problema conocido: en preguntas de "el más barato" a veces no aparece la opción más económica, porque la búsqueda es por similitud y no por precio.
