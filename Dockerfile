# Stage 1: Base
FROM oven/bun:1.2.15 AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN bun install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
RUN bun run build

# Stage 4: Runner (non-root)
FROM oven/bun:1.2.15-slim AS runner
WORKDIR /app

# Metadata
LABEL org.opencontainers.image.title="thac"
LABEL org.opencontainers.image.description="TanStack Start + Hono API application"
LABEL org.opencontainers.image.source="https://github.com/shiroemons/thac"

# Copy server build output
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy web build output (TanStack Start SSR)
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Run as non-root user for security
USER bun

EXPOSE 3000 3001

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun -e "await fetch('http://localhost:3000').catch(() => process.exit(1))" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
