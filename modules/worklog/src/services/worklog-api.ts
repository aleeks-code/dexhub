import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScaglioneFiscale } from '@dexhub/worklog-engine'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''
const BASE = `${API}/api/v1/worklog`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntryKind =
  | 'work' | 'overtime' | 'vacation' | 'leave'
  | 'sick' | 'holiday' | 'cig' | 'permesso_non_retribuito'

export interface EntryModifiers {
  notturno?: boolean
  pomeridiano?: boolean
  orarioInizio?: string       // 'HH:MM' — orario esplicito, precedenza su notturno/pomeridiano
  orarioFine?: string         // 'HH:MM' — fine ≤ inizio → wrappa mezzanotte
  festivoLavorato?: boolean
  reperibilita?: boolean
}

export interface WorklogEntry {
  id: string
  dayId: string
  kind: EntryKind
  hours: number
  modifiers?: EntryModifiers
  note?: string
  createdAt: string
}

export interface WorklogDay {
  id: string
  userId: string
  date: string // 'YYYY-MM-DD'
  note?: string
  mealOverride?: boolean | null
  deletedAt?: string | null
  entries: WorklogEntry[]
  createdAt: string
  updatedAt: string
}

export interface EntryInput {
  kind: EntryKind
  hours: number
  modifiers?: EntryModifiers
  note?: string
}

export interface UpsertDayInput {
  date: string
  note?: string
  mealOverride?: boolean | null
  entries: EntryInput[]
}

export interface MonthlySummary {
  month: string
  daysWorked: number
  giorniLavorabiliMese: number
  giorniRegistrati: number
  giorniConBuco: number
  oreOrdinarie: number
  oreStraordinario: number
  oreFerie: number
  orePermesso: number
  oreMalattia: number
  oreFestivi: number
  orePermessoNonRetribuito: number
  oreCig: number
  oreRestanti: number
  totaleRegistrate: number
  // null when balance anchor not configured
  residuiFerie: number | null
  residuiPermessi: number | null
  mensaAttiva: boolean
  numeroPasti: number
}

export interface ContractConfig {
  oreGiornaliereStandard: number
  oreLavorativeSettimanali: number
  giorniLavorativiSettimana: number[]
  saldoAllaData: string | null
  ferieResidueOreIniziali: number | null
  permessiResiduiOreIniziali: number | null
  rateoFerieMensile: number | null
  rateoPermessiMensile: number | null
}

export interface WorklogTemplate {
  id: string
  userId: string
  name: string
  entries: EntryInput[]
  createdAt: string
}

export interface CreateTemplateInput {
  name: string
  entries: EntryInput[]
}

// ─── CCNL ────────────────────────────────────────────────────────────────────

export interface CcnlOption {
  id: string
  nome: string
}

// ─── Fiscal config ────────────────────────────────────────────────────────────

export interface FiscalConfig {
  ccnlId: string
  tipoContratto: 'ordinario' | 'apprendistato'
  regione: string | null
  comune: string | null
  aliquotaAddRegionale: number | null
  aliquotaAddComunale: number | null
  mensilita: number
  contributiInpsOverride: number | null
}

export interface FiscalConfigResponse {
  config: FiscalConfig | null
  availableFiscalYears: number[]
}

export interface UpsertFiscalConfigInput {
  ccnlId: string
  tipoContratto: 'ordinario' | 'apprendistato'
  regione?: string | null
  comune?: string | null
  aliquotaAddRegionale?: number | null
  aliquotaAddComunale?: number | null
  mensilita?: number
  contributiInpsOverride?: number | null
}

// ─── Retribuzione ─────────────────────────────────────────────────────────────

export interface RetribuzioneEntry {
  id: string
  decorrenza: string  // 'YYYY-MM'
  tipo: 'monthly' | 'hourly'
  importo: number
  premioFisso: number | null
  // Modalità 1 — scomposizione dichiarata (solo 'monthly'), tutti presenti o tutti null
  minimoTabellare: number | null
  superminimo: number | null
  scattiAnzianita: number | null
  premioProduzioneFisso: number | null
  note: string | null
}

export interface CreateRetribuzioneInput {
  decorrenza: string
  tipo: 'monthly' | 'hourly'
  importo: number
  premioFisso?: number | null
  minimoTabellare?: number | null
  superminimo?: number | null
  scattiAnzianita?: number | null
  premioProduzioneFisso?: number | null
  note?: string | null
}

