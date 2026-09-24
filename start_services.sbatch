#!/bin/bash
#SBATCH --job-name=buho_local
#SBATCH --account=p000
#SBATCH --qos=qos000
#SBATCH --partition=gpu
#SBATCH --nodes=1
#SBATCH --gres=gpu:2
#SBATCH --cpus-per-task=16
#SBATCH --mem=128G
#SBATCH --time=08:00:00
#SBATCH --output=/lustre/home/owen/IS2_ElBuhoTragon/service_slurm.log
#SBATCH --error=/lustre/home/owen/IS2_ElBuhoTragon/service_slurm.err

echo "=================================================="
echo "Iniciando El Búho Tragón en nodo GPU de cómputo"
echo "Nodo: $(hostname)"
echo "Fecha: $(date)"
echo "ID del Job: $SLURM_JOB_ID"
echo "=================================================="

# Activar entorno de Conda
source /apps/miniconda3/bin/activate buho_tragon

# Configurar variables de entorno generales
export PROJECT_DIR="/lustre/home/owen/IS2_ElBuhoTragon"
export PYTHONUNBUFFERED=1
export PATH="/lustre/home/owen/.nvm/versions/node/v20.20.2/bin:$PATH"

# Cargar módulo Ollama y configurar distribución en 2 GPUs ROCm
module load ollama/0.34.0
export OLLAMA_MODELS="/lustre/proyectos/ollama-models"
export OLLAMA_HOST="0.0.0.0:11434"
export OLLAMA_KEEP_ALIVE="-1"
export OLLAMA_SCHED_SPREAD="1"

# Configurar variables para el RAG
export BUHO_LLM_BACKEND="ollama"
export BUHO_OLLAMA_MODEL="qwen2.5:72b"
export BUHO_OLLAMA_URL="http://127.0.0.1:11434"
export BUHO_EMBEDDING_MODEL="/lustre/proyectos/llm/modelos-bert/bert-base-uncased"
export BUHO_RERANKER_MODEL=""
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1

# Guardar información del nodo para fácil acceso
echo "$(hostname)" > "$PROJECT_DIR/.active_node"

cleanup() {
    echo "Recibida señal de término. Deteniendo servicios..."
    kill $(jobs -p) 2>/dev/null
    rm -f "$PROJECT_DIR/.active_node"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Iniciar servidor Ollama
echo "[1/4] Iniciando Ollama con ROCm (2 GPUs AMD MI210)..."
ollama serve > "$PROJECT_DIR/ollama.log" 2>&1 &
OLLAMA_PID=$!
echo "Ollama corriendo con PID: $OLLAMA_PID"

# Esperar a que el daemon de Ollama esté listo
for i in {1..20}; do
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama API lista y respondiendo en el puerto 11434."
        break
    fi
    sleep 1
done

# Precalentar el modelo en VRAM (distribuye las capas entre GPU 0 y GPU 1)
echo "Precalentando Qwen2.5-72B en VRAM..."
ollama run qwen2.5:72b "hola" > /dev/null 2>&1

# 2. Precargar RAG e índice FAISS
echo "[2/4] Precargando embeddings e índice FAISS..."
cd "$PROJECT_DIR/backend"
python manage.py warmup_rag

# 3. Iniciar Backend Django
echo "[3/4] Iniciando Backend Django (puerto 8000)..."
python manage.py runserver 0.0.0.0:8000 > "$PROJECT_DIR/django.log" 2>&1 &
DJANGO_PID=$!
echo "Django corriendo con PID: $DJANGO_PID"

# 4. Iniciar Frontend Vite
echo "[4/4] Iniciando Frontend Vite (puerto 5173)..."
cd "$PROJECT_DIR/frontend"
npx vite --host 0.0.0.0 --port 5173 > "$PROJECT_DIR/vite.log" 2>&1 &
FRONTEND_PID=$!
echo "Vite corriendo con PID: $FRONTEND_PID"

echo "=================================================="
echo "Servicios activos exitosamente en $(hostname)."
echo "Para conectar desde tu máquina local ejecuta:"
echo "ssh -L 5173:$(hostname):5173 -L 8000:$(hostname):8000 owen@yuca.unison.mx"
echo "=================================================="

# Monitorear procesos
wait $DJANGO_PID $FRONTEND_PID $OLLAMA_PID

