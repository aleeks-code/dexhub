/**
 * DexHub Semantic Design System
 * Standardized status styles ensuring visual coherence across all modules:
 *
 * - Warning / Attenzione: Yellow 300–400 (avvisi, urgenze moderate)
 * - Errore / Scaduto: Rose 400 (errori, scadenze superate)
 * - Info / Tecnologia: Sky 400 (turno pomeridiano, latenza, connettività)
 * - Neutro / Workflow: Slate / Surface (richieste in attesa ordinaria, undo)
 * - Notturno: Purple 400 (turno notturno 22-06)
 * - Champagne Gold: Tonalità metallica dorata desaturata per chip carte fisiche
 */

export const statusColors = {
  warning: {
    text: 'text-yellow-400 dark:text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
    badge: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25',
    dot: 'bg-yellow-400',
  },
  danger: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    dot: 'bg-rose-400',
  },
  info: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
    dot: 'bg-sky-400',
  },
  neutral: {
    text: 'text-text-subtle',
    bg: 'bg-surface-raised',
    border: 'border-border',
    badge: 'bg-surface-raised text-text-subtle border border-border/80',
    dot: 'bg-zinc-500',
  },
  holiday: {
    text: 'text-rose-400/90 font-bold',
    surface: 'bg-rose-500/[0.05] border-rose-500/20',
  },
  nightShift: {
    text: 'text-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/25',
  },
  afternoonShift: {
    text: 'text-sky-400',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
  },
  champagneGold: {
    chipGradient: 'from-[#f3ead2] via-[#e2d4ae] to-[#baa36d]',
    chipBorder: 'border-[#a89058]/50',
  },
} as const
