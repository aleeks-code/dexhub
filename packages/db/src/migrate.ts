import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export async function runMigrations(): Promise<void> {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL environment variable is not set')

  const isNeonOrCloud =
    url.includes('neon.tech') ||
    url.includes('render.com') ||
    url.includes('sslmode=require') ||
    process.env['NODE_ENV'] === 'production'
  const isLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('docker.internal')

  // Dedicated single-connection client — never shares the pool
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 15,
    ...(isNeonOrCloud && !isLocal ? { ssl: 'require' } : {}),
  })
  const db = drizzle(sql)

  const candidates = [
    join(__dirname, '..', 'migrations'),
    join(process.cwd(), 'node_modules', '@dexhub', 'db', 'migrations'),
    join(process.cwd(), 'migrations'),
    '/app/api/node_modules/@dexhub/db/migrations',
    '/app/packages/db/migrations',
  ]
  const migrationsFolder = candidates.find((p) => existsSync(p)) ?? candidates[0]!
  process.stdout.write(`[Migrate] Using migrations folder: ${migrationsFolder} (exists: ${existsSync(migrationsFolder)})\n`)
  // NOTE: 0003/0004/0005 are not in drizzle.__drizzle_migrations (applied manually before tracking existed).
  // Drizzle's algorithm skips them permanently: it runs only migrations with when > max(tracked.created_at),
  // and 0009 is already tracked. On a clean DB all 10 run in idx order without conflicts (IF NOT EXISTS guards).

  try {
    await migrate(db, { migrationsFolder })
    process.stdout.write('[Migrate] All migrations successfully applied\n')
  } finally {
    try {
      await sql`ALTER TABLE IF EXISTS "invite_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;`
      await sql`ALTER TABLE IF EXISTS "user_module_preferences" ADD COLUMN IF NOT EXISTS "in_overview" boolean DEFAULT false NOT NULL;`
      await sql`
        CREATE TABLE IF NOT EXISTS "feedbacks" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" text NOT NULL,
          "type" text NOT NULL,
          "title" text NOT NULL,
          "message" text NOT NULL,
          "status" text DEFAULT 'open' NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      `

      // Defensive guarantee: ensure CCNL Metalmeccanica Industria exists
      await sql`
        INSERT INTO "worklog_ccnl_profile" (
          "id", "nome", "divisore_orario", "orario_settimanale", "maggiorazioni", "limiti_straordinario", "banca_ore", "turni_standard", "fasce_maggiorate", "default_rol_ore_anno", "default_ex_festivita_ore_anno", "valido_fino"
        ) VALUES (
          'metalmeccanica-industria',
          'CCNL Metalmeccanica Industria (Federmeccanica-Assistal)',
          173,
          40,
          '{"straordinarioDiurnoFeriale": 0.25, "straordinarioNotturno": 0.55, "straordinarioFestivo": 0.50, "straordinarioFestivoNotturno": 0.75, "notturnoOrdinarioInTurno": 0.15, "pomeridianoInTurno": 0.065}',
          '{"oreGiornoMax": 2, "oreSettimanaMax": 8, "oreAnnoMax": 200, "oreAnnoMaxConAccordo": 250}',
          '{"maggiorazioneConfluita": 0.50}',
          '{"mattino": {"inizio": "06:00"}, "pomeriggio": {"inizio": "14:00"}, "notte": {"inizio": "22:00"}}',
          '{"notturnoOrdinarioInTurno": {"da": "22:00", "a": "06:00", "percentuale": 0.20}, "pomeridianoInTurno": {"da": "18:00", "a": "22:00", "percentuale": 0.20}}',
          72,
          32,
          '2027-05-31'
        ) ON CONFLICT ("id") DO NOTHING;
      `

      // Defensive guarantee: ensure CCNL Commercio exists
      await sql`
        INSERT INTO "worklog_ccnl_profile" (
          "id", "nome", "divisore_orario", "orario_settimanale", "maggiorazioni", "limiti_straordinario", "banca_ore", "turni_standard", "fasce_maggiorate", "default_rol_ore_anno", "default_ex_festivita_ore_anno", "valido_fino"
        ) VALUES (
          'commercio-terziario',
          'CCNL Commercio e Terziario (Confcommercio)',
          168,
          40,
          '{"straordinarioDiurnoFeriale": 0.15, "straordinarioNotturno": 0.50, "straordinarioFestivo": 0.30, "straordinarioFestivoNotturno": 0.60, "notturnoOrdinarioInTurno": 0.15, "pomeridianoInTurno": 0.05}',
          '{"oreGiornoMax": 2, "oreSettimanaMax": 8, "oreAnnoMax": 200, "oreAnnoMaxConAccordo": 250}',
          '{"maggiorazioneConfluita": 0.50}',
          '{"mattino": {"inizio": "06:00"}, "pomeriggio": {"inizio": "14:00"}, "notte": {"inizio": "22:00"}}',
          '{"notturnoOrdinarioInTurno": {"da": "22:00", "a": "06:00", "percentuale": 0.15}, "pomeridianoInTurno": {"da": "18:00", "a": "22:00", "percentuale": 0.10}}',
          56,
          32,
          '2027-03-31'
        ) ON CONFLICT ("id") DO NOTHING;
      `

      // Defensive guarantee: ensure fiscal profile 2026 exists
      await sql`
        INSERT INTO "worklog_fiscal_profile" (
          "anno", "contributi_inps", "scaglioni_irpef", "no_tax_area", "detrazioni_lavoro", "trattamento_integrativo"
        ) VALUES (
          2026,
          0.09190,
          '[{"fino": 28000, "aliquota": 0.23}, {"fino": 50000, "aliquota": 0.33}, {"fino": null, "aliquota": 0.43}]',
          8500.00,
          '{"fasce": [{"tipo": "flat", "valore_base": 1955, "reddito_fino": 15000}, {"base": 1910, "tipo": "lineare", "aggiunta": 1190, "reddito_da": 15001, "denominatore": 13000, "reddito_fino": 28000}, {"base": 1910, "tipo": "lineare_solo_base", "reddito_da": 28001, "denominatore": 22000, "reddito_fino": 50000}], "bonus": [{"importo": 65, "reddito_da": 25001, "reddito_fino": 35000}]}',
          '{"detrazione_da": 20001, "detrazione_zero_a": 40000, "detrazione_importo": 1000, "fasce_non_imponibili": [{"percentuale": 0.071, "reddito_da": 0, "reddito_fino": 8500}, {"percentuale": 0.053, "reddito_da": 8501, "reddito_fino": 15000}, {"percentuale": 0.048, "reddito_da": 15001, "reddito_fino": 20000}], "detrazione_piatto_fino": 32000}'
        ) ON CONFLICT ("anno") DO NOTHING;
      `

      // Defensive guarantee: ensure CIG historical massimali table and 2026 entry exist
      await sql`
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
      `
      await sql`
        INSERT INTO "worklog_cig_massimale" ("anno", "massimale_lordo", "massimale_netto", "aliquota_riduzione", "circolare_inps", "note", "documento_url")
        VALUES 
          (2026, 1423.69, 1340.56, 0.05840, 'Circolare INPS n. 4 del 28/01/2026', 'Massimali Cassa Integrazione Guadagni e Contratti di Solidarietà anno 2026', '/docs/volantino-cig-2026.pdf'),
          (2025, 1392.89, 1311.56, 0.05840, 'Circolare INPS n. 25 del 29/01/2025', 'Massimali Cassa Integrazione Guadagni anno 2025', NULL),
          (2024, 1317.07, 1240.15, 0.05840, 'Circolare INPS n. 25 del 29/01/2024', 'Massimali Cassa Integrazione Guadagni anno 2024', NULL)
        ON CONFLICT ("anno") DO NOTHING;
      `
    } catch (e) {
      process.stderr.write(`[Migrate] Schema sync note: ${e}\n`)
    }
    await sql.end()
  }
}
