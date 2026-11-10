'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Repeat,
  Plus,
  Search,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  X,
  TrendingUp,
  Tag,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  calculateSubscriptionsSummary,
} from '../services/subscriptions-service'
import type {
  Subscription,
  SubscriptionCategory,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionsSummary,
} from '../types'

const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  streaming: 'Streaming & Media',
  software: 'Software & Cloud',
  utilities: 'Utenze & Servizi',
  fitness: 'Salute & Fitness',
  hosting: 'Hosting & Domini',
  other: 'Altro',
}

const CYCLE_LABELS: Record<BillingCycle, string> = {
  mensile: 'Mese',
  annuale: 'Anno',
  trimestrale: 'Trimestre',
  settimanale: 'Settimana',
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [category, setCategory] = useState<SubscriptionCategory>('streaming')
  const [cycle, setCycle] = useState<BillingCycle>('mensile')
  const [nextRenewalDate, setNextRenewalDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [url, setUrl] = useState('')

  async function loadData() {
    try {
      const items = await listSubscriptions()
      setSubs(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const summary: SubscriptionsSummary = useMemo(() => {
    return calculateSubscriptionsSummary(subs)
  }, [subs])

  const filteredSubs = useMemo(() => {
    return subs
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .filter((s) => (filterCategory === 'all' ? true : s.category === filterCategory))
      .filter((s) => (filterStatus === 'all' ? true : s.status === filterStatus))
      .sort((a, b) => {
        const da = new Date(a.nextRenewalDate).getTime()
        const db = new Date(b.nextRenewalDate).getTime()
        return da - db
      })
  }, [subs, search, filterCategory, filterStatus])

  function openCreateModal() {
    setEditingId(null)
    setName('')
    setCost('')
    setCategory('streaming')
    setCycle('mensile')
    const nextMonth = new Date()
    nextMonth.setDate(nextMonth.getDate() + 30)
    setNextRenewalDate(nextMonth.toISOString().slice(0, 10))
    setPaymentMethod('')
    setNotes('')
    setUrl('')
    setModalOpen(true)
  }

  function openEditModal(sub: Subscription) {
    setEditingId(sub.id)
    setName(sub.name)
    setCost(String(sub.cost))
    setCategory(sub.category)
    setCycle(sub.cycle)
    setNextRenewalDate(sub.nextRenewalDate)
    setPaymentMethod(sub.paymentMethod ?? '')
    setNotes(sub.notes ?? '')
    setUrl(sub.url ?? '')
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsedCost = parseFloat(cost.replace(',', '.'))
    if (!name.trim() || isNaN(parsedCost) || parsedCost <= 0 || !nextRenewalDate) return

    if (editingId) {
      await updateSubscription(editingId, {
        name: name.trim(),
        cost: parsedCost,
        category,
        cycle,
        nextRenewalDate,
        paymentMethod: paymentMethod.trim() || undefined,
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
      })
    } else {
      await createSubscription({
        name: name.trim(),
        cost: parsedCost,
        category,
        cycle,
        nextRenewalDate,
        paymentMethod: paymentMethod.trim() || undefined,
        status: 'attivo',
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
      })
    }

    setModalOpen(false)
    await loadData()
  }

  async function handleToggleStatus(sub: Subscription) {
    const nextStatus: SubscriptionStatus = sub.status === 'attivo' ? 'in_pausa' : 'attivo'
    await updateSubscription(sub.id, { status: nextStatus })
    await loadData()
  }

  async function handleDelete(id: string) {
    if (confirm('Sei sicuro di voler rimuovere questo abbonamento?')) {
      await deleteSubscription(id)
      await loadData()
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="h-5 w-5 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Abbonamenti & Ricorrenze
            </h1>
          </div>
          <p className="text-xs text-text-muted">
            Monitora tutti i tuoi servizi e canoni attivi, le date di rinnovo e la spesa aggregata.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-violet-700 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nuovo Abbonamento</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
            Spesa Mensile Totale
          </p>
          <p className="font-mono text-2xl font-bold text-violet-500 mt-1">
            {summary.totalMonthlyCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Costo normalizzato al mese</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
            Spesa Annuale Stimata
          </p>
          <p className="font-mono text-2xl font-bold text-text mt-1">
            {summary.totalAnnualCost.toLocaleString('it-IT', { minimumFractionDigits: 0 })} €
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Previsione su 12 mesi</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
            Servizi Attivi
          </p>
          <p className="font-mono text-2xl font-bold text-emerald-500 mt-1">
            {summary.activeCount}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {summary.pausedCount > 0 ? `${summary.pausedCount} in pausa` : 'Tutti attivi'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider">
            Prossimo Rinnovo
          </p>
          {summary.nextRenewal ? (
            <div>
              <p className="font-semibold text-base text-text mt-1 truncate">
                {summary.nextRenewal.subscription.name}
              </p>
              <p className="text-[11px] font-medium text-amber-500">
                {summary.nextRenewal.daysUntil === 0
                  ? 'Oggi!'
                  : summary.nextRenewal.daysUntil === 1
                    ? 'Domani'
                    : `tra ${summary.nextRenewal.daysUntil} giorni`}{' '}
                ({summary.nextRenewal.subscription.cost.toFixed(2)} €)
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-2">Nessun rinnovo programmato</p>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome servizio..."
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Tutte le categorie</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Tutti gli stati</option>
            <option value="attivo">Attivi</option>
            <option value="in_pausa">In pausa</option>
          </select>
        </div>
      </div>

      {/* Grid of Subscriptions */}
      {loading ? (
        <div className="py-12 text-center text-xs text-text-subtle">Caricamento abbonamenti…</div>
      ) : filteredSubs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Repeat className="mx-auto h-8 w-8 text-text-subtle mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text">Nessun abbonamento trovato</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {search || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Nessun servizio corrisponde ai filtri selezionati.'
              : 'Aggiungi il tuo primo abbonamento per iniziare a tracciare costi e rinnovi.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubs.map((sub) => {
            const todayMs = new Date().setHours(0, 0, 0, 0)
            const renewalMs = new Date(sub.nextRenewalDate).getTime()
            const daysUntil = Math.round((renewalMs - todayMs) / (1000 * 60 * 60 * 24))
            const isPaused = sub.status === 'in_pausa'

            return (
              <div
                key={sub.id}
                className={`flex flex-col justify-between rounded-2xl border bg-surface p-4 transition-all hover:shadow-md ${
                  isPaused ? 'opacity-65 border-border/60' : 'border-border'
                }`}
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white font-bold text-xs shadow-sm"
                        style={{ background: sub.color ?? '#8B5CF6' }}
                      >
                        {sub.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{sub.name}</p>
                        <span className="text-[10px] text-text-muted">
                          {CATEGORY_LABELS[sub.category]}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isPaused
                          ? 'bg-surface-raised text-text-subtle'
                          : 'bg-emerald-500/15 text-emerald-500'
                      }`}
                    >
                      {isPaused ? 'In Pausa' : 'Attivo'}
                    </span>
                  </div>

                  {/* Price & Cycle */}
                  <div className="my-3 flex items-baseline gap-1.5">
                    <span className="font-mono text-xl font-bold text-text">
                      {sub.cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                    </span>
                    <span className="text-xs text-text-subtle">/ {CYCLE_LABELS[sub.cycle]}</span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-[11px] text-text-muted border-t border-border/50 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-text-subtle">
                        <Calendar className="h-3 w-3" /> Prossimo rinnovo
                      </span>
                      <span
                        className={`font-medium ${
                          daysUntil <= 3 && !isPaused
                            ? 'text-rose-500 font-bold'
                            : daysUntil <= 7 && !isPaused
                              ? 'text-amber-500'
                              : 'text-text'
                        }`}
                      >
                        {new Date(sub.nextRenewalDate).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        {!isPaused &&
                          `(${daysUntil === 0 ? 'Oggi' : daysUntil === 1 ? 'Domani' : `${daysUntil} gg`})`}
                      </span>
                    </div>

                    {sub.paymentMethod && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-text-subtle">
                          <CreditCard className="h-3 w-3" /> Metodo
                        </span>
                        <span className="truncate max-w-[12rem]">{sub.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(sub)}
                    className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-text transition-colors cursor-pointer"
                  >
                    {isPaused ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Riattiva</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span>Pausa</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(sub)}
                      className="rounded-lg p-1.5 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors cursor-pointer"
                      title="Modifica"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub.id)}
                      className="rounded-lg p-1.5 text-text-subtle hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
              <h2 className="text-base font-bold text-text">
                {editingId ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-text-subtle hover:bg-surface hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                  Nome Servizio *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Netflix, Spotify, Palestra..."
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                    Costo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="12.99"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                    Ciclo di Rinnovo
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value as BillingCycle)}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="mensile">Ogni Mese</option>
                    <option value="annuale">Ogni Anno</option>
                    <option value="trimestrale">Ogni 3 Mesi</option>
                    <option value="settimanale">Ogni Settimana</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                    Prossimo Rinnovo *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextRenewalDate}
                    onChange={(e) => setNextRenewalDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1">
                  Metodo di Pagamento
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="Es. PayPal, Visa •••• 1234, Addebito conto..."
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface hover:text-text"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  {editingId ? 'Salva Modifiche' : 'Crea Abbonamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
