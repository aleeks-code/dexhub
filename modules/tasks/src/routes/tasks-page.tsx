'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  CalendarRange,
  CheckCheck,
  ListChecks,
  Plus,
  RefreshCw,
  Star,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useReopenTask,
  useReorderTask,
} from '../hooks/use-tasks'
import {
  useSpaces,
  useSpaceMembers,
  useSpaceInvites,
  useCreateSpace,
  useDeleteSpace,
  useJoinSpace,
  useLeaveSpace,
  useInviteToSpace,
  useCancelInvite,
  useRemoveMember,
} from '../hooks/use-spaces'
import { useTasksT } from '../i18n'
import { ProgressRing } from '../components/progress-ring'
import { QuickAddBar } from '../components/quick-add-bar'
import { TaskRow, Avatar, type Person } from '../components/task-row'
import { InviteModal, NewWorkspaceModal, JoinModal } from '../components/workspace-modals'
import type { Task, TaskPriority, TaskSection } from '../api/tasks-client'

type Mode = 'personale' | 'together'
type SmartList = 'tutte' | 'oggi' | 'settimana' | 'importanti' | 'completate'

const SECTIONS: Array<{ id: TaskSection; dot: string }> = [
  { id: 'oggi', dot: 'bg-primary' },
  { id: 'settimana', dot: 'bg-info' },
  { id: 'prossime', dot: 'bg-text-subtle' },
]

function isToday(iso?: string): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
  )
}

