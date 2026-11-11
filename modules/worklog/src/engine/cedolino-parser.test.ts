import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  parseItalianNumber,
  extractCedolinoFromPdfBuffer,
} from './cedolino-parser'
import { generateDaysFromCedolino } from './cedolino-importer'

describe('cedolino-parser', () => {
  describe('parseItalianNumber', () => {
    it('parses standard Italian numbers', () => {
      expect(parseItalianNumber('1.732,74')).toBe(1732.74)
      expect(parseItalianNumber('96,50')).toBe(96.5)
      expect(parseItalianNumber('24,00')).toBe(24)
      expect(parseItalianNumber('-47,99')).toBe(-47.99)
      expect(parseItalianNumber('9,99')).toBe(9.99)
      expect(parseItalianNumber('0,00')).toBe(0)
    })

    it('handles dirty strings with currency or whitespace', () => {
      expect(parseItalianNumber(' 1.732,74 € ')).toBe(1732.74)
      expect(parseItalianNumber('2.023,27')).toBe(2023.27)
    })
  })

  describe('extractCedolinoFromPdfBuffer (real test PDF)', () => {
    const testPdfPath = 'C:/Users/am28/Desktop/Cedolino 9-2026.pdf'
    const pdfExists = fs.existsSync(testPdfPath)

    it.runIf(pdfExists)('extracts data correctly from Cedolino 9-2026.pdf', async () => {
      const buffer = fs.readFileSync(testPdfPath)
      const data = await extractCedolinoFromPdfBuffer(buffer)

      expect(data.mese).toBe('2026-09')
      expect(data.netto).toBe(1732.74)

      // Ore
      expect(data.ore.ordinarie).toBe(96.5)
      expect(data.ore.ferie).toBe(24)
      expect(data.ore.permessi).toBe(24) // 16h PAR individ. + 8h PAR aziend.
      expect(data.ore.congedo).toBe(32) // 4 giorni congedo parentale x 8h
      expect(data.ore.congedo80).toBe(32)
      expect(data.ore.congedo30).toBe(0)
      expect(data.ore.notturno).toBe(24) // 24h magg. nott.
      expect(data.pastiMensa).toBe(13)
      expect(data.ore.altreAssenze).toBe(1) // 1h assemblea sindacale

      // Residui
      expect(data.residui.ferie).toBe(-47.99)
      expect(data.residui.permessi).toBe(9.99)
      expect(data.residui.rol).toBe(12.0)

      // Retribuzione
      expect(data.retribuzione?.importo).toBe(2296.56)
      expect(data.retribuzione?.minimoTabellare).toBe(2023.27)
      expect(data.retribuzione?.premioProduzioneFisso).toBe(248.24)
      expect(data.retribuzione?.scattiAnzianita).toBe(25.05)

      // Addizionali
      expect(data.addizionali.rataRegionale).toBe(37.39)
      expect(data.addizionali.rataComunale).toBe(14.73)
      expect(data.addizionali.accontoComunale).toBe(6.41)
      expect(data.addizionali.totale).toBe(58.53)
      expect(data.addizionali.residuoRegionale).toBe(37.38)
      expect(data.addizionali.residuoComunale).toBe(14.72)
      expect(data.addizionali.residuoAcconto).toBe(6.40)

      // Previdenza & Aliquota effettiva rilevata
      expect(data.previdenza.imponibileInps).toBe(2042.00)
      expect(data.previdenza.contributiInps).toBe(193.79)
      expect(data.previdenza.aliquotaInpsCalcolata).toBe(0.0949) // 9,49%

      // Trattenute ricorrenti
      expect(data.trattenute.sindacato).toBe(20.23)
      expect(data.trattenute.cometa).toBe(24.28)
      expect(data.trattenute.mensaTotale).toBe(10.01)
      expect(data.trattenute.mensaPasti).toBe(13)
      expect(data.trattenute.mensaUnitario).toBe(0.77)
      expect(data.trattenute.impostaSostitutivaPremi).toBe(10.51)

      // Fiscale
      expect(data.fiscale.totaleLordo).toBe(2042.21)
      expect(data.fiscale.imponibileIrpef).toBe(2040.09)
      expect(data.fiscale.irpefLorda).toBe(469.22)
      expect(data.fiscale.detrazioniLavoro).toBe(166.38)
      expect(data.fiscale.irpefNetta).toBe(302.84)

      // Congedo parentale
      expect(data.congedo.indennitaInps).toBe(310.72)
      expect(data.congedo.stornoAzienda).toBe(318.60)
      expect(data.congedo.ore).toBe(32)
      expect(data.congedo.giorni).toBe(4)
    })
  })

  describe('generateDaysFromCedolino', () => {
    it('generates an intelligent schedule for the month', () => {
      const result = generateDaysFromCedolino({
        month: '2026-09',
        ore: {
          ordinarie: 96.5,
          ferie: 24,
          permessi: 24,
          congedo: 32,
          congedo80: 32,
          congedo30: 0,
          malattia: 0,
          cig: 0,
          straordinario: 0,
          notturno: 24,
          pomeridiano: 0,
          altreAssenze: 1,
        },
        pastiMensa: 13,
        standardDailyHours: 8,
      })

      // September 2026 has 22 working days
      expect(result.daysToSave.length).toBe(22)
      expect(result.stats.giorniLavorati).toBe(12)
      expect(result.stats.giorniFerie).toBe(3)
      expect(result.stats.giorniPermesso).toBe(3)
      expect(result.stats.giorniCongedo).toBe(4)
      expect(result.stats.giorniCongedo80).toBe(4)
      expect(result.stats.giorniCongedo30).toBe(0)
      expect(result.stats.pastiAssegnati).toBe(13) // all 13 meals are distributed accurately (12 work days + 1 partial/permessi day)
      expect(result.stats.totaleOreRegistrate).toBe(176.5)

      // Check congedo parentale 80% days
      const congedoDays = result.daysToSave.filter(
        (d) => d.entries[0]?.kind === 'congedo_parentale_80',
      )
      expect(congedoDays.length).toBe(4)

      // Check night shifts on the first 3 work days
      const workDaysWithNight = result.daysToSave.filter(
        (d) => d.entries[0]?.kind === 'work' && d.entries[0]?.modifiers?.notturno,
      )
      expect(workDaysWithNight.length).toBe(3)
    })
  })
})
