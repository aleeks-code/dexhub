ALTER TABLE "worklog_addizionali_config" ADD COLUMN IF NOT EXISTS "mese_inizio" integer DEFAULT 3 NOT NULL;
ALTER TABLE "worklog_addizionali_config" ADD COLUMN IF NOT EXISTS "mese_fine" integer DEFAULT 11 NOT NULL;
ALTER TABLE "worklog_netto_reale" ADD COLUMN IF NOT EXISTS "cedolino_snapshot" jsonb;
