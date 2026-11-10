import { extractText } from 'unpdf'
import type { ExtractedPdfData, Installment, FieldProvenance } from '../types'
import { generateAmortizationSchedule, solveTan, round } from './amortization'

export function parseItalianNumber(str: string): number | undefined {
  if (!str) return undefined
  // Clean string: remove currency symbols, percentage and whitespace
  const cleaned = str.replace(/[€$£%\s]/g, '').trim()
  // If format is 12.345,67 -> replace dots, replace comma with dot
  if (/^[0-9]{1,3}(\.[0-9]{3})+(,[0-9]+)?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(normalized)
    return isNaN(num) ? undefined : round(num)
  }
  // If format is 12345,67 or 5,75
  if (/^[0-9]+,[0-9]+$/.test(cleaned)) {
    const normalized = cleaned.replace(',', '.')
    const num = parseFloat(normalized)
    return isNaN(num) ? undefined : round(num)
  }
  // Standard float
  const num = parseFloat(cleaned)
  return isNaN(num) ? undefined : round(num)
}

export function parseItalianDate(str: string): string | undefined {
  if (!str) return undefined
  const cleaned = str.trim()
  // Matches DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const match = cleaned.match(/^([0-3]?[0-9])[\/\-.]([0-1]?[0-9])[\/\-.]([12][0-9]{3})$/)
  if (!match) {
    // Check if already YYYY-MM-DD
    if (/^[12][0-9]{3}-[0-1][0-9]-[0-3][0-9]$/.test(cleaned)) {
      return cleaned
    }
    return undefined
  }
  const day = match[1]!.padStart(2, '0')
  const month = match[2]!.padStart(2, '0')
  const year = match[3]!
  return `${year}-${month}-${day}`
}

const KNOWN_LENDERS: { name: string; pattern: RegExp }[] = [
  { name: 'Deutsche Bank Easy', pattern: /deutsche\s+bank\s+(?:easy|s\.p\.a)/i },
  { name: 'Deutsche Bank', pattern: /deutsche\s+bank/i },
  { name: 'Findomestic', pattern: /findomestic(?:\s+banca)?/i },
  { name: 'Compass', pattern: /compass(?:\s+banca)?/i },
  { name: 'Agos', pattern: /agos(?:\s+ducato)?/i },
  { name: 'Santander', pattern: /santander(?:\s+consumer)?/i },
  { name: 'Intesa Sanpaolo', pattern: /intesa\s+sanpaolo/i },
  { name: 'UniCredit', pattern: /unicredit/i },
  { name: 'BNL BNP Paribas', pattern: /bnl|bnp\s+paribas/i },
  { name: 'Fiditalia', pattern: /fiditalia/i },
  { name: 'Poste Italiane', pattern: /poste\s+italiane|bancoposta/i },
  { name: 'Credit Agricole', pattern: /credit\s+agricole/i },
  { name: 'BBVA', pattern: /bbva/i },
  { name: 'ING Direct', pattern: /ing(?:\s+direct)?/i },
  { name: 'Cofidis', pattern: /cofidis/i },
  { name: 'Younited Credit', pattern: /younited(?:\s+credit)?/i },
  { name: 'Mediolanum', pattern: /mediolanum/i },
  { name: 'Avvera', pattern: /avvera/i },
  { name: 'BCC', pattern: /\bbcc\b|credito\s+cooperativo/i },
]

interface ParsedTableRow {
  number: number
  dueDate: string
  totalAmount: number
  feeAmount: number
  interestAmount: number
  principalAmount: number
  residualDebt?: number
}

