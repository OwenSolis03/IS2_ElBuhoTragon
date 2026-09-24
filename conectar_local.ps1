# ==============================================================================
# El Búho Tragón - Conexión Automática desde Windows (PowerShell)
# 
# Ejecuta este script en PowerShell en tu computadora local:
#   .\conectar_local.ps1
# ==============================================================================

$RemoteUser = "owen"
$RemoteHost = "yuca.unison.mx"
$NodeFile   = "/lustre/home/owen/IS2_ElBuhoTragon/.active_node"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      CONEXION A EL BUHO TRAGON (TUNEL SSH)       " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Consultando nodo GPU asignado en $RemoteHost..."

try {
    $AssignedNode = (ssh -o ConnectTimeout=10 "$RemoteUser@$RemoteHost" "cat $NodeFile 2>/dev/null").Trim()
} catch {
    $AssignedNode = ""
}

if (-not $AssignedNode) {
    Write-Host "No se encontro ningun nodo activo en el cluster." -ForegroundColor Red
    Write-Host ""
    Write-Host "Pasos sugeridos:"
    Write-Host "  1. Conectate a Yuca: ssh $RemoteUser@$RemoteHost"
    Write-Host "  2. Inicia los servicios con: cd IS2_ElBuhoTragon; ./launch.sh"
    Write-Host "  3. Vuelve a ejecutar este script."
    Write-Host "=================================================="
    exit 1
}

Write-Host "Nodo activo detectado: $AssignedNode" -ForegroundColor Green
Write-Host ""
Write-Host "Abriendo tuneles de puertos hacia $AssignedNode :"
Write-Host "  * Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  * Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Manten esta ventana de PowerShell abierta mientras uses la app."
Write-Host "Para cerrar la conexion presiona [Ctrl + C]."
Write-Host "=================================================="

ssh -N -L 5173:${AssignedNode}:5173 -L 8000:${AssignedNode}:8000 "$RemoteUser@$RemoteHost"
