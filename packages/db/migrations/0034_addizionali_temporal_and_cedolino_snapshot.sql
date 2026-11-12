ALTER TABLE "worklog_addizionali_config" ADD COLUMN IF NOT EXISTS "mese_inizio" integer DEFAULT 3 NOT NULL;
ALTER TABLE "worklog_addizionali_config" ADD COLUMN IF NOT EXISTS "mese_fine" integer DEFAULT 11 NOT NULL;
ALTER TABLE "worklog_netto_reale" ADD COLUMN IF NOT EXISTS "cedolino_snapshot" jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_worklog_addizionali_config_mese_inizio') THEN
    ALTER TABLE "worklog_addizionali_config" ADD CONSTRAINT "chk_worklog_addizionali_config_mese_inizio" CHECK ("mese_inizio" >= 1 AND "mese_inizio" <= 12);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_worklog_addizionali_config_mese_fine') THEN
    ALTER TABLE "worklog_addizionali_config" ADD CONSTRAINT "chk_worklog_addizionali_config_mese_fine" CHECK ("mese_fine" >= 1 AND "mese_fine" <= 12);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_worklog_addizionali_config_mesi_range') THEN
    ALTER TABLE "worklog_addizionali_config" ADD CONSTRAINT "chk_worklog_addizionali_config_mesi_range" CHECK ("mese_inizio" <= "mese_fine");
  END IF;
END $$;

