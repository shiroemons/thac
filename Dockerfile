# Stage 1: Base
FROM node:24.18.1-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack install -g pnpm@11.20.0

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/search/package.json ./packages/search/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 4: Runner (non-root)
FROM node:24.18.1-bookworm-slim AS runner
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack install -g pnpm@11.20.0

# Metadata
LABEL org.opencontainers.image.title="thac"
LABEL org.opencontainers.image.description="TanStack Start + Hono API application"
LABEL org.opencontainers.image.source="https://github.com/shiroemons/thac"

# Copy server build output
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy web build output (TanStack Start SSR)
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Copy database package for db:push and db:seed operations
COPY --from=builder /app/packages/db ./packages/db
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/turbo.json ./turbo.json

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Run as non-root user for security
USER node

EXPOSE 3001 3000

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001').catch(() => process.exit(1))" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
