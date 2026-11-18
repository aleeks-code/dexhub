'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Timer, Play, Pause, RotateCcw, X, Plus } from 'lucide-react'
import { cn } from '@dexhub/ui'

interface Props {
  initialSeconds?: number
  onClose?: () => void
  active: boolean
}

export function RestTimer({ initialSeconds = 90, onClose, active }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (active) {
      setSecondsLeft(initialSeconds)
      setIsRunning(true)
    }
  }, [active, initialSeconds])

  useEffect(() => {
    if (!isRunning || !active) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsRunning(false)
          // Feedback aptico/sonoro se disponibile nel browser
          if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 100, 200])
            } catch {
              // Ignore
            }
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, active])

  if (!active) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / initialSeconds) * 100))
  const isFinished = secondsLeft === 0

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-surface-raised/95 backdrop-blur-md p-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl font-mono text-base font-black transition-colors',
            isFinished
              ? 'bg-emerald-500 text-black animate-pulse'
              : 'bg-surface text-emerald-400 border border-emerald-500/30'
          )}
        >
          {formattedTime}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-text">Recupero BDF</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface border border-border/40">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex items-center gap-1 pl-2 border-l border-border/60">
        <button
          type="button"
          onClick={() => setSecondsLeft((prev) => prev + 30)}
          className="rounded-lg p-1.5 text-xs text-text-subtle hover:text-emerald-400 hover:bg-surface transition-colors cursor-pointer"
          title="+30 secondi"
        >
          <span className="text-[11px] font-bold">+30s</span>
        </button>

        <button
          type="button"
          onClick={() => setIsRunning((p) => !p)}
          className="rounded-lg p-1.5 text-text-subtle hover:text-text hover:bg-surface transition-colors cursor-pointer"
          title={isRunning ? 'Pausa' : 'Avvia'}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setSecondsLeft(initialSeconds)
            setIsRunning(true)
          }}
          className="rounded-lg p-1.5 text-text-subtle hover:text-text hover:bg-surface transition-colors cursor-pointer"
          title="Ricomincia"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-surface transition-colors cursor-pointer"
            title="Chiudi timer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
