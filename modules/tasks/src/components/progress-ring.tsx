'use client'

/**
 * Anello di progresso (mockup, punto 2). SVG puro: nessuna libreria per due cerchi.
 * Colori dai token del tema, così funziona anche in light.
 */
export function ProgressRing({
  percent,
  label,
  size = 76,
}: {
  percent: number
  label: string
  size?: number
}) {
  const stroke = 6
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const safe = Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - safe / 100)

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset .35s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium text-text">
          {Math.round(safe)}%
        </span>
      </div>
      <span className="font-mono text-[10px] tracking-[0.14em] text-text-subtle">{label}</span>
    </div>
  )
}
