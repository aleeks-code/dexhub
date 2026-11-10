'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LoginForm } from '@/core/components/login-form'
import loginFormStyles from '@/core/components/login-form.module.css'
import styles from './landing.module.css'

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.focus()

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="presentation"
    >
      <div
        ref={cardRef}
        className={`${loginFormStyles.card} ${styles.modalCard}`}
        role="dialog"
        aria-modal="true"
        aria-label="Accedi"
        tabIndex={-1}
      >
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Chiudi">
          <X size={18} aria-hidden="true" />
        </button>
        <LoginForm />
      </div>
    </div>
  )
}
