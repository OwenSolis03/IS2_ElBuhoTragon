from .rag_engine_hpc import BuhoRAG

_rag_instance = None

def get_rag_engine(data_path=None) -> BuhoRAG:
    """
    Retorna una instancia Singleton del motor RAG para evitar
    múltiples cargas en memoria del modelo LLM (ej. Qwen-14B).
    """
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = BuhoRAG(data_path=data_path)
        # Cargamos los datos y construimos (o cargamos desde la caché) el índice FAISS en memoria
        _rag_instance.load_data()
        _rag_instance.build_index()
    return _rag_instance
