# Stage 1: Base
FROM oven/bun:1 AS base
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
FROM oven/bun:1-slim AS runner
WORKDIR /app

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

ENTRYPOINT ["./entrypoint.sh"]
