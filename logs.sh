#!/bin/bash
# ==============================================================================
# El Búho Tragón - Visualizador de Logs
# Permite ver los logs de los distintos servicios en tiempo real o resumidos.
# Uso:
#   ./logs.sh          (Muestra un resumen de los últimos logs)
#   ./logs.sh ollama   (Sigue los logs de Ollama con tail -f)
#   ./logs.sh django   (Sigue los logs de Django con tail -f)
#   ./logs.sh vite     (Sigue los logs de Vite con tail -f)
#   ./logs.sh slurm    (Sigue los logs de arranque del job SLURM)
# ==============================================================================

PROJECT_DIR="/lustre/home/owen/IS2_ElBuhoTragon"
cd "$PROJECT_DIR" || exit 1

SERVICE="$1"

case "$SERVICE" in
    ollama)
        echo "=== SIGUIENDO LOGS DE OLLAMA (Ctrl+C para salir) ==="
        tail -f -n 30 "$PROJECT_DIR/ollama.log"
        ;;
    django)
        echo "=== SIGUIENDO LOGS DE DJANGO (Ctrl+C para salir) ==="
        tail -f -n 30 "$PROJECT_DIR/django.log"
        ;;
    vite)
        echo "=== SIGUIENDO LOGS DE VITE (Ctrl+C para salir) ==="
        tail -f -n 30 "$PROJECT_DIR/vite.log"
        ;;
    slurm)
        echo "=== SIGUIENDO LOGS DE SLURM (Ctrl+C para salir) ==="
        tail -f -n 30 "$PROJECT_DIR/service_slurm.log"
        ;;
    *)
        echo "=================================================="
        echo "        RESUMEN DE LOGS DE EL BÚHO TRAGÓN         "
        echo "=================================================="
        echo ""
        echo "--- Últimas líneas de service_slurm.log ---"
        tail -n 8 "$PROJECT_DIR/service_slurm.log" 2>/dev/null || echo "(Vacío o no existe)"
        echo ""
        echo "--- Últimas líneas de django.log ---"
        tail -n 8 "$PROJECT_DIR/django.log" 2>/dev/null || echo "(Vacío o no existe)"
        echo ""
        echo "--- Últimas líneas de vite.log ---"
        tail -n 6 "$PROJECT_DIR/vite.log" 2>/dev/null || echo "(Vacío o no existe)"
        echo ""
        echo "=================================================="
        echo "Para seguir un log específico en tiempo real ejecuta:"
        echo "  ./logs.sh ollama"
        echo "  ./logs.sh django"
        echo "  ./logs.sh vite"
        echo "  ./logs.sh slurm"
        echo "=================================================="
        ;;
esac
