#!/bin/bash
# Script to run the Prisma seed on the staging server (oci-public)
#
# Usage:
#   ./scripts/run-seed-staging.sh [container-name]
#
# Defaults to running on the 'dono-backend' container if no argument provided.
#
# Prerequisites:
#   - Must be run from the project root
#   - Docker/Podman must be running on the staging server
#   - Must have access to the staging server (SSH or direct Docker connection)

set -e

CONTAINER_NAME="${1:-dono-backend}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🌱 Running Prisma seed on staging server"
echo "Container: $CONTAINER_NAME"
echo ""

# Option 1: If you have SSH access to staging, run this:
# ssh user@staging-server "cd /path/to/esa-dono-ui && docker exec $CONTAINER_NAME sh -c 'cd /app && npm run prisma db seed'"

# Option 2: If Docker is accessible locally from staging, use:
# (This assumes you have docker context set up for the staging server)
docker exec "$CONTAINER_NAME" sh -c "cd /app && npx prisma db seed --schema ./server/prisma/schema.prisma"

echo ""
echo "✅ Seed completed successfully!"
