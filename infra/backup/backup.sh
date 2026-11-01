#!/usr/bin/env bash
# Nightly backup of PostgreSQL (custom format) and MongoDB (archive), kept 14 days.
# Coordinate the target directory with IT so it is included in the off-site backup.
set -euo pipefail
DEST="${BACKUP_DIR:-/var/backups/nexora}"
STAMP="$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose -f $(dirname "$0")/../docker-compose.yml"
mkdir -p "$DEST"
$COMPOSE exec -T postgres pg_dump -U nexora -Fc nexora > "$DEST/postgres_$STAMP.dump"
$COMPOSE exec -T mongo mongodump --archive --gzip --db nexora > "$DEST/mongo_$STAMP.archive.gz"
find "$DEST" -type f -mtime +14 -delete
echo "backup written to $DEST ($STAMP)"
