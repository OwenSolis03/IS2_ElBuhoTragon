"""
Production RAG Engine - El Búho Tragón
FREE CPU-optimized with TinyLlama (fastest option)
Perfect for school projects and multi-user chatbots
"""

import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional
import torch


class BuhoRAG:
    """
    Production RAG system for El Búho Tragón cafeteria queries.
    Using TinyLlama - fastest free model for CPU
    """

    def __init__(self, data_path: str = "rag_data_fixed.json"):
        """
        Initialize RAG engine

        Args:
            data_path: Path to JSON data file
        """
        print("🦉 Initializing El Búho Tragón RAG System...")

        self.data_path = data_path
        self.data = None
        self.documents = []
        self.metadata = []
        self.faiss_index = None

        # Models (will be loaded on first use)
        self.embedding_model = None
        self.llm_pipeline = None
        self.tokenizer = None

        # User location cache
        self.current_user_lat = None
        self.current_user_lon = None

        print("✅ RAG System initialized")

    def _load_models(self):
        """Lazy load models (only when needed)"""
        if self.embedding_model is None:
            print("📥 Loading embedding model...")
            self.embedding_model = SentenceTransformer(
                'sentence-transformers/all-MiniLM-L6-v2'
            )

        if self.llm_pipeline is None:
            print("📥 Loading LLM (Qwen2.5 - best for RAG)...")

            # Qwen2.5: Mejor para seguir instrucciones y RAG
            # Más inteligente que TinyLlama, sigue contexto estrictamente
            model_id = "Qwen/Qwen2.5-1.5B-Instruct"

            self.tokenizer = AutoTokenizer.from_pretrained(model_id)

            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float32,  # CPU requires float32
                device_map="cpu",
                low_cpu_mem_usage=True
            )

            self.llm_pipeline = pipeline(
                "text-generation",
                model=model,
                tokenizer=self.tokenizer,
                # Don't specify device when using device_map
            )

            print("✅ Models loaded successfully")

    def load_data(self):
        """Load data from JSON file"""
        print(f"📊 Loading data from {self.data_path}...")

        with open(self.data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

        print(f"✅ Loaded: {len(self.data.get('menus', []))} menus, "
              f"{len(self.data.get('tienditas', []))} tienditas, "
              f"{len(self.data.get('facultades', []))} facultades")

    @staticmethod
    def calculate_distance(lat1: float, lon1: float,
                           lat2: float, lon2: float) -> float:
        """Calculate distance in meters using Haversine formula"""
        R = 6371000  # Earth radius in meters

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

    def _add_distances(self, tienditas: List[Dict],
                       user_lat: float, user_lon: float) -> List[Dict]:
        """Add distance information to tienditas"""
        result = []
        for tienda in tienditas:
            tienda = tienda.copy()
            if tienda.get('latitud') and tienda.get('longitud'):
                dist = self.calculate_distance(
                    user_lat, user_lon,
                    float(tienda['latitud']),
                    float(tienda['longitud'])
                )
                tienda['distancia_metros'] = round(dist, 1)
            else:
                tienda['distancia_metros'] = None
            result.append(tienda)

        # Sort by distance
        result = [t for t in result if t['distancia_metros'] is not None]
        result.sort(key=lambda x: x['distancia_metros'])

        return result

    def build_index(self, user_lat: Optional[float] = None,
                    user_lon: Optional[float] = None):
        """
        Build search index from data

        Args:
            user_lat: User latitude for distance calculation
            user_lon: User longitude for distance calculation
        """
        if not self.data:
            self.load_data()

        # Load models if not loaded
        self._load_models()

        print("🔨 Building search index...")

        self.current_user_lat = user_lat
        self.current_user_lon = user_lon

        self.documents = []
        self.metadata = []

        # Create tienditas lookup with distances
        tienditas_list = self.data.get('tienditas', [])
        if user_lat and user_lon:
            tienditas_list = self._add_distances(tienditas_list, user_lat, user_lon)

        tienditas_dict = {t['id_tiendita']: t for t in tienditas_list}

        # Build documents from menus
        for menu in self.data.get('menus', []):
            tienda = tienditas_dict.get(menu.get('id_tiendita'), {})

            # Create rich document with all context
            parts = [
                f"Platillo: {menu.get('nombre', 'N/A')}",
                f"Precio: ${float(menu.get('precio', 0)):.2f} pesos",
            ]

            if menu.get('categoria'):
                parts.append(f"Categoría: {menu['categoria']}")

            if menu.get('descripcion'):
                # NO incluir descripción si es muy larga (reduce ruido)
                desc = menu['descripcion']
                if len(desc) < 100:  # Solo descripciones cortas
                    parts.append(f"Descripción: {desc}")

            if tienda.get('nombre'):
                parts.append(f"Cafetería: {tienda['nombre']}")

            if tienda.get('distancia_metros'):
                parts.append(f"Distancia: {tienda['distancia_metros']:.0f} metros")

            doc = ". ".join(parts) + "."

            self.documents.append(doc)
            self.metadata.append({
                'tipo': 'menu',
                'id': menu.get('id_menu'),
                'tiendita': tienda.get('nombre')
            })

        # Build documents from tienditas
        for tienda in tienditas_list:
            parts = [
                f"Cafetería: {tienda.get('nombre', 'N/A')}",
                f"Ubicación: {tienda.get('direccion', 'N/A')}",
            ]

            if tienda.get('facultad_nombre'):
                parts.append(f"En la {tienda['facultad_nombre']}")

            if tienda.get('hora_apertura') and tienda.get('hora_cierre'):
                apertura = str(tienda['hora_apertura'])[:5]  # HH:MM
                cierre = str(tienda['hora_cierre'])[:5]
                parts.append(f"Horario: {apertura} a {cierre}")

            if tienda.get('distancia_metros'):
                parts.append(f"Distancia: {tienda['distancia_metros']:.0f} metros")

            doc = ". ".join(parts) + "."

            self.documents.append(doc)
            self.metadata.append({
                'tipo': 'tiendita',
                'id': tienda.get('id_tiendita')
            })

        # Build documents from facultades
        for facultad in self.data.get('facultades', []):
            doc = (
                f"Facultad: {facultad.get('nombre', 'N/A')}. "
                f"Incluye: {facultad.get('descripcion', 'N/A')}."
            )
            self.documents.append(doc)
            self.metadata.append({
                'tipo': 'facultad',
                'id': facultad.get('id_facultad')
            })

        print(f"📝 Created {len(self.documents)} documents")

        # Generate embeddings
        print("🔢 Generating embeddings...")
        embeddings = self.embedding_model.encode(
            self.documents,
            show_progress_bar=False,
            batch_size=32
        )

        # Build FAISS index
        dimension = embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatL2(dimension)
        self.faiss_index.add(np.array(embeddings).astype('float32'))

        print(f"✅ Index built with {self.faiss_index.ntotal} vectors")

    def _retrieve_context(self, query: str, k: int = 3) -> List[str]:
        """Retrieve relevant documents for query (reduced to 3 for less noise)"""
        if not self.faiss_index:
            raise ValueError("Index not built. Call build_index() first.")

        # Encode query
        query_embedding = self.embedding_model.encode([query])

        # Search
        distances, indices = self.faiss_index.search(
            np.array(query_embedding).astype('float32'),
            k
        )

        # Return documents
        return [self.documents[i] for i in indices[0]]

    def query(self, question: str,
              user_lat: Optional[float] = None,
              user_lon: Optional[float] = None) -> Dict:
        """
        Main query interface

        Args:
            question: User's question
            user_lat: User latitude (optional)
            user_lon: User longitude (optional)

        Returns:
            Dict with 'answer' and 'context'
        """
        # Rebuild index if location changed
        if user_lat and user_lon:
            if (user_lat != self.current_user_lat or
                    user_lon != self.current_user_lon):
                print("📍 Location changed, rebuilding index...")
                self.build_index(user_lat, user_lon)

        # Ensure index exists
        if not self.faiss_index:
            self.build_index()

        # Load models if needed
        self._load_models()

        # Retrieve context (solo 3 documentos para evitar ruido)
        context_docs = self._retrieve_context(question, k=3)

        # Limpiar el contexto para que sea más legible para el modelo
        clean_context = []
        for doc in context_docs:
            # Remover números de referencia si existen en los docs
            clean_doc = doc.replace("[1]", "").replace("[2]", "").replace("[3]", "")
            clean_context.append(clean_doc)

        context_str = "\n\n".join(clean_context)

        # Prompt optimizado para Qwen2.5
        prompt = f"""<|im_start|>system
Eres El Buhito, asistente de cafeterías de la Universidad de Sonora.

REGLAS ESTRICTAS:
- Responde SOLO usando la INFORMACIÓN DISPONIBLE abajo
- Si la información NO está disponible, di: "No tengo esa información"
- NO inventes precios, horarios, nombres o ubicaciones
- Sé breve y directo (máximo 2 oraciones)
- NO menciones "información disponible", "contexto" o términos técnicos
- Responde de forma natural y conversacional<|im_end|>
<|im_start|>user
INFORMACIÓN DISPONIBLE:
{context_str}

Pregunta: {question}<|im_end|>
<|im_start|>assistant
"""

        # Parámetros optimizados para Qwen2.5
        outputs = self.llm_pipeline(
            prompt,
            max_new_tokens=60,  # Más corto = respuestas más directas
            return_full_text=False,
            temperature=0.1,
            top_p=0.8,
            do_sample=True,
            repetition_penalty=1.1,
            pad_token_id=self.tokenizer.eos_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )

        answer = outputs[0]['generated_text'].strip()

        # Limpieza de tokens especiales de Qwen
        answer = answer.replace("<|im_end|>", "")
        answer = answer.replace("<|im_start|>", "")
        answer = answer.replace("assistant", "")
        answer = answer.replace("user", "")
        answer = answer.replace("system", "")

        # Remover artefactos del razonamiento
        import re
        answer = re.sub(r'Respuesta:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'La respuesta es:?\s*', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\[[\d,\s]+\]', '', answer)
        answer = re.sub(r'INFORMACIÓN DISPONIBLE.*?:', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'(la )?pregunta.*?:', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'(en el|del|según el) context[oa]?', '', answer, flags=re.IGNORECASE)
        answer = re.sub(r'\s+', ' ', answer).strip()

        return {
            'answer': answer,
            'context': context_docs
        }


# Singleton instance for production use
_rag_instance = None

def get_rag_engine(data_path: str = "rag_data_fixed.json") -> BuhoRAG:
    """
    Get or create RAG engine singleton
    Use this in production to avoid reloading models

    Example in Flask:
        @app.route('/api/chat', methods=['POST'])
        def chat():
            rag = get_rag_engine()
            question = request.json.get('question')
            result = rag.query(question)
            return jsonify(result)
    """
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = BuhoRAG(data_path=data_path)
        _rag_instance.load_data()
        _rag_instance.build_index()
    return _rag_instance


# Example usage and testing
if __name__ == "__main__":
    print("="*70)
    print("Testing RAG Engine with Qwen2.5")
    print("="*70)

    # Initialize
    rag = BuhoRAG()
    rag.load_data()

    # Build index SIN ubicación (para probar que no invente distancias)
    print("\n⚠️  Construyendo índice SIN ubicación de usuario...")
    rag.build_index()  # Sin lat/lon

    # Test queries
    test_questions = [
        "¿Cuánto cuesta la Torta Cubana?",
        "¿Cuál es la cafetería más cercana?",  # Debe decir "necesito tu ubicación"
        "¿A qué hora abre la Cafetería de Derecho?",
        "¿Venden pizzas?",
    ]

    for i, q in enumerate(test_questions, 1):
        print(f"\n[{i}/{len(test_questions)}] {q}")
        print("-" * 70)
        result = rag.query(q)
        print(f"🦉 {result['answer']}")

    print("\n" + "="*70)
    print("✅ Testing complete")
    print("="*70)