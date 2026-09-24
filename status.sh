#!/bin/bash
# ==============================================================================
# El Búho Tragón - Verificador de Estado de Servicios
# ==============================================================================

PROJECT_DIR="/lustre/home/owen/IS2_ElBuhoTragon"

JOB_INFO=$(squeue -u $USER -n buho_local -h -o "%i %N %M %T" 2>/dev/null)

echo "=================================================="
echo "          ESTADO DE EL BÚHO TRAGÓN                "
echo "=================================================="

if [ -z "$JOB_INFO" ]; then
    echo "❌ No hay ningún trabajo activo de El Búho Tragón en SLURM."
    echo ""
    echo "Para iniciarlo ejecuta:"
    echo "  ./launch.sh"
    echo "=================================================="
    exit 0
fi

JOB_ID=$(echo "$JOB_INFO" | awk '{print $1}')
NODE=$(echo "$JOB_INFO" | awk '{print $2}')
TIME=$(echo "$JOB_INFO" | awk '{print $3}')
STATE=$(echo "$JOB_INFO" | awk '{print $4}')

echo "Job ID SLURM:   $JOB_ID"
echo "Estado:         $STATE"
echo "Nodo asignado:  $NODE"
echo "Tiempo activo:  $TIME"
echo ""

if [ "$STATE" == "RUNNING" ]; then
    echo "Verificando conectividad en el nodo $NODE..."
    
    # 1. Ollama
    OLLAMA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NODE:11434/api/tags" 2>/dev/null)
    if [ "$OLLAMA_STATUS" != "200" ]; then
        OLLAMA_STATUS=$(srun --jobid=$JOB_ID curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:11434/api/tags" 2>/dev/null || echo "DOWN")
    fi
    if [ "$OLLAMA_STATUS" == "200" ]; then
        echo "  • Ollama LLM (puerto 11434):  ✔ ACTIVO (Qwen2.5-72B listo)"
    else
        echo "  • Ollama LLM (puerto 11434):  ⏳ INICIALIZANDO / DOWN ($OLLAMA_STATUS)"
    fi

    # 2. Django
    DJANGO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NODE:8000/api/Tienditas/" 2>/dev/null || echo "DOWN")
    if [ "$DJANGO_STATUS" == "200" ]; then
        echo "  • Backend Django (puerto 8000): ✔ ACTIVO (HTTP 200)"
    else
        echo "  • Backend Django (puerto 8000): ⏳ INICIALIZANDO / DOWN ($DJANGO_STATUS)"
    fi

    # 3. Vite
    VITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$NODE:5173/" 2>/dev/null || echo "DOWN")
    if [ "$VITE_STATUS" == "200" ]; then
        echo "  • Frontend Vite (puerto 5173):  ✔ ACTIVO (HTTP 200)"
    else
        echo "  • Frontend Vite (puerto 5173):  ⏳ INICIALIZANDO / DOWN ($VITE_STATUS)"
    fi

    echo ""
    echo "👉 COMANDO PARA CONECTAR POR SSH DESDE TU COMPUTADORA LOCAL:"
    echo "--------------------------------------------------"
    echo "ssh -L 5173:$NODE:5173 -L 8000:$NODE:8000 owen@yuca.unison.mx"
    echo "--------------------------------------------------"
else
    echo "⏳ El trabajo está en cola esperando asignación de recursos..."
fi

echo "=================================================="
