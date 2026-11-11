CREATE TABLE IF NOT EXISTS "worklog_cig_massimale" (
	"anno" integer PRIMARY KEY NOT NULL,
	"massimale_lordo" numeric(10, 2) NOT NULL,
	"massimale_netto" numeric(10, 2) NOT NULL,
	"aliquota_riduzione" numeric(6, 5) DEFAULT '0.05840' NOT NULL,
	"circolare_inps" text,
	"note" text,
	"documento_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "worklog_cig_massimale" ("anno", "massimale_lordo", "massimale_netto", "aliquota_riduzione", "circolare_inps", "note", "documento_url")
VALUES 
  (2026, 1423.69, 1340.56, 0.05840, 'Circolare INPS n. 4 del 28/01/2026', 'Massimali Cassa Integrazione Guadagni e Contratti di Solidarietà anno 2026', '/docs/volantino-cig-2026.pdf'),
  (2025, 1392.89, 1311.56, 0.05840, 'Circolare INPS n. 25 del 29/01/2025', 'Massimali Cassa Integrazione Guadagni anno 2025', NULL),
  (2024, 1317.07, 1240.15, 0.05840, 'Circolare INPS n. 25 del 29/01/2024', 'Massimali Cassa Integrazione Guadagni anno 2024', NULL)
ON CONFLICT ("anno") DO UPDATE SET
  "massimale_lordo" = EXCLUDED."massimale_lordo",
  "massimale_netto" = EXCLUDED."massimale_netto",
  "aliquota_riduzione" = EXCLUDED."aliquota_riduzione",
  "circolare_inps" = EXCLUDED."circolare_inps",
  "note" = EXCLUDED."note",
  "documento_url" = EXCLUDED."documento_url";
