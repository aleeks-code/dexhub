import { extractText, extractTextItems } from 'unpdf'

export interface CedolinoHoursBreakdown {
  ordinarie: number
  ferie: number
  permessi: number          // ROL + PAR + permessi retribuiti
  malattia: number
  cig: number
  congedo: number           // Congedo parentale o straordinario (in ore)
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
  ore: CedolinoHoursBreakdown
  pastiMensa: number
  residui: CedolinoResidui
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
  let congedoDays = 0
  let congedoOre = 0
  let straordinario = 0
  let notturno = 0
  let pomeridiano = 0
  let pastiMensa = 0
  let altreAssenze = 0

  for (const line of lines) {
    const rowMatch = line.match(/^\s*(\d{1,5})\s+([a-zA-Z0-9\.\'\/\-\s%]+?)\s+([0-9]+,[0-9]{2,5})\b/)
    if (!rowMatch) continue

    const code = rowMatch[1]
    const rawDesc = rowMatch[2]!.trim()
    const desc = rawDesc.toUpperCase()
    const qty = parseItalianNumber(rowMatch[3]!) ?? 0

    rawRows.push({ code, desc: rawDesc, qty })

    // Categorization
    if (desc.includes('NOTT')) {
      notturno += qty
    } else if (desc.includes('POMERID')) {
      pomeridiano += qty
    } else if (desc.includes('STRAORDINAR') || desc.includes('ORE STR')) {
      straordinario += qty
    } else if (desc.includes('FERIE') && !desc.includes('RES') && !desc.includes('A.P.') && !desc.includes('MAT.')) {
      ferie += qty
    } else if (/\b(?:P\.A\.R\.?|PAR|ROL|PERMESSI)\b/i.test(desc) && !desc.includes('RES') && !desc.includes('A.P.') && !desc.includes('MAT.')) {
      permessi += qty
    } else if (desc.includes('MALATTIA')) {
      malattia += qty
    } else if (desc.includes('CIG') || desc.includes('CASSA INT') || desc.includes('SOLIDARIETA')) {
      cig += qty
    } else if (desc.includes('CONG') || desc.includes('MATERN') || desc.includes('PATERN')) {
      // In Italian payslips (like TeamSystem 9814 CONG.PARENTALE), qty is usually in days (1.00, 2.00)
      if (qty <= 15) {
        congedoDays += qty
      } else {
        congedoOre += qty
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

  return {
    mese: detectedMese,
    meseNome: detectedMeseNome,
    netto: detectedNetto,
    datiDipendente: {
      nome: nomeDipendente,
      azienda,
    },
    ore: {
      ordinarie,
      ferie,
      permessi,
      malattia,
      cig,
      congedo: congedoOre + congedoDays * 8,
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
    rawRows,
  }
}