function parseTableRows(fullText: string): ParsedTableRow[] {
  const rows: ParsedTableRow[] = []

  // Format 1: Deutsche Bank Easy compact format
  // Example: 375,0008/05/202308/05/2023RIPI375,005,00132,64237,36RP08/05/20231
  // or IE359,005,00100,29253,71RP08/03/202411
  const dbRegex =
    /(?:(?:[0-9]+,[0-9]{2}[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}[0-3][0-9]\/[0-1][0-9]\/[0-9]{4}[A-Z]{2}(?:PI|PP|IE))|(?:IE|PI|PP|NP))\s*([0-9]+,[0-9]{2})\s*([0-9]+,[0-9]{2})\s*([0-9]+,[0-9]{2})\s*([0-9]+,[0-9]{2})\s*RP\s*([0-3][0-9]\/[0-1][0-9]\/[0-9]{4})\s*([0-9]{1,3})/g

  let dbMatch: RegExpExecArray | null
  while ((dbMatch = dbRegex.exec(fullText)) !== null) {
    const total = parseItalianNumber(dbMatch[1]!) ?? 0
    const fee = parseItalianNumber(dbMatch[2]!) ?? 0
    const interest = parseItalianNumber(dbMatch[3]!) ?? 0
    const principal = parseItalianNumber(dbMatch[4]!) ?? 0
    const date = parseItalianDate(dbMatch[5]!) ?? ''
    const num = parseInt(dbMatch[6]!, 10)

    if (num > 0 && date && (principal > 0 || total > 0)) {
      rows.push({
        number: num,
        dueDate: date,
        totalAmount: total,
        feeAmount: fee,
        interestAmount: interest,
        principalAmount: principal,
      })
    }
  }

  if (rows.length >= 3) {
    rows.sort((a, b) => a.number - b.number)
    return rows
  }

  // Format 2: Standard whitespace/pipe delimited rows
  // Example: 1 15/01/2025 210,00 180,00 30,00 4820,00
  const lines = fullText.split(/\r?\n/)
  const numPattern = '(?:[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})'
  const rowRegex = new RegExp(
    `^\\s*([0-9]{1,3})\\s+[|\\s]*([0-3]?[0-9][\\/\\-.][0-1]?[0-9][\\/\\-.][12][0-9]{3})\\s+[|\\s]*(${numPattern})\\s+[|\\s]*(${numPattern})\\s+[|\\s]*(${numPattern})(?:\\s+[|\\s]*(${numPattern}))?`,
  )

  for (const line of lines) {
    const match = line.match(rowRegex)
    if (match) {
      const num = parseInt(match[1]!, 10)
      const date = parseItalianDate(match[2]!)
      const total = parseItalianNumber(match[3]!) ?? 0
      const principal = parseItalianNumber(match[4]!) ?? 0
      const interest = parseItalianNumber(match[5]!) ?? 0
      const explicitResidual = match[6] ? parseItalianNumber(match[6]) : undefined

      if (num && date) {
        rows.push({
          number: num,
          dueDate: date,
          totalAmount: total,
          feeAmount: 0,
          interestAmount: interest,
          principalAmount: principal,
          residualDebt: explicitResidual,
        })
      }
    }
  }

  rows.sort((a, b) => a.number - b.number)
  return rows
}

