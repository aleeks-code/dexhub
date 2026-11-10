# TODO

All planned phases (8–15) are complete. Remaining items are infrastructure and operational tasks.

## Infrastructure
- [x] Migrations generated (`packages/db/migrations/0000_careless_firedrake.sql`) and applied automatically on API boot via `runMigrations()` in `bootstrap()`
- [ ] Set up `audit_logs` PostgreSQL immutability rules (row-level security / trigger)
- [ ] Add pnpm-lock.yaml to version control after first clean install
- [ ] Configure log aggregation (Loki / ELK) — JSON logs are ready to pipe in
- [ ] Configure alerting on health endpoint returning 503

## Operations
- [ ] Generate and securely store `BACKUP_ENCRYPTION_KEY` before first deployment
- [ ] Schedule automated backups (cron calling POST /api/v1/backup)
- [ ] Verify WebAuthn passkey flow end-to-end on production domain
- [ ] Test full restore flow from backup before going live

## Future Modules
- [ ] Calendar module
- [ ] Tasks / Todo module
- [ ] Bookmarks module
- [ ] Files module
