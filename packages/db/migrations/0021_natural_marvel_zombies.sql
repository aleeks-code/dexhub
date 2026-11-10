CREATE TABLE "worklog_addizionali_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"attivo" boolean DEFAULT false NOT NULL,
	"addizionale_regionale" numeric(10, 2) DEFAULT '0' NOT NULL,
	"addizionale_comunale" numeric(10, 2) DEFAULT '0' NOT NULL,
	"acconto_comunale" numeric(10, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_worklog_addizionali_config_regionale_nonneg" CHECK ("worklog_addizionali_config"."addizionale_regionale" >= 0),
	CONSTRAINT "chk_worklog_addizionali_config_comunale_nonneg" CHECK ("worklog_addizionali_config"."addizionale_comunale" >= 0),
	CONSTRAINT "chk_worklog_addizionali_config_acconto_nonneg" CHECK ("worklog_addizionali_config"."acconto_comunale" >= 0)
);
--> statement-breakpoint
ALTER TABLE "worklog_addizionali_config" ADD CONSTRAINT "worklog_addizionali_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;