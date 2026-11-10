DO $$ BEGIN
  CREATE TYPE "public"."worklog_entry_kind" AS ENUM('work', 'overtime', 'vacation', 'leave', 'sick', 'holiday', 'rest', 'recovery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "worklog_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "worklog_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"kind" "worklog_entry_kind" NOT NULL,
	"hours" numeric(4, 2) NOT NULL,
	"modifiers" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "worklog_contract" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ore_giornaliere_standard" numeric(4, 2) DEFAULT '8' NOT NULL,
	"ore_lavorative_settimanali" numeric(4, 2) DEFAULT '40' NOT NULL,
	"giorni_lavorativi_settimana" integer[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worklog_days" ADD CONSTRAINT "worklog_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklog_entries" ADD CONSTRAINT "worklog_entries_day_id_worklog_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."worklog_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD CONSTRAINT "worklog_contract_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_worklog_days_user_date" ON "worklog_days" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_worklog_days_user" ON "worklog_days" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_worklog_entries_day" ON "worklog_entries" USING btree ("day_id");
