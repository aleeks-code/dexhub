CREATE TYPE "public"."worklog_retribuzione_tipo" AS ENUM('hourly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."worklog_tipo_contratto" AS ENUM('ordinario', 'apprendistato');--> statement-breakpoint
CREATE TABLE "worklog_retribuzione" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"decorrenza" varchar(7) NOT NULL,
	"tipo" "worklog_retribuzione_tipo" NOT NULL,
	"importo" numeric(10, 2) NOT NULL,
	"premio_fisso" numeric(10, 2),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worklog_ccnl_profile" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"divisore_orario" numeric(5, 2) NOT NULL,
	"orario_settimanale" numeric(4, 1) NOT NULL,
	"maggiorazioni" jsonb NOT NULL,
	"limiti_straordinario" jsonb NOT NULL,
	"banca_ore" jsonb,
	"default_rol_ore_anno" numeric(6, 2),
	"default_ex_festivita_ore_anno" numeric(6, 2),
	"valido_fino" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worklog_fiscal_profile" (
	"anno" integer PRIMARY KEY NOT NULL,
	"contributi_inps" numeric(6, 5) NOT NULL,
	"scaglioni_irpef" jsonb NOT NULL,
	"no_tax_area" numeric(10, 2) NOT NULL,
	"detrazioni_lavoro" jsonb NOT NULL,
	"trattamento_integrativo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worklog_user_fiscal_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ccnl_id" varchar(50) NOT NULL,
	"tipo_contratto" "worklog_tipo_contratto" DEFAULT 'ordinario' NOT NULL,
	"regione" varchar(50),
	"comune" varchar(100),
	"aliquota_add_regionale" numeric(6, 5),
	"aliquota_add_comunale" numeric(6, 5),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worklog_retribuzione" ADD CONSTRAINT "worklog_retribuzione_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklog_user_fiscal_config" ADD CONSTRAINT "worklog_user_fiscal_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklog_user_fiscal_config" ADD CONSTRAINT "worklog_user_fiscal_config_ccnl_id_worklog_ccnl_profile_id_fk" FOREIGN KEY ("ccnl_id") REFERENCES "public"."worklog_ccnl_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_worklog_retribuzione_user_dec" ON "worklog_retribuzione" USING btree ("user_id","decorrenza");