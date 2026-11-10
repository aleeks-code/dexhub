CREATE TYPE "public"."worklog_regime_orario" AS ENUM('giornaliero', 'turnista');--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "regime_orario" "worklog_regime_orario";--> statement-breakpoint
ALTER TABLE "worklog_ccnl_profile" ADD COLUMN "turni_standard" jsonb;--> statement-breakpoint
ALTER TABLE "worklog_ccnl_profile" ADD COLUMN "fasce_maggiorate" jsonb;