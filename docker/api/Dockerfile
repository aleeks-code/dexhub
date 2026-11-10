FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Build — source BEFORE install so pnpm symlinks are never overwritten by COPY
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @dexhub/sdk build
RUN pnpm --filter @dexhub/worklog-engine build
RUN pnpm --filter @dexhub/db build
RUN pnpm --filter @dexhub/api build

# Production image — pnpm deploy uses the local .pnpm virtual store copied from builder
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app /build
WORKDIR /build
RUN pnpm deploy --filter=@dexhub/api --prod /prod/api

WORKDIR /prod/api

# Copy migration files where runMigrations() expects them (__dirname/../migrations)
COPY packages/db/migrations ./node_modules/@dexhub/db/migrations

EXPOSE 3001
CMD ["node", "dist/main"]
