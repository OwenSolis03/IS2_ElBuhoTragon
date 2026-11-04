#!/usr/bin/env bash
# Respaldo diario de la base de datos SQLite a S3 (lo ejecuta buho-backup.timer).
# Usa la API de backup de SQLite: la copia es consistente aunque haya escrituras en curso.
# Los respaldos en S3 expiran solos a los 30 días (regla de ciclo de vida del bucket).
set -euo pipefail

: "${BACKUP_BUCKET:?Falta BACKUP_BUCKET en /opt/buho/data/.env}"
: "${DJANGO_DB_PATH:?Falta DJANGO_DB_PATH en /opt/buho/data/.env}"

stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

python3.12 - "$DJANGO_DB_PATH" "$tmp/el_buho_tragon.db" <<'EOF'
import sqlite3, sys
src = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
ok = dst.execute("PRAGMA integrity_check").fetchone()[0]
dst.close(); src.close()
if ok != "ok":
    sys.exit(f"integrity_check falló: {ok}")
EOF

gzip -9 "$tmp/el_buho_tragon.db"
aws s3 cp --quiet "$tmp/el_buho_tragon.db.gz" "s3://$BACKUP_BUCKET/backups/el_buho_tragon-$stamp.db.gz"
echo "Respaldo subido: s3://$BACKUP_BUCKET/backups/el_buho_tragon-$stamp.db.gz"
