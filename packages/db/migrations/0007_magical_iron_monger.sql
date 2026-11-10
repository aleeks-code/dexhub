CREATE TABLE "worklog_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"entries" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "saldo_alla_data" varchar(10);--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "ferie_residue_ore_iniziali" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "permessi_residui_ore_iniziali" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "rateo_ferie_mensile" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "worklog_contract" ADD COLUMN "rateo_permessi_mensile" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "worklog_templates" ADD CONSTRAINT "worklog_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_worklog_templates_user" ON "worklog_templates" USING btree ("user_id");