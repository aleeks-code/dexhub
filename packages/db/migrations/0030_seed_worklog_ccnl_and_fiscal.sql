-- Seed CCNL profiles (Metalmeccanica Industria and Commercio) and Fiscal profile 2026
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
) ON CONFLICT ("id") DO UPDATE SET
  "nome" = EXCLUDED."nome",
  "divisore_orario" = EXCLUDED."divisore_orario",
  "orario_settimanale" = EXCLUDED."orario_settimanale",
  "maggiorazioni" = EXCLUDED."maggiorazioni",
  "limiti_straordinario" = EXCLUDED."limiti_straordinario",
  "banca_ore" = EXCLUDED."banca_ore",
  "turni_standard" = EXCLUDED."turni_standard",
  "fasce_maggiorate" = EXCLUDED."fasce_maggiorate",
  "default_rol_ore_anno" = EXCLUDED."default_rol_ore_anno",
  "default_ex_festivita_ore_anno" = EXCLUDED."default_ex_festivita_ore_anno",
  "valido_fino" = EXCLUDED."valido_fino";

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
) ON CONFLICT ("id") DO UPDATE SET
  "nome" = EXCLUDED."nome",
  "divisore_orario" = EXCLUDED."divisore_orario",
  "orario_settimanale" = EXCLUDED."orario_settimanale",
  "maggiorazioni" = EXCLUDED."maggiorazioni",
  "limiti_straordinario" = EXCLUDED."limiti_straordinario",
  "banca_ore" = EXCLUDED."banca_ore",
  "turni_standard" = EXCLUDED."turni_standard",
  "fasce_maggiorate" = EXCLUDED."fasce_maggiorate",
  "default_rol_ore_anno" = EXCLUDED."default_rol_ore_anno",
  "default_ex_festivita_ore_anno" = EXCLUDED."default_ex_festivita_ore_anno",
  "valido_fino" = EXCLUDED."valido_fino";

INSERT INTO "worklog_fiscal_profile" (
  "anno", "contributi_inps", "scaglioni_irpef", "no_tax_area", "detrazioni_lavoro", "trattamento_integrativo"
) VALUES (
  2026,
  0.09190,
  '[{"fino": 28000, "aliquota": 0.23}, {"fino": 50000, "aliquota": 0.33}, {"fino": null, "aliquota": 0.43}]',
  8500.00,
  '{"fasce": [{"tipo": "flat", "valore_base": 1955, "reddito_fino": 15000}, {"base": 1910, "tipo": "lineare", "aggiunta": 1190, "reddito_da": 15001, "denominatore": 13000, "reddito_fino": 28000}, {"base": 1910, "tipo": "lineare_solo_base", "reddito_da": 28001, "denominatore": 22000, "reddito_fino": 50000}], "bonus": [{"importo": 65, "reddito_da": 25001, "reddito_fino": 35000}]}',
  '{"detrazione_da": 20001, "detrazione_zero_a": 40000, "detrazione_importo": 1000, "fasce_non_imponibili": [{"percentuale": 0.071, "reddito_da": 0, "reddito_fino": 8500}, {"percentuale": 0.053, "reddito_da": 8501, "reddito_fino": 15000}, {"percentuale": 0.048, "reddito_da": 15001, "reddito_fino": 20000}], "detrazione_piatto_fino": 32000}'
) ON CONFLICT ("anno") DO UPDATE SET
  "contributi_inps" = EXCLUDED."contributi_inps",
  "scaglioni_irpef" = EXCLUDED."scaglioni_irpef",
  "no_tax_area" = EXCLUDED."no_tax_area",
  "detrazioni_lavoro" = EXCLUDED."detrazioni_lavoro",
  "trattamento_integrativo" = EXCLUDED."trattamento_integrativo";
