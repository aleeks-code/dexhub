export type TaskStatus = 'da_fare' | 'in_corso' | 'completata' | 'archiviata'
export type TaskPriority = 'bassa' | 'media' | 'alta' | 'critica'
export type TaskSection = 'oggi' | 'settimana' | 'prossime'

export const VALID_VIEWS = [
  'today',
  'tomorrow',
  'this-week',
  'overdue',
  'important',
  'favorites',
  'completed',
] as const
export type TaskView = (typeof VALID_VIEWS)[number]

export class CreateTaskDto {
  title!: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  section?: TaskSection
  dueDate?: string
  favorite?: boolean
  pinned?: boolean
  assigneeId?: string | null
}

export class UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  section?: TaskSection
  dueDate?: string
  favorite?: boolean
  pinned?: boolean
  assigneeId?: string | null
}

export class ReorderTaskDto {
  sortOrder!: number
  // Il drag&drop in vista "Tutte" puo' spostare l'attivita' in un'altra sezione
  // nello stesso gesto (mockup, punto 8).
  section?: TaskSection
}