// ─── Variabili flat (Step 6) — premio produzione feriale/variabile, one-off per mese ───────

export type VariabileFlatTipo = 'premio_produzione_feriale' | 'premio_produzione_variabile'

export interface VariabileFlatEntry {
  id: string
  mese: string  // 'YYYY-MM'
  tipo: VariabileFlatTipo
  importo: number
  note: string | null
}

export interface CreateVariabileFlatInput {
  mese: string
  tipo: VariabileFlatTipo
  importo: number
  note?: string | null
}

// ─── CIG config (Step 5) — single-row per user, upsert ─────────────────────────

export type CigConfigTipo = 'solidarieta'

export interface CigConfig {
  tipo: CigConfigTipo
  coefficiente: number
  massimaleMensile: number | null
  note: string | null
}

export interface UpsertCigConfigInput {
  tipo: CigConfigTipo
  coefficiente: number
  massimaleMensile?: number | null
  note?: string | null
}

// ─── Sindacato config (trattenuta CGIL) — single-row per user, upsert ──────────

export interface SindacatoConfig {
  iscritto: boolean
  coefficiente: number
  nome: string | null
}

export interface UpsertSindacatoConfigInput {
  iscritto: boolean
  coefficiente: number
  nome?: string | null
}

// ─── Mensa config (trattenuta mensa) — single-row per user, upsert ─────────────

export interface MensaConfig {
  attivo: boolean
  importo: number
}

// ─── Cometa config (previdenza complementare) — single-row per user, upsert ────

export interface CometaConfig {
  iscritto: boolean
  coefficiente: number | null  // nullable: nessun default applicativo, l'utente deve dichiararlo
}

// ─── Addizionali IRPEF config (regionale/comunale/acconto) — single-row per user, upsert ───────

export interface AddizionaliConfig {
  attivo: boolean
  addizionaleRegionale: number
  addizionaleComunale: number
  accontoComunale: number
}

// ─── Netto reale (per mese, chiave composta userId+mese) — upsert per-mese ─────

export interface NettoRealeConfig {
  mese: string  // 'YYYY-MM'
  netto: number
}

// ─── Stima ───────────────────────────────────────────────────────────────────

export type StimaBlocker =
  | 'no_user_config'
  | 'no_retribuzione'
  | 'no_ccnl_profile'
  | 'no_fiscal_profile'
  | 'no_contract'
  | 'no_turni_config'
  | 'no_cig_config'
  | 'buco_mese'

export type StimaWarningCode =
  | 'no_addizionali'
  | 'annualizzazione'
  | 'mese_parziale'
  | 'malattia_stimata'
  | 'detrazioni_stimate_ral_teorico'
  | 'quadratura_incongruente'
  | 'integrazione_solidarieta_stimata'
  | 'trattenuta_sindacale_non_disponibile'
  | 'cometa_non_disponibile'

export interface StimaOutput {
  lordo: number
  contributiInps: number
  imponibileIrpefMensile: number
  irpefNettaMensile: number
  netto: number
  ralLordo: number
  imponibileIrpefAnnuo: number
  irpefLorda: number
  detrazioniArt13: number
  beneficioCuneo: number
  stornoCig: number
  integrazioneSolidarieta: number
  trattenutaSindacale: number
  trattenutaMensa: number
  trattenutaAddizionali: number
  cometaDeducibile: number
  oreNotturne: number
  orePomeridiane: number
  warningAnnualizzazione: boolean
  warningDetrazioniForfettizzate: boolean
}

export type StimaResponse =
  | { stima: StimaOutput; stimaBlocker: null; stimaWarnings: StimaWarningCode[]; sindacatoNome: string | null; nettoReale: number | null; scarto: number | null }
  | { stima: null; stimaBlocker: StimaBlocker; stimaWarnings: StimaWarningCode[] }

// ─── Conguaglio (Fase 3 Passo 2) ──────────────────────────────────────────────

export type ConguaglioStatus = 'ok' | 'anno_incompleto' | 'dati_inconsistenti' | 'dati_insufficienti'

// Mirror di ConguaglioRawOutput lato API. Normalizzato il 2026-09-10: il backend consegna
// gia' il nominale mese per mese e il RAL teorico ricostruito, il motore non deriva piu' nulla
// da scalari (retribuzione e aliquota INPS sono time-versioned nel dominio).
export interface ConguaglioRawOutput {
  scaglioni: ScaglioneFiscale[]
  imponibiliMensiliReali: number[]
  imponibiliNominaliMensili: number[]
  ralTeoricoImponibile: number
  mesiAttesiReali: number
}

