CREATE TABLE "worklog_mensa_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"attivo" boolean DEFAULT false NOT NULL,
	"importo" numeric(10, 2) DEFAULT '0.77' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worklog_days" ADD COLUMN "meal_override" boolean;--> statement-breakpoint
ALTER TABLE "worklog_mensa_config" ADD CONSTRAINT "worklog_mensa_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;