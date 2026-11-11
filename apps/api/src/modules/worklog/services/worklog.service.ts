import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  and,
  asc,
  desc,
  eq,
  getClient,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  worklogCcnlProfile,
  worklogCigConfig,
  worklogCigMassimale,
  worklogContract,
  worklogDays,
  worklogEntries,
  worklogFiscalProfile,
  worklogRetribuzione,
  worklogSindacatoConfig,
  worklogMensaConfig,
  worklogAddizionaliConfig,
  worklogCometaConfig,
  worklogNettoReale,
  worklogTemplates,
  worklogUserFiscalConfig,
  worklogVariabiliFlat,
} from '@dexhub/db'
import type { CigConfigTipo, EntryKind, VariabileFlatTipo } from '@dexhub/db'
import { getItalianHolidays } from '@dexhub/worklog-engine'
import { getWorkingDays, deriveMeal, todayDate } from './stima.resolver'
import type {
  UpsertDayDto,
  UpdateContractDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  UpsertFiscalConfigDto,
  CreateRetribuzioneDto,
  CreateVariabileFlatDto,
  UpdateVariabileFlatDto,
  UpsertCigConfigDto,
  UpsertSindacatoConfigDto,
  UpsertMensaConfigDto,
  UpsertCometaConfigDto,
  UpsertNettoRealeDto,
  UpsertAddizionaliConfigDto,
} from '../dto/worklog.dto'

