ALTER TYPE "public"."worklog_entry_kind" ADD VALUE 'cig';--> statement-breakpoint
CREATE TABLE "worklog_cig_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tipo" varchar(40) DEFAULT 'solidarieta' NOT NULL,
	"coefficiente" numeric(5, 4) DEFAULT '0.596' NOT NULL,
	"massimale_mensile" numeric(10, 2),
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_worklog_cig_config_coefficiente_range" CHECK ("worklog_cig_config"."coefficiente" >= 0 AND "worklog_cig_config"."coefficiente" <= 1)
);
--> statement-breakpoint
ALTER TABLE "worklog_cig_config" ADD CONSTRAINT "worklog_cig_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;