export function extractLoanDataFromText(fullText: string): ExtractedPdfData {
  let lender: string | undefined
  let contractNumber: string | undefined
  let financedAmount: number | undefined
  let tan: number | undefined
  let taeg: number | undefined
  let installmentsCount: number | undefined
  let monthlyInstallment: number | undefined
  let monthlyFee: number = 0
  let startDate: string | undefined
  let paymentDay: number | undefined

  const provenance: Record<string, FieldProvenance> = {}

  const conf = {
    lender: 0,
    amount: 0,
    tan: 0,
    installments: 0,
    monthlyPayment: 0,
    startDate: 0,
  }

  // 1. Detect Lender
  for (const item of KNOWN_LENDERS) {
    if (item.pattern.test(fullText)) {
      lender = item.name
      conf.lender = 0.95
      provenance['lender'] = {
        origin: 'extracted',
        note: `Riconosciuto dal documento: ${item.name}`,
      }
      break
    }
  }

  // 2. Detect Contract / Practice / Loan Number
  // Support "finanziamento n. 3187450301", "piano di ammortamento n. 3187450301", "pratica n.", "contratto n."
  const contractMatch = fullText.match(
    /(?:(?:finanziamento|piano\s+di\s+ammortamento|pratica|contratto|credito|posizione)\s+n\.?|n\.?\s*(?:finanziamento|pratica|contratto|credito)|codice\s+contratto)\s*[:=]?\s*([A-Z0-9\-\/]{4,25})/i,
  )
  if (contractMatch && contractMatch[1]) {
    contractNumber = contractMatch[1].trim()
    provenance['contractNumber'] = {
      origin: 'extracted',
      note: `Estratto dal testo: n. ${contractNumber}`,
    }
  }

  // 3. Detect Financed Amount from text
  const amountMatch = fullText.match(
    /(?:importo(?:\s+totale)?(?:\s+del\s+credito|\s+finanziato|\s+erogato)?|capitale(?:\s+finanziato|\s+erogato)?|totale\s+finanziato)\s*[:=]?\s*(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/i,
  )
  if (amountMatch && amountMatch[1]) {
    financedAmount = parseItalianNumber(amountMatch[1])
    if (financedAmount && financedAmount > 0) {
      conf.amount = 0.9
      provenance['financedAmount'] = {
        origin: 'extracted',
        note: `Letto dal riepilogo del contratto (${financedAmount.toLocaleString('it-IT')} €)`,
      }
    }
  }

  // 4. Detect Monthly Installment from text
  const installmentMatch = fullText.match(
    /(?:importo(?:\s+della)?\s+rata|rata\s+mensile|rata\s+base|importo\s+della\s+singola\s+rata|rata\s+costante|singola\s+rata)\s*[:=]?\s*(?:€\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+(?:,[0-9]{2})?)/i,
  )
  if (installmentMatch && installmentMatch[1]) {
    monthlyInstallment = parseItalianNumber(installmentMatch[1])
    if (monthlyInstallment && monthlyInstallment > 0) {
      conf.monthlyPayment = 0.9
      provenance['monthlyInstallment'] = {
        origin: 'extracted',
        note: `Letto dal riepilogo del contratto (${monthlyInstallment.toFixed(2)} €)`,
      }
    }
  }

  // 5. Detect Installments Count / Duration from text
  const countMatch = fullText.match(
    /(?:numero(?:\s+delle)?\s+rate|n\.?\s*rate|durata(?:\s+in\s+mesi)?)\s*[:=]?\s*([0-9]{1,3})\s*(?:rate|mesi)?/i,
  )
  if (countMatch && countMatch[1]) {
    installmentsCount = parseInt(countMatch[1], 10)
    if (installmentsCount > 0) {
      conf.installments = 0.9
      provenance['installmentsCount'] = {
        origin: 'extracted',
        note: `Letto dal riepilogo del contratto (${installmentsCount} rate)`,
      }
    }
  } else {
    const alternativeCount = fullText.match(/(?:in|per)\s+([0-9]{1,3})\s+rate(?:\s+mensili)?\s+da/i)
    if (alternativeCount && alternativeCount[1]) {
      installmentsCount = parseInt(alternativeCount[1], 10)
      if (installmentsCount > 0) {
        conf.installments = 0.85
        provenance['installmentsCount'] = {
          origin: 'extracted',
          note: `Rilevato dalla descrizione contrattuale (${installmentsCount} rate)`,
        }
      }
    }
  }

  // 6. Detect TAN from text
  const tanMatch = fullText.match(
    /(?:t\.?a\.?n\.?|tasso\s+annuo\s+nominale)(?:\s+fisso|\s+variabile)?\s*[:=]?\s*([0-9]+(?:[.,][0-9]{1,3})?)\s*%/i,
  )
  if (tanMatch && tanMatch[1]) {
    tan = parseFloat(tanMatch[1].replace(',', '.'))
    if (!isNaN(tan)) {
      conf.tan = 0.9
      provenance['tan'] = {
        origin: 'extracted',
        note: `Letto direttamente dal documento (${tan}%)`,
      }
    }
  }

  // 7. Detect TAEG from text
  const taegMatch = fullText.match(
    /(?:t\.?a\.?e\.?g\.?|tasso\s+annuo\s+effettivo\s+globale|i\.?s\.?c\.?)\s*[:=]?\s*([0-9]+(?:[.,][0-9]{1,3})?)\s*%/i,
  )
  if (taegMatch && taegMatch[1]) {
    taeg = parseFloat(taegMatch[1].replace(',', '.'))
    if (!isNaN(taeg)) {
      provenance['taeg'] = {
        origin: 'extracted',
        note: `Letto direttamente dal documento (${taeg}%)`,
      }
    }
  }

  // 8. Detect Monthly Fee from text
  const feeMatch = fullText.match(
    /(?:spese\s+incasso\s+rata|spese\s+gestione\s+pratica|spesa\s+incasso)\s*[:=]?\s*(?:€\s*)?([0-9]+(?:[.,][0-9]{2})?)/i,
  )
  if (feeMatch && feeMatch[1]) {
    const parsed = parseItalianNumber(feeMatch[1])
    if (parsed !== undefined) {
      monthlyFee = parsed
      provenance['monthlyFee'] = {
        origin: 'extracted',
        note: `Letto dalle condizioni contrattuali (${monthlyFee.toFixed(2)} €)`,
      }
    }
  }

  // 9. Detect Start Date from text
  const dateMatch = fullText.match(
    /(?:data\s+prima\s+rata|decorrenza|scadenza\s+prima\s+rata|prima\s+rata|decorrenza\s+dal|scadenza\s+rata\s*1)\s*[:=]?\s*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][12][0-9]{3})/i,
  )
  if (dateMatch && dateMatch[1]) {
    startDate = parseItalianDate(dateMatch[1])
    if (startDate) {
      conf.startDate = 0.9
      const parts = startDate.split('-')
      paymentDay = parseInt(parts[2] || '15', 10)
      provenance['startDate'] = {
        origin: 'extracted',
        note: `Data prima rata rilevata: ${startDate}`,
      }
      provenance['paymentDay'] = {
        origin: 'extracted',
        note: `Giorno di scadenza del mese: ${paymentDay}°`,
      }
    }
  }

  // 10. Parse Tabular Rows if present
  const parsedRows = parseTableRows(fullText)
  let schedule: Installment[] | undefined

  if (parsedRows.length >= 3) {
    // We have a concrete tabular amortization schedule in the PDF!
    // Count of installments
    if (!installmentsCount) {
      installmentsCount = parsedRows.length
      conf.installments = 0.95
      provenance['installmentsCount'] = {
        origin: 'computed',
        note: `Calcolato dal conteggio delle ${installmentsCount} rate della tabella`,
      }
    }

    // Sum quota capitale if financedAmount was not in summary text
    let sumPrincipal = 0
    let sumInterest = 0
    const feeCounts = new Map<number, number>()
    const installmentCounts = new Map<number, number>()

    for (const r of parsedRows) {
      sumPrincipal = round(sumPrincipal + r.principalAmount)
      sumInterest = round(sumInterest + r.interestAmount)
      if (r.feeAmount > 0) {
        feeCounts.set(r.feeAmount, (feeCounts.get(r.feeAmount) || 0) + 1)
      }
      if (r.totalAmount > 0) {
        installmentCounts.set(r.totalAmount, (installmentCounts.get(r.totalAmount) || 0) + 1)
      }
    }

    if (!financedAmount) {
      if (parsedRows[0]?.residualDebt !== undefined && parsedRows[0].residualDebt > 0) {
        financedAmount = round(parsedRows[0].principalAmount + parsedRows[0].residualDebt)
        conf.amount = 0.95
        provenance['financedAmount'] = {
          origin: 'computed',
          note: `Ricavato dalla prima riga della tabella: quota capitale (${parsedRows[0].principalAmount} €) + debito residuo (${parsedRows[0].residualDebt} €) = ${financedAmount.toLocaleString('it-IT')} €`,
        }
      } else if (sumPrincipal > 0) {
        financedAmount = sumPrincipal
        conf.amount = 0.95
        provenance['financedAmount'] = {
          origin: 'computed',
          note: `Calcolato sommando le ${parsedRows.length} quote capitale della tabella (${financedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €)`,
        }
      }
    }

    // Determine recurring monthly installment from mode of table rows
    if (!monthlyInstallment && installmentCounts.size > 0) {
      let bestAmt = parsedRows[0]!.totalAmount
      let maxCount = 0
      for (const [amt, cnt] of installmentCounts.entries()) {
        if (cnt > maxCount) {
          maxCount = cnt
          bestAmt = amt
        }
      }
      monthlyInstallment = bestAmt
      conf.monthlyPayment = 0.95
      provenance['monthlyInstallment'] = {
        origin: 'computed',
        note: `Rata mensile ricorrente ricavata dalla tabella (${monthlyInstallment.toFixed(2)} €)`,
      }
    }

    // Determine monthly fee from table rows
    if (monthlyFee === 0 && feeCounts.size > 0) {
      let bestFee = 0
      let maxFeeCount = 0
      for (const [fee, cnt] of feeCounts.entries()) {
        if (cnt > maxFeeCount) {
          maxFeeCount = cnt
          bestFee = fee
        }
      }
      monthlyFee = bestFee
      provenance['monthlyFee'] = {
        origin: 'extracted',
        note: `Spese incasso rilevate dalla tabella (${monthlyFee.toFixed(2)} €)`,
      }
    }

    // Determine startDate and paymentDay from first row
    if (!startDate && parsedRows[0]) {
      startDate = parsedRows[0].dueDate
      const parts = startDate.split('-')
      paymentDay = parseInt(parts[2] || '15', 10)
      conf.startDate = 0.95
      provenance['startDate'] = {
        origin: 'extracted',
        note: `Rilevata dalla prima rata della tabella: ${startDate}`,
      }
      provenance['paymentDay'] = {
        origin: 'extracted',
        note: `Giorno di scadenza rata dalla tabella: ${paymentDay}° del mese`,
      }
    }

    // Calculate TAN if missing
    if (tan === undefined && financedAmount && monthlyInstallment && installmentsCount) {
      const netInstallment = Math.max(0, monthlyInstallment - monthlyFee)
      const calculatedTan = solveTan(financedAmount, netInstallment, installmentsCount)
      if (calculatedTan > 0) {
        tan = calculatedTan
        conf.tan = 0.9
        provenance['tan'] = {
          origin: 'computed',
          note: `Calcolato matematicamente dal piano d'ammortamento (${tan}%)`,
        }
      }
    }

    // Build the concrete Installment[] schedule with residual debt progression
    let currentDebt = financedAmount || sumPrincipal
    schedule = []
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i]!
      const resDebt =
        row.residualDebt !== undefined
          ? row.residualDebt
          : Math.max(0, round(currentDebt - row.principalAmount))
      currentDebt = resDebt
      schedule.push({
        number: row.number,
        dueDate: row.dueDate,
        totalAmount: row.totalAmount,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        feeAmount: row.feeAmount || monthlyFee,
        residualDebt: resDebt,
      })
    }
  } else {
    // No tabular rows: derive missing parameters using French financial formulas
    if (financedAmount && installmentsCount) {
      if (!monthlyInstallment && tan !== undefined) {
        const net = generateAmortizationSchedule({
          financedAmount,
          tan,
          installmentsCount,
          startDate: startDate || new Date().toISOString().slice(0, 10),
          monthlyFee,
        })
        if (net[0]) {
          monthlyInstallment = net[0].totalAmount
          conf.monthlyPayment = 0.85
          provenance['monthlyInstallment'] = {
            origin: 'computed',
            note: `Calcolata con formula di ammortamento francese (${monthlyInstallment.toFixed(2)} €)`,
          }
        }
      } else if (monthlyInstallment && tan === undefined) {
        const netInst = Math.max(0, monthlyInstallment - monthlyFee)
        tan = solveTan(financedAmount, netInst, installmentsCount)
        conf.tan = 0.85
        provenance['tan'] = {
          origin: 'computed',
          note: `Calcolato matematicamente da capitale, rata e durata (${tan}%)`,
        }
      }

      if (startDate) {
        schedule = generateAmortizationSchedule({
          financedAmount,
          tan: tan ?? 0,
          installmentsCount,
          startDate,
          paymentDay: paymentDay ?? 15,
          monthlyFee,
          knownMonthlyInstallment: monthlyInstallment,
        })
      }
    }
  }

  return {
    lender,
    contractNumber,
    financedAmount,
    tan,
    taeg,
    installmentsCount,
    monthlyInstallment,
    monthlyFee,
    startDate,
    paymentDay,
    rawText: fullText,
    schedule,
    provenance,
    confidence: conf,
  }
}

export async function extractLoanFromPdfBuffer(
  buffer: ArrayBuffer | Uint8Array | unknown,
): Promise<ExtractedPdfData> {
  // Ensure buffer is cleanly a Uint8Array
  let data: Uint8Array
  if (buffer instanceof Uint8Array && !('byteOffset' in buffer && (buffer as { constructor: { name: string } }).constructor.name === 'Buffer')) {
    data = buffer
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buffer)) {
    data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  } else if (buffer instanceof ArrayBuffer) {
    data = new Uint8Array(buffer)
  } else if ((buffer as { buffer?: ArrayBuffer }).buffer instanceof ArrayBuffer) {
    const b = buffer as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number }
    data = new Uint8Array(b.buffer, b.byteOffset || 0, b.byteLength || b.buffer.byteLength)
  } else {
    throw new Error('Formato buffer non supportato per l’analisi PDF.')
  }

  const result = await extractText(data, { mergePages: true })
  const fullText = typeof result.text === 'string' ? result.text : (result.text as string[]).join('\n')
  return extractLoanDataFromText(fullText)
}
