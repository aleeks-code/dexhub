import { extractText, extractTextItems } from 'unpdf'

export interface CedolinoHoursBreakdown {
  ordinarie: number
  ferie: number
  permessi: number          // ROL + PAR + permessi retribuiti
  malattia: number
  cig: number
  congedo: number           // Totale congedo parentale o straordinario (in ore)
  congedo80: number         // Congedo parentale indennizzato 80% (in ore)
  congedo30: number         // Congedo parentale indennizzato 30% (in ore)
  straordinario: number
  notturno: number
  pomeridiano: number
  altreAssenze: number      // Assemblea sindacale, ecc.
}

export interface CedolinoResidui {
  ferie: number | null
  permessi: number | null
  rol: number | null
}

export interface CedolinoRetribuzione {
  importo: number
  minimoTabellare: number | null
  premioProduzioneFisso: number | null
  scattiAnzianita: number | null
  superminimo: number | null
}

export interface CedolinoAddizionaliRilevate {
  rataRegionale: number
  rataComunale: number
  accontoComunale: number
  totale: number
  residuoRegionale?: number | null
  residuoComunale?: number | null
  residuoAcconto?: number | null
}

export interface CedolinoPrevidenzaRilevata {
  imponibileInps: number | null
  contributiInps: number | null
  aliquotaInpsCalcolata: number | null // e.g. 0.0949
}

export interface CedolinoTrattenuteRilevate {
  sindacato: number | null
  cometa: number | null
  mensaTotale: number | null
  mensaPasti: number | null
  mensaUnitario: number | null
  impostaSostitutivaPremi: number | null
}

export interface CedolinoFiscaleRilevato {
  totaleLordo: number | null
  imponibileIrpef: number | null
  irpefLorda: number | null
  detrazioniLavoro: number | null
  irpefNetta: number | null
}

export interface CedolinoCongedoRilevato {
  indennitaInps: number | null
  stornoAzienda: number | null
  ore: number | null
  giorni: number | null
}

export interface CedolinoCigDettaglio {
  ore: number
  storno: number
  integrazioneNetta: number
  coefficienteEffettivo: number
}

export interface CedolinoMaggiorazioneTurno {
  ore: number
  tariffa: number | null
  importo: number | null
  percentuale: number
  tipoSuggerito: 'pomeridiano' | 'notturno'
}

export interface CedolinoPremiRisultato {
  totalePremi: number
  totaleImpostaSostitutiva: number
  imponibile5?: number
  imposta5?: number
  imponibile15?: number
  imposta15?: number
}

export interface CedolinoParsedData {
  mese: string | null       // 'YYYY-MM'
  meseNome?: string         // e.g. 'Settembre 2026'
  netto: number | null      // e.g. 1732.74
  datiDipendente?: {
    nome?: string
    azienda?: string
    ccnl?: string
    qualifica?: string
  }
  retribuzione?: CedolinoRetribuzione | null
  ore: CedolinoHoursBreakdown
  pastiMensa: number
  residui: CedolinoResidui
  addizionali: CedolinoAddizionaliRilevate
  previdenza: CedolinoPrevidenzaRilevata
  trattenute: CedolinoTrattenuteRilevate
  fiscale: CedolinoFiscaleRilevato
  congedo: CedolinoCongedoRilevato
  cigDettaglio?: CedolinoCigDettaglio | null
  maggiorazioniTurno?: CedolinoMaggiorazioneTurno | null
  premiRisultato?: CedolinoPremiRisultato | null
  rawRows: Array<{ code?: string; desc: string; qty: number; value?: number }>
}

const ITALIAN_MONTHS_MAP: Record<string, string> = {
  gennaio: '01',
  febbraio: '02',
  marzo: '03',
  aprile: '04',
  maggio: '05',
  giugno: '06',
  luglio: '07',
  agosto: '08',
  settembre: '09',
  ottobre: '10',
  novembre: '11',
  dicembre: '12',
}

const ITALIAN_MONTH_NAMES: Record<string, string> = {
  '01': 'Gennaio',
  '02': 'Febbraio',
  '03': 'Marzo',
  '04': 'Aprile',
  '05': 'Maggio',
  '06': 'Giugno',
  '07': 'Luglio',
  '08': 'Agosto',
  '09': 'Settembre',
  '10': 'Ottobre',
  '11': 'Novembre',
  '12': 'Dicembre',
}

