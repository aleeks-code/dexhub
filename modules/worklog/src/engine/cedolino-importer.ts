import { isItalianHoliday } from '../utils/holidays'
import type { CedolinoHoursBreakdown } from './cedolino-parser'
import type { EntryInput, UpsertDayInput, WorklogDay } from '../services/worklog-api'

export interface GenerateDaysFromCedolinoInput {
  month: string // 'YYYY-MM'
  ore: CedolinoHoursBreakdown
  pastiMensa: number
  standardDailyHours?: number
  standardAfternoonMarkupHours?: number // Ore di maggiorazione per giornata di turno pomeridiano (default 4h dalle 18 alle 22)
  workdays?: number[] // 1=Mon .. 5=Fri, 7=Sun
  existingDays?: WorklogDay[]
  overwriteExisting?: boolean
}

export interface CedolinoDayPreview {
  date: string
  dayNum: number
  dow: string
  isHoliday: boolean
  kind: string
  label: string
  hours: number
  notturno: boolean
  pomeridiano: boolean
  meal: boolean
  note?: string
}

export interface CedolinoImportResult {
  month: string
  daysToSave: UpsertDayInput[]
  previewDays: CedolinoDayPreview[]
  stats: {
    giorniLavorati: number
    giorniFerie: number
    giorniPermesso: number
    giorniMalattia: number
    giorniCig: number
    giorniCongedo: number
    giorniCongedo80: number
    giorniCongedo30: number
    totaleOreRegistrate: number
    pastiAssegnati: number
  }
}

function parseYYYYMM(m: string): [number, number] {
  const parts = m.split('-')
  return [parseInt(parts[0]!, 10), parseInt(parts[1]!, 10)]
}

