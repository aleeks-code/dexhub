FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Build stage
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY modules ./modules
COPY apps ./apps

ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @dexhub/sdk build
RUN pnpm --filter @dexhub/worklog-engine build
RUN pnpm --filter @dexhub/db build
RUN pnpm --filter @dexhub/ui build
RUN pnpm --filter @dexhub/api build
RUN pnpm --filter @dexhub/web build

# Prepare production API
RUN pnpm deploy --filter=@dexhub/api --prod /prod/api

# Runner stage
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install caddy
RUN apk add --no-cache caddy

WORKDIR /app

# Copy API
COPY --from=builder /prod/api /app/api
COPY --from=builder /app/apps/api/dist /app/api/dist
COPY packages/db/migrations /app/api/node_modules/@dexhub/db/migrations

# Copy Web (Next.js standalone)
COPY --from=builder /app/apps/web/.next/standalone /app/web
COPY --from=builder /app/apps/web/.next/static /app/web/apps/web/.next/static
COPY --from=builder /app/apps/web/public /app/web/apps/web/public
COPY --from=builder /app/apps/web/public /app/web/public

# Copy Caddy and startup script
COPY docker/render/Caddyfile /app/Caddyfile
COPY docker/render/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000

CMD ["/app/start.sh"]
