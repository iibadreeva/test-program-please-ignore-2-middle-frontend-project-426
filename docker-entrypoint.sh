#!/bin/sh
set -e

MAX_ATTEMPTS="${MIGRATE_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${MIGRATE_RETRY_SECONDS:-2}"

echo "Applying database migrations..."
attempt=1
while true; do
  if /prisma-tools/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma; then
    break
  fi
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "migrate deploy failed after ${MAX_ATTEMPTS} attempts" >&2
    exit 1
  fi
  echo "Database not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${SLEEP_SECONDS}s..."
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Seeding catalog (idempotent)..."
# CJS + NODE_PATH: ESM ignores NODE_PATH, so seed must be CommonJS to load
# @prisma/client from /prisma-tools/node_modules.
NODE_PATH=/prisma-tools/node_modules node /app/dist/seed.cjs

echo "Starting server on 0.0.0.0:${PORT:-3000}..."
exec node server.js