export default function TasksPage() {
  const t = useTasksT()

  const [mode, setMode] = useState<Mode>('personale')
  const [smart, setSmart] = useState<SmartList>('tutte')
  const [prioFilter, setPrioFilter] = useState<TaskPriority[]>([])
  const [wsId, setWsId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [newWsOpen, setNewWsOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const { data: spaces = [] } = useSpaces()
  const personalSpace = spaces.find((s) => s.type === 'personal') ?? null
  const workspaces = useMemo(() => spaces.filter((s) => s.type === 'shared'), [spaces])

  const activeWs = workspaces.find((w) => w.id === wsId) ?? workspaces[0] ?? null
  const currentSpace = mode === 'personale' ? personalSpace : activeWs
  const currentSpaceId = currentSpace?.id ?? null

  const { data: allTasks = [], isLoading } = useTasks(
    currentSpaceId ? { spaceId: currentSpaceId } : { spaceId: '__none__' },
  )
  const { data: members = [] } = useSpaceMembers(mode === 'together' ? currentSpaceId : null)
  const { data: invites = [] } = useSpaceInvites(mode === 'together' ? currentSpaceId : null)

  const createTask = useCreateTask(currentSpaceId ?? '')
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const completeTask = useCompleteTask()
  const reopenTask = useReopenTask()
  const reorderTask = useReorderTask()
  const createSpace = useCreateSpace()
  const deleteSpace = useDeleteSpace()
  const joinSpace = useJoinSpace()
  const leaveSpace = useLeaveSpace()
  const inviteToSpace = useInviteToSpace(currentSpaceId ?? '')
  const cancelInvite = useCancelInvite(currentSpaceId ?? '')
  const removeMember = useRemoveMember(currentSpaceId ?? '')

  // Chi sono: il backend non espone "me" qui, ma il proprietario di uno space personale
  // sono sempre io — quindi lo si deduce da li' senza una chiamata in piu'.
  const meId = personalSpace?.createdBy ?? null
  const isOwner = !!currentSpace && !!meId && currentSpace.createdBy === meId

  const peopleById = useMemo(() => {
    const map = new Map<string, Person>()
    for (const m of members) {
      const name = m.name ?? m.email ?? '?'
      map.set(m.userId, { id: m.userId, name, initial: name.charAt(0).toUpperCase() })
    }
    return map
  }, [members])

  // ── Filtri: smart list × priorità (si combinano, punto 5) ────────────────
  const filtered = useMemo(() => {
    let list = allTasks
    switch (smart) {
      case 'oggi':
        list = list.filter((x) => x.section === 'oggi' && x.status !== 'completata')
        break
      case 'settimana':
        list = list.filter((x) => x.section === 'settimana' && x.status !== 'completata')
        break
      case 'importanti':
        list = list.filter((x) => x.favorite && x.status !== 'completata')
        break
      case 'completate':
        list = list.filter((x) => x.status === 'completata')
        break
      default:
        break
    }
    if (prioFilter.length > 0) list = list.filter((x) => prioFilter.includes(x.priority))
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [allTasks, smart, prioFilter])

  // ── Intestazione: conteggi e anello (punto 2) ────────────────────────────
  const openCount = allTasks.filter((x) => x.status !== 'completata').length
  const todayTasks = allTasks.filter((x) => x.section === 'oggi' || isToday(x.dueDate))
  const todayDone = todayTasks.filter((x) => x.status === 'completata').length
  const percent = allTasks.length === 0 ? 0 : (allTasks.filter((x) => x.status === 'completata').length / allTasks.length) * 100

  const subtitle =
    openCount === 0
      ? t.subtitleDone
      : t.subtitleCount
          .replace('{n}', String(openCount))
          .replace('{x}', String(todayDone))
          .replace('{y}', String(todayTasks.length))

  const smartLists: Array<{ id: SmartList; label: string; icon: typeof ListChecks; count: number }> = [
    { id: 'tutte', label: t.viewAll, icon: ListChecks, count: allTasks.length },
    {
      id: 'oggi',
      label: t.viewToday,
      icon: CalendarDays,
      count: allTasks.filter((x) => x.section === 'oggi' && x.status !== 'completata').length,
    },
    {
      id: 'settimana',
      label: t.viewWeek,
      icon: CalendarRange,
      count: allTasks.filter((x) => x.section === 'settimana' && x.status !== 'completata').length,
    },
    {
      id: 'importanti',
      label: t.viewImportant,
      icon: Star,
      count: allTasks.filter((x) => x.favorite && x.status !== 'completata').length,
    },
    {
      id: 'completate',
      label: t.viewCompleted,
      icon: CheckCheck,
      count: allTasks.filter((x) => x.status === 'completata').length,
    },
  ]

  const prios: Array<{ id: TaskPriority; label: string; cls: string }> = [
    { id: 'bassa', label: t.prioLow, cls: 'border-success bg-success/15 text-success' },
    { id: 'media', label: t.prioMedium, cls: 'border-warning bg-warning/15 text-warning' },
    { id: 'alta', label: t.prioHigh, cls: 'border-error bg-error/15 text-error' },
  ]

  function togglePrio(p: TaskPriority) {
    setPrioFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  function handleAdd(input: { title: string; dueDate: string; priority: TaskPriority }) {
    if (!currentSpaceId) return
    createTask.mutate({
      title: input.title,
      dueDate: input.dueDate || undefined,
      priority: input.priority,
      section: 'oggi',
    })
  }

  function handleDrop(target: Task) {
    if (!dragId || dragId === target.id) return
    const dragged = allTasks.find((x) => x.id === dragId)
    setDragId(null)
    if (!dragged) return
    reorderTask.mutate({
      id: dragged.id,
      sortOrder: target.sortOrder,
      // In vista "Tutte" rilasciare su un'altra sezione la adotta (punto 8).
      section: smart === 'tutte' && target.section !== dragged.section ? target.section : undefined,
    })
  }

  function renderRow(task: Task) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        t={t}
        assignee={
          mode === 'together' && task.assigneeId ? peopleById.get(task.assigneeId) : undefined
        }
        dragging={dragId === task.id}
        onToggleDone={() =>
          task.status === 'completata' ? reopenTask.mutate(task.id) : completeTask.mutate(task.id)
        }
        onToggleStar={() => updateTask.mutate({ id: task.id, favorite: !task.favorite })}
        onSave={({ title, dueDate }) =>
          updateTask.mutate({ id: task.id, title, dueDate: dueDate || undefined })
        }
        onDelete={() => {
          if (confirm(t.deleteTaskConfirm)) deleteTask.mutate(task.id)
        }}
        onDragStart={() => setDragId(task.id)}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(task)}
      />
    )
  }

  const emptyState = (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-text">{t.emptyTitle}</p>
      <p className="mt-1 text-xs text-text-muted">{t.emptyBody}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Breadcrumb (punto 1) */}
      <nav className="font-mono text-[10px] tracking-[0.14em] text-text-subtle">
        <Link href="/home" className="transition-colors hover:text-text">
          {t.breadcrumbHome.toUpperCase()}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-muted">{t.title.toUpperCase()}</span>
      </nav>

      {/* Intestazione (punto 2) */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-text">{t.title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        <ProgressRing percent={percent} label={t.completed} />
      </header>

      {/* Selettore modalità (punto 3) */}
      <div className="inline-flex w-fit gap-1 rounded-lg border border-border bg-overlay-subtle p-1">
        {([
          { id: 'personale' as const, label: t.modePersonal, icon: User },
          { id: 'together' as const, label: t.modeTogether, icon: Users },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === id
                ? 'bg-primary text-primary-foreground'
                : 'text-text-muted hover:text-text',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Barra workspace (punto 10) */}
      {mode === 'together' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.12em] text-text-subtle">
              {t.workspace}
            </span>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => setWsId(w.id)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  activeWs?.id === w.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-muted hover:text-text',
                )}
              >
                {w.name}
              </button>
            ))}
            <button
              onClick={() => setNewWsOpen(true)}
              className="flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              {t.newWorkspace}
            </button>
            <button
              onClick={() => {
                setJoinError(null)
                setJoinOpen(true)
              }}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              {t.joinWithCode}
            </button>
          </div>

          {activeWs ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-overlay-subtle px-3 py-2">
              <div className="flex -space-x-1.5">
                {members.slice(0, 5).map((m) => {
                  const name = m.name ?? m.email ?? '?'
                  return (
                    <span key={m.userId} className="ring-2 ring-surface rounded-full">
                      <Avatar
                        person={{ id: m.userId, name, initial: name.charAt(0).toUpperCase() }}
                        size={24}
                      />
                    </span>
                  )
                })}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <RefreshCw className="h-3 w-3 text-primary" />
                {t.membersCount.replace('{n}', String(members.length))}
              </span>
              <button
                onClick={() => setInviteOpen(true)}
                className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {t.invite}
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-subtle">{t.noWorkspaces}</p>
          )}
        </div>
      )}

      {/* Quick add (punto 4) */}
      <QuickAddBar t={t} shared={mode === 'together'} disabled={!currentSpaceId} onAdd={handleAdd} />

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Colonna sinistra (punto 5) */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-56">
          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-text-subtle">
              {t.smartLists}
            </p>
            <ul className="space-y-0.5">
              {smartLists.map(({ id, label, icon: Icon, count }) => (
                <li key={id}>
                  <button
                    onClick={() => setSmart(id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                      smart === id
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-text-muted hover:bg-surface-raised hover:text-text',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate text-left">{label}</span>
                    <span className="font-mono text-[11px] text-text-subtle">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] tracking-[0.12em] text-text-subtle">
              {t.priority}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePrio(p.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    prioFilter.includes(p.id)
                      ? p.cls
                      : 'border-border text-text-subtle hover:text-text',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Colonna destra (punto 6) */}
        <section className="min-w-0 flex-1">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-text-muted">{t.loading}</p>
          ) : filtered.length === 0 ? (
            emptyState
          ) : smart === 'tutte' ? (
            <div className="flex flex-col gap-5">
              {SECTIONS.map(({ id, dot }) => {
                const rows = filtered.filter((x) => x.section === id)
                if (rows.length === 0) return null
                const label =
                  id === 'oggi' ? t.sectionToday : id === 'settimana' ? t.sectionWeek : t.sectionNext
                return (
                  <div key={id}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {label}
                      </h2>
                      <span className="font-mono text-[11px] text-text-subtle">{rows.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">{rows.map(renderRow)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {smartLists.find((s) => s.id === smart)?.label}
              </h2>
              <div className="flex flex-col gap-1.5">{filtered.map(renderRow)}</div>
            </div>
          )}
        </section>
      </div>

      {/* Modali */}
      {inviteOpen && activeWs && (
        <InviteModal
          t={t}
          space={activeWs}
          members={members}
          invites={invites}
          meId={meId}
          isOwner={isOwner}
          onClose={() => setInviteOpen(false)}
          onInvite={(email) => inviteToSpace.mutate(email)}
          onCancelInvite={(id) => cancelInvite.mutate(id)}
          onRemoveMember={(id) => removeMember.mutate(id)}
          onDeleteWorkspace={() => {
            if (!confirm(t.deleteWorkspaceConfirm)) return
            deleteSpace.mutate(activeWs.id)
            setInviteOpen(false)
            setWsId(null)
          }}
          onLeave={() => {
            if (!confirm(t.leaveWorkspaceConfirm)) return
            leaveSpace.mutate(activeWs.id)
            setInviteOpen(false)
            setWsId(null)
          }}
        />
      )}

      {newWsOpen && (
        <NewWorkspaceModal
          t={t}
          pending={createSpace.isPending}
          onClose={() => setNewWsOpen(false)}
          onCreate={async (name) => {
            const created = await createSpace.mutateAsync({ name, type: 'shared' })
            setWsId(created.id)
            setNewWsOpen(false)
          }}
        />
      )}

      {joinOpen && (
        <JoinModal
          t={t}
          pending={joinSpace.isPending}
          error={joinError}
          onClose={() => setJoinOpen(false)}
          onJoin={async (code) => {
            try {
              const joined = await joinSpace.mutateAsync(code)
              setWsId(joined.id)
              setJoinOpen(false)
              setJoinError(null)
            } catch (err) {
              setJoinError(err instanceof Error ? err.message : String(err))
            }
          }}
        />
      )}
    </div>
  )
}
