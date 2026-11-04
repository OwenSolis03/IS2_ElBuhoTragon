#!/usr/bin/env bash
# Compila el frontend y lo publica en AWS Amplify.
#
# Uso:
#   deploy/amplify/deploy-frontend.sh            # sitio principal (rama buhotragon)
#   deploy/amplify/deploy-frontend.sh preview    # vista previa en otra URL (se crea si no existe)
#
# Requiere la AWS CLI con sesión iniciada (aws login --profile buho-tragon).
# Variables opcionales: AWS_PROFILE (default buho-tragon), AMPLIFY_APP_ID.
set -euo pipefail

BRANCH="${1:-buhotragon}"
APP_ID="${AMPLIFY_APP_ID:-d2c3gnm85qd306}"
export AWS_PROFILE="${AWS_PROFILE:-buho-tragon}"
export AWS_REGION="${AWS_REGION:-us-east-2}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND="$ROOT/frontend"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== [1/5] Sesión de AWS"
aws sts get-caller-identity --query Account --output text >/dev/null \
    || { echo "No hay sesión de AWS. Corre: aws login --profile $AWS_PROFILE" >&2; exit 1; }

echo "== [2/5] Compilando frontend"
cd "$FRONTEND"
[ -d node_modules ] || npm ci
# VITE_API_URL vacía = misma URL del sitio; Amplify reenvía /api/* al backend.
# Si se compila sin ella, el sitio publicado intentaría llamar a 127.0.0.1 y se rompería.
VITE_API_URL= npm run build
if grep -rq "127.0.0.1:8000" dist/assets; then
    echo "ERROR: el build apunta a 127.0.0.1:8000; no se publica." >&2
    exit 1
fi

echo "== [3/5] Empaquetando"
python3 -I - "$FRONTEND/dist" "$WORK/site.zip" <<'EOF'
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(src):
        for name in files:
            path = os.path.join(root, name)
            z.write(path, os.path.relpath(path, src))
EOF

echo "== [4/5] Rama de Amplify: $BRANCH"
if ! aws amplify get-branch --app-id "$APP_ID" --branch-name "$BRANCH" >/dev/null 2>&1; then
    echo "   No existe; creando rama de vista previa..."
    aws amplify create-branch --app-id "$APP_ID" --branch-name "$BRANCH" \
        --stage DEVELOPMENT --description "Vista previa" >/dev/null
fi

echo "== [5/5] Publicando"
read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH" \
    --query '[jobId,zipUploadUrl]' --output text)
curl -fsS -X PUT -H "Content-Type: application/zip" --upload-file "$WORK/site.zip" "$UPLOAD_URL"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

status=PENDING
for _ in $(seq 1 60); do
    status=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" \
        --query job.summary.status --output text)
    case "$status" in SUCCEED|FAILED|CANCELLED) break ;; esac
    sleep 5
done

if [ "$status" != "SUCCEED" ]; then
    echo "ERROR: el deploy terminó en $status (job $JOB_ID)" >&2
    exit 1
fi
echo "== Listo: https://$BRANCH.$APP_ID.amplifyapp.com"
