#!/usr/bin/env bash
# Dump the MongoDB container to a timestamped gzip archive and prune old ones.
# Schedule via cron, e.g. daily at 03:00:
#   0 3 * * * /opt/shopstatesideglobal/scripts/backup-mongo.sh >> /var/log/ssg-backup.log 2>&1
set -euo pipefail

# Run from the repo root so docker compose + .env resolve.
cd "$(dirname "$0")/.."

# Load MONGO_USER / MONGO_PASS from .env
set -a; . ./.env; set +a

BACKUP_DIR="${BACKUP_DIR:-/opt/ssg-backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/ssg-$STAMP.archive.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backing up MongoDB -> $OUT"
docker compose exec -T mongo mongodump \
  --username "$MONGO_USER" --password "$MONGO_PASS" --authenticationDatabase admin \
  --db state_side_global --archive --gzip > "$OUT"

echo "[$(date)] Pruning backups older than ${RETAIN_DAYS} days"
find "$BACKUP_DIR" -name 'ssg-*.archive.gz' -mtime "+${RETAIN_DAYS}" -delete

echo "[$(date)] Done. Current backups:"
ls -lh "$BACKUP_DIR"

# Restore (manual):
#   gunzip -c ssg-YYYYMMDD-HHMMSS.archive.gz | docker compose exec -T mongo \
#     mongorestore --username "$MONGO_USER" --password "$MONGO_PASS" \
#     --authenticationDatabase admin --archive --gzip --drop
