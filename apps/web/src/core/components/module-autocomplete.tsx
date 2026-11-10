'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}

// Variante testo del pattern catcher/dropdown di modules/worklog/component-autocomplete.tsx
// (quello è number-only, per i componenti retribuzione — non riusabile qui: slug testo libero,
// modulo separato). Stessa struttura: fixed inset-0 come catcher, niente onBlur/tastiera in v1.
export function ModuleAutocomplete({ value, onChange, suggestions, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)

  const matches = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        className={className}
      />

      {open && matches.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg py-1 shadow-lg">
            {matches.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className="block w-full px-3 py-1 text-left text-sm text-text hover:bg-surface"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