function parseHours(v: string | number | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

function monthRange(month: string): { from: string; to: string } {
  const parts = month.split('-')
  const year = parseInt(parts[0] ?? '2000', 10)
  const mon = parseInt(parts[1] ?? '1', 10)
  const from = `${year}-${String(mon).padStart(2, '0')}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const to = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

// Months elapsed from anchorDate to today (fractional, floored to integer)
function monthsFrom(anchorDate: string): number {
  const [ay, am] = anchorDate.split('-').map(Number) as [number, number]
  const now = new Date()
  return (now.getFullYear() - ay) * 12 + (now.getMonth() + 1 - am)
}

@Injectable()
export class WorklogService {
  private get db() {
    return getClient()
  }

  // ── Days ────────────────────────────────────────────────────────────────────

  async getDays(userId: string, from: string, to: string) {
    const days = await this.db
      .select()
      .from(worklogDays)
      .where(
        and(
          eq(worklogDays.userId, userId),
          gte(worklogDays.date, from),
          lte(worklogDays.date, to),
          isNull(worklogDays.deletedAt),
        ),
      )
      .orderBy(asc(worklogDays.date))

    if (days.length === 0) return []

    const dayIds = days.map((d) => d.id)
    const entries = await this.db
      .select()
      .from(worklogEntries)
      .where(inArray(worklogEntries.dayId, dayIds))
      .orderBy(asc(worklogEntries.createdAt))

    return days.map((day) => ({
      ...day,
      entries: entries
        .filter((e) => e.dayId === day.id)
        .map((e) => ({ ...e, hours: parseHours(e.hours) })),
    }))
  }

  async upsertDay(userId: string, dto: UpsertDayDto) {
    return this.db.transaction(async (tx) => {
      // Search regardless of deletedAt: a soft-deleted row still holds the unique
      // (userId, date) slot, so we must UPDATE it (and clear deletedAt) rather than INSERT.
      const existing = await tx
        .select()
        .from(worklogDays)
        .where(
          and(
            eq(worklogDays.userId, userId),
            eq(worklogDays.date, dto.date),
          ),
        )
        .limit(1)
        .then((r) => r[0])

      let dayId: string

      // undefined (campo omesso) → chiave assente dal patch, drizzle non tocca la colonna,
      // un override esistente sopravvive. null/boolean (campo inviato) → scritto as-is.
      const mealOverridePatch = dto.mealOverride !== undefined ? { mealOverride: dto.mealOverride } : {}

      if (existing) {
        dayId = existing.id
        await tx
          .update(worklogDays)
          .set({ note: dto.note ?? null, deletedAt: null, updatedAt: new Date(), ...mealOverridePatch })
          .where(eq(worklogDays.id, dayId))
        await tx.delete(worklogEntries).where(eq(worklogEntries.dayId, dayId))
      } else {
        const [inserted] = await tx
          .insert(worklogDays)
          .values({ userId, date: dto.date, note: dto.note ?? null, ...mealOverridePatch })
          .returning()
        dayId = inserted!.id
      }

      if (dto.entries.length > 0) {
        await tx.insert(worklogEntries).values(
          dto.entries.map((e) => ({
            dayId,
            kind: e.kind,
            hours: String(e.hours),
            modifiers: e.modifiers ?? null,
            note: e.note ?? null,
          })),
        )
      }

      const day = await tx
        .select()
        .from(worklogDays)
        .where(eq(worklogDays.id, dayId))
        .limit(1)
        .then((r) => r[0]!)

      const entries = await tx
        .select()
        .from(worklogEntries)
        .where(eq(worklogEntries.dayId, dayId))
        .orderBy(asc(worklogEntries.createdAt))

      return {
        ...day,
        entries: entries.map((e) => ({ ...e, hours: parseHours(e.hours) })),
      }
    })
  }

  /**
   * Create-only, mai restore/overwrite (Fix C-bis): usata dall'auto-popolamento festivi.
   * INSERT...ON CONFLICT DO NOTHING sull'unique (userId,date) è atomico — chiude la race
   * di un check-then-insert separato (due chiamate concorrenti, solo una inserisce davvero).
   * Se la riga esiste già (attiva O cestinata) `inserted` è undefined → non tocca nulla,
   * a differenza di `upsertDay` che de-cestinerebbe e cancellerebbe le entry originali.
   */
  async ensureHolidayDay(userId: string, date: string, hours: number) {
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(worklogDays)
        .values({ userId, date })
        .onConflictDoNothing({ target: [worklogDays.userId, worklogDays.date] })
        .returning()

      if (!inserted) return { created: false }

      await tx.insert(worklogEntries).values({
        dayId: inserted.id,
        kind: 'holiday',
        hours: String(hours),
        modifiers: null,
        note: null,
      })

      return { created: true }
    })
  }

  async deleteDay(userId: string, id: string) {
    const day = await this.db
      .select()
      .from(worklogDays)
      .where(and(eq(worklogDays.id, id), eq(worklogDays.userId, userId), isNull(worklogDays.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!day) throw new NotFoundException('Day not found')

    await this.db
      .update(worklogDays)
      .set({ deletedAt: new Date() })
      .where(eq(worklogDays.id, id))
  }

  // ── Trash ───────────────────────────────────────────────────────────────────

  async getTrash(userId: string) {
    const days = await this.db
      .select()
      .from(worklogDays)
      .where(and(eq(worklogDays.userId, userId), isNotNull(worklogDays.deletedAt)))
      .orderBy(desc(worklogDays.deletedAt))

    if (days.length === 0) return []

    const dayIds = days.map((d) => d.id)
    const entries = await this.db
      .select()
      .from(worklogEntries)
      .where(inArray(worklogEntries.dayId, dayIds))

    return days.map((day) => ({
      ...day,
      entries: entries
        .filter((e) => e.dayId === day.id)
        .map((e) => ({ ...e, hours: parseHours(e.hours) })),
    }))
  }

  async restoreDay(userId: string, id: string) {
    const day = await this.db
      .select()
      .from(worklogDays)
      .where(and(eq(worklogDays.id, id), eq(worklogDays.userId, userId), isNotNull(worklogDays.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!day) throw new NotFoundException('Day not found in trash')

    await this.db
      .update(worklogDays)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(worklogDays.id, id))
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async searchDays(userId: string, q: string) {
    const days = await this.db
      .select()
      .from(worklogDays)
      .where(
        and(
          eq(worklogDays.userId, userId),
          isNull(worklogDays.deletedAt),
          ilike(worklogDays.note, `%${q}%`),
        ),
      )
      .orderBy(desc(worklogDays.date))
      .limit(50)

    if (days.length === 0) return []

    const dayIds = days.map((d) => d.id)
    const entries = await this.db
      .select()
      .from(worklogEntries)
      .where(inArray(worklogEntries.dayId, dayIds))

    return days.map((day) => ({
      ...day,
      entries: entries
        .filter((e) => e.dayId === day.id)
        .map((e) => ({ ...e, hours: parseHours(e.hours) })),
    }))
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  async getMonthlySummary(userId: string, month: string) {
    const { from, to } = monthRange(month)

    // Stessa fonte della stima (stima.resolver.ts) — mai ricalcolare qui, deve
    // coincidere esattamente col giorniLavorabiliMese usato per la pro-quota fissa.
    const year = parseInt(month.split('-')[0] ?? '0', 10)
    const calendarWorkingDays = getWorkingDays(month, getItalianHolidays(year))
    const giorniLavorabiliMese = calendarWorkingDays.length

    const kindRows = await this.db
      .select({
        kind: worklogEntries.kind,
        totalHours: sql<string>`SUM(${worklogEntries.hours}::numeric)`,
      })
      .from(worklogEntries)
      .innerJoin(worklogDays, eq(worklogEntries.dayId, worklogDays.id))
      .where(
        and(
          eq(worklogDays.userId, userId),
          gte(worklogDays.date, from),
          lte(worklogDays.date, to),
          isNull(worklogDays.deletedAt),
        ),
      )
      .groupBy(worklogEntries.kind)

    const daysWorkedRow = await this.db
      .select({ count: sql<string>`COUNT(DISTINCT ${worklogDays.id})` })
      .from(worklogDays)
      .innerJoin(worklogEntries, eq(worklogEntries.dayId, worklogDays.id))
      .where(
        and(
          eq(worklogDays.userId, userId),
          gte(worklogDays.date, from),
          lte(worklogDays.date, to),
          isNull(worklogDays.deletedAt),
          sql`${worklogEntries.kind} IN ('work', 'overtime')`,
        ),
      )
      .then((r) => r[0])

    function h(kind: EntryKind): number {
      return parseHours(kindRows.find((r) => r.kind === kind)?.totalHours)
    }

    const oreOrdinarie = h('work')
    const oreStraordinario = h('overtime')

    // Completezza mese — "registrato" = almeno un'entry di QUALSIASI kind (non solo work/
    // overtime, a differenza di daysWorkedRow sopra). Riusa calendarWorkingDays (stessa fonte
    // della stima), NON il blocker buco_mese (quello short-circuita al primo buco, non conta).
    const registeredDaysRows = await this.db
      .select({ date: worklogDays.date })
      .from(worklogDays)
      .innerJoin(worklogEntries, eq(worklogEntries.dayId, worklogDays.id))
      .where(
        and(
          eq(worklogDays.userId, userId),
          gte(worklogDays.date, from),
          lte(worklogDays.date, to),
          isNull(worklogDays.deletedAt),
        ),
      )
      .groupBy(worklogDays.date)
    const registeredDates = new Set(registeredDaysRows.map((r) => r.date))

    const todayStr = todayDate()
    let giorniRegistrati = 0
    let giorniConBuco = 0
    for (const dateStr of calendarWorkingDays) {
      if (registeredDates.has(dateStr)) giorniRegistrati++
      else if (dateStr < todayStr) giorniConBuco++
    }

    // Residui — computed only when contract has balance anchor configured
    const contract = await this.db
      .select()
      .from(worklogContract)
      .where(eq(worklogContract.userId, userId))
      .limit(1)
      .then((r) => r[0])

    let residuiFerie: number | null = null
    let residuiPermessi: number | null = null

    if (contract?.saldoAllaData && contract.ferieResidueOreIniziali != null) {
      const mesi = Math.max(0, monthsFrom(contract.saldoAllaData))
      const rateoFerie = parseHours(contract.rateoFerieMensile)
      const rateoPermessi = parseHours(contract.rateoPermessiMensile)
      const inizialiFerie = parseHours(contract.ferieResidueOreIniziali)
      const inizialiPermessi = parseHours(contract.permessiResiduiOreIniziali)

      // Consumed from saldoAllaData to end of requested month
      const consumedRows = await this.db
        .select({
          kind: worklogEntries.kind,
          totalHours: sql<string>`SUM(${worklogEntries.hours}::numeric)`,
        })
        .from(worklogEntries)
        .innerJoin(worklogDays, eq(worklogEntries.dayId, worklogDays.id))
        .where(
          and(
            eq(worklogDays.userId, userId),
            gte(worklogDays.date, contract.saldoAllaData),
            lte(worklogDays.date, to),
            isNull(worklogDays.deletedAt),
            sql`${worklogEntries.kind} IN ('vacation', 'leave')`,
          ),
        )
        .groupBy(worklogEntries.kind)

      const ferieConsumate = parseHours(consumedRows.find((r) => r.kind === 'vacation')?.totalHours)
      const permessiConsumati = parseHours(consumedRows.find((r) => r.kind === 'leave')?.totalHours)

      residuiFerie = inizialiFerie + mesi * rateoFerie - ferieConsumate
      residuiPermessi = inizialiPermessi + mesi * rateoPermessi - permessiConsumati
    }

    // Mensa — query sempre eseguita, mirror sindacato/CIG: "riga assente" = non attivo, mai un blocker.
    const [mensaConfig] = await this.db
      .select()
      .from(worklogMensaConfig)
      .where(eq(worklogMensaConfig.userId, userId))
      .limit(1)
    const mensaAttiva = mensaConfig?.attivo ?? false

    // numeroPasti: stesso confine giorni (calendarWorkingDays) e stesso predicato tri-state
    // (mealOverride ?? deriveMeal) del resolver stima — deriveMeal riusato, MAI ridefinito qui.
    // A differenza del resolver, un giorno feriale non registrato non blocca (buco_mese vive
    // solo nella stima) — qui conta semplicemente 0, il riepilogo non deve mai bloccarsi sui buchi.
    let numeroPasti = 0
    if (mensaAttiva) {
      const mealRows = await this.db
        .select({
          date: worklogDays.date,
          mealOverride: worklogDays.mealOverride,
          kind: worklogEntries.kind,
        })
        .from(worklogDays)
        .leftJoin(worklogEntries, eq(worklogEntries.dayId, worklogDays.id))
        .where(
          and(
            eq(worklogDays.userId, userId),
            gte(worklogDays.date, from),
            lte(worklogDays.date, to),
            isNull(worklogDays.deletedAt),
          ),
        )

      const mealDayMap = new Map<string, { kind: EntryKind }[]>()
      const mealOverrideMap = new Map<string, boolean | null>()
      for (const row of mealRows) {
        if (!mealDayMap.has(row.date)) mealDayMap.set(row.date, [])
        mealOverrideMap.set(row.date, row.mealOverride)
        if (row.kind != null) mealDayMap.get(row.date)!.push({ kind: row.kind as EntryKind })
      }

      for (const dateStr of calendarWorkingDays) {
        const entries = mealDayMap.get(dateStr)
        if (entries === undefined) continue
        const override = mealOverrideMap.get(dateStr) ?? null
        if (override !== null ? override : deriveMeal(entries)) numeroPasti++
      }
    }

    return {
      month,
      daysWorked: parseInt(daysWorkedRow?.count ?? '0', 10),
      giorniLavorabiliMese,
      giorniRegistrati,
      giorniConBuco,
      oreOrdinarie,
      oreStraordinario,
      oreFerie: h('vacation'),
      orePermesso: h('leave'),
      oreMalattia: h('sick'),
      oreFestivi: h('holiday'),
      orePermessoNonRetribuito: h('permesso_non_retribuito'),
      oreCig: h('cig'),
      totaleRegistrate: kindRows.reduce((sum, r) => sum + parseHours(r.totalHours), 0),
      oreRestanti: 0,
      // Residui (null = not configured)
      residuiFerie,
      residuiPermessi,
      mensaAttiva,
      numeroPasti,
    }
  }

  // ── Contract ─────────────────────────────────────────────────────────────────

  async getContract(userId: string) {
    const row = await this.db
      .select()
      .from(worklogContract)
      .where(eq(worklogContract.userId, userId))
      .limit(1)
      .then((r) => r[0])

    if (!row) {
      return {
        oreGiornaliereStandard: 8,
        oreLavorativeSettimanali: 40,
        giorniLavorativiSettimana: [1, 2, 3, 4, 5],
        saldoAllaData: null,
        ferieResidueOreIniziali: null,
        permessiResiduiOreIniziali: null,
        rateoFerieMensile: null,
        rateoPermessiMensile: null,
      }
    }

    return {
      oreGiornaliereStandard: parseHours(row.oreGiornaliereStandard),
      oreLavorativeSettimanali: parseHours(row.oreLavorativeSettimanali),
      giorniLavorativiSettimana: row.giorniLavorativiSettimana,
      regimeOrario: row.regimeOrario ?? null,
      saldoAllaData: row.saldoAllaData ?? null,
      ferieResidueOreIniziali: row.ferieResidueOreIniziali != null ? parseHours(row.ferieResidueOreIniziali) : null,
      permessiResiduiOreIniziali: row.permessiResiduiOreIniziali != null ? parseHours(row.permessiResiduiOreIniziali) : null,
      rateoFerieMensile: row.rateoFerieMensile != null ? parseHours(row.rateoFerieMensile) : null,
      rateoPermessiMensile: row.rateoPermessiMensile != null ? parseHours(row.rateoPermessiMensile) : null,
    }
  }

  async updateContract(userId: string, dto: UpdateContractDto) {
    const values = {
      userId,
      oreGiornaliereStandard: String(dto.oreGiornaliereStandard),
      oreLavorativeSettimanali: String(dto.oreLavorativeSettimanali),
      giorniLavorativiSettimana: dto.giorniLavorativiSettimana,
      regimeOrario: dto.regimeOrario ?? null,
      saldoAllaData: dto.saldoAllaData ?? null,
      ferieResidueOreIniziali: dto.ferieResidueOreIniziali != null ? String(dto.ferieResidueOreIniziali) : null,
      permessiResiduiOreIniziali: dto.permessiResiduiOreIniziali != null ? String(dto.permessiResiduiOreIniziali) : null,
      rateoFerieMensile: dto.rateoFerieMensile != null ? String(dto.rateoFerieMensile) : null,
      rateoPermessiMensile: dto.rateoPermessiMensile != null ? String(dto.rateoPermessiMensile) : null,
    }

    await this.db
      .insert(worklogContract)
      .values(values)
      .onConflictDoUpdate({
        target: worklogContract.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getContract(userId)
  }

  // ── Templates ────────────────────────────────────────────────────────────────

  async getTemplates(userId: string) {
    return this.db
      .select()
      .from(worklogTemplates)
      .where(eq(worklogTemplates.userId, userId))
      .orderBy(asc(worklogTemplates.createdAt))
  }

  async createTemplate(userId: string, dto: CreateTemplateDto) {
    const [template] = await this.db
      .insert(worklogTemplates)
      .values({
        userId,
        name: dto.name,
        entries: dto.entries,
      })
      .returning()
    return template!
  }

  async updateTemplate(userId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.db
      .select()
      .from(worklogTemplates)
      .where(and(eq(worklogTemplates.id, id), eq(worklogTemplates.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (!template) throw new NotFoundException('Template not found')

    const [updated] = await this.db
      .update(worklogTemplates)
      .set({ name: dto.name, entries: dto.entries })
      .where(eq(worklogTemplates.id, id))
      .returning()
    return updated!
  }

  async deleteTemplate(userId: string, id: string) {
    const template = await this.db
      .select()
      .from(worklogTemplates)
      .where(and(eq(worklogTemplates.id, id), eq(worklogTemplates.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (!template) throw new NotFoundException('Template not found')

    await this.db
      .delete(worklogTemplates)
      .where(eq(worklogTemplates.id, id))
  }

  // ── CCNL ─────────────────────────────────────────────────────────────────────

  async getCcnlList() {
    return this.db
      .select({
        id: worklogCcnlProfile.id,
        nome: worklogCcnlProfile.nome,
        divisoreOrario: worklogCcnlProfile.divisoreOrario,
        orarioSettimanale: worklogCcnlProfile.orarioSettimanale,
        maggiorazioni: worklogCcnlProfile.maggiorazioni,
        limitiStraordinario: worklogCcnlProfile.limitiStraordinario,
        defaultRolOreAnno: worklogCcnlProfile.defaultRolOreAnno,
        defaultExFestivitaOreAnno: worklogCcnlProfile.defaultExFestivitaOreAnno,
        validoFino: worklogCcnlProfile.validoFino,
      })
      .from(worklogCcnlProfile)
      .orderBy(asc(worklogCcnlProfile.nome))
  }

  // ── Fiscal config ─────────────────────────────────────────────────────────────

  async getFiscalConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogUserFiscalConfig)
      .where(eq(worklogUserFiscalConfig.userId, userId))
      .limit(1)

    const fiscalYearRows = await this.db
      .select({ anno: worklogFiscalProfile.anno })
      .from(worklogFiscalProfile)
      .orderBy(asc(worklogFiscalProfile.anno))

    const availableFiscalYears = fiscalYearRows.map((r) => r.anno)

    if (!config) return { config: null, availableFiscalYears }

    return {
      config: {
        ccnlId: config.ccnlId,
        tipoContratto: config.tipoContratto,
        regione: config.regione ?? null,
        comune: config.comune ?? null,
        aliquotaAddRegionale: config.aliquotaAddRegionale != null ? parseFloat(config.aliquotaAddRegionale) : null,
        aliquotaAddComunale: config.aliquotaAddComunale != null ? parseFloat(config.aliquotaAddComunale) : null,
        mensilita: config.mensilita,
        contributiInpsOverride: config.contributiInpsOverride != null ? parseFloat(config.contributiInpsOverride) : null,
      },
      availableFiscalYears,
    }
  }

  async upsertFiscalConfig(userId: string, dto: UpsertFiscalConfigDto) {
    // Verify CCNL exists — FK violation would surface as a cryptic DB error otherwise
    const [ccnl] = await this.db
      .select({ id: worklogCcnlProfile.id })
      .from(worklogCcnlProfile)
      .where(eq(worklogCcnlProfile.id, dto.ccnlId))
      .limit(1)

    if (!ccnl) throw new BadRequestException(`CCNL '${dto.ccnlId}' not found`)

    const values = {
      userId,
      ccnlId: dto.ccnlId,
      tipoContratto: dto.tipoContratto,
      regione: dto.regione ?? null,
      comune: dto.comune ?? null,
      aliquotaAddRegionale: dto.aliquotaAddRegionale != null ? String(dto.aliquotaAddRegionale) : null,
      aliquotaAddComunale: dto.aliquotaAddComunale != null ? String(dto.aliquotaAddComunale) : null,
      contributiInpsOverride: dto.contributiInpsOverride != null ? String(dto.contributiInpsOverride) : null,
      ...(dto.mensilita != null ? { mensilita: dto.mensilita } : {}),
    }

    await this.db
      .insert(worklogUserFiscalConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogUserFiscalConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return (await this.getFiscalConfig(userId)).config
  }

  // ── Retribuzione ──────────────────────────────────────────────────────────────

  async getRetribuzione(userId: string) {
    const rows = await this.db
      .select()
      .from(worklogRetribuzione)
      .where(eq(worklogRetribuzione.userId, userId))
      .orderBy(desc(worklogRetribuzione.decorrenza))

    return rows.map((r) => ({
      id: r.id,
      decorrenza: r.decorrenza,
      tipo: r.tipo,
      importo: parseFloat(r.importo),
      premioFisso: r.premioFisso != null ? parseFloat(r.premioFisso) : null,
      minimoTabellare: r.minimoTabellare != null ? parseFloat(r.minimoTabellare) : null,
      superminimo: r.superminimo != null ? parseFloat(r.superminimo) : null,
      scattiAnzianita: r.scattiAnzianita != null ? parseFloat(r.scattiAnzianita) : null,
      premioProduzioneFisso: r.premioProduzioneFisso != null ? parseFloat(r.premioProduzioneFisso) : null,
      note: r.note ?? null,
    }))
  }

  async createRetribuzione(userId: string, dto: CreateRetribuzioneDto) {
    const [row] = await this.db
      .insert(worklogRetribuzione)
      .values({
        userId,
        decorrenza: dto.decorrenza,
        tipo: dto.tipo,
        importo: String(dto.importo),
        premioFisso: dto.premioFisso != null ? String(dto.premioFisso) : null,
        minimoTabellare: dto.minimoTabellare != null ? String(dto.minimoTabellare) : null,
        superminimo: dto.superminimo != null ? String(dto.superminimo) : null,
        scattiAnzianita: dto.scattiAnzianita != null ? String(dto.scattiAnzianita) : null,
        premioProduzioneFisso: dto.premioProduzioneFisso != null ? String(dto.premioProduzioneFisso) : null,
        note: dto.note ?? null,
      })
      .returning()

    const r = row!
    return {
      id: r.id,
      decorrenza: r.decorrenza,
      tipo: r.tipo,
      importo: parseFloat(r.importo),
      premioFisso: r.premioFisso != null ? parseFloat(r.premioFisso) : null,
      minimoTabellare: r.minimoTabellare != null ? parseFloat(r.minimoTabellare) : null,
      superminimo: r.superminimo != null ? parseFloat(r.superminimo) : null,
      scattiAnzianita: r.scattiAnzianita != null ? parseFloat(r.scattiAnzianita) : null,
      premioProduzioneFisso: r.premioProduzioneFisso != null ? parseFloat(r.premioProduzioneFisso) : null,
      note: r.note ?? null,
    }
  }

  async updateRetribuzione(userId: string, id: string, dto: CreateRetribuzioneDto) {
    const existing = await this.db
      .select({ id: worklogRetribuzione.id })
      .from(worklogRetribuzione)
      .where(and(eq(worklogRetribuzione.id, id), eq(worklogRetribuzione.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (!existing) throw new NotFoundException('Retribuzione entry not found')

    // decorrenza esclusa dal set — questa route corregge una riga, non la sposta (Diagnosi B, sessione 2026-07-11)
    const [row] = await this.db
      .update(worklogRetribuzione)
      .set({
        tipo: dto.tipo,
        importo: String(dto.importo),
        premioFisso: dto.premioFisso != null ? String(dto.premioFisso) : null,
        minimoTabellare: dto.minimoTabellare != null ? String(dto.minimoTabellare) : null,
        superminimo: dto.superminimo != null ? String(dto.superminimo) : null,
        scattiAnzianita: dto.scattiAnzianita != null ? String(dto.scattiAnzianita) : null,
        premioProduzioneFisso: dto.premioProduzioneFisso != null ? String(dto.premioProduzioneFisso) : null,
        note: dto.note ?? null,
      })
      .where(eq(worklogRetribuzione.id, id))
      .returning()

    const r = row!
    return {
      id: r.id,
      decorrenza: r.decorrenza,
      tipo: r.tipo,
      importo: parseFloat(r.importo),
      premioFisso: r.premioFisso != null ? parseFloat(r.premioFisso) : null,
      minimoTabellare: r.minimoTabellare != null ? parseFloat(r.minimoTabellare) : null,
      superminimo: r.superminimo != null ? parseFloat(r.superminimo) : null,
      scattiAnzianita: r.scattiAnzianita != null ? parseFloat(r.scattiAnzianita) : null,
      premioProduzioneFisso: r.premioProduzioneFisso != null ? parseFloat(r.premioProduzioneFisso) : null,
      note: r.note ?? null,
    }
  }

  async deleteRetribuzione(userId: string, id: string) {
    const [row] = await this.db
      .select({ id: worklogRetribuzione.id })
      .from(worklogRetribuzione)
      .where(and(eq(worklogRetribuzione.id, id), eq(worklogRetribuzione.userId, userId)))
      .limit(1)

    if (!row) throw new NotFoundException('Retribuzione entry not found')

    await this.db
      .delete(worklogRetribuzione)
      .where(eq(worklogRetribuzione.id, id))
  }

  // ── Variabili flat (Step 6) — premio produzione feriale/variabile, one-off per mese ────────

  async getVariabiliFlat(userId: string, mese?: string) {
    const rows = await this.db
      .select()
      .from(worklogVariabiliFlat)
      .where(mese
        ? and(eq(worklogVariabiliFlat.userId, userId), eq(worklogVariabiliFlat.mese, mese))
        : eq(worklogVariabiliFlat.userId, userId))
      .orderBy(desc(worklogVariabiliFlat.mese))

    return rows.map((r) => ({
      id: r.id,
      mese: r.mese,
      tipo: r.tipo as VariabileFlatTipo,
      importo: parseFloat(r.importo),
      note: r.note ?? null,
    }))
  }

  async createVariabileFlat(userId: string, dto: CreateVariabileFlatDto) {
    const [row] = await this.db
      .insert(worklogVariabiliFlat)
      .values({
        userId,
        mese: dto.mese,
        tipo: dto.tipo,
        importo: String(dto.importo),
        note: dto.note ?? null,
      })
      .returning()

    const r = row!
    return { id: r.id, mese: r.mese, tipo: r.tipo as VariabileFlatTipo, importo: parseFloat(r.importo), note: r.note ?? null }
  }

  async updateVariabileFlat(userId: string, id: string, dto: UpdateVariabileFlatDto) {
    const row = await this.db
      .select({ id: worklogVariabiliFlat.id })
      .from(worklogVariabiliFlat)
      .where(and(eq(worklogVariabiliFlat.id, id), eq(worklogVariabiliFlat.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (!row) throw new NotFoundException('Variabile flat entry not found')

    const [updated] = await this.db
      .update(worklogVariabiliFlat)
      .set({ mese: dto.mese, tipo: dto.tipo, importo: String(dto.importo), note: dto.note ?? null })
      .where(eq(worklogVariabiliFlat.id, id))
      .returning()

    const u = updated!
    return { id: u.id, mese: u.mese, tipo: u.tipo as VariabileFlatTipo, importo: parseFloat(u.importo), note: u.note ?? null }
  }

  async deleteVariabileFlat(userId: string, id: string) {
    const [row] = await this.db
      .select({ id: worklogVariabiliFlat.id })
      .from(worklogVariabiliFlat)
      .where(and(eq(worklogVariabiliFlat.id, id), eq(worklogVariabiliFlat.userId, userId)))
      .limit(1)

    if (!row) throw new NotFoundException('Variabile flat entry not found')

    await this.db
      .delete(worklogVariabiliFlat)
      .where(eq(worklogVariabiliFlat.id, id))
  }

  // ── CIG config (Step 5) — single-row per user, upsert, mirror fiscal-config ────────────────

  async getCigConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogCigConfig)
      .where(eq(worklogCigConfig.userId, userId))
      .limit(1)

    if (!config) return null

    return {
      tipo: config.tipo as CigConfigTipo,
      coefficiente: parseFloat(config.coefficiente),
      massimaleMensile: config.massimaleMensile != null ? parseFloat(config.massimaleMensile) : null,
      note: config.note ?? null,
    }
  }

  async upsertCigConfig(userId: string, dto: UpsertCigConfigDto) {
    const values = {
      userId,
      tipo: dto.tipo,
      coefficiente: String(dto.coefficiente),
      massimaleMensile: dto.massimaleMensile != null ? String(dto.massimaleMensile) : null,
      note: dto.note ?? null,
    }

    await this.db
      .insert(worklogCigConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogCigConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getCigConfig(userId)
  }

  async getCigMassimali() {
    const rows = await this.db
      .select()
      .from(worklogCigMassimale)
      .orderBy(desc(worklogCigMassimale.anno))

    return rows.map((r) => ({
      anno: r.anno,
      massimaleLordo: parseFloat(r.massimaleLordo),
      massimaleNetto: parseFloat(r.massimaleNetto),
      aliquotaRiduzione: parseFloat(r.aliquotaRiduzione),
      circolareInps: r.circolareInps ?? null,
      note: r.note ?? null,
      documentoUrl: r.documentoUrl ?? null,
    }))
  }

  // ── Sindacato config (trattenuta CGIL) — single-row per user, upsert, mirror CIG ──────────

  async getSindacatoConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogSindacatoConfig)
      .where(eq(worklogSindacatoConfig.userId, userId))
      .limit(1)

    if (!config) return null

    return {
      iscritto: config.iscritto,
      coefficiente: parseFloat(config.coefficiente),
      nome: config.nome ?? null,
    }
  }

  async upsertSindacatoConfig(userId: string, dto: UpsertSindacatoConfigDto) {
    const values = {
      userId,
      iscritto: dto.iscritto,
      coefficiente: String(dto.coefficiente),
      nome: dto.nome ?? null,
    }

    await this.db
      .insert(worklogSindacatoConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogSindacatoConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getSindacatoConfig(userId)
  }

  // ── Mensa config (trattenuta mensa) — single-row per user, upsert, mirror sindacato ──────

  async getMensaConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogMensaConfig)
      .where(eq(worklogMensaConfig.userId, userId))
      .limit(1)

    if (!config) return null

    return {
      attivo: config.attivo,
      importo: parseFloat(config.importo),
    }
  }

  async upsertMensaConfig(userId: string, dto: UpsertMensaConfigDto) {
    const values = {
      userId,
      attivo: dto.attivo,
      importo: String(dto.importo),
    }

    await this.db
      .insert(worklogMensaConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogMensaConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getMensaConfig(userId)
  }

  // ── Addizionali config (trattenuta addizionali regionale/comunale) — single-row per user,
  // upsert, mirror mensa. Importi GIÀ MENSILI presi dalla busta reale, mai calcolati qui.

  async getAddizionaliConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogAddizionaliConfig)
      .where(eq(worklogAddizionaliConfig.userId, userId))
      .limit(1)

    if (!config) return null

    return {
      attivo: config.attivo,
      addizionaleRegionale: parseFloat(config.addizionaleRegionale),
      addizionaleComunale: parseFloat(config.addizionaleComunale),
      accontoComunale: parseFloat(config.accontoComunale),
    }
  }

  async upsertAddizionaliConfig(userId: string, dto: UpsertAddizionaliConfigDto) {
    const values = {
      userId,
      attivo: dto.attivo,
      addizionaleRegionale: String(dto.addizionaleRegionale),
      addizionaleComunale: String(dto.addizionaleComunale),
      accontoComunale: String(dto.accontoComunale),
    }

    await this.db
      .insert(worklogAddizionaliConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogAddizionaliConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getAddizionaliConfig(userId)
  }

  // ── Cometa config (previdenza complementare) — single-row per user, upsert, mirror sindacato ──

  async getCometaConfig(userId: string) {
    const [config] = await this.db
      .select()
      .from(worklogCometaConfig)
      .where(eq(worklogCometaConfig.userId, userId))
      .limit(1)

    if (!config) return null

    return {
      iscritto: config.iscritto,
      coefficiente: config.coefficiente != null ? parseFloat(config.coefficiente) : null,
    }
  }

  async upsertCometaConfig(userId: string, dto: UpsertCometaConfigDto) {
    const values = {
      userId,
      iscritto: dto.iscritto,
      coefficiente: dto.coefficiente != null ? String(dto.coefficiente) : null,
    }

    await this.db
      .insert(worklogCometaConfig)
      .values(values)
      .onConflictDoUpdate({
        target: worklogCometaConfig.userId,
        set: { ...values, updatedAt: new Date() },
      })

    return this.getCometaConfig(userId)
  }

  // ── Netto reale (per mese) — chiave composta (userId, mese), upsert, mirror config
  // single-row ma con target composito (stesso pattern moduleKvStore) ─────────────

  async getNettoReale(userId: string, mese: string) {
    const [row] = await this.db
      .select()
      .from(worklogNettoReale)
      .where(and(eq(worklogNettoReale.userId, userId), eq(worklogNettoReale.mese, mese)))
      .limit(1)

    if (!row) return null

    return {
      mese: row.mese,
      netto: parseFloat(row.netto),
    }
  }

  async upsertNettoReale(userId: string, dto: UpsertNettoRealeDto) {
    const values = {
      userId,
      mese: dto.mese,
      netto: String(dto.netto),
    }

    await this.db
      .insert(worklogNettoReale)
      .values(values)
      .onConflictDoUpdate({
        target: [worklogNettoReale.userId, worklogNettoReale.mese],
        set: { netto: values.netto, updatedAt: new Date() },
      })

    return this.getNettoReale(userId, dto.mese)
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async exportData(userId: string, format: 'csv' | 'json', from: string, to: string) {
    const days = await this.getDays(userId, from, to)

    if (format === 'json') {
      return { contentType: 'application/json', data: JSON.stringify(days, null, 2) }
    }

    // CSV
    const rows: string[] = ['data,tipo,ore,note_voce,note_giorno']
    for (const day of days) {
      for (const entry of day.entries) {
        const cols = [
          day.date,
          entry.kind,
          entry.hours.toFixed(2),
          (entry.note ?? '').replace(/,/g, ';'),
          (day.note ?? '').replace(/,/g, ';'),
        ]
        rows.push(cols.join(','))
      }
    }
    return { contentType: 'text/csv', data: rows.join('\n') }
  }
}
