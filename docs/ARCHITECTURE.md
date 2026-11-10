# DexHub Architecture

## Overview

DexHub is a personal modular hub platform built as a monorepo. The Core is minimal and stable; all features are delivered by isolated modules.

## Monorepo Structure

```
DexHub/
├── apps/
│   ├── web/          — Next.js 15 frontend (App Router, React 19)
│   └── api/          — NestJS 11 backend (Fastify adapter)
├── packages/
│   ├── sdk/          — Module SDK: types, events, permissions, storage, errors
│   ├── db/           — Drizzle ORM schemas and client
│   ├── ui/           — Shared component library (shadcn/ui pattern)
│   └── config/       — Shared TypeScript, ESLint, Prettier configs
├── modules/
│   └── _template/    — Module scaffolding template
└── docker/           — Dockerfiles and Caddyfile
```

## Layers

### Frontend (apps/web)
- **Framework**: Next.js 15 with App Router and React Server Components
- **State**: Zustand (UI/client), TanStack Query (server state), URL (navigation state)
- **Styling**: Tailwind CSS v4 with `@theme inline` for runtime CSS variable theming
- **Routing**: Route groups `(auth)` and `(hub)`. Module pages via catch-all `[module]/[...path]`

### Backend (apps/api)
- **Framework**: NestJS 11 with Fastify adapter (≈2× faster than Express)
- **Architecture**: Controller → Service → Repository (unidirectional dependencies)
- **Validation**: Zod (no class-validator)
- **Error handling**: Global exception filter returns `{ error: { code, message, requestId } }`

### Database (packages/db)
- **ORM**: Drizzle ORM with postgres.js driver
- **Database**: PostgreSQL 16
- **Schema groups**: core/, modules/, audit/
- **Audit logs**: Append-only enforced at DB level via PostgreSQL rules (no UPDATE, no DELETE)

### Module SDK (packages/sdk)
- **Manifest**: declares id, version, sdkVersion, routes, widgets, permissions, settings, events
- **Events**: Typed EventBus — modules can only emit declared events
- **Permissions**: PermissionsContext with `has()`, `hasAll()`, `hasAny()`
- **Storage**: namespaced adapters (modules cannot cross namespace boundaries)
- **Result<T>**: domain errors returned as `{ ok, value }` / `{ ok: false, error }`, never thrown

## Module Isolation (5 layers)

1. **Package boundaries**: modules import only from `@dexhub/sdk`
2. **ESLint**: `no-restricted-imports` blocks direct DB and cross-module imports
3. **Storage SDK**: namespace enforcement prevents cross-module DB access
4. **IMA broker**: Inter-Module API requires declared `crossModuleAccess` permissions
5. **Event Bus governance**: modules can only emit events listed in `manifest.events.emits`

## Authentication

- **Primary**: Passkey / WebAuthn (passwordless)
- **Fallback**: Recovery codes (hashed, one-time-use)
- **Emergency**: Docker Emergency Access (token injected via env at container start)
- **Single-user default**: `app.multi_user_enabled = false` in settings table — zero code changes to enable multi-user

## Infrastructure

- **Reverse proxy**: Caddy (auto-HTTPS, HTTP/3, security headers, gzip/zstd)
- **Container**: Docker Compose (production) + Docker Compose override (development)
- **CI/CD**: GitHub Actions — typecheck, lint, build on PR; build+push GHCR images on main
