'use client'

import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  suggestions: number[]
  placeholder?: string
  className?: string
}

export function ComponentAutocomplete({ value, onChange, suggestions, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const matches = suggestions.filter((v) => String(v).startsWith(value))

  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={0}
        step={10}
        placeholder={placeholder}
        required
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        className={className}
      />

      {open && matches.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-bg py-1 shadow-lg">
            {matches.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { onChange(String(v)); setOpen(false) }}
                className="block w-full px-3 py-1 text-left text-sm text-text hover:bg-surface"
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
