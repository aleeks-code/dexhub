'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@dexhub/ui'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  showToast: (msg: string, type?: ToastType, title?: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let globalToastDispatcher: ((msg: string, type?: ToastType, title?: string, duration?: number) => void) | null = null

export const toast = {
  success: (msg: string, title?: string) => globalToastDispatcher?.(msg, 'success', title),
  error: (msg: string, title?: string) => globalToastDispatcher?.(msg, 'error', title),
  info: (msg: string, title?: string) => globalToastDispatcher?.(msg, 'info', title),
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 3500) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev, { id, message, type, title, duration }])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast],
  )

  globalToastDispatcher = showToast

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Render Container */}
      <div
        className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 max-w-sm w-full pointer-events-none p-3 sm:p-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md transition-all',
              t.type === 'success' && 'border-emerald-500/40 bg-surface/95 text-text shadow-emerald-500/5',
              t.type === 'error' && 'border-error/40 bg-surface/95 text-text shadow-error/5',
              t.type === 'info' && 'border-primary/40 bg-surface/95 text-text shadow-primary/5',
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 text-error" />}
              {t.type === 'info' && <Info className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <p className="text-xs font-bold leading-tight text-text mb-0.5">{t.title}</p>}
              <p className="text-xs text-text-muted leading-relaxed">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded-lg p-1 text-text-subtle hover:text-text hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
