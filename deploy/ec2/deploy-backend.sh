#!/usr/bin/env bash
# Publica el backend (Django + chatbot) en el servidor EC2.
# Empaqueta el commit actual (HEAD) con git archive, lo sube al bucket privado
# y ejecuta setup.sh en el servidor vía SSM. La base de datos y el .env del
# servidor nunca se reemplazan.
#
# Uso: deploy/ec2/deploy-backend.sh
# Requiere la AWS CLI con sesión iniciada (aws login --profile buho-tragon).
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-buho-tragon}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
INSTANCE_ID="${INSTANCE_ID:-i-09634d6e7ba9591a1}"
BUCKET="${BUCKET:-buho-tragon-deploy-288272421897}"
HOST="${BACKEND_HOST:-3-22-76-54.sslip.io}"
CORS="${CORS_ORIGINS:-https://buhotragon.d2c3gnm85qd306.amplifyapp.com}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$ROOT"

echo "== [1/4] Sesión de AWS y estado del repo"
aws sts get-caller-identity --query Account --output text >/dev/null \
    || { echo "No hay sesión de AWS. Corre: aws login --profile $AWS_PROFILE" >&2; exit 1; }
if ! git diff --quiet HEAD -- backend llm_rag deploy; then
    echo "AVISO: hay cambios sin commit en backend/, llm_rag/ o deploy/; NO se publican (solo HEAD)." >&2
fi
echo "   Publicando commit $(git rev-parse --short HEAD) ($(git branch --show-current))"

echo "== [2/4] Empaquetando y subiendo"
git archive --format=tar.gz -o "$WORK/bundle.tar.gz" HEAD backend llm_rag deploy
aws s3 cp --quiet "$WORK/bundle.tar.gz" "s3://$BUCKET/bundle.tar.gz"

echo "== [3/4] Instalando en el servidor (2-4 minutos)"
params=$(printf '{"commands":["set -e","aws s3 cp --quiet s3://%s/bundle.tar.gz - | tar -xz -C /tmp deploy/ec2/setup.sh","bash /tmp/deploy/ec2/setup.sh %s %s %s"],"executionTimeout":["900"]}' \
    "$BUCKET" "$BUCKET" "$HOST" "$CORS")
CID=$(aws ssm send-command --instance-ids "$INSTANCE_ID" --document-name AWS-RunShellScript \
    --timeout-seconds 900 --comment "deploy $(git rev-parse --short HEAD)" \
    --parameters "$params" --query Command.CommandId --output text)

status=Pending
for _ in $(seq 1 90); do
    status=$(aws ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE_ID" \
        --query Status --output text 2>/dev/null || echo Pending)
    case "$status" in Success|Failed|TimedOut|Cancelled) break ;; esac
    sleep 8
done
aws ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE_ID" \
    --query StandardOutputContent --output text | grep -E "^==|Error|error" || true
if [ "$status" != "Success" ]; then
    echo "ERROR: el deploy terminó en $status. Detalle:" >&2
    aws ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE_ID" \
        --query StandardErrorContent --output text | tail -20 >&2
    exit 1
fi

echo "== [4/4] Verificando a través de Amplify"
SITE="${CORS%%,*}"
for path in /api/Tienditas/ /api/Usuarios/; do
    printf "   GET %-16s -> %s\n" "$path" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE$path")"
done
echo "== Listo (esperado: Tienditas 200, Usuarios 401)"
