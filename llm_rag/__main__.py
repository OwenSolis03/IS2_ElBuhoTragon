"""
Chat interactivo para probar el RAG sin Django:

    python -m llm_rag                      # desde la raíz del repo
    python -m llm_rag --lat 29.0848 --lon -110.9632
"""
import argparse
import logging

from . import get_rag_engine


def main():
    parser = argparse.ArgumentParser(description="Prueba interactiva de El Búho Tragón")
    parser.add_argument("--lat", type=float, default=None, help="Latitud simulada del usuario")
    parser.add_argument("--lon", type=float, default=None, help="Longitud simulada del usuario")
    parser.add_argument("--debug", action="store_true", help="Mostrar el contexto recuperado")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    rag = get_rag_engine()
    history = []
    print("\nEl Búho Tragón listo. Escribe 'salir' para terminar o 'reset' para borrar el historial.\n")

    while True:
        try:
            question = input("Tú: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not question:
            continue
        if question.lower() in ("salir", "exit", "quit"):
            break
        if question.lower() == "reset":
            history = []
            print("Búho: Conversación reiniciada.\n")
            continue

        result = rag.query(question, user_lat=args.lat, user_lon=args.lon, history=history)
        if args.debug:
            print(f"\n[búsqueda] {result['search_query']}")
            print(f"[ubicación] {result['location_used']}  [presupuesto] {result['budget_detected']}")
            print("[contexto]\n" + "\n\n".join(result["context"]) + "\n")
        print(f"Búho: {result['answer']}\n")
        history = (history + [(question, result["answer"])])[-6:]


if __name__ == "__main__":
    main()
