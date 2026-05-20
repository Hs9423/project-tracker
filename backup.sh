#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

echo "==> Creating database backup: ${BACKUP_FILE}"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U pt_user project_tracker \
  > "${BACKUP_FILE}"

echo "==> Backup saved: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"
