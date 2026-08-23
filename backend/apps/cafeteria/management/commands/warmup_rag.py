"""
Management command to pre-download and warm up all RAG models.
Run this BEFORE starting the Django server so the first chatbot request doesn't timeout.

Usage: python manage.py warmup_rag
"""
import sys
import os
from django.core.management.base import BaseCommand

# Add repo root to path so `llm_rag` is importable as a package
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../../..'))


class Command(BaseCommand):
    help = 'Pre-download RAG models and build the FAISS index'

    def handle(self, *args, **options):
        self.stdout.write("[1/4] Importing RAG engine...")
        try:
            from llm_rag import get_rag_engine
        except ImportError as e:
            self.stderr.write(f"ERROR: Could not import llm_rag: {e}")
            return

        self.stdout.write("[2/4] Creating RAG instance (singleton reused by the Django views)...")
        self.stdout.write("[3/4] Loading data + building FAISS index...")
        rag = get_rag_engine()
        self.stdout.write(f"       Index built: {len(rag.documents)} chunks indexed")

        self.stdout.write("[4/4] Loading LLM models (this may download ~1GB the first time)...")
        rag._load_models()

        # Quick smoke test
        self.stdout.write("\n[Test] Running smoke test query...")
        result = rag.query("que desayunos hay?")
        answer = result.get('answer', '')[:100]
        self.stdout.write(f"[Test] Response: {answer}...")

        self.stdout.write(self.style.SUCCESS(
            "\n=== RAG warmup complete! You can now start the server with: python manage.py runserver ==="
        ))
