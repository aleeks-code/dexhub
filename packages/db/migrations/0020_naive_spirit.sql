CREATE TABLE "worklog_cometa_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"iscritto" boolean DEFAULT false NOT NULL,
	"coefficiente" numeric(5, 4),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_worklog_cometa_config_coefficiente_range" CHECK ("worklog_cometa_config"."coefficiente" IS NULL OR ("worklog_cometa_config"."coefficiente" >= 0 AND "worklog_cometa_config"."coefficiente" <= 1))
);
--> statement-breakpoint
ALTER TABLE "worklog_cometa_config" ADD CONSTRAINT "worklog_cometa_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;