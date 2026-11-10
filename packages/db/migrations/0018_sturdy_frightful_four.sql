CREATE TYPE "public"."changelog_categoria" AS ENUM('feature', 'improvement', 'fix', 'security', 'breaking');--> statement-breakpoint
CREATE TYPE "public"."changelog_visibilita" AS ENUM('user', 'developer', 'internal');--> statement-breakpoint
CREATE TYPE "public"."changelog_stato" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "changelog_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"categoria" "changelog_categoria" NOT NULL,
	"visibilita" "changelog_visibilita" DEFAULT 'user' NOT NULL,
	"modulo" text,
	"titolo" text NOT NULL,
	"descrizione" text,
	"link_wiki" text,
	"migration_note" text,
	"ordine" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_release" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"versione" text NOT NULL,
	"titolo" text NOT NULL,
	"descrizione" text,
	"stato" "changelog_stato" DEFAULT 'draft' NOT NULL,
	"data_pubblicazione" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "changelog_change" ADD CONSTRAINT "changelog_change_release_id_changelog_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."changelog_release"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_changelog_release_single_draft" ON "changelog_release" USING btree ("stato") WHERE "changelog_release"."stato" = 'draft';