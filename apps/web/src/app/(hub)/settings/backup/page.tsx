'use client'

import { useRef, useState } from 'react'
import {
  Archive,
  Calendar,
  Clock,
  Download,
  HardDrive,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useRestoreBackup,
  type BackupJob,
} from '@/core/hooks/use-backup'
import { useT } from '@/i18n'

const TYPE_ICON: Record<BackupJob['type'], React.ElementType> = {
  manual: Archive,
  daily: Clock,
  weekly: Calendar,
  monthly: HardDrive,
}

const STATUS_CLASS: Record<BackupJob['status'], string> = {
  pending: 'text-text-muted',
  completed: 'text-success',
  failed: 'text-error',
}

function fmtBytes(n: number | null): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function BackupPage() {
  const { data: backups = [], isLoading, error } = useBackups()
  const createBackup = useCreateBackup()
  const deleteBackup = useDeleteBackup()
  const downloadBackup = useDownloadBackup()
  const restoreBackup = useRestoreBackup()
  const t = useT()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  async function handleRestore() {
    if (!restoreFile) return
    const content = await restoreFile.text()
    restoreBackup.mutate(content, {
      onSuccess: () => {
        setRestoreSuccess(true)
        setRestoreFile(null)
        setConfirmRestore(false)
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">{t.backup.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{t.backup.subtitle}</p>
      </div>

      {/* Backup list */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{t.backup.listTitle}</h2>
          <Button
            onClick={() => createBackup.mutate()}
            disabled={createBackup.isPending}
            className="flex items-center gap-2 text-sm"
          >
            {createBackup.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            {createBackup.isPending ? t.backup.creating : t.backup.create}
          </Button>
        </div>

        {createBackup.isError && (
          <p className="text-xs text-error">{createBackup.error?.message}</p>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-error">{t.backup.failed}</p>
        ) : backups.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-subtle">{t.backup.noBackups}</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {backups.map((job) => {
              const Icon = TYPE_ICON[job.type]
              return (
                <div key={job.id} className="flex items-center gap-4 px-4 py-3">
                  <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text">{t.backup.types[job.type]}</span>
                      {job.encrypted && <Shield className="h-3 w-3 text-primary" />}
                      <span className={cn('text-xs', STATUS_CLASS[job.status])}>{job.status}</span>
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {fmtDate(job.completedAt ?? job.createdAt)} · {fmtBytes(job.sizeBytes)}
                    </p>
                    {job.error && <p className="text-xs text-error">{job.error}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {job.status === 'completed' && (
                      <button
                        onClick={() => downloadBackup.mutate({ id: job.id, filename: job.filename })}
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
                        title={t.backup.download}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {confirmDelete === job.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            deleteBackup.mutate(job.id, {
                              onSuccess: () => setConfirmDelete(null),
                            })
                          }
                          className="rounded px-2 py-1 text-xs text-error hover:bg-surface-raised"
                        >
                          {t.backup.confirmDelete}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-raised"
                        >
                          {t.backup.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(job.id)}
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-error"
                        title={t.backup.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Restore */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-text">{t.backup.restore.title}</h2>
        <p className="text-xs text-text-muted">{t.backup.restore.desc}</p>

        {restoreSuccess && (
          <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            {t.backup.restore.success}
          </div>
        )}
        {restoreBackup.isError && (
          <p className="text-xs text-error">{restoreBackup.error?.message}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            setRestoreFile(e.target.files?.[0] ?? null)
            setRestoreSuccess(false)
            setConfirmRestore(false)
          }}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-raised"
          >
            <Upload className="h-4 w-4" />
            {restoreFile ? restoreFile.name : t.backup.restore.chooseFile}
          </button>

          {restoreFile && !confirmRestore && (
            <button
              onClick={() => setConfirmRestore(true)}
              className="rounded-md border border-error/50 bg-error/10 px-3 py-2 text-sm text-error transition-colors hover:bg-error/20"
            >
              {t.backup.restore.restore}
            </button>
          )}
        </div>

        {confirmRestore && restoreFile && (
          <div className="space-y-3 rounded-lg border border-error/30 bg-error/5 p-4">
            <p className="text-sm font-medium text-error">{t.backup.restore.confirm}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={restoreBackup.isPending}
                className="rounded-md bg-error px-3 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {restoreBackup.isPending ? t.backup.restore.restoring : t.backup.restore.yes}
              </button>
              <button
                onClick={() => setConfirmRestore(false)}
                className="rounded-md border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-raised"
              >
                {t.backup.restore.cancel}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
