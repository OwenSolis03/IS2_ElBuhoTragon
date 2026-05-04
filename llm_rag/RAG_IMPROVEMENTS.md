# Propuestas de Mejora para el Motor RAG (El Búho Tragón)

Este documento detalla las propuestas arquitectónicas y de rendimiento para optimizar el motor RAG actual (`rag_engine.py` y `rag_engine_hpc.py`).

## 1. Desacoplamiento de Contexto Estático y Dinámico (Crítico)

**Problema Actual:**
El sistema actual recalcula la distancia del usuario a las cafeterías, modifica el texto del documento para incluir la cadena `DISTANCIA: X metros` y **vuelve a generar los embeddings de todos los documentos para reconstruir el índice FAISS** en tiempo de ejecución al detectar un cambio de ubicación. Esto es un cuello de botella masivo de rendimiento que impide escalar a múltiples usuarios concurrentes.

**Propuesta de Implementación:**
*   **Embeddings Estáticos:** Generar los embeddings (menús, descripciones, ubicación fija) una sola vez al iniciar el servidor o servicio.
*   **Cálculo en Tiempo de Consulta:** Cuando un usuario hace una pregunta, recuperar primero las cafeterías relevantes usando solo similitud semántica.
*   **Inyección Dinámica:** Calcular la distancia *solo* para los documentos recuperados de FAISS y anexar esa información directamente en el prompt del LLM (ej. `Contexto: Cafetería Artes (a 150m de tu ubicación). Menú: ...`) antes de generar la respuesta.

## 2. Actualización a un Modelo de Embeddings Multilingüe

**Problema Actual:**
El modelo actual (`all-MiniLM-L6-v2`) es extremadamente rápido pero está entrenado y optimizado principalmente para el idioma inglés. Su capacidad para capturar la semántica del español mexicano, modismos universitarios y nombres de platillos locales ("chilaquiles", "torta cubana", "aguas frescas") no es óptima.

