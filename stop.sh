#!/bin/bash
# ==============================================================================
# El Búho Tragón - Detención Limpia de Servicios
# ==============================================================================

PROJECT_DIR="/lustre/home/owen/IS2_ElBuhoTragon"

JOB_ID=$(squeue -u $USER -n buho_local -h -o "%i")

echo "=================================================="
echo "          DETENIENDO EL BÚHO TRAGÓN               "
echo "=================================================="

if [ -n "$JOB_ID" ]; then
    echo "Cancelando trabajo SLURM (Job ID: $JOB_ID)..."
    scancel $JOB_ID
    rm -f "$PROJECT_DIR/.active_node"
    echo "✅ Trabajo cancelado y nodo liberado exitosamente."
else
    echo "ℹ️  No hay ningún trabajo activo llamado 'buho_local' para el usuario $USER."
    rm -f "$PROJECT_DIR/.active_node"
fi

echo "=================================================="
