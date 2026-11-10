# Roadmap

## Phase 7 — Project Setup ✅
Complete monorepo scaffold with all packages, apps, Docker, CI/CD, and documentation.

## Phase 8 — Authentication ✅
- Better Auth integration (Passkey/WebAuthn)
- Recovery codes (bcrypt-hashed, one-time-use)
- Docker Emergency Access token
- 3-step setup wizard (admin account + passkey + recovery codes)
- Session management

## Phase 9 — Core API ✅
- User CRUD
- Settings API (get/set)
- Module registry API (list, enable, disable)
- Permissions service
- Audit logging middleware

## Phase 10 — Core Frontend ✅
- Sidebar with module navigation (populated from registry)
- Dashboard widget grid (12-column)
- Settings page (theme, user profile)
- Command palette
- Module error boundaries

## Phase 11 — Module SDK Runtime ✅
- Event Bus implementation
- Storage SDK (namespace enforcement)
- IMA broker (inter-module API)
- Module loader (dynamic import + manifest validation)

## Phase 12 — First Module ✅
- Notes module: full CRUD, KV storage, EventBus events, IMA public API
- Dashboard widget "Recent Notes"
- Command palette actions
- SDK validation across all runtime services

## Phase 13 — Backup & Restore ✅
- Local filesystem adapter
- GFS rotation schedule (7 daily / 4 weekly / 12 monthly)
- Encrypted backup manifests with SHA-256 checksums (AES-256-GCM)
- Restore flow with checksum verification and FK-safe data import
- Backup management UI at /settings/backup

## Phase 14 — Hardening ✅
- Rate limiting via @nestjs/throttler (global 200/min; auth 10/min; setup 5/min)
- Security headers via @fastify/helmet
- AdminGuard for backup and module registry mutations
- Dependency audit: 0 known vulnerabilities (drizzle-orm upgraded to >=0.45.2)

## Phase 15 — Production Readiness ✅
- Structured JSON logging (JsonLogger replacing NestJS default)
- HTTP access log via Fastify onResponse hook (method, url, status, durationMs)
- Enhanced health check: DB ping latency + memory metrics + uptime + version
- Docker compose: healthcheck for API, backup volume, all env vars wired
- .env.example: complete and accurate for all services
