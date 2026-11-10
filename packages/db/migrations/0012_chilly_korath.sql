CREATE TABLE "worklog_variabili_flat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mese" varchar(7) NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"importo" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_worklog_variabili_flat_importo_positivo" CHECK ("worklog_variabili_flat"."importo" >= 0)
);
--> statement-breakpoint
ALTER TABLE "worklog_variabili_flat" ADD CONSTRAINT "worklog_variabili_flat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_worklog_variabili_flat_user_mese" ON "worklog_variabili_flat" USING btree ("user_id","mese");