export type ConguaglioRawResponse =
  | { conguaglioRaw: ConguaglioRawOutput; conguaglioStatus: 'ok'; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: 'dati_insufficienti'; mesiCompleti: number; mesiMinimi: number; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: Exclude<ConguaglioStatus, 'ok' | 'dati_insufficienti'>; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: null; stimaBlocker: StimaBlocker }

// ─── Raw API ────────────────────────────────────────────────────────────────

export const worklogApi = {
  getDays: (from: string, to: string) =>
    request<WorklogDay[]>(`/days?from=${from}&to=${to}`),

  upsertDay: (body: UpsertDayInput) =>
    request<WorklogDay>('/days', { method: 'POST', body: JSON.stringify(body) }),

  ensureHolidayDay: (body: { date: string; hours: number }) =>
    request<{ created: boolean }>('/days/ensure-holiday', { method: 'POST', body: JSON.stringify(body) }),

  deleteDay: (id: string) =>
    fetch(`${BASE}/days/${id}`, { method: 'DELETE', credentials: 'include' }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
    }),

  getTrash: () => request<WorklogDay[]>('/trash'),

  restoreDay: (id: string) =>
    fetch(`${BASE}/days/${id}/restore`, { method: 'POST', credentials: 'include' }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
    }),

  search: (q: string) =>
    request<WorklogDay[]>(`/search?q=${encodeURIComponent(q)}`),

  getSummary: (month: string) =>
    request<MonthlySummary>(`/summary?month=${month}`),

  getContract: () => request<ContractConfig>('/contract'),

  updateContract: (body: ContractConfig) =>
    request<ContractConfig>('/contract', { method: 'PUT', body: JSON.stringify(body) }),

  getTemplates: () => request<WorklogTemplate[]>('/templates'),

  createTemplate: (body: CreateTemplateInput) =>
    request<WorklogTemplate>('/templates', { method: 'POST', body: JSON.stringify(body) }),

  updateTemplate: (id: string, body: CreateTemplateInput) =>
    request<WorklogTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteTemplate: (id: string) =>
    fetch(`${BASE}/templates/${id}`, { method: 'DELETE', credentials: 'include' }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
    }),

  exportUrl: (format: 'csv' | 'json', from: string, to: string) =>
    `${BASE}/export?format=${format}&from=${from}&to=${to}`,

  getStima: (month: string) =>
    request<StimaResponse>(`/stima?month=${month}`),

  getConguaglioRaw: () =>
    request<ConguaglioRawResponse>('/stima/conguaglio-raw'),

  getCcnlList: () =>
    request<CcnlOption[]>('/ccnl'),

  getFiscalConfig: () =>
    request<FiscalConfigResponse>('/fiscal-config'),

  upsertFiscalConfig: (body: UpsertFiscalConfigInput) =>
    request<FiscalConfig>('/fiscal-config', { method: 'PUT', body: JSON.stringify(body) }),

  getRetribuzione: () =>
    request<RetribuzioneEntry[]>('/retribuzione'),

  createRetribuzione: (body: CreateRetribuzioneInput) =>
    request<RetribuzioneEntry>('/retribuzione', { method: 'POST', body: JSON.stringify(body) }),

  updateRetribuzione: (id: string, body: CreateRetribuzioneInput) =>
    request<RetribuzioneEntry>(`/retribuzione/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteRetribuzione: (id: string) =>
    fetch(`${BASE}/retribuzione/${id}`, { method: 'DELETE', credentials: 'include' }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
    }),

  getVariabiliFlat: (mese?: string) =>
    request<VariabileFlatEntry[]>(`/variabili-flat${mese ? `?mese=${mese}` : ''}`),

  createVariabileFlat: (body: CreateVariabileFlatInput) =>
    request<VariabileFlatEntry>('/variabili-flat', { method: 'POST', body: JSON.stringify(body) }),

  deleteVariabileFlat: (id: string) =>
    fetch(`${BASE}/variabili-flat/${id}`, { method: 'DELETE', credentials: 'include' }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`)
    }),

  getCigConfig: () =>
    request<CigConfig | null>('/cig-config'),

  upsertCigConfig: (body: UpsertCigConfigInput) =>
    request<CigConfig>('/cig-config', { method: 'PUT', body: JSON.stringify(body) }),

  getSindacatoConfig: () =>
    request<SindacatoConfig | null>('/sindacato-config'),

  upsertSindacatoConfig: (body: UpsertSindacatoConfigInput) =>
    request<SindacatoConfig>('/sindacato-config', { method: 'PUT', body: JSON.stringify(body) }),

  getMensaConfig: () =>
    request<MensaConfig | null>('/mensa-config'),

  upsertMensaConfig: (body: MensaConfig) =>
    request<MensaConfig>('/mensa-config', { method: 'PUT', body: JSON.stringify(body) }),

  getCometaConfig: () =>
    request<CometaConfig | null>('/cometa-config'),

  upsertCometaConfig: (body: CometaConfig) =>
    request<CometaConfig>('/cometa-config', { method: 'PUT', body: JSON.stringify(body) }),

  getAddizionaliConfig: () =>
    request<AddizionaliConfig | null>('/addizionali-config'),

  upsertAddizionaliConfig: (body: AddizionaliConfig) =>
    request<AddizionaliConfig>('/addizionali-config', { method: 'PUT', body: JSON.stringify(body) }),

  getNettoReale: (mese: string) =>
    request<NettoRealeConfig | null>(`/netto-reale?mese=${mese}`),

  upsertNettoReale: (body: NettoRealeConfig) =>
    request<NettoRealeConfig>('/netto-reale', { method: 'PUT', body: JSON.stringify(body) }),
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const worklogKeys = {
  all: ['worklog'] as const,
  days: (from: string, to: string) => ['worklog', 'days', from, to] as const,
  trash: () => ['worklog', 'trash'] as const,
  search: (q: string) => ['worklog', 'search', q] as const,
  summary: (month: string) => ['worklog', 'summary', month] as const,
  contract: () => ['worklog', 'contract'] as const,
  templates: () => ['worklog', 'templates'] as const,
  stima: (month: string) => ['worklog', 'stima', month] as const,
  conguaglioRaw: () => ['worklog', 'conguaglio-raw'] as const,
  ccnl: () => ['worklog', 'ccnl'] as const,
  fiscalConfig: () => ['worklog', 'fiscal-config'] as const,
  retribuzione: () => ['worklog', 'retribuzione'] as const,
  variabiliFlat: (mese?: string) => ['worklog', 'variabili-flat', mese ?? 'all'] as const,
  cigConfig: () => ['worklog', 'cig-config'] as const,
  sindacatoConfig: () => ['worklog', 'sindacato-config'] as const,
  mensaConfig: () => ['worklog', 'mensa-config'] as const,
  cometaConfig: () => ['worklog', 'cometa-config'] as const,
  addizionaliConfig: () => ['worklog', 'addizionali-config'] as const,
  nettoReale: (mese: string) => ['worklog', 'netto-reale', mese] as const,
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useWorklogDays(from: string, to: string) {
  return useQuery({
    queryKey: worklogKeys.days(from, to),
    queryFn: () => worklogApi.getDays(from, to),
    staleTime: 30_000,
  })
}

export function useWorklogTrash() {
  return useQuery({
    queryKey: worklogKeys.trash(),
    queryFn: () => worklogApi.getTrash(),
    staleTime: 30_000,
  })
}

export function useWorklogSearch(q: string) {
  return useQuery({
    queryKey: worklogKeys.search(q),
    queryFn: () => worklogApi.search(q),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })
}

export function useMonthlySummary(month: string) {
  return useQuery({
    queryKey: worklogKeys.summary(month),
    queryFn: () => worklogApi.getSummary(month),
    staleTime: 30_000,
  })
}

export function useWorklogContract() {
  return useQuery({
    queryKey: worklogKeys.contract(),
    queryFn: () => worklogApi.getContract(),
    staleTime: 5 * 60_000,
  })
}

export function useWorklogTemplates() {
  return useQuery({
    queryKey: worklogKeys.templates(),
    queryFn: () => worklogApi.getTemplates(),
    staleTime: 60_000,
  })
}

export function useUpsertDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertDayInput) => worklogApi.upsertDay(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.all })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

