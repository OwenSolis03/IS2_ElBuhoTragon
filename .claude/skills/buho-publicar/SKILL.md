---
name: buho-publicar
description: Runbook para publicar y operar El Búho Tragón en AWS - deploy del frontend (Amplify, sitio y vista previa) y del backend (EC2), verificación, rollback, respaldos y restauración de la base de datos, y revisión de costos. Úsala cuando haya que publicar un cambio, revertir uno, restaurar datos o revisar el estado o el gasto del sitio.
---

# Publicar y operar El Búho Tragón

Lee primero `buho-contexto` si no lo has hecho. Todo se hace con la AWS CLI y el perfil `buho-tragon` en la región `us-east-2`. Publicar es una acción hacia producción: **confirma con la persona antes de correr un deploy al sitio principal**.

## Antes de publicar

- Checklist de `buho-revision` aprobada.
- El sitio principal se publica **desde `main`** después del merge. Las vistas previas pueden salir de cualquier rama.
- Sesión de AWS activa: `aws sts get-caller-identity --profile buho-tragon`. Si falla: `aws login --profile buho-tragon`.

## Frontend (Amplify)

```bash
deploy/amplify/deploy-frontend.sh preview    # https://preview.d2c3gnm85qd306.amplifyapp.com
deploy/amplify/deploy-frontend.sh            # https://buhotragon.d2c3gnm85qd306.amplifyapp.com
```

El script compila con `VITE_API_URL` vacía (las llamadas pasan por el proxy `/api/*` de Amplify) y se niega a publicar un build que apunte a `127.0.0.1`. **No subas builds a mano.** Las reglas de proxy y de la SPA son de la app de Amplify; no las cambies sin entender que el WiFi del campus bloquea sslip.io.

La regla de la SPA manda a `index.html` todo archivo cuya extensión no esté en su lista (`css|js|mjs|png|...`). Si agregas un tipo de archivo nuevo (por ejemplo `.wasm` o `.pbf`), agrégalo a esa regla (`aws amplify update-app --custom-rules`) o Amplify devolverá HTML en su lugar (así se rompió el worker de MapLibre, `.mjs`). Después de cambiar reglas, vuelve a publicar para limpiar la caché.

## Backend (EC2)

```bash
deploy/ec2/deploy-backend.sh
```

Publica el commit actual (HEAD): `git archive` → bucket → `setup.sh` en el servidor vía SSM (instala dependencias, `migrate`, `collectstatic`, `warmup_rag` y reinicia gunicorn y Caddy). La base de datos (`/opt/buho/data/el_buho_tragon.db`) y el `.env` del servidor **nunca se reemplazan**. Avisa si hay cambios sin commit, porque esos no se publican.

Si cambiaste un modelo con una migración delicada, corre antes un respaldo manual (ver abajo).

## Verificar después de publicar

```bash
S=https://buhotragon.d2c3gnm85qd306.amplifyapp.com
curl -s -o /dev/null -w "%{http_code}\n" $S/                  # 200
curl -s -o /dev/null -w "%{http_code}\n" $S/api/Tienditas/    # 200
curl -s -o /dev/null -w "%{http_code}\n" $S/api/Usuarios/     # 401 (si da 200 es una falla de seguridad grave)
curl -s -X POST -H 'Content-Type: application/json' -d '{"message":"donde venden molletes?"}' $S/api/chatbot/
```

Desde la red de la UNISON no se puede probar `https://3-22-76-54.sslip.io` directo (Fortinet lo bloquea). Prueba a través de Amplify, o corre `curl` desde el servidor vía SSM.

## Revertir

- **Frontend:** `git switch <commit-bueno>` y `deploy/amplify/deploy-frontend.sh`, o redeploy de un job anterior desde la consola de Amplify.
- **Backend:** `git revert <commit>` (o `git switch` al commit bueno) y `deploy/ec2/deploy-backend.sh`. El servidor guarda las últimas 3 versiones en `/opt/buho/releases/`.

## Respaldos

- **Automáticos:** la base de datos se copia a `s3://buho-tragon-deploy-288272421897/backups/` cada día a las 3:00 am de Hermosillo (se guarda 30 días), y Data Lifecycle Manager saca un snapshot del disco a las 3:30 am (se guardan 7).
- **Respaldo manual ahora:** `aws ssm send-command --instance-ids i-09634d6e7ba9591a1 --document-name AWS-RunShellScript --parameters 'commands=["systemctl start buho-backup.service","journalctl -u buho-backup -n 2 -o cat"]'`
- **Restaurar** (confírmalo antes con la persona; reemplaza datos vivos):
  1. `aws s3 ls s3://buho-tragon-deploy-288272421897/backups/` y elige la fecha.
  2. Por SSM: `systemctl stop buho-backend`, respalda la base actual, descarga y descomprime el respaldo elegido en `/opt/buho/data/el_buho_tragon.db`, `chown buho:buho`, `chmod 600`, `systemctl start buho-backend`.
  3. Verifica como arriba.

## Costos y estado

```bash
aws freetier get-account-plan-state --profile buho-tragon      # créditos restantes y vencimiento
aws budgets describe-budget --account-id 288272421897 --budget-name buho-tragon-mensual --profile buho-tragon
```

Lo fijo cuesta unos $13 al mes (EC2 $6.13, IP $3.65, disco $1.60, Amplify ~$1) y el chatbot unos $0.0015 por mensaje. Si aparece "Access Denied" de repente en algo que funcionaba, revisa en AWS Settings > Billing si el proyecto se pausó por límite de gasto o por créditos agotados.

## Servidor (solo si hace falta)

- Entrar: `aws ssm start-session --target i-09634d6e7ba9591a1 --profile buho-tragon` (requiere el plugin de Session Manager).
- Logs: `journalctl -u buho-backend -n 100`, `journalctl -u caddy -n 50`.
- Configuración: `/opt/buho/data/.env` (permisos 600; ahí está la SECRET_KEY: **nunca la imprimas ni la copies al chat**).
