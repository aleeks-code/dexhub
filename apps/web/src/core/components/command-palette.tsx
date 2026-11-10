'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Search,
  Calculator,
  Plus,
  FileText,
  CheckSquare,
  Briefcase,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useAppStore } from '@/core/store/app.store'
import { useVisibleModules } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { useT } from '@/i18n'
import type { CommandDefinition } from '@dexhub/sdk'
import { QuickCaptureModal } from './quick-capture-modal'

interface CommandItem {
  id: string
  label: string
  group: string
  href?: string
  onAction?: () => void
  icon: React.ElementType
  shortcut?: string
  keywords?: string[]
}

function formatShortcutKey(key: string): string {
  const map: Record<string, string> = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: '⌘' }
  return map[key.toLowerCase()] ?? key.toUpperCase()
}

function tryEvaluateMath(expr: string): number | null {
  const sanitized = expr.replace(/,/g, '.').trim()
  if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(sanitized)) return null
  if (!/[\+\-\*\/]/.test(sanitized)) return null
  try {
    const fn = new Function(`return (${sanitized})`)
    const res = fn()
    if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
      return Math.round(res * 10000) / 10000
    }
  } catch {
    return null
  }
  return null
}

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const { openCommandPalette, closeCommandPalette } = useAppStore()
  const router = useRouter()
  const t = useT()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const [captureModalOpen, setCaptureModalOpen] = useState(false)
  const [captureModalTab, setCaptureModalTab] = useState<'note' | 'task'>('note')

  const { data: modules } = useVisibleModules()
  const visibleModules = (modules ?? []).filter((m) => m.enabled && !m.maintenance)

  const quickActions: CommandItem[] = [
    {
      id: 'quick-note',
      label: 'Nuova Nota Rapida',
      group: 'Crea al volo',
      icon: FileText,
      keywords: ['nota', 'note', 'scrivi', 'appunto', 'memo'],
      onAction: () => {
        closeCommandPalette()
        setCaptureModalTab('note')
        setCaptureModalOpen(true)
      },
    },
    {
      id: 'quick-task',
      label: 'Nuovo Task',
      group: 'Crea al volo',
      icon: CheckSquare,
      keywords: ['task', 'compito', 'to-do', 'fare', 'promemoria'],
      onAction: () => {
        closeCommandPalette()
        setCaptureModalTab('task')
        setCaptureModalOpen(true)
      },
    },
    {
      id: 'quick-worklog',
      label: 'Registra Ore di Lavoro',
      group: 'Crea al volo',
      icon: Briefcase,
      href: '/worklog',
      keywords: ['ore', 'lavoro', 'timbra', 'worklog', 'stipendio'],
    },
  ]

  const coreItems: CommandItem[] = [
    { id: 'dashboard', label: t.dashboard.title, group: t.commandPalette.navigate, href: '/home', icon: LayoutDashboard },
    { id: 'modules', label: t.modules.nav, group: t.commandPalette.navigate, href: '/modules', icon: LayoutGrid },
    { id: 'settings', label: t.settings.title, group: t.commandPalette.navigate, href: '/settings', icon: Settings },
  ]

  const modulesWithCommands = new Set(
    visibleModules
      .filter((m) => {
        const commands = m.manifest['commands'] as CommandDefinition[] | undefined
        return commands && commands.length > 0
      })
      .map((m) => m.id),
  )

  const moduleNavItems: CommandItem[] = visibleModules
    .filter((m) => !modulesWithCommands.has(m.id))
    .map((m) => ({
      id: m.id,
      label: m.name,
      group: t.commandPalette.modules,
      href: `/${m.id}`,
      icon: resolveModuleIcon(m.manifest['icon'] as string | undefined),
    }))

  const moduleCommandItems: CommandItem[] = visibleModules.flatMap((m) => {
    const commands = (m.manifest['commands'] as CommandDefinition[] | undefined) ?? []
    const moduleIcon = m.manifest['icon'] as string | undefined
    return commands.map((cmd) => ({
      id: `${m.id}:${cmd.id}`,
      label: cmd.label,
      group: m.name,
      href: cmd.href,
      icon: resolveModuleIcon(cmd.icon ?? moduleIcon),
      shortcut: cmd.shortcut,
      keywords: cmd.keywords,
    }))
  })

  // Math calculator result
  const mathResult = useMemo(() => {
    if (!query.trim()) return null
    return tryEvaluateMath(query)
  }, [query])

  const allItems = [...quickActions, ...coreItems, ...moduleNavItems, ...moduleCommandItems]

  const filtered = useMemo(() => {
    let list: CommandItem[] = []

    if (mathResult !== null) {
      list.push({
        id: 'calc-result',
        label: `= ${mathResult} (premi Invio per copiare)`,
        group: 'Calcolatrice Rapida',
        icon: Calculator,
        onAction: () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(String(mathResult))
          }
          closeCommandPalette()
        },
      })
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      const matches = allItems.filter((i) => {
        return (
          i.label.toLowerCase().includes(q) ||
          i.keywords?.some((kw) => kw.toLowerCase().includes(q))
        )
      })
      list = [...list, ...matches]
    } else {
      list = [...list, ...allItems]
    }

    return list
  }, [query, mathResult, allItems, closeCommandPalette])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open ? closeCommandPalette() : openCommandPalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, openCommandPalette, closeCommandPalette])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  function handleSelect(item: CommandItem) {
    if (item.onAction) {
      item.onAction()
    } else if (item.href) {
      closeCommandPalette()
      router.push(item.href)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      const item = filtered[selected]
      if (item) handleSelect(item)
    } else if (e.key === 'Escape') {
      closeCommandPalette()
    }
  }

  const groups = [...new Set(filtered.map((i) => i.group))]

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-modal flex items-start justify-center pt-[15vh]"
          onClick={closeCommandPalette}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-text-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Cerca, digita un calcolo (es. 150*1.22) o crea..."
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
              />
              <kbd className="hidden rounded-lg border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-subtle sm:block">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-subtle">
                  {t.commandPalette.noResults} &ldquo;{query}&rdquo;
                </p>
              ) : (
                groups.map((group) => {
                  const items = filtered.filter((i) => i.group === group)
                  return (
                    <div key={group}>
                      <p className="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                        {group}
                      </p>
                      {items.map((item) => {
                        const idx = filtered.indexOf(item)
                        const Icon = item.icon
                        return (
                          <button
                            key={item.id}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer',
                              idx === selected
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-text hover:bg-surface',
                            )}
                            onMouseEnter={() => setSelected(idx)}
                            onClick={() => handleSelect(item)}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                idx === selected ? 'text-primary-foreground' : 'text-text-muted',
                              )}
                            />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.shortcut && (
                              <span className="flex items-center gap-0.5">
                                {item.shortcut.split('+').map((key) => (
                                  <kbd
                                    key={key}
                                    className="rounded border border-border bg-surface-raised px-1 py-0.5 text-[10px] text-text-subtle"
                                  >
                                    {formatShortcutKey(key)}
                                  </kbd>
                                ))}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Capture Dialog from Command Palette */}
      <QuickCaptureModal
        open={captureModalOpen}
        initialTab={captureModalTab}
        onClose={() => setCaptureModalOpen(false)}
      />
    </>
  )
}

