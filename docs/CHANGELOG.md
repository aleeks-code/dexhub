# Changelog

All notable changes to DexHub are documented here.

## [Unreleased]

### Added
- Initial monorepo scaffold (Phase 7)
- `packages/sdk` — Module SDK with types, events, permissions, storage, errors, Result<T>
- `packages/db` — Drizzle ORM schemas for all 15 tables (users, sessions, passkeys, recovery codes, roles, permissions, role_permissions, user_roles, settings, setup_tokens, module_registry, module_settings, module_kv_store, audit_logs, cache_store)
- `packages/ui` — Shared component library with Button and cn/CVA utilities
- `packages/config` — Shared TypeScript, ESLint, Prettier configs
- `apps/web` — Next.js 15 frontend with App Router, dark-first design system, Zustand store
- `apps/api` — NestJS 11 + Fastify backend with health endpoint, global exception filter, Zod pipe
- Docker Compose (production and development)
- Caddy reverse proxy with security headers
- GitHub Actions CI/CD workflows
- Module template scaffold (`modules/_template`)
- Architecture documentation and 9 ADRs
