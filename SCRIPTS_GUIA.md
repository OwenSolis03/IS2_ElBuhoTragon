# Guía de Uso: Scripts de Despliegue y Conexión

Esta guía explica cómo levantar, monitorear y conectar el entorno completo de **El Búho Tragón** (Ollama Qwen2.5-72B en 2 GPUs MI210 + Backend Django + Frontend React/Vite).

---

## 1. Scripts en el Cluster (Yuca)

Todos estos scripts se ejecutan dentro del directorio del proyecto:
```bash
cd /lustre/home/owen/IS2_ElBuhoTragon
```

### 🚀 Iniciar los Servicios: `./launch.sh`
Envía el trabajo a SLURM, espera la asignación del nodo GPU, precalienta el modelo Qwen 72B en las 2 GPUs y levanta Django y Vite. Al terminar, imprime el comando SSH exacto para tu máquina:
```bash
./launch.sh
```

### 📊 Ver Estado: `./status.sh`
Muestra el Job ID activo, tiempo de ejecución, conectividad de los puertos (11434, 8000, 5173) y el comando de conexión:
```bash
./status.sh
```

### 📜 Ver Logs: `./logs.sh`
Permite ver un resumen o seguir los logs en tiempo real:
```bash
./logs.sh          # Muestra resumen de los últimos logs
./logs.sh ollama   # Sigue logs de Ollama (Ctrl+C para salir)
./logs.sh django   # Sigue logs de Django
./logs.sh vite     # Sigue logs de Vite
./logs.sh slurm    # Sigue logs del job general
```

### 🛑 Detener los Servicios: `./stop.sh`
Cancela el trabajo de SLURM, libera las 2 GPUs inmediatamente y limpia el registro de nodo activo:
```bash
./stop.sh
```

---

## 2. Conectar desde tu Máquina Local (Laptop / PC)

Debido a que SLURM asigna un nodo dinámicamente (`amdgpu-hpc-01`, `02`, `03`, etc.), tienes **dos opciones** para abrir el túnel SSH:

### Opción A: Script Automático (Recomendado - Sin cambiar el nodo manualmente)
El script `conectar_local.sh` consulta automáticamente a Yuca cuál nodo está activo y abre el túnel sin que tengas que editar nada.

- **En Mac, Linux o Windows (WSL / Git Bash)**:
  Descarga o copia `conectar_local.sh` a tu computadora y ejecútalo:
  ```bash
  ./conectar_local.sh
  ```

- **En Windows (PowerShell)**:
  Copia `conectar_local.ps1` a tu computadora y ejecútalo:
  ```powershell
  .\conectar_local.ps1
  ```

- **Comando rápido de una sola línea (Mac/Linux/WSL)**:
  ```bash
  ssh -L 5173:$(ssh owen@yuca.unison.mx "cat /lustre/home/owen/IS2_ElBuhoTragon/.active_node"):5173 -L 8000:$(ssh owen@yuca.unison.mx "cat /lustre/home/owen/IS2_ElBuhoTragon/.active_node"):8000 owen@yuca.unison.mx
  ```

### Opción B: Copiar el comando mostrado por `./launch.sh` o `./status.sh`
Tanto `./launch.sh` como `./status.sh` imprimen el comando listo con el nodo actual, por ejemplo:
```bash
ssh -L 5173:amdgpu-hpc-03:5173 -L 8000:amdgpu-hpc-03:8000 owen@yuca.unison.mx
```

---

## 3. URLs en tu Navegador
Una vez que el túnel SSH esté abierto en tu terminal local:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:8000](http://localhost:8000)
