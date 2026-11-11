// Italian national holidays — pure computation, no I/O.
// Easter uses the Meeus/Jones/Butcher algorithm.

function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getItalianHolidays(year: number): Set<string> {
  const easter = easterDate(year)
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)

  return new Set([
    `${year}-01-01`, // Capodanno
    `${year}-01-06`, // Epifania
    fmt(easter),     // Pasqua
    fmt(easterMonday), // Pasquetta
    `${year}-04-25`, // Liberazione
    `${year}-05-01`, // Festa del Lavoro
    `${year}-06-02`, // Festa della Repubblica
    `${year}-08-15`, // Ferragosto
    `${year}-11-01`, // Ognissanti
    `${year}-12-08`, // Immacolata
    `${year}-12-25`, // Natale
    `${year}-12-26`, // Santo Stefano
  ])
}

export function isItalianHoliday(date: string): boolean {
  const year = parseInt(date.slice(0, 4), 10)
  return getItalianHolidays(year).has(date)
}

export function getItalianHolidayName(date: string): string | null {
  const year = parseInt(date.slice(0, 4), 10)
  const easter = easterDate(year)
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)

  const names: Record<string, string> = {
    [`${year}-01-01`]: 'Capodanno',
    [`${year}-01-06`]: 'Epifania',
    [fmt(easter)]: 'Pasqua',
    [fmt(easterMonday)]: "Lunedì dell'Angelo",
    [`${year}-04-25`]: 'Liberazione',
    [`${year}-05-01`]: 'Festa del Lavoro',
    [`${year}-06-02`]: 'Festa della Repubblica',
    [`${year}-08-15`]: 'Ferragosto',
    [`${year}-11-01`]: 'Ognissanti',
    [`${year}-12-08`]: 'Immacolata',
    [`${year}-12-25`]: 'Natale',
    [`${year}-12-26`]: 'Santo Stefano',
  }

  return names[date] ?? null
}
