'use client'

import type { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
}

/** Hover tooltip for icon-only controls — CSS-only (group-hover), no native title attribute. */
export function IconTooltip({ label, children }: Props) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-bg px-2 py-1 text-xs text-text opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
