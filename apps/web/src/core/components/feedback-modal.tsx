'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '@/i18n'
import { useSubmitFeedback, type FeedbackType } from '@/core/hooks/use-feedback'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  type: FeedbackType
}

export function FeedbackModal({ isOpen, onClose, type }: FeedbackModalProps) {
  const t = useT()
  const tf = t.feedback.modal
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const submit = useSubmitFeedback()

  const isBug = type === 'bug'
  const modalTitle = isBug ? tf.bugTitle : tf.featureTitle
  const titlePh = isBug ? tf.bugTitlePh : tf.featureTitlePh
  const messagePh = isBug ? tf.bugMessagePh : tf.featureMessagePh
  const successMsg = isBug ? tf.successBug : tf.successFeature

  if (!isOpen) return null

  function handleClose() {
    setTitle('')
    setMessage('')
    setSuccess(false)
    setError('')
    onClose()
  }

  async function handleSubmit() {
    if (!title.trim() || !message.trim()) return
    setError('')
    try {
      await submit.mutateAsync({ type, title: title.trim(), message: message.trim() })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-text">{modalTitle}</h3>
          <button
            onClick={handleClose}
            className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">{successMsg}</p>
              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  OK
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  {tf.titleLbl}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={titlePh}
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  {tf.messageLbl}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={messagePh}
                  rows={5}
                  maxLength={5000}
                  className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised"
                >
                  {tf.cancel}
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submit.isPending || !title.trim() || !message.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submit.isPending ? tf.submitting : tf.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