export function parseItalianNumber(str: string): number | null {
  if (!str) return null
  const cleaned = str.replace(/[€$£%\s]/g, '').trim()
  if (!cleaned) return null
  const isNegative = cleaned.startsWith('-') || cleaned.endsWith('-')
  const numOnly = cleaned.replace(/-/g, '')
  if (/^[0-9]{1,3}(\.[0-9]{3})+(,[0-9]+)?$/.test(numOnly)) {
    const norm = numOnly.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(norm)
    return isNaN(n) ? null : isNegative ? -n : n
  }
  if (/^[0-9]+,[0-9]+$/.test(numOnly)) {
    const norm = numOnly.replace(',', '.')
    const n = parseFloat(norm)
    return isNaN(n) ? null : isNegative ? -n : n
  }
  const n = parseFloat(numOnly)
  return isNaN(n) ? null : isNegative ? -n : n
}

export async function extractCedolinoFromPdfBuffer(
  buffer: ArrayBuffer | Uint8Array,
): Promise<CedolinoParsedData> {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // Pass separate copies to prevent buffer detach issues in unpdf/pdfjs
  const bytes1 = new Uint8Array(bytes)
  const bytes2 = new Uint8Array(bytes)

  const textRes = await extractText(bytes1)
  const itemsRes = await extractTextItems(bytes2)

  const fullText = Array.isArray(textRes.text) ? textRes.text.join('\n') : textRes.text
  const lines = fullText.split('\n')

  // ── 1. Mese e Anno di competenza ───────────────────────────────────────────
  let detectedMese: string | null = null
  let detectedMeseNome: string | undefined = undefined

  const monthRegex =
    /\b(GENNAIO|FEBBRAIO|MARZO|APRILE|MAGGIO|GIUGNO|LUGLIO|AGOSTO|SETTEMBRE|OTTOBRE|NOVEMBRE|DICEMBRE)\s+(\d{4})\b/i
  const mMatch = fullText.match(monthRegex)
  if (mMatch) {
    const name = mMatch[1]!.toLowerCase()
    const year = mMatch[2]!
    const mm = ITALIAN_MONTHS_MAP[name]
    if (mm) {
      detectedMese = `${year}-${mm}`
      detectedMeseNome = `${ITALIAN_MONTH_NAMES[mm]} ${year}`
    }
  }

  if (!detectedMese) {
    const numPeriodRegex =
      /(?:MESE\s+RETRIBUITO|COMPETENZA|PERIODO|CEDOLINO)[\s:]*([0-1]?[0-9])[\/\-](20\d\d)/i
    const numMatch = fullText.match(numPeriodRegex)
    if (numMatch) {
      const mm = numMatch[1]!.padStart(2, '0')
      const year = numMatch[2]!
      detectedMese = `${year}-${mm}`
      detectedMeseNome = `${ITALIAN_MONTH_NAMES[mm] ?? mm} ${year}`
    }
  }

  // ── 2. Netto in busta ──────────────────────────────────────────────────────
  let detectedNetto: number | null = null
  const allPages = itemsRes.items ?? []
  const lastPageItems = allPages[allPages.length - 1] ?? []

  // Geometric extraction on last page
  const nettoHeader = lastPageItems.find((i) =>
    /NETTO\s*(?:BUSTA|DEL\s+MESE|A\s+PAGARE|DA\s+PAGARE|IN\s+BUSTA)/i.test(i.str),
  )

  if (nettoHeader) {
    const candidates = lastPageItems.filter((i) => {
      const dy = nettoHeader.y - i.y
      const dx = Math.abs(i.x - nettoHeader.x)
      // Matches directly below (dy 5-45, dx < 80) or directly to the right (dy < 10, dx 10-200)
      const isBelow = dy > 5 && dy < 45 && dx < 80
      const isRight = Math.abs(dy) < 10 && i.x > nettoHeader.x && (i.x - nettoHeader.x) < 200
      if (!isBelow && !isRight) return false
      return /^[0-9]{1,3}(\.[0-9]{3})*,[0-9]{2}$/.test(i.str.trim())
    })

    if (candidates.length > 0) {
      // Pick closest
      candidates.sort((a, b) => Math.abs(nettoHeader.y - a.y) - Math.abs(nettoHeader.y - b.y))
      detectedNetto = parseItalianNumber(candidates[0]!.str)
    }
  }

  // Fallback regex on full text
  if (detectedNetto === null || detectedNetto <= 0) {
    const textNettoMatch = fullText.match(
      /(?:NETTO\s+(?:BUSTA|DEL\s+MESE|A\s+PAGARE|DA\s+PAGARE|IN\s+BUSTA|SPETTANTE)|TOTALE\s+NETTO)[\s\S]{0,120}?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
    )
    if (textNettoMatch) {
      detectedNetto = parseItalianNumber(textNettoMatch[1]!)
    }
  }

  // ── 3. Righe del Cedolino & Ripartizione Ore ────────────────────────────────
  const rawRows: CedolinoParsedData['rawRows'] = []

  let ordinarie = 0
  let ferie = 0
  let permessi = 0
  let malattia = 0
  let cig = 0
  let congedo80Days = 0
  let congedo80Ore = 0
  let congedo30Days = 0
  let congedo30Ore = 0
  let straordinario = 0
  let notturno = 0
  let pomeridiano = 0
  let pastiMensa = 0
  let altreAssenze = 0

  let stornoCigTotale = 0
  let integrazioneSolidarietaTotale = 0
  let oreCigEffettive = 0

  let premioAssog5Imponibile = 0
  let premioAssog5Imposta = 0
  let premioAssog15Imponibile = 0
  let premioAssog15Imposta = 0

  let rilevataMaggiorazione: CedolinoMaggiorazioneTurno | null = null

  for (const line of lines) {
    const rowMatch = line.match(/^\s*(\d{1,5})\s+([a-zA-Z0-9\.\'\/\-\s%]+?)\s+([0-9]+,[0-9]{2,5})\b/)
    if (!rowMatch) continue

    const code = rowMatch[1]
    const rawDesc = rowMatch[2]!.trim()
    const desc = rawDesc.toUpperCase()
    const qty = parseItalianNumber(rowMatch[3]!) ?? 0

    // Estrae tutti i token numerici della riga per recuperare l'eventuale controvalore in euro
    const numTokens = line.match(/-?[0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2,5}-?|-?[0-9]+,[0-9]{2,5}-?/g)
    let lineValue: number | undefined = undefined
    if (numTokens && numTokens.length > 1) {
      const lastToken = numTokens[numTokens.length - 1]!
      lineValue = parseItalianNumber(lastToken) ?? undefined
    }

    rawRows.push({ code, desc: rawDesc, qty, value: lineValue })

    // Categorization
    if (desc.includes('NOTT')) {
      notturno += qty
      const perc = desc.includes('20%') ? 0.20 : desc.includes('25%') ? 0.25 : desc.includes('30%') ? 0.30 : 0.20
      const tariffa = numTokens && numTokens.length >= 3 ? parseItalianNumber(numTokens[1]!) : null
      rilevataMaggiorazione = {
        ore: qty,
        tariffa,
        importo: lineValue ?? null,
        percentuale: perc,
        // Nel CCNL Metalmeccanico (es. Bondioli & Pavesi), 20% serale 18-22 è turno pomeridiano (4h magg/giorno)
        tipoSuggerito: perc === 0.20 ? 'pomeridiano' : 'notturno',
      }
      if (perc === 0.20) {
        pomeridiano += qty
      }
    } else if (desc.includes('POMERID')) {
      pomeridiano += qty
      const tariffa = numTokens && numTokens.length >= 3 ? parseItalianNumber(numTokens[1]!) : null
      rilevataMaggiorazione = {
        ore: qty,
        tariffa,
        importo: lineValue ?? null,
        percentuale: 0.20,
        tipoSuggerito: 'pomeridiano',
      }
    } else if (desc.includes('STRAORDINAR') || desc.includes('ORE STR')) {
      straordinario += qty
    } else if (desc.includes('FERIE') && !desc.includes('RES') && !desc.includes('A.P.') && !desc.includes('MAT.')) {
      ferie += qty
    } else if (/\b(?:P\.A\.R\.?|PAR|ROL|PERMESSI)\b/i.test(desc) && !desc.includes('RES') && !desc.includes('A.P.') && !desc.includes('MAT.')) {
      permessi += qty
    } else if (desc.includes('MALATTIA')) {
      malattia += qty
    } else if (desc.includes('RECUPERO') && (desc.includes('CIG') || desc.includes('C.I.G.'))) {
      // Storno/recupero ore CIG aziendale
      cig += qty
      oreCigEffettive += qty
      if (lineValue !== undefined) {
        stornoCigTotale = Math.round((stornoCigTotale + Math.abs(lineValue)) * 100) / 100
      }
    } else if (desc.includes('SOLIDARIETA')) {
      // Integrazione netta Solidarietà erogata per conto INPS (voce 9294)
      if (lineValue !== undefined) {
        integrazioneSolidarietaTotale = Math.round((integrazioneSolidarietaTotale + Math.abs(lineValue)) * 100) / 100
      }
    } else if (desc.includes('CIG') || desc.includes('CASSA INT')) {
      cig += qty
      oreCigEffettive += qty
    } else if (desc.includes('CONG') || desc.includes('MATERN') || desc.includes('PATERN')) {
      // In Italian payslips (like TeamSystem 9814 CONG.PARENTALE), qty is usually in days (1.00, 2.00)
      const is30 = desc.includes('30%') || desc.includes(' 30')
      if (is30) {
        if (qty <= 15) {
          congedo30Days += qty
        } else {
          congedo30Ore += qty
        }
      } else {
        if (qty <= 15) {
          congedo80Days += qty
        } else {
          congedo80Ore += qty
        }
      }
    } else if (desc.includes('PASTI') || desc.includes('MENSA')) {
      if (!desc.includes('PAUSA') && !desc.includes('INDENNITA')) {
        pastiMensa += qty
      }
    } else if (desc.includes('ASSEMB') || desc.includes('SINDAC')) {
      altreAssenze += qty
    } else if (desc.includes('ORE LAV') && !desc.includes('STR')) {
      ordinarie += qty
    }

    // Premi di risultato L.199/25 detassati
    if (desc.includes('L.199/25') || desc.includes('L. 199/25')) {
      if (desc.includes('ASSOG.5%') || desc.includes('IMPONIBILE 5%')) {
        premioAssog5Imponibile = lineValue ?? qty
      } else if (desc.includes('IMPOSTA SOST. 5%') || desc.includes('IMPOSTA SOST.5%')) {
        premioAssog5Imposta = lineValue ?? qty
      } else if (desc.includes('ASSOG. 15%') || desc.includes('ASSOG.15%') || desc.includes('IMPONIBILE 15%')) {
        premioAssog15Imponibile = lineValue ?? qty
      } else if (desc.includes('IMPOSTA SOST. 15%') || desc.includes('IMPOSTA SOST.15%')) {
        premioAssog15Imposta = lineValue ?? qty
      }
    }
  }

  // ── 4. Residui (Ferie, Permessi, ROL) ──────────────────────────────────────
  let ferieResidue: number | null = null
  let permessiResidui: number | null = null
  let rolResidui: number | null = null

  // In TeamSystem/table cedolini, match column values under header row
  const residueHeaders = lastPageItems.filter((i) =>
    /\b(?:FERIE\s*RES|PERMESSI\s*RES|ROL\.?\s*RES)\b/i.test(i.str),
  )

  for (const h of residueHeaders) {
    const below = lastPageItems.filter((i) => {
      const dy = h.y - i.y
      const dx = i.x - h.x
      // Value is below header (dy 5-30) and column-aligned (dx between -5 and 35)
      return dy > 5 && dy < 35 && dx >= -5 && dx < 40 && /^-?[0-9]+,[0-9]{2}$/.test(i.str.trim())
    })

    if (below.length > 0) {
      const val = parseItalianNumber(below[0]!.str)
      if (/FERIE\s*RES/i.test(h.str)) ferieResidue = val
      else if (/PERMESSI\s*RES/i.test(h.str)) permessiResidui = val
      else if (/ROL\.?\s*RES/i.test(h.str)) rolResidui = val
    }
  }

  // Dati dipendente (optional)
  let nomeDipendente: string | undefined = undefined
  let azienda: string | undefined = undefined

  const dittaMatch = fullText.match(/(?:Ditta|Azienda|Datore)[\s\S]{0,80}?([A-Z0-9\s&,\.\'\-]+?(?:S\.p\.A\.|S\.r\.l\.|SRL|SPA))/i)
  if (dittaMatch) {
    azienda = dittaMatch[1]!.trim()
  }

  const nomeMatch = fullText.match(/(?:COGNOME\s+E\s+NOME)[\s\S]{0,100}?\b([A-Z\']+\s+[A-Z\']+)\b/)
  if (nomeMatch) {
    nomeDipendente = nomeMatch[1]!.trim()
  }

  // ── 5. Retribuzione Fissa (Paga Base, Premio Prod, Scatti) ───────────────
  let retribuzioneEstretta: CedolinoRetribuzione | null = null

  // In TeamSystem: riga "PAGA BASE PREM.PROD. SC. ANZ." seguita da riga numerica
  const pbIndex = lines.findIndex((l) => /PAGA\s*BASE/i.test(l))
  if (pbIndex !== -1 && pbIndex + 1 < lines.length) {
    const nextLine = lines[pbIndex + 1]!.trim()
    const nums = nextLine.split(/\s+/).map((s) => parseItalianNumber(s))
    const n0 = nums[0]
    const n1 = nums[1]
    const n2 = nums[2]
    if (typeof n0 === 'number' && n0 > 0) {
      const minimo = n0
      const premio = typeof n1 === 'number' ? n1 : 0
      const scatti = typeof n2 === 'number' ? n2 : 0
      const totale = Math.round((minimo + premio + scatti) * 100) / 100

      retribuzioneEstretta = {
        importo: totale,
        minimoTabellare: minimo,
        premioProduzioneFisso: premio,
        scattiAnzianita: scatti,
        superminimo: 0,
      }
    }
  }

  // Fallback pattern generico
  if (!retribuzioneEstretta) {
    const retribBaseMatch = fullText.match(
      /(?:RETRIBUZIONE\s+(?:BASE|DI\s+FATTO|LORDA|MENSILE))[\s\S]{0,50}?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
    )
    if (retribBaseMatch) {
      const val = parseItalianNumber(retribBaseMatch[1]!)
      if (val !== null && val > 0) {
        retribuzioneEstretta = {
          importo: val,
          minimoTabellare: val,
          premioProduzioneFisso: null,
          scattiAnzianita: null,
          superminimo: null,
        }
      }
    }
  }

  // ── 6. Rilevazione Addizionali IRPEF, Previdenza, Fiscale, Trattenute ─────
  let rataRegionale = 0
  let rataComunale = 0
  let accontoComunale = 0
  let residuoRegionale: number | null = null
  let residuoComunale: number | null = null
  let residuoAcconto: number | null = null

  let cometaImporto: number | null = null
  let sindacatoImporto: number | null = null
  let mensaTotale: number | null = null
  let mensaUnitario: number | null = null
  let mensaPastiQty: number | null = null
  let impostaSostitutivaTotale = 0

  let indennitaCongedoTotale = 0
  let stornoAziendaCongedo: number | null = null

  let lordoRilevato: number | null = null
  let imponibileInpsRilevato: number | null = null
  let contributiInpsRilevati: number | null = null
  let imponibileIrpefRilevato: number | null = null
  let irpefLordaRilevata: number | null = null
  let detrazioniLavoroRilevate: number | null = null
  let irpefNettaRilevata: number | null = null

  for (const line of lines) {
    // Addizionale regionale
    const regMatch = line.match(/(?:RATA\s+ADDIZ\.?\s*REGIONALE|ADDIZ\.?\s*REGIONALE\s*A\.?P\.?)[^\d]*([0-9]+,[0-9]{2})(?:\s+Res:\s*([0-9]+,[0-9]{2}))?/i)
    if (regMatch) {
      rataRegionale = parseItalianNumber(regMatch[1]!) ?? 0
      if (regMatch[2]) residuoRegionale = parseItalianNumber(regMatch[2])
    }

    // Addizionale comunale
    const comMatch = line.match(/(?:RATA\s+ADDIZ\.?\s*COMUNALE|ADDIZ\.?\s*COMUNALE\s*A\.?P\.?)[^\d]*([0-9]+,[0-9]{2})(?:\s+Res:\s*([0-9]+,[0-9]{2}))?/i)
    if (comMatch && !line.includes('ACCONTO')) {
      rataComunale = parseItalianNumber(comMatch[1]!) ?? 0
      if (comMatch[2]) residuoComunale = parseItalianNumber(comMatch[2])
    }

    // Acconto comunale
    const accMatch = line.match(/(?:ACCONTO\s+ADD\.?LE\s+COMUNALE|ACCONTO\s+ADDIZ\.?\s*COMUNALE)[^\d]*([0-9]+,[0-9]{2})(?:\s+Res:\s*([0-9]+,[0-9]{2}))?/i)
    if (accMatch) {
      accontoComunale = parseItalianNumber(accMatch[1]!) ?? 0
      if (accMatch[2]) residuoAcconto = parseItalianNumber(accMatch[2])
    }

    // Cometa dipendente
    const cometaMatch = line.match(/(?:CONTRIB\.?\s*DIP\.?\s*F\.?DO\s*COMETA|F\.DO\s*COMETA\s*DIP)[^\d]*([0-9]+,[0-9]{2})/i)
    if (cometaMatch && !line.includes('Azienda') && !line.includes('TFR')) {
      cometaImporto = parseItalianNumber(cometaMatch[1]!)
    }

    // Mensa corrispettivo pasti
    const mensaMatch = line.match(/(?:CORRISPETTIVO\s+PASTI|TRATT\.?\s*MENSA)\s+([0-9]+,[0-9]{2})\s+([0-9]+,[0-9]{2,5})\s+([0-9]+,[0-9]{2})/i)
    if (mensaMatch) {
      mensaPastiQty = parseItalianNumber(mensaMatch[1]!)
      mensaUnitario = parseItalianNumber(mensaMatch[2]!)
      mensaTotale = parseItalianNumber(mensaMatch[3]!)
    }

    // Imposta sostitutiva premi (L.199/25)
    const impSostMatch = line.match(/IMPOSTA\s+SOST\.?(?:[0-9% ]+L\.199\/25)?[^\d]*([0-9]+,[0-9]{2})/i)
    if (impSostMatch) {
      impostaSostitutivaTotale = Math.round((impostaSostitutivaTotale + (parseItalianNumber(impSostMatch[1]!) ?? 0)) * 100) / 100
    }

    // Congedo indennità INPS
    if (/CONG\.PARENTALE\s+C\/INPS/i.test(line)) {
      const parts = line.trim().split(/\s+/)
      const last = parts[parts.length - 1]
      const val = parseItalianNumber(last ?? '')
      if (val !== null && val > 0) {
        indennitaCongedoTotale = Math.round((indennitaCongedoTotale + val) * 100) / 100
      }
    }

    // Recupero stipendio assenze
    const recMatch = line.match(/RECUPERO\s+STIPENDIO.*?([0-9]+,[0-9]{2})\b/i)
    if (recMatch) {
      stornoAziendaCongedo = parseItalianNumber(recMatch[1]!)
    }

    // Previdenza line: es. "2.042,21 2.042,00 193,79 193,79"
    const prevMatch = line.match(/^\s*([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s*$/)
    if (prevMatch) {
      const l = parseItalianNumber(prevMatch[1]!)
      const inps = parseItalianNumber(prevMatch[2]!)
      const c = parseItalianNumber(prevMatch[3]!)
      const cTot = parseItalianNumber(prevMatch[4]!)
      // Verifica di integrità: lordo e imponibile congrui e aliquota INPS realistica (7% - 15%)
      if (l !== null && inps !== null && c !== null && cTot !== null && l > 100 && inps > 100) {
        const rate = c / inps
        if (rate >= 0.07 && rate <= 0.15 && Math.abs(c - cTot) < 0.05) {
          lordoRilevato = l
          imponibileInpsRilevato = inps
          contributiInpsRilevati = c
        }
      }
    }

    // Fiscale line: es. "68,79 2.040,09 469,22 166,38 302,84"
    const fiscMatch = line.match(/^\s*([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s*$/)
    if (fiscMatch) {
      const imp = parseItalianNumber(fiscMatch[2]!)
      const lorda = parseItalianNumber(fiscMatch[3]!)
      const detr = parseItalianNumber(fiscMatch[4]!)
      const netta = parseItalianNumber(fiscMatch[5]!)
      // Validazione matematica quadratura fiscale italiana: irpefLorda - detrazioni = irpefNetta
      if (imp !== null && lorda !== null && detr !== null && netta !== null && imp > 100) {
        if (Math.abs(lorda - detr - netta) < 0.05) {
          imponibileIrpefRilevato = imp
          irpefLordaRilevata = lorda
          detrazioniLavoroRilevate = detr
          irpefNettaRilevata = netta
        }
      }
    }

    // Sindacato line: es. "20,23 411,42 938,79" (tratt. sindacale, trattenute corpo, totale trattenute)
    const sindMatch = line.match(/^\s*([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s+([0-9\.]+,\d{2})\s*$/)
    if (sindMatch && sindacatoImporto === null) {
      const val = parseItalianNumber(sindMatch[1]!)
      const tratCorpo = parseItalianNumber(sindMatch[2]!)
      const totTrat = parseItalianNumber(sindMatch[3]!)
      // Distingue dalla riga retribuzione (2.023,27 248,24 25,05): una quota sindacale è < 100 €
      // e il terzo valore è il totale trattenute (> 200 €). Verifica inoltre il contesto sindacale nel testo.
      if (
        val !== null && val > 0 && val < 100 &&
        tratCorpo !== null && tratCorpo > 100 &&
        totTrat !== null && totTrat > 200 &&
        (fullText.includes('TRATT. SINDACALE') || /(?:SINDAC|CGIL|CISL|UIL|FIM|FIOM)/i.test(fullText))
      ) {
        sindacatoImporto = val
      }
    }
  }

  const aliquotaInpsCalcolata =
    imponibileInpsRilevato && imponibileInpsRilevato > 0 && contributiInpsRilevati
      ? Math.round((contributiInpsRilevati / imponibileInpsRilevato) * 10000) / 10000
      : null

  const totaleAddizionali = Math.round((rataRegionale + rataComunale + accontoComunale) * 100) / 100
  const oreCongedoTot = (congedo80Ore + congedo80Days * 8) + (congedo30Ore + congedo30Days * 8)

  return {
    mese: detectedMese,
    meseNome: detectedMeseNome,
    netto: detectedNetto,
    datiDipendente: {
      nome: nomeDipendente,
      azienda,
    },
    retribuzione: retribuzioneEstretta,
    ore: {
      ordinarie,
      ferie,
      permessi,
      malattia,
      cig,
      congedo: oreCongedoTot,
      congedo80: congedo80Ore + congedo80Days * 8,
      congedo30: congedo30Ore + congedo30Days * 8,
      straordinario,
      notturno,
      pomeridiano,
      altreAssenze,
    },
    pastiMensa: Math.round(pastiMensa),
    residui: {
      ferie: ferieResidue,
      permessi: permessiResidui,
      rol: rolResidui,
    },
    addizionali: {
      rataRegionale,
      rataComunale,
      accontoComunale,
      totale: totaleAddizionali,
      residuoRegionale,
      residuoComunale,
      residuoAcconto,
    },
    previdenza: {
      imponibileInps: imponibileInpsRilevato,
      contributiInps: contributiInpsRilevati,
      aliquotaInpsCalcolata,
    },
    trattenute: {
      sindacato: sindacatoImporto,
      cometa: cometaImporto,
      mensaTotale,
      mensaPasti: mensaPastiQty,
      mensaUnitario,
      impostaSostitutivaPremi: impostaSostitutivaTotale > 0 ? impostaSostitutivaTotale : null,
    },
    fiscale: {
      totaleLordo: lordoRilevato,
      imponibileIrpef: imponibileIrpefRilevato,
      irpefLorda: irpefLordaRilevata,
      detrazioniLavoro: detrazioniLavoroRilevate,
      irpefNetta: irpefNettaRilevata,
    },
    congedo: {
      indennitaInps: indennitaCongedoTotale > 0 ? indennitaCongedoTotale : null,
      stornoAzienda: stornoAziendaCongedo,
      ore: oreCongedoTot > 0 ? oreCongedoTot : null,
      giorni: (congedo80Days + congedo30Days) > 0 ? (congedo80Days + congedo30Days) : null,
    },
    cigDettaglio:
      stornoCigTotale > 0 && integrazioneSolidarietaTotale > 0
        ? {
            ore: oreCigEffettive,
            storno: stornoCigTotale,
            integrazioneNetta: integrazioneSolidarietaTotale,
            coefficienteEffettivo:
              Math.round((integrazioneSolidarietaTotale / stornoCigTotale) * 10000) / 10000,
          }
        : null,
    maggiorazioniTurno: rilevataMaggiorazione,
    premiRisultato:
      premioAssog5Imponibile > 0 || premioAssog15Imponibile > 0
        ? {
            totalePremi: Math.round((premioAssog5Imponibile + premioAssog15Imponibile) * 100) / 100,
            totaleImpostaSostitutiva:
              Math.round((premioAssog5Imposta + premioAssog15Imposta) * 100) / 100,
            imponibile5: premioAssog5Imponibile,
            imposta5: premioAssog5Imposta,
            imponibile15: premioAssog15Imponibile,
            imposta15: premioAssog15Imposta,
          }
        : null,
    rawRows,
  }
}
