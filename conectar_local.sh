#!/bin/bash
# ==============================================================================
# El Búho Tragón - Conexión Automática desde Máquina Local (Mac/Linux/WSL)
# 
# Ejecuta este script EN TU COMPUTADORA LOCAL (no en el cluster).
# Detecta automáticamente qué nodo asignó SLURM y abre el túnel SSH.
# ==============================================================================

REMOTE_USER="owen"
REMOTE_HOST="yuca.unison.mx"
NODE_FILE="/lustre/home/owen/IS2_ElBuhoTragon/.active_node"

echo "=================================================="
echo "      CONEXIÓN A EL BÚHO TRAGÓN (TÚNEL SSH)       "
echo "=================================================="
echo "Consultando nodo GPU asignado en $REMOTE_HOST..."

# Consultar el nodo activo registrado por el script de SLURM
ASSIGNED_NODE=$(ssh -o ConnectTimeout=10 -o BatchMode=no "$REMOTE_USER@$REMOTE_HOST" "cat $NODE_FILE 2>/dev/null" 2>/dev/null)

if [ -z "$ASSIGNED_NODE" ]; then
    echo "❌ No se encontró ningún nodo activo en el cluster."
    echo ""
    echo "Pasos sugeridos:"
    echo "  1. Conéctate a Yuca: ssh $REMOTE_USER@$REMOTE_HOST"
    echo "  2. Inicia los servicios con: cd IS2_ElBuhoTragon && ./launch.sh"
    echo "  3. Vuelve a ejecutar este script en tu máquina local."
    echo "=================================================="
    exit 1
fi

echo "✅ Nodo activo detectado: $ASSIGNED_NODE"
echo ""
echo "Abriendo túneles de puertos hacia $ASSIGNED_NODE:"
echo "  • Frontend: http://localhost:5173"
echo "  • Backend:  http://localhost:8000"
echo ""
echo "💡 Mantén esta terminal abierta mientras uses la aplicación."
echo "   Para cerrar la conexión presiona [Ctrl + C]."
echo "=================================================="

# Abrir el túnel SSH direccionando hacia el nodo dinámico
ssh -N -L 5173:$ASSIGNED_NODE:5173 -L 8000:$ASSIGNED_NODE:8000 "$REMOTE_USER@$REMOTE_HOST"
