const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''
const BASE = `${API}/api/v1/tasks`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

export type SpaceType = 'personal' | 'shared'
export type TaskStatus = 'da_fare' | 'in_corso' | 'completata' | 'archiviata'
export type TaskPriority = 'bassa' | 'media' | 'alta' | 'critica'
export type TaskSection = 'oggi' | 'settimana' | 'prossime'

export interface TaskSpace {
  id: string
  name: string
  description?: string
  type: SpaceType
  color?: string
  icon?: string
  joinCode?: string
  joinCodeFormatted?: string
  /** Proprietario del workspace: e' l'unico che puo' eliminarlo o rimuovere membri. */
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface SpaceMember {
  userId: string
  spaceId: string
  joinedAt: string
  name?: string
  email?: string
  image?: string
  isOwner: boolean
}

export interface SpaceInvite {
  id: string
  email: string
  createdAt: string
}

export interface Tag {
  id: string
  spaceId: string
  name: string
  color?: string
}

export interface Task {
  id: string
  spaceId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  section: TaskSection
  assigneeId?: string | null
  completedAt?: string
  dueDate?: string
  sortOrder: number
  favorite: boolean
  pinned: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  tags?: Tag[]
}

export interface TaskFilters {
  spaceId?: string
  view?: string
  status?: string
  priority?: string
  favorite?: boolean
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export type TaskInput = {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  section?: TaskSection
  dueDate?: string
  favorite?: boolean
  assigneeId?: string | null
}

// ─── Spaces ────────────────────────────────────────────────────────────────

export const spacesApi = {
  list: () => request<TaskSpace[]>('/spaces'),

  get: (id: string) => request<TaskSpace>(`/spaces/${id}`),

  create: (body: { name: string; description?: string; type: SpaceType; color?: string; icon?: string }) =>
    request<TaskSpace>('/spaces', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: Partial<{ name: string; description: string; color: string; icon: string }>) =>
    request<TaskSpace>(`/spaces/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/spaces/${id}`, { method: 'DELETE' }),

  members: (id: string) => request<SpaceMember[]>(`/spaces/${id}/members`),

  invites: (id: string) => request<SpaceInvite[]>(`/spaces/${id}/invites`),

  invite: (id: string, email: string) =>
    request<SpaceInvite>(`/spaces/${id}/invites`, { method: 'POST', body: JSON.stringify({ email }) }),

  cancelInvite: (id: string, inviteId: string) =>
    request<void>(`/spaces/${id}/invites/${inviteId}`, { method: 'DELETE' }),

  removeMember: (id: string, userId: string) =>
    request<void>(`/spaces/${id}/members/${userId}`, { method: 'DELETE' }),

  join: (code: string) =>
    request<TaskSpace>('/join', { method: 'POST', body: JSON.stringify({ code }) }),

  leave: (id: string) =>
    request<void>(`/spaces/${id}/leave`, { method: 'POST', body: '{}' }),

  regenerateCode: (id: string) =>
    request<TaskSpace>(`/spaces/${id}/regenerate-code`, { method: 'POST', body: '{}' }),
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (filters: TaskFilters = {}) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) params.set(k, String(v))
    }
    const qs = params.toString()
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<Task>(`/tasks/${id}`),

  create: (spaceId: string, body: TaskInput) =>
    request<Task>(`/spaces/${spaceId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: Partial<TaskInput>) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  complete: (id: string) => request<Task>(`/tasks/${id}/complete`, { method: 'POST', body: '{}' }),

  reopen: (id: string) => request<Task>(`/tasks/${id}/reopen`, { method: 'POST', body: '{}' }),

  /** Il drag&drop puo' cambiare sezione nello stesso gesto: la data NON viene toccata. */
  reorder: (id: string, sortOrder: number, section?: TaskSection) =>
    request<{ ok: boolean }>(`/tasks/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(section ? { sortOrder, section } : { sortOrder }),
    }),

  duplicate: (id: string) => request<Task>(`/tasks/${id}/duplicate`, { method: 'POST', body: '{}' }),
}