**Propuesta de Implementación:**
*   Migrar a modelos ligeros pero con soporte multilingüe nativo que mantengan la compatibilidad con CPU/GPU.
*   **Alternativas recomendadas:**
    *   `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
    *   `intfloat/multilingual-e5-small`

## 3. Optimización de la Estrategia de Chunking (Granularidad)

**Problema Actual:**
Actualmente, se indexa un solo documento masivo por cafetería que contiene hasta 50 elementos del menú. Esto diluye el "peso semántico" del vector resultante. Si un usuario busca algo muy específico como "tacos", un documento con 50 platillos de diversas categorías podría tener un puntaje de similitud menor frente a textos irrelevantes.

**Propuesta de Implementación:**
*   **Chunking por Categoría:** Dividir el menú en fragmentos lógicos más pequeños antes de vectorizar. Crear documentos como: "Cafetería Derecho - Desayunos", "Cafetería Derecho - Bebidas", "Cafetería Derecho - Comida Rápida".
*   **Beneficio:** FAISS recuperará fragmentos de menú mucho más precisos, lo cual también ahorra tokens valiosos en la ventana de contexto del modelo LLM (Qwen).

## 4. Reformulación de Consultas Sensible al Contexto (Memoria)

**Problema Actual:**
En `rag_engine_hpc.py` se implementó un historial de chat, pero la consulta cruda del usuario es la que se envía directamente a FAISS para la búsqueda semántica.
*   *Turno 1:* Usuario: "¿Dónde hay chilaquiles?" -> (FAISS recupera Cafetería Artes y el LLM responde).
*   *Turno 2:* Usuario: "¿A qué hora cierran?" -> (FAISS busca la frase "A qué hora cierran?" sin el contexto de la "Cafetería Artes", obteniendo resultados aleatorios o equivocados).

**Propuesta de Implementación:**
*   Implementar un paso de **Reformulación de Consulta** antes de buscar en la base de datos vectorial.
*   Usar una llamada ultra-rápida al LLM (con un prompt diseñado para reescribir) que transforme el *Turno 2* en una consulta con contexto completo: *"¿A qué hora cierra la Cafetería Artes?"*. Este texto reformulado es el que se vectoriza para buscar en FAISS.

## 5. Filtrado de Metadatos manteniendo FAISS (Vector Ligero)

**Problema Actual:**
`faiss.IndexFlatL2` es excelente para búsqueda de similitud pura por fuerza bruta, pero nativamente no soporta filtrado complejo por metadatos (ej. "buscar solo en cafeterías abiertas" o "en un radio menor a 500m").

**Propuesta de Implementación:**
*   **Conservar FAISS** como motor de búsqueda vectorial principal para mantener la ligereza y rapidez del sistema local, siguiendo las directrices de optimización de hardware.
*   **Filtrado Híbrido (Pre o Post-filtrado):** Implementar un almacén de metadatos secundario (ej. un diccionario en memoria o SQLite ligero) mapeado por el ID del vector (`faiss.IndexIDMap`).
*   Al realizar una consulta, recuperar los mejores $N \times 5$ resultados de FAISS, aplicar las reglas lógicas sobre los metadatos en código Python, y quedarse con los Top $N$ relevantes.

## 6. Detección Robusta de Ubicaciones (Fuzzy Matching)

**Problema Actual:**
El sistema de alias para geolocalización implementado en `rag_engine_hpc.py` usa coincidencias exactas de subcadenas (`if place in query_lower:`). Esto falla fácilmente ante errores ortográficos comunes ("matematicass") y puede provocar falsos positivos.

**Propuesta de Implementación:**
*   Integrar una librería de Fuzzy Matching (coincidencia aproximada de cadenas) como `thefuzz` (anteriormente `fuzzywuzzy`) para comparar la entrada del usuario contra el diccionario maestro de alias del campus.
*   Establecer un umbral de confianza (ej. >85%) para confirmar que el usuario se refiere a una ubicación específica antes de cambiar las coordenadas referenciales.

## 7. Transición a Inferencia Cuantizada Local (Hardware Agnosticism)

**Problema Actual:**
La arquitectura RAG actual depende de infraestructura de alto rendimiento (HPC) para la inferencia, limitando el desarrollo local y la viabilidad de despliegues en servidores estándar o hardware de consumo.

**Propuesta de Implementación:**
*   **Motores de Inferencia Ligeros:** Integrar backends altamente optimizados como `llama.cpp` (con aceleración Vulkan/DirectML) u `Ollama` para democratizar la ejecución local en GPUs de consumo o en modo solo-CPU.
*   **Cuantización:** Utilizar formatos de modelos cuantizados (como `GGUF` o `AWQ`) que reducen de forma drástica el consumo de VRAM y RAM del sistema.
*   **Adopción de SLMs:** Migrar a "Small Language Models" de alto rendimiento en el rango de 1.5B a 8B parámetros (como Qwen2.5 o Llama 3), logrando un balance ideal entre calidad conversacional y requerimientos de cómputo.

## 8. Mejora de Precisión mediante Re-ranking (Compensación SLM)

**Problema Actual:**
Al emplear SLMs cuantizados, el modelo generador depende críticamente de recibir el contexto más pertinente posible. FAISS (bi-encoder) es ultrarrápido pero a veces impreciso para capturar sutilezas semánticas complejas en una búsqueda.

**Propuesta de Implementación:**
*   **Implementar Re-ranking (Cross-Encoder):** Tras la recuperación inicial con FAISS y el filtrado por metadatos, procesar los candidatos con un modelo de reordenamiento ligero (ej. `BAAI/bge-reranker-base`).
*   Este componente puntuará con mayor precisión la relevancia de cada fragmento frente a la consulta del usuario, asegurando que los documentos inyectados al SLM sean estrictamente los mejores.
*   Esto optimiza el uso de tokens y contrarresta efectivamente la posible pérdida de razonamiento asociada a modelos más pequeños.
