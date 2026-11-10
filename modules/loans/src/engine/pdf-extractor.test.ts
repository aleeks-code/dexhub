import { describe, it, expect } from 'vitest'
import {
  parseItalianNumber,
  parseItalianDate,
  extractLoanDataFromText,
} from './pdf-extractor'

describe('PDF Extractor', () => {
  it('parses Italian currency and decimal strings correctly', () => {
    expect(parseItalianNumber('15.000,00 €')).toBe(15000)
    expect(parseItalianNumber('€ 245,50')).toBe(245.5)
    expect(parseItalianNumber('1.250,75')).toBe(1250.75)
    expect(parseItalianNumber('5,75 %')).toBe(5.75)
    expect(parseItalianNumber('100')).toBe(100)
  })

  it('parses Italian date formats to ISO YYYY-MM-DD', () => {
    expect(parseItalianDate('15/04/2025')).toBe('2025-04-15')
    expect(parseItalianDate('01-12-2024')).toBe('2024-12-01')
    expect(parseItalianDate('2026-03-20')).toBe('2026-03-20')
  })

  it('extracts loan parameters from a standard Italian financing contract text', () => {
    const sampleText = `
      FINDOMESTIC BANCA S.p.A.
      PROPOSTA DI CONTRATTO DI CREDITO PERSONALE
      Pratica n. 98472918-A
      Importo totale del credito: € 12.000,00
      Durata in mesi: 48 rate
      Importo della singola rata: € 280,50
      T.A.N. fisso: 5,65%
      T.A.E.G.: 6,10%
      Spese incasso rata: € 2,00
      Data prima rata: 15/06/2025
    `

    const data = extractLoanDataFromText(sampleText)

    expect(data.lender).toBe('Findomestic')
    expect(data.contractNumber).toBe('98472918-A')
    expect(data.financedAmount).toBe(12000)
    expect(data.installmentsCount).toBe(48)
    expect(data.monthlyInstallment).toBe(280.5)
    expect(data.tan).toBe(5.65)
    expect(data.taeg).toBe(6.1)
    expect(data.monthlyFee).toBe(2)
    expect(data.startDate).toBe('2025-06-15')
    expect(data.paymentDay).toBe(15)

    // Schedule should be automatically computed
    expect(data.schedule).toBeDefined()
    expect(data.schedule?.length).toBe(48)
    expect(data.schedule?.[0]?.dueDate).toBe('2025-06-15')
  })

  it('extracts table rows when present in the document', () => {
    const tableText = `
      Compass Banca S.p.A.
      Piano di Ammortamento
      N. Scadenza Rata Capitale Interessi Debito Residuo
      1 15/01/2025 210,00 180,00 30,00 4820,00
      2 15/02/2025 210,00 181,00 29,00 4639,00
      3 15/03/2025 210,00 182,00 28,00 4457,00
      4 15/04/2025 210,00 183,00 27,00 4274,00
    `

    const data = extractLoanDataFromText(tableText)
    expect(data.lender).toBe('Compass')
    expect(data.schedule).toBeDefined()
    expect(data.schedule?.length).toBe(4)
    expect(data.schedule?.[0]?.dueDate).toBe('2025-01-15')
    expect(data.schedule?.[0]?.principalAmount).toBe(180)
    expect(data.schedule?.[0]?.residualDebt).toBe(4820)
  })

  it('correctly extracts Deutsche Bank Easy amortization plan (MUNAFO ALEX.pdf) and auto-computes missing fields', async () => {
    const fs = await import('fs')
    const samplePath = 'C:/Users/am28/Desktop/MUNAFO ALEX.pdf'
    if (!fs.existsSync(samplePath)) return

    const buf = fs.readFileSync(samplePath)
    const { extractLoanFromPdfBuffer } = await import('./pdf-extractor')
    const data = await extractLoanFromPdfBuffer(buf)

    expect(data.lender).toContain('Deutsche Bank')
    expect(data.contractNumber).toBe('3187450301')
    expect(data.installmentsCount).toBe(60)
    expect(data.financedAmount).toBe(17450)
    expect(data.monthlyInstallment).toBe(359)
    expect(data.monthlyFee).toBe(5)
    expect(data.startDate).toBe('2023-05-08')
    expect(data.paymentDay).toBe(8)
    expect(data.tan).toBeGreaterThan(7)
    expect(data.tan).toBeLessThan(9)
    expect(data.schedule?.length).toBe(60)

    // Check provenance
    expect(data.provenance['contractNumber']?.origin).toBe('extracted')
    expect(data.provenance['financedAmount']?.origin).toBe('computed')
    expect(data.provenance['installmentsCount']?.origin).toBe('computed')
  })
})