export function generateDaysFromCedolino(input: GenerateDaysFromCedolinoInput): CedolinoImportResult {
  const {
    month,
    ore,
    pastiMensa,
    standardDailyHours = 8,
    standardAfternoonMarkupHours = 4,
    workdays = [1, 2, 3, 4, 5],
    existingDays = [],
    overwriteExisting = true,
  } = input

  const [year, mNum] = parseYYYYMM(month)
  const totalDays = new Date(year, mNum, 0).getDate()

  // 1. Identify all working days (Mon-Fri, non-holiday)
  const workingDates: string[] = []
  const holidayDates: string[] = []

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0')
    const mStr = String(mNum).padStart(2, '0')
    const dateStr = `${year}-${mStr}-${dayStr}`
    const d = new Date(`${dateStr}T00:00:00`)
    const jsDay = d.getDay() || 7 // 1=Mon..7=Sun

    if (isItalianHoliday(dateStr)) {
      holidayDates.push(dateStr)
      continue
    }

    if (workdays.includes(jsDay)) {
      workingDates.push(dateStr)
    }
  }

  // 2. Absence allocations in days
  const std = standardDailyHours || 8
  const nFerie = Math.round(ore.ferie / std)
  const nPermessi = Math.round(ore.permessi / std)
  const nMalattia = Math.round(ore.malattia / std)
  const nCig = Math.round(ore.cig / std)
  const nCongedo80 = Math.round((ore.congedo80 ?? (ore.congedo || 0)) / std)
  const nCongedo30 = Math.round((ore.congedo30 ?? 0) / std)

  const totalAbsenceDays = nFerie + nPermessi + nMalattia + nCig + nCongedo80 + nCongedo30

  // Target work days
  let nWorkDays = Math.max(0, workingDates.length - totalAbsenceDays)
  if (ore.ordinarie > 0) {
    const calculatedWorkDays = Math.ceil(ore.ordinarie / std)
    // If ordinary hours fit closely, align work days
    if (calculatedWorkDays + totalAbsenceDays <= workingDates.length) {
      nWorkDays = calculatedWorkDays
    }
  }

  // Night and afternoon shift days:
  // Nel turno notturno (22:00-06:00), tutte le ore lavorate (std, es. 8h) hanno la maggiorazione notte.
  // Nel turno pomeridiano (14:00-22:00), solo le 4 ore dopo le 18:00 (18:00-22:00) hanno la maggiorazione turno pomeridiano/notturno.
  // Pertanto, ogni giornata intera di turno pomeridiano matura 4h di maggiorazione (standardAfternoonMarkupHours).
  const nNotturnoDays = ore.notturno > 0 ? Math.min(nWorkDays, Math.ceil(ore.notturno / std)) : 0
  const nPomeridianoDays =
    ore.pomeridiano > 0
      ? Math.min(
          Math.max(0, nWorkDays - nNotturnoDays),
          Math.ceil(ore.pomeridiano / (standardAfternoonMarkupHours || 4)),
        )
      : 0

  // 3. Plan schedule across workingDates
  type SlotKind = 'work' | 'malattia' | 'cig' | 'congedo80' | 'congedo30' | 'permessi' | 'ferie'
  const plan: Array<{
    date: string
    kind: SlotKind
    hours: number
    notturno?: boolean
    pomeridiano?: boolean
    note?: string
  }> = []

  let cursor = 0

  // A. Work days
  let remainingOrd = ore.ordinarie > 0 ? ore.ordinarie : nWorkDays * std
  for (let i = 0; i < nWorkDays && cursor < workingDates.length; i++) {
    const isNight = i < nNotturnoDays
    const isAfternoon = !isNight && i < nNotturnoDays + nPomeridianoDays

    // Distribute ordinary hours smoothly (e.g. 96.5 over 12 days -> 11 x 8h + 1 x 8.5h)
    const isLastWorkDay = i === nWorkDays - 1 || cursor === workingDates.length - 1
    const h = isLastWorkDay ? Math.max(1, Math.round(remainingOrd * 10) / 10) : std
    remainingOrd = Math.max(0, remainingOrd - h)

    plan.push({
      date: workingDates[cursor]!,
      kind: 'work',
      hours: h,
      notturno: isNight || undefined,
      pomeridiano: isAfternoon || undefined,
    })
    cursor++
  }

  // B. Malattia days
  for (let i = 0; i < nMalattia && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'malattia',
      hours: std,
      note: 'Malattia',
    })
    cursor++
  }

  // C. CIG days
  for (let i = 0; i < nCig && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'cig',
      hours: std,
      note: 'Cassa Integrazione',
    })
    cursor++
  }

  // D. Congedo days
  for (let i = 0; i < nCongedo80 && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'congedo80',
      hours: std,
      note: 'Congedo parentale 80%',
    })
    cursor++
  }
  for (let i = 0; i < nCongedo30 && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'congedo30',
      hours: std,
      note: 'Congedo parentale 30%',
    })
    cursor++
  }

  // E. Permessi / PAR days
  for (let i = 0; i < nPermessi && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'permessi',
      hours: std,
      note: 'Permesso / PAR',
    })
    cursor++
  }

  // F. Ferie days
  for (let i = 0; i < nFerie && cursor < workingDates.length; i++) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'ferie',
      hours: std,
      note: 'Ferie',
    })
    cursor++
  }

  // If there are leftover working dates, assign standard work
  while (cursor < workingDates.length) {
    plan.push({
      date: workingDates[cursor]!,
      kind: 'work',
      hours: std,
    })
    cursor++
  }

  // Attach single residual extra hours (e.g. 1h assemblea sindacale) to the first or last work day
  if (ore.altreAssenze > 0) {
    const firstWork = plan.find((p) => p.kind === 'work')
    if (firstWork) {
      firstWork.note = firstWork.note
        ? `${firstWork.note} + Assemblea Sindacale`
        : 'Include Assemblea Sindacale'
    }
  }

  // Assign meals:
  // Meals are distributed across days up to `pastiMensa`:
  // 1st priority: worked days ('work')
  // 2nd priority: permessi / PAR days (often taken as partial day presence with lunch)
  // 3rd priority: any other scheduled day in the plan
  const existingMap = new Map(existingDays.map((d) => [d.date, d]))

  const isCandidateDay = (idx: number) => {
    const item = plan[idx]!
    if (!overwriteExisting && existingMap.has(item.date)) {
      const existing = existingMap.get(item.date)!
      if (existing.entries && existing.entries.length > 0) {
        return false // Giorno già presente e non sovrascritto
      }
    }
    return true
  }

  let existingMealsPreserved = 0
  if (!overwriteExisting) {
    for (const item of plan) {
      if (existingMap.has(item.date)) {
        const existing = existingMap.get(item.date)!
        if (existing.entries && existing.entries.length > 0 && existing.mealOverride === true) {
          existingMealsPreserved++
        }
      }
    }
  }

  let mealsRemaining = Math.max(0, pastiMensa - existingMealsPreserved)
  const mealIndices = new Set<number>()

  // Priority 1: Work days (solo sui giorni effettivamente da salvare)
  for (let i = 0; i < plan.length && mealsRemaining > 0; i++) {
    if (plan[i]!.kind === 'work' && isCandidateDay(i)) {
      mealIndices.add(i)
      mealsRemaining--
    }
  }

  // Priority 2: Permessi / ROL / PAR days (solo sui giorni da salvare)
  for (let i = 0; i < plan.length && mealsRemaining > 0; i++) {
    if (plan[i]!.kind === 'permessi' && isCandidateDay(i) && !mealIndices.has(i)) {
      mealIndices.add(i)
      mealsRemaining--
    }
  }

  // Priority 3: Altri giorni candidati pianificati
  for (let i = 0; i < plan.length && mealsRemaining > 0; i++) {
    if (isCandidateDay(i) && !mealIndices.has(i)) {
      mealIndices.add(i)
      mealsRemaining--
    }
  }

  const daysToSave: UpsertDayInput[] = []
  const previewDays: CedolinoDayPreview[] = []

  let countLavoro = 0
  let countFerie = 0
  let countPermesso = 0
  let countMalattia = 0
  let countCig = 0
  let countCongedo = 0
  let totOre = 0
  let countPasti = existingMealsPreserved

  let countCongedo80 = 0
  let countCongedo30 = 0
  for (let idx = 0; idx < plan.length; idx++) {
    const item = plan[idx]!
    if (!overwriteExisting && existingMap.has(item.date)) {
      const existing = existingMap.get(item.date)!
      if (existing.entries && existing.entries.length > 0) {
        continue
      }
    }

    let entryKind: EntryInput['kind'] = 'work'
    let label = 'Lavoro'

    switch (item.kind) {
      case 'work':
        entryKind = 'work'
        label = item.notturno ? 'Lavoro Notturno' : item.pomeridiano ? 'Lavoro Pomeridiano' : 'Ordinario'
        countLavoro++
        break
      case 'ferie':
        entryKind = 'vacation'
        label = 'Ferie'
        countFerie++
        break
      case 'permessi':
        entryKind = 'leave'
        label = 'Permesso / PAR'
        countPermesso++
        break
      case 'congedo80':
        entryKind = 'congedo_parentale_80'
        label = 'Congedo parentale 80%'
        countCongedo80++
        break
      case 'congedo30':
        entryKind = 'congedo_parentale_30'
        label = 'Congedo parentale 30%'
        countCongedo30++
        break
      case 'malattia':
        entryKind = 'sick'
        label = 'Malattia'
        countMalattia++
        break
      case 'cig':
        entryKind = 'cig'
        label = 'Cassa Integrazione'
        countCig++
        break
    }

    const hasMeal = mealIndices.has(idx)
    if (hasMeal) {
      countPasti++
    }

    const entries: EntryInput[] = [
      {
        kind: entryKind,
        hours: item.hours,
        modifiers:
          item.notturno || item.pomeridiano
            ? {
                notturno: item.notturno,
                pomeridiano: item.pomeridiano,
              }
            : undefined,
        note: item.note,
      },
    ]

    totOre += item.hours

    daysToSave.push({
      date: item.date,
      note: item.note,
      mealOverride: hasMeal ? true : undefined,
      entries,
    })

    const dObj = new Date(`${item.date}T00:00:00`)
    previewDays.push({
      date: item.date,
      dayNum: dObj.getDate(),
      dow: dObj.toLocaleDateString('it-IT', { weekday: 'short' }),
      isHoliday: false,
      kind: entryKind,
      label,
      hours: item.hours,
      notturno: Boolean(item.notturno),
      pomeridiano: Boolean(item.pomeridiano),
      meal: hasMeal,
      note: item.note,
    })
  }

  return {
    month,
    daysToSave,
    previewDays,
    stats: {
      giorniLavorati: countLavoro,
      giorniFerie: countFerie,
      giorniPermesso: countPermesso,
      giorniMalattia: countMalattia,
      giorniCig: countCig,
      giorniCongedo: countCongedo80 + countCongedo30,
      giorniCongedo80: countCongedo80,
      giorniCongedo30: countCongedo30,
      totaleOreRegistrate: Math.round(totOre * 10) / 10,
      pastiAssegnati: countPasti,
    },
  }
}
