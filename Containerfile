# syntax=docker/dockerfile:1.7
# OCI-compatible Containerfile for distributed testing of dono-ui.
#
# Build:
#   podman build -t dono-ui:test --target test .
#   podman build -t dono-ui:runtime --target runtime .
#
# Run tests (distributed):
#   podman run --rm dono-ui:test
#   podman run --rm -e TEST_TARGET=client dono-ui:test
#   podman run --rm -e TEST_TARGET=server dono-ui:test
#   podman run --rm -e MODE=lint dono-ui:test
#   podman run --rm -e MODE=build dono-ui:test
#
# Run dev server:
#   podman run --rm -p 3001:3001 -p 5173:5173 dono-ui:runtime

# ---------- Base ----------
FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0 AS base

# OCI labels
LABEL org.opencontainers.image.title="dono-ui" \
      org.opencontainers.image.description="ESA charity donation platform (Tiltify integration)" \
      org.opencontainers.image.source="https://github.com/Codescales/esa-dono-ui" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="ESA" \
      org.opencontainers.image.documentation="https://github.com/Codescales/esa-dono-ui"

# Build-time arguments
ARG NODE_ENV=production
ARG UID=1001
ARG GID=1001

# Build-time env (visible at all stages)
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    CI=true

# System deps (openssl for prisma on alpine-based; ca-certificates for HTTPS)
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid ${GID} dono \
 && useradd  --system --uid ${UID} --gid dono --home /app --shell /sbin/nologin dono

WORKDIR /app

# ---------- Dependencies (cached layer) ----------
FROM base AS deps

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Use BuildKit cache mount for npm to speed up distributed rebuilds
RUN --mount=type=cache,target=/root/.npm,id=npm \
    npm ci --no-audit --no-fund --include=dev

# ---------- Test target (default for distributed testing) ----------
FROM deps AS test

ARG TEST_TARGET=both
ENV TEST_TARGET=${TEST_TARGET} \
    NODE_ENV=test \
    PATH="/app/node_modules/.bin:${PATH}"

# Copy the rest of the source
COPY --chown=dono:dono . .

# Generate Prisma client (needed for any server code, even tests that import it)
RUN DATABASE_URL="file:./dev.db" npx prisma generate --schema=./server/prisma/schema.prisma

# Switch to non-root user for runtime safety
USER dono

# Default entrypoint runs the selected test target
ENTRYPOINT ["/usr/local/bin/node", "scripts/run-tests.mjs"]

# ---------- Runtime target (production) ----------
FROM deps AS runtime

ENV NODE_ENV=production \
    PORT=3001

COPY --chown=dono:dono . .

RUN DATABASE_URL="file:./dev.db" npx prisma generate --schema=./server/prisma/schema.prisma \
 && cd client && npm run build && cd .. \
 && npm prune --omit=dev

USER dono

EXPOSE 3001 5173

CMD ["sh", "-c", "cd /app/server && npx prisma db push --skip-generate && cd /app && npm run dev"]
