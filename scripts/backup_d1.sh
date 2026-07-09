#!/usr/bin/env bash
# Backup Cloudflare D1 database.
# Usage: D1_NAME=my-db bash scripts/backup_d1.sh

set -euo pipefail

: "${D1_NAME:?Set D1_NAME (database name)}"

DATE=$(date +%Y-%m-%d)
FILENAME="${D1_NAME}-backup-${DATE}.sql"

echo "💾 Backing up D1: ${D1_NAME} → ${FILENAME}"
npx wrangler d1 export "${D1_NAME}" --remote --output="./${FILENAME}"

echo ""
echo "✅ Backup saved: ./${FILENAME}"
echo "📦 File size: $(du -h "./${FILENAME}" | cut -f1)"
echo ""
echo "Restore with:"
echo "  npx wrangler d1 execute ${D1_NAME} --remote --file=./${FILENAME}"
