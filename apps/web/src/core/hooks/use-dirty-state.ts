'use client'

import { useState } from 'react'

// Generic dirty-tracking for a flat object of editable fields, compared against the last
// committed snapshot. `commit` replaces the snapshot (initial load, or after a successful
// save) and clears dirty in one step — reusable wherever a form needs an unsaved-changes
// indicator (Settings, Wiki, ...).
export function useDirtyState<T extends Record<string, unknown>>(initial: T) {
  const [saved, setSaved] = useState(initial)
  const [value, setValue] = useState(initial)

  const isDirty = (Object.keys(saved) as (keyof T)[]).some((k) => value[k] !== saved[k])

  function commit(next: T) {
    setSaved(next)
    setValue(next)
  }

  return { value, setValue, isDirty, commit }
}
