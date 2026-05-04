# RAG Engine - Next Steps

## Priority 1: Upgrade Quantized Model (Fix Hallucinations)

The current `Qwen2.5-1.5B-Instruct` (Q4_K_M, ~1.1GB) hallucinates by mixing data between cafeterias. It's too small for accurate context-grounded generation.

### Recommended Upgrade Path

| Model | Size | RAM Usage | Speed | Accuracy |
|-------|------|-----------|-------|----------|
| Qwen2.5-1.5B Q4_K_M | ~1.1GB | ~1.5GB | ~2s | Poor - hallucinates |
| **Qwen2.5-7B Q4_K_M** | **~4.7GB** | **~5.5GB** | **~8s** | **Good** |
| Qwen2.5-14B (full, GPU) | ~28GB | GPU required | ~3s | Excellent |

### Implementation (in `rag_engine.py`)

Change `_load_models()`:

```python
model_path = hf_hub_download(
    repo_id="Qwen/Qwen2.5-7B-Instruct-GGUF",
    filename="qwen2.5-7b-instruct-q4_k_m.gguf"
)

self.llm_pipeline = Llama(
    model_path=model_path,
    n_ctx=4096,
    n_threads=6,  # increase for 7B
    verbose=False
)
```

### Requirements
- 16GB+ RAM on the machine
- First download takes ~2 minutes on fast internet
- Response time ~5-10 seconds per query on CPU

## Priority 2: Restore `views.py` Import for Production

Currently `views.py` imports `rag_engine` (CPU/local). For HPC deployment, switch back:

```python
# views.py line 202
from rag_engine_hpc import BuhoRAG  # HPC with 14B model
```

## Priority 3: Consider Environment-Based Engine Selection

```python
import os
ENGINE = os.getenv('RAG_ENGINE', 'cpu')  # 'cpu' or 'hpc'
if ENGINE == 'hpc':
    from rag_engine_hpc import BuhoRAG
else:
    from rag_engine import BuhoRAG
```

This would allow the same `views.py` to work in both environments without manual edits.
