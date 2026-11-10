CREATE TABLE "worklog_netto_reale" (
	"user_id" text NOT NULL,
	"mese" varchar(7) NOT NULL,
	"netto" numeric(10, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worklog_netto_reale_user_id_mese_pk" PRIMARY KEY("user_id","mese"),
	CONSTRAINT "chk_worklog_netto_reale_netto_nonneg" CHECK ("worklog_netto_reale"."netto" >= 0)
);
--> statement-breakpoint
ALTER TABLE "worklog_netto_reale" ADD CONSTRAINT "worklog_netto_reale_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;