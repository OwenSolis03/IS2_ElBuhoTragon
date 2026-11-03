import os

_rag_instance = None


def get_rag_engine(data_path=None):
    """
    Retorna una instancia Singleton del motor RAG para evitar
    múltiples cargas en memoria (modelos o índice de embeddings).

    RAG_BACKEND elige el motor:
      - "bedrock" (default): Amazon Bedrock, para el despliegue en AWS
      - "hpc": Qwen-14B + FAISS en GPU (clúster Yuca)
    Los imports son perezosos para no exigir torch/faiss cuando se usa Bedrock.
    """
    global _rag_instance
    if _rag_instance is None:
        backend = os.getenv("RAG_BACKEND", "bedrock").lower()
        if backend == "hpc":
            from .rag_engine_hpc import BuhoRAG as engine_class
        elif backend == "bedrock":
            from .rag_engine_bedrock import BuhoRAGBedrock as engine_class
        else:
            raise ValueError(f"RAG_BACKEND desconocido: {backend}")

        _rag_instance = engine_class(data_path=data_path)
        # Cargamos los datos y construimos (o cargamos desde la caché) el índice en memoria
        _rag_instance.load_data()
        _rag_instance.build_index()
    return _rag_instance
