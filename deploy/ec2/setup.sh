#!/usr/bin/env bash
# Instala o actualiza el backend de El Búho Tragón en EC2 (Amazon Linux 2023, arm64).
# Se ejecuta como root vía SSM Run Command; es idempotente (sirve para cada redeploy).
#
# Uso: setup.sh <bucket> <host> [cors_origins]
#   bucket        Bucket S3 privado con bundle.tar.gz (y el_buho_tragon.db la primera vez)
#   host          Dominio público del backend, ej. 3-12-34-56.sslip.io
#   cors_origins  Orígenes permitidos separados por coma (dominio de Amplify)
set -euo pipefail

BUCKET="$1"
HOST="$2"
CORS_ORIGINS="${3:-}"

APP=/opt/buho
DATA="$APP/data"
CADDY_VERSION=2.10.2
CADDY_SHA512=6ce061a690312ab38367df3c5d5f89a2e4a263e7300d300d87356211bb81e79b15933e6d6203e03fbf26f15cc0311f264805f336147dbdd24938d84b57a4421c

echo "== [1/6] Paquetes del sistema"
command -v python3.12 >/dev/null || dnf install -y -q python3.12 python3.12-pip
id buho >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /sbin/nologin buho
id caddy >/dev/null 2>&1 || useradd --system --home-dir /var/lib/caddy --shell /sbin/nologin caddy
mkdir -p "$APP/releases" "$DATA" /var/lib/caddy /etc/caddy
chown buho:buho "$DATA"
chown caddy:caddy /var/lib/caddy

if [ "$(/usr/local/bin/caddy version 2>/dev/null | cut -d' ' -f1)" != "v$CADDY_VERSION" ]; then
    tmp=$(mktemp -d)
    curl -fsSL -o "$tmp/caddy.tar.gz" \
        "https://github.com/caddyserver/caddy/releases/download/v$CADDY_VERSION/caddy_${CADDY_VERSION}_linux_arm64.tar.gz"
    echo "$CADDY_SHA512  $tmp/caddy.tar.gz" | sha512sum -c -
    tar -xzf "$tmp/caddy.tar.gz" -C "$tmp" caddy
    install -m 755 "$tmp/caddy" /usr/local/bin/caddy
    rm -rf "$tmp"
fi

echo "== [2/6] Código"
release="$APP/releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$release"
aws s3 cp --quiet "s3://$BUCKET/bundle.tar.gz" - | tar -xz -C "$release"
chown -R buho:buho "$release"

echo "== [3/6] Base de datos y configuración (solo la primera vez; nunca se sobrescriben)"
if [ ! -f "$DATA/el_buho_tragon.db" ]; then
    aws s3 cp --quiet "s3://$BUCKET/el_buho_tragon.db" "$DATA/el_buho_tragon.db"
    chown buho:buho "$DATA/el_buho_tragon.db"
    chmod 600 "$DATA/el_buho_tragon.db"
fi
if [ ! -f "$DATA/.env" ]; then
    # La SECRET_KEY se genera aquí y nunca sale del servidor
    cat > "$DATA/.env" <<EOF
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=$(python3.12 -c 'import secrets; print(secrets.token_urlsafe(50))')
DJANGO_DB_PATH=$DATA/el_buho_tragon.db
RAG_BACKEND=bedrock
BEDROCK_REGION=us-east-2
EOF
fi
# Valores que dependen del despliegue: se actualizan en cada corrida
sed -i '/^DJANGO_ALLOWED_HOSTS=/d; /^CORS_ALLOWED_ORIGINS=/d; /^NUM_PROXIES=/d; /^BACKUP_BUCKET=/d' "$DATA/.env"
echo "DJANGO_ALLOWED_HOSTS=$HOST" >> "$DATA/.env"
echo "BACKUP_BUCKET=$BUCKET" >> "$DATA/.env"
# CloudFront + proxy de Amplify + Caddy: la IP del alumno es la 3a desde la derecha
echo "NUM_PROXIES=3" >> "$DATA/.env"
[ -n "$CORS_ORIGINS" ] && echo "CORS_ALLOWED_ORIGINS=$CORS_ORIGINS" >> "$DATA/.env"
chown buho:buho "$DATA/.env"
chmod 600 "$DATA/.env"

echo "== [4/6] Dependencias de Python"
[ -x "$APP/venv/bin/python" ] || python3.12 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q --upgrade pip
"$APP/venv/bin/pip" install -q -r "$release/backend/requirements.txt"

echo "== [5/6] Migraciones, estáticos y precalentado del chatbot"
runuser -u buho -- bash -c "
    set -euo pipefail
    set -a; . '$DATA/.env'; set +a
    cd '$release/backend'
    '$APP/venv/bin/python' manage.py migrate --noinput
    '$APP/venv/bin/python' manage.py collectstatic --noinput -v 0
    '$APP/venv/bin/python' manage.py warmup_rag
"

echo "== [6/6] Servicios"
ln -sfn "$release" "$APP/current"
install -m 644 "$release/deploy/ec2/buho-backend.service" /etc/systemd/system/buho-backend.service
install -m 644 "$release/deploy/ec2/caddy.service" /etc/systemd/system/caddy.service
install -m 644 "$release/deploy/ec2/buho-backup.service" /etc/systemd/system/buho-backup.service
install -m 644 "$release/deploy/ec2/buho-backup.timer" /etc/systemd/system/buho-backup.timer
sed "s/__HOST__/$HOST/" "$release/deploy/ec2/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now buho-backend caddy buho-backup.timer
systemctl restart buho-backend
systemctl reload caddy || systemctl restart caddy

# Conservar solo las 3 versiones más recientes
ls -1dt "$APP"/releases/* | tail -n +4 | xargs -r rm -rf

echo "== Listo: https://$HOST"