// Create-only (Fix C-bis) — no-op se il giorno esiste già (attivo o cestinato). Niente
// invalidazione stima: un festivo non entra mai in giorniLavorabiliMese, zero impatto sui numeri.
export function useEnsureHolidayDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { date: string; hours: number }) => worklogApi.ensureHolidayDay(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.all }),
  })
}

export function useDeleteDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogApi.deleteDay(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.all })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useRestoreDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogApi.restoreDay(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.all }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContractConfig) => worklogApi.updateContract(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.all }),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTemplateInput) => worklogApi.createTemplate(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.templates() }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: CreateTemplateInput & { id: string }) => worklogApi.updateTemplate(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.templates() }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogApi.deleteTemplate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: worklogKeys.templates() }),
  })
}

export function useStima(month: string) {
  return useQuery({
    queryKey: worklogKeys.stima(month),
    queryFn: () => worklogApi.getStima(month),
    staleTime: 60_000,
  })
}

export function useConguaglioRaw(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: worklogKeys.conguaglioRaw(),
    queryFn: () => worklogApi.getConguaglioRaw(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

export function useCcnlList() {
  return useQuery({
    queryKey: worklogKeys.ccnl(),
    queryFn: () => worklogApi.getCcnlList(),
    staleTime: 10 * 60_000,
  })
}

export function useFiscalConfig() {
  return useQuery({
    queryKey: worklogKeys.fiscalConfig(),
    queryFn: () => worklogApi.getFiscalConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useRetribuzione() {
  return useQuery({
    queryKey: worklogKeys.retribuzione(),
    queryFn: () => worklogApi.getRetribuzione(),
    staleTime: 60_000,
  })
}

export function useUpsertFiscalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertFiscalConfigInput) => worklogApi.upsertFiscalConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.fiscalConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useCreateRetribuzione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRetribuzioneInput) => worklogApi.createRetribuzione(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.retribuzione() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useUpdateRetribuzione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: CreateRetribuzioneInput & { id: string }) => worklogApi.updateRetribuzione(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.retribuzione() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
      void qc.invalidateQueries({ queryKey: worklogKeys.conguaglioRaw() })
    },
  })
}

