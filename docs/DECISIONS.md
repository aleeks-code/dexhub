# Architecture Decision Records

## ADR-001: pnpm Workspaces + Turborepo

**Status**: Accepted

**Decision**: Use pnpm workspaces for monorepo package management with Turborepo for task caching.

**Rationale**: pnpm is significantly faster than npm/yarn and uses hard links to avoid disk duplication. Turborepo adds task-level caching so `build`, `typecheck`, and `lint` skip unchanged packages. Together they minimize CI and local dev time in a multi-package monorepo.

---

## ADR-002: Next.js 15 + NestJS 11 (Fastify)

**Status**: Accepted

**Decision**: Next.js 15 (App Router) for the frontend, NestJS 11 with Fastify adapter for the API.

**Rationale**: Next.js App Router and React Server Components reduce client-side JS payload and enable streaming. NestJS provides structured dependency injection that scales with module complexity. The Fastify adapter delivers ~2× throughput over Express at no architectural cost.

---

## ADR-003: Drizzle ORM

**Status**: Accepted

**Decision**: Drizzle ORM with postgres.js driver over Prisma or TypeORM.

**Rationale**: Drizzle is lightweight, has zero runtime overhead, produces SQL-close queries that are easy to audit, and has first-class TypeScript inference. Prisma requires a separate process (query engine) and is heavier; TypeORM relies on decorators with well-known footguns.

---

## ADR-004: Better Auth (Passkey primary)

**Status**: Accepted

**Decision**: Better Auth with WebAuthn/Passkey as primary authentication, recovery codes as fallback, and Docker Emergency Access for admin recovery.

**Rationale**: Passkeys are phishing-resistant and passwordless by design. Recovery codes (hashed, one-time-use) cover the case where all passkeys are lost. Docker Emergency Access (env-injected token) provides a recovery path when the database is inaccessible or no user exists.

---

## ADR-005: Caddy over Nginx

**Status**: Accepted

**Decision**: Caddy 2 as reverse proxy.

**Rationale**: Caddy manages TLS certificates automatically (Let's Encrypt / ZeroSSL) with no cron jobs or certbot. It supports HTTP/3 out of the box. The Caddyfile config is dramatically simpler than nginx for equivalent security headers and proxy rules. The performance difference vs. nginx is negligible at this scale.

---

## ADR-006: Single-user default with multi-user flag

**Status**: Accepted

**Decision**: Deploy as single-user by default. `app.multi_user_enabled = false` in the settings table. PermissionsService short-circuits to `return true` when this flag is false. Setting the flag to `true` enables multi-user with zero code changes.

**Rationale**: Eliminates complexity from the initial implementation while making the upgrade path trivial. The flag lives in the database, not in code, so there is no feature-flag debt to clean up.

---

## ADR-007: Audit Log immutability at DB level

**Status**: Accepted

**Decision**: Enforce audit log immutability via PostgreSQL rules (`CREATE RULE audit_no_update ... DO INSTEAD NOTHING`, `CREATE RULE audit_no_delete ... DO INSTEAD NOTHING`), not at the application layer.

**Rationale**: Application-layer enforcement can be bypassed by direct DB access or future bugs. DB-level rules are enforced for any connection, including emergency shell access. This satisfies the "security before convenience" principle.

---

## ADR-008: Tailwind CSS v4 with `@theme inline`

**Status**: Accepted

**Decision**: Tailwind v4 with `@theme {}` for static tokens and `@theme inline {}` for dynamic color tokens backed by CSS custom properties. Dark mode is the default (`:root`); light mode applies `.light` class to `<html>`.

**Rationale**: Tailwind v4 eliminates the `tailwind.config.js` file and moves theming into CSS, which is the correct layer. `@theme inline` bridges Tailwind utility classes to runtime CSS variables, enabling zero-flash theme switching without class regeneration.

---

## ADR-009: Redis optional via adapter pattern

**Status**: Accepted

**Decision**: Cache, pub/sub, and KV features use an adapter interface. `InMemoryAdapter` is the default (no external dependency). `RedisAdapter` is activated when `REDIS_URL` is set. All adapters have a PostgreSQL fallback for persistence.

**Rationale**: Redis adds operational complexity (another service to run, monitor, backup). For a personal hub, in-memory is sufficient. The adapter pattern lets Redis be adopted transparently when needed without changing calling code.
