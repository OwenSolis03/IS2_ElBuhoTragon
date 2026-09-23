import threading

from .rag_engine_hpc import BuhoRAG

_rag_instance = None
_rag_lock = threading.Lock()


def get_rag_engine(data_path=None) -> BuhoRAG:
    """
    Retorna una instancia Singleton del motor RAG para evitar
    múltiples cargas en memoria del modelo LLM (ej. Qwen-14B).
    Es seguro llamarla desde varios hilos (runserver/gunicorn con threads).
    """
    global _rag_instance
    if _rag_instance is None:
        with _rag_lock:
            if _rag_instance is None:
                rag = BuhoRAG(data_path=data_path)
                # Cargamos los datos y construimos (o cargamos desde la caché) el índice FAISS en memoria
                rag.load_data()
                rag.build_index()
                _rag_instance = rag
    return _rag_instance
