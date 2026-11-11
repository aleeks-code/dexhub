import type { CigConfigTipo, EntryKind, EntryModifiers, VariabileFlatTipo } from '@dexhub/db'

export class EntryInputDto {
  kind!: EntryKind
  hours!: number
  modifiers?: EntryModifiers
  note?: string
}

export class UpsertDayDto {
  date!: string // 'YYYY-MM-DD'
  note?: string
  // Tri-state: undefined (campo omesso) = non toccare un override esistente, null = "Auto"
  // esplicito, boolean = forza. Distinzione viva solo qui, mai appiattita a `?? null` (a
  // differenza di `note` sopra, che non ha bisogno di questa distinzione).
  mealOverride?: boolean | null
  entries!: EntryInputDto[]
}

export class UpdateContractDto {
  oreGiornaliereStandard!: number
  oreLavorativeSettimanali!: number
  giorniLavorativiSettimana!: number[]
  regimeOrario?: 'giornaliero' | 'turnista' | null
  // Balance anchor (all optional — not configured until user sets them)
  saldoAllaData?: string | null          // 'YYYY-MM-DD'
  ferieResidueOreIniziali?: number | null
  permessiResiduiOreIniziali?: number | null
  rateoFerieMensile?: number | null
  rateoPermessiMensile?: number | null
}

export class CreateTemplateDto {
  name!: string
  entries!: EntryInputDto[]
}

export class UpdateTemplateDto {
  name!: string
  entries!: EntryInputDto[]
}

export class UpsertFiscalConfigDto {
  ccnlId!: string
  tipoContratto!: 'ordinario' | 'apprendistato'
  regione?: string | null
  comune?: string | null
  aliquotaAddRegionale?: number | null
  aliquotaAddComunale?: number | null
  mensilita?: number
  contributiInpsOverride?: number | null
}

export class CreateRetribuzioneDto {
  decorrenza!: string  // 'YYYY-MM'
  tipo!: 'monthly' | 'hourly'
  importo!: number
  premioFisso?: number | null
  note?: string | null
  // Modalità 1 — scomposizione dichiarata (solo 'monthly'). Tutti e 4 insieme, o nessuno:
  // il resolver tratta "nessuno" come record legacy (nessun check di quadratura).
  minimoTabellare?: number | null
  superminimo?: number | null
  scattiAnzianita?: number | null
  premioProduzioneFisso?: number | null
}

export class CreateVariabileFlatDto {
  mese!: string  // 'YYYY-MM'
  tipo!: VariabileFlatTipo
  importo!: number
  note?: string | null
}

export class UpdateVariabileFlatDto {
  mese!: string
  tipo!: VariabileFlatTipo
  importo!: number
  note?: string | null
}

export class UpsertCigConfigDto {
  tipo!: CigConfigTipo
  coefficiente!: number
  massimaleMensile?: number | null  // predisposto, non letto v1
  note?: string | null
}

export class UpsertSindacatoConfigDto {
  iscritto!: boolean
  coefficiente!: number
  nome?: string | null  // normalizzato '' → null lato zod (controller), mai stringa vuota in DB
}

export class UpsertMensaConfigDto {
  attivo!: boolean
  importo!: number
}

export class UpsertAddizionaliConfigDto {
  attivo!: boolean
  addizionaleRegionale!: number
  addizionaleComunale!: number
  accontoComunale!: number
}

export class UpsertCometaConfigDto {
  iscritto!: boolean
  coefficiente!: number | null  // nessun default applicativo del valore percentuale
}

export class UpsertNettoRealeDto {
  mese!: string  // 'YYYY-MM'
  netto!: number
}
