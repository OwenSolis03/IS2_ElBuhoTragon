#!/bin/bash
# ==============================================================================
# El Búho Tragón - Script de Lanzamiento Automático
# Inicia todos los servicios en un nodo GPU de ACARUS y muestra la conexión.
# ==============================================================================

PROJECT_DIR="/lustre/home/owen/IS2_ElBuhoTragon"
cd "$PROJECT_DIR" || exit 1

echo "=================================================="
echo "      EL BÚHO TRAGÓN - LANZADOR DE SERVICIOS      "
echo "=================================================="

# 1. Verificar si ya hay un trabajo corriendo
EXISTING_JOB=$(squeue -u $USER -n buho_local -h -o "%i")
if [ -n "$EXISTING_JOB" ]; then
    NODE=$(cat "$PROJECT_DIR/.active_node" 2>/dev/null || squeue -u $USER -j $EXISTING_JOB -h -o "%N")
    echo "⚠️  Ya existe un trabajo activo de El Búho Tragón:"
    echo "   Job ID: $EXISTING_JOB"
    echo "   Nodo:   $NODE"
    echo ""
    echo "Para ver el estado detallado ejecuta:  ./status.sh"
    echo "Para detener los servicios ejecuta:    ./stop.sh"
    echo ""
    echo "Comando para conectar por SSH desde tu máquina local:"
    echo "ssh -L 5173:$NODE:5173 -L 8000:$NODE:8000 owen@yuca.unison.mx"
    echo "=================================================="
    exit 0
fi

# 2. Limpiar rastros anteriores
rm -f "$PROJECT_DIR/.active_node"

# 3. Enviar trabajo a Slurm
echo "[1/4] Solicitando nodo con 2 GPUs AMD MI210 a SLURM..."
SBATCH_OUTPUT=$(sbatch start_services.sbatch)
JOB_ID=$(echo "$SBATCH_OUTPUT" | awk '{print $4}')

if [ -z "$JOB_ID" ]; then
    echo "❌ Error al enviar el trabajo a SLURM:"
    echo "$SBATCH_OUTPUT"
    exit 1
fi

echo "✅ Trabajo enviado con Job ID: $JOB_ID"
echo ""

# 4. Esperar a que el trabajo sea asignado y empiece a correr
echo "[2/4] Esperando a que SLURM asigne un nodo GPU..."
while true; do
    JOB_STATE=$(squeue -u $USER -j $JOB_ID -h -o "%T" 2>/dev/null)
    if [ "$JOB_STATE" == "RUNNING" ]; then
        break
    elif [ "$JOB_STATE" == "PENDING" ]; then
        echo -n "."
        sleep 2
    else
        # Si ya no está en la cola, revisar si falló
        sleep 2
        JOB_STATE=$(squeue -u $USER -j $JOB_ID -h -o "%T" 2>/dev/null)
        if [ -z "$JOB_STATE" ]; then
            echo ""
            echo "❌ El trabajo terminó inesperadamente. Revisa service_slurm.err:"
            cat "$PROJECT_DIR/service_slurm.err" 2>/dev/null | tail -n 15
            exit 1
        fi
    fi
done

echo ""
NODE=$(squeue -u $USER -j $JOB_ID -h -o "%N")
echo "✅ Nodo asignado: $NODE"
echo ""

# 5. Esperar a que los servicios estén listos
echo "[3/4] Inicializando Ollama (Qwen2.5-72B en 2 GPUs), RAG, Django y Vite..."
echo "     (La carga de 47GB de pesos toma alrededor de 60-90 segundos)"

TIMEOUT=180
ELAPSED=0
DJANGO_READY=false
VITE_READY=false

while [ $ELAPSED -lt $TIMEOUT ]; do
    if [ "$DJANGO_READY" = false ]; then
        STATUS_DJANGO=$(curl -s -o /dev/null -w "%{http_code}" "http://$NODE:8000/api/Tienditas/" 2>/dev/null)
        if [ "$STATUS_DJANGO" == "200" ]; then
            DJANGO_READY=true
            echo "  ✔ Backend Django listo (HTTP 200)"
        fi
    fi

    if [ "$VITE_READY" = false ]; then
        STATUS_VITE=$(curl -s -o /dev/null -w "%{http_code}" "http://$NODE:5173/" 2>/dev/null)
        if [ "$STATUS_VITE" == "200" ]; then
            VITE_READY=true
            echo "  ✔ Frontend Vite listo (HTTP 200)"
        fi
    fi

    if [ "$DJANGO_READY" = true ] && [ "$VITE_READY" = true ]; then
        break
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "  ... esperando arranque (${ELAPSED}s / ${TIMEOUT}s)"
done

echo ""
echo "=================================================="
echo "          🎉 ¡SERVICIOS LISTOS Y OPERATIVOS!      "
echo "=================================================="
echo "Nodo asignado:  $NODE"
echo "Job ID SLURM:   $JOB_ID"
echo "Hardware:       2x AMD Instinct MI210 (128 GB VRAM)"
echo "Modelo LLM:     Qwen2.5-72B (Ollama ROCm)"
echo ""
echo "👉 EJECUTA EN TU COMPUTADORA LOCAL (Terminal):"
echo "--------------------------------------------------"
echo "ssh -L 5173:$NODE:5173 -L 8000:$NODE:8000 owen@yuca.unison.mx"
echo "--------------------------------------------------"
echo ""
echo "Una vez abierto el túnel, entra a tu navegador en:"
echo "  • Frontend: http://localhost:5173"
echo "  • Backend:  http://localhost:8000"
echo ""
echo "Scripts de apoyo disponibles en el cluster:"
echo "  • Ver estado:     ./status.sh"
echo "  • Ver logs:       ./logs.sh"
echo "  • Detener todo:   ./stop.sh"
echo "=================================================="