export function useDeleteRetribuzione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogApi.deleteRetribuzione(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.retribuzione() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useVariabiliFlat(mese?: string) {
  return useQuery({
    queryKey: worklogKeys.variabiliFlat(mese),
    queryFn: () => worklogApi.getVariabiliFlat(mese),
    staleTime: 30_000,
  })
}

export function useCreateVariabileFlat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateVariabileFlatInput) => worklogApi.createVariabileFlat(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['worklog', 'variabili-flat'] })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useDeleteVariabileFlat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => worklogApi.deleteVariabileFlat(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['worklog', 'variabili-flat'] })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useCigConfig() {
  return useQuery({
    queryKey: worklogKeys.cigConfig(),
    queryFn: () => worklogApi.getCigConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useUpsertCigConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertCigConfigInput) => worklogApi.upsertCigConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.cigConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useSindacatoConfig() {
  return useQuery({
    queryKey: worklogKeys.sindacatoConfig(),
    queryFn: () => worklogApi.getSindacatoConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useUpsertSindacatoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertSindacatoConfigInput) => worklogApi.upsertSindacatoConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.sindacatoConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useMensaConfig() {
  return useQuery({
    queryKey: worklogKeys.mensaConfig(),
    queryFn: () => worklogApi.getMensaConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateMensaConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MensaConfig) => worklogApi.upsertMensaConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.mensaConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useCometaConfig() {
  return useQuery({
    queryKey: worklogKeys.cometaConfig(),
    queryFn: () => worklogApi.getCometaConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCometaConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CometaConfig) => worklogApi.upsertCometaConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.cometaConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useAddizionaliConfig() {
  return useQuery({
    queryKey: worklogKeys.addizionaliConfig(),
    queryFn: () => worklogApi.getAddizionaliConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateAddizionaliConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddizionaliConfig) => worklogApi.upsertAddizionaliConfig(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: worklogKeys.addizionaliConfig() })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}

export function useNettoReale(mese: string) {
  return useQuery({
    queryKey: worklogKeys.nettoReale(mese),
    queryFn: () => worklogApi.getNettoReale(mese),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateNettoReale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NettoRealeConfig) => worklogApi.upsertNettoReale(body),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: worklogKeys.nettoReale(variables.mese) })
      void qc.invalidateQueries({ queryKey: ['worklog', 'stima'] })
    },
  })
}
