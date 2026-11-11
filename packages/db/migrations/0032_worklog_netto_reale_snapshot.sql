ALTER TABLE "worklog_netto_reale" ADD COLUMN IF NOT EXISTS "stima_netto_snapshot" numeric(10, 2);
ALTER TABLE "worklog_netto_reale" ADD COLUMN IF NOT EXISTS "stima_snapshot" jsonb;
ALTER TABLE "worklog_netto_reale" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
