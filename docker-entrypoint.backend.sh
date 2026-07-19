#!/bin/sh
# Backend entrypoint: apply DB migrations, then exec the server.
set -e

echo "[entrypoint] Applying Prisma migrations to ${DATABASE_URL}"
node_modules/.bin/prisma migrate deploy --schema=./server/prisma/schema.prisma

echo "[entrypoint] Starting: $*"
exec "$@"
