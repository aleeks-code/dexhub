# Migration history

| File | Contenuto | Snapshot |
|---|---|---|
| `0000_careless_firedrake.sql` | Schema base: users, roles, sessions, passkeys, moduli, backup | ✅ `meta/0000_snapshot.json` |
| `0001_user_invites.sql` | Tabella `user_invites` | ❌ snapshot mancante |
| `0002_recovery_code_encrypted.sql` | Colonna `code_encrypted` su `recovery_codes` | ❌ snapshot mancante |
| `0003_invite_requests.sql` | Tabella `invite_requests` | ❌ snapshot mancante |
| `0004_tasks_module.sql` | Tabelle modulo Tasks (spaces, lists, tasks, tags, comments) | ❌ snapshot mancante |
| `0005_tasks_v1.sql` | Colonne `pinned` (tasks) e `is_inbox` (task_lists) | ❌ snapshot mancante |
| `0006_kind_magus.sql` | Tabelle modulo Worklog (worklog_days, worklog_entries, worklog_contract) + enum `worklog_entry_kind` | ✅ `meta/0006_snapshot.json` |

## Debito noto: snapshot 0001–0005 mancanti

La catena snapshot in `meta/` è incompleta: esistono solo `0000_snapshot.json` e
`0006_snapshot.json`. Gli snapshot 0001–0005 non esistono.

**`drizzle-kit generate` e `check` funzionano** perché entrambi usano solo l'ultimo
snapshot (0006) come baseline — verificato empiricamente (luglio 2026).

**ATTENZIONE — NON cancellare `meta/0006_snapshot.json`.** Se viene perso, il prossimo
`generate` userebbe `0000_snapshot.json` come base e produrrebbe una migration gonfia che
tenta di ricreare tutte le tabelle di 0001–0006 (questo è esattamente ciò che è accaduto
quando 0006 è stato generato la prima volta).

**Nota tecnica:** la cartella `meta/` deve contenere SOLO file `.json`. Drizzle-kit scansiona
tutti i file nella directory e tenta di parsarli come JSON — qualsiasi altro tipo di file
causa un `SyntaxError` al prossimo `generate`.

**Per ricostruire la catena completa** (non urgente): costruire incrementalmente gli snapshot
0001–0005 partendo da `0000_snapshot.json`, applicando le modifiche di schema di ogni
migration SQL. Ogni snapshot ha formato `{ id, prevId, version, dialect, tables, enums, ... }`
con UUID univoci a catena. Il `prevId` di `0006_snapshot.json` dovrebbe poi essere aggiornato
per puntare all'id di `0005_snapshot.json`.
