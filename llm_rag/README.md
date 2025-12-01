# 🦉 El Búho Tragón - Production RAG System

Sistema de IA conversacional para consultas sobre cafeterías del campus UNISON.

## 📁 Estructura del Proyecto

```
IS2_ElBuhoTragon/
└── llm_rag/
    ├── __init__.py
    ├── rag_engine.py          # Motor RAG principal
    ├── rag_data_fixed.json    # Datos de cafeterías
    ├── requirements.txt       # Dependencias
    └── README.md             # Este archivo
```

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
cd llm_rag
pip install -r requirements.txt
```

**Nota:** Primera instalación descarga ~2-3GB de modelos (una sola vez).

### 2. Probar el Sistema

```bash
python rag_engine.py
```

### 3. Usar en Código

```python
from llm_rag.rag_engine import BuhoRAG

# Inicializar
rag = BuhoRAG(data_path="rag_data_fixed.json")
rag.load_data()
rag.build_index()

# Consultar
result = rag.query("¿Cuánto cuesta la Torta Cubana?")
print(result['answer'])
```

## 🎯 Características Anti-Alucinación

Este sistema está optimizado para **minimizar alucinaciones**:

1. **Temperatura baja (0.1)** - Reduce creatividad, aumenta precisión
2. **Prompts estrictos** - Instrucciones claras de no inventar
3. **Contexto explícito** - Marca claramente qué información usar
4. **Modelo robusto** - Phi-3-mini entrenado para seguir instrucciones
5. **Validación de contexto** - Solo responde con info disponible

## 📍 Uso con Ubicación del Usuario

```python
# Con ubicación GPS del usuario
result = rag.query(
    "¿Cuál es la cafetería más cercana?",
    user_lat=29.085,  # Latitud del usuario
    user_lon=-110.963  # Longitud del usuario
)

# El sistema calculará distancias y priorizará cafeterías cercanas
```

## 🔧 Integración con Django

### Opción 1: Singleton (Recomendado para Producción)

```python
from llm_rag.rag_engine import get_rag_engine

# En tu view
def chat_endpoint(request):
    rag = get_rag_engine()  # Reusa instancia existente
    result = rag.query(request.data['question'])
    return JsonResponse({'answer': result['answer']})
```

### Opción 2: Instancia Manual

```python
from llm_rag.rag_engine import BuhoRAG

# Inicializar una vez al iniciar Django
rag_engine = BuhoRAG()
rag_engine.load_data()
rag_engine.build_index()

# Usar en views
def chat_endpoint(request):
    result = rag_engine.query(request.data['question'])
    return JsonResponse({'answer': result['answer']})
```

## 🌐 Despliegue en Servidor

### En el Servidor (Turing)

```bash
# 1. Clonar/actualizar repositorio
cd ~/IS2_ElBuhoTragon
git pull origin test

# 2. Instalar dependencias
cd llm_rag
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Probar
python rag_engine.py
```

### Desde tu Laptop (SSH Tunnel)

```bash
# Conectar con port forwarding
ssh -L 8000:localhost:8000 a223201053@turing.mat.uson.mx

# Ahora puedes acceder al servidor desde http://localhost:8000
```

## 📊 Performance

| Métrica | Valor |
|---------|-------|
| **Primera consulta** | ~10-30 segundos (carga modelos) |
| **Consultas siguientes** | ~2-5 segundos |
| **Memoria RAM requerida** | ~4-6 GB |
| **Tamaño modelos** | ~2.5 GB (descarga única) |

## 🐛 Troubleshooting

### Error: "No module named 'llm_rag'"

**Solución:** Agregar al Python path en Django:

```python
# En manage.py o settings.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
```

### Error: "Out of memory"

**Solución:** Cambiar a modelo más ligero en `rag_engine.py`:

```python
# Línea 70, cambiar:
model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"  # Más ligero
```

### LLM sigue alucinando

**Solución:** Ya está optimizado al máximo. Si persiste:
1. Aumentar `k` en `_retrieve_context()` para más contexto
2. Revisar que `rag_data_fixed.json` tenga toda la info necesaria
3. Ajustar el system prompt en `query()`

### Primera consulta muy lenta

**Solución:** Esto es normal. Los modelos se cargan en memoria. Usa el singleton `get_rag_engine()` para mantener modelos cargados.

## 🔄 Actualizar Datos

Cuando cambies la base de datos:

```bash
# 1. Exportar nuevos datos (en backend/)
python export_for_rag.py

# 2. Copiar a llm_rag/
cp rag_data_fixed.json ../llm_rag/

# 3. Reiniciar Django para recargar
```

## 📝 API Response Format

```json
{
  "answer": "La Torta Cubana cuesta $85.00 pesos y está disponible en...",
  "context": [
    "Platillo: Torta Cubana. Precio: $85.00 pesos...",
    "Cafetería: ..."
  ]
}
```

## 🎨 Próxima Integración

Este sistema está listo para integrarse con tu chat widget del frontend. Cuando compartas los archivos del chat, integraremos:

1. Llamada al endpoint desde React
2. Obtención de ubicación GPS del usuario
3. Manejo de estados de carga
4. Display de respuestas en el chat

## 📞 Soporte

Para dudas sobre este sistema RAG:
- Revisar este README
- Ejecutar `python rag_engine.py` para testing
- Verificar logs del servidor

## 🔐 Seguridad

- No incluir API keys en el código
- Validar inputs del usuario
- Limitar rate de consultas si es necesario
- Logs para monitorear uso

---

**Listo para producción** ✅