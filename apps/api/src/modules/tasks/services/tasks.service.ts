import { Injectable, NotFoundException } from '@nestjs/common'
import {
  and,
  asc,
  desc,
  eq,
  getClient,
  inArray,
  isNull,
  lt,
  sql,
  taskSpaceMembers,
  taskSpaces,
  taskTaskTags,
  tasks,
} from '@dexhub/db'
import { SpacesService } from './spaces.service'
import { TagsService } from './tags.service'
import type { CreateTaskDto, UpdateTaskDto, TaskView, TaskStatus, TaskPriority } from '../dto/task.dto'

export interface TaskFilters {
  view?: TaskView
  status?: TaskStatus[]
  priority?: TaskPriority[]
  favorite?: boolean
  search?: string
  sort?: 'sortOrder' | 'dueDate' | 'priority' | 'title' | 'createdAt'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  spaceId?: string
}

@Injectable()
export class TasksService {
  private get db() {
    return getClient()
  }

  constructor(
    private readonly spacesService: SpacesService,
    private readonly tagsService: TagsService,
  ) {}

  async list(userId: string, filters: TaskFilters) {
    const page = Math.max(1, filters.page ?? 1)
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
    const offset = (page - 1) * limit

    // Collect space IDs the user has access to
    let spaceIds: string[]
    if (filters.spaceId) {
      await this.spacesService.assertMember(filters.spaceId, userId)
      spaceIds = [filters.spaceId]
    } else {
      const memberRows = await this.db
        .select({ spaceId: taskSpaceMembers.spaceId })
        .from(taskSpaceMembers)
        .innerJoin(taskSpaces, eq(taskSpaces.id, taskSpaceMembers.spaceId))
        .where(and(eq(taskSpaceMembers.userId, userId), isNull(taskSpaces.deletedAt)))
      spaceIds = memberRows.map((r) => r.spaceId)
    }

    if (spaceIds.length === 0) return []

    const conditions = [
      isNull(tasks.deletedAt),
      inArray(tasks.spaceId, spaceIds),
    ]

    // Smart list view presets
    if (filters.view) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayAfterTomorrow = new Date(today)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      switch (filters.view) {
        case 'today':
          conditions.push(
            and(
              sql`${tasks.dueDate}::date = CURRENT_DATE`,
              sql`${tasks.status} != 'completata'`,
            )!,
          )
          break
        case 'tomorrow':
          conditions.push(
            and(
              sql`${tasks.dueDate}::date = CURRENT_DATE + 1`,
              sql`${tasks.status} != 'completata'`,
            )!,
          )
          break
        case 'this-week':
          conditions.push(
            and(
              sql`${tasks.dueDate}::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7`,
              sql`${tasks.status} != 'completata'`,
            )!,
          )
          break
        case 'overdue':
          conditions.push(
            and(
              lt(tasks.dueDate, now),
              sql`${tasks.status} != 'completata'`,
            )!,
          )
          break
        case 'important':
          conditions.push(
            and(
              sql`${tasks.priority} IN ('alta', 'critica')`,
              sql`${tasks.status} != 'completata'`,
            )!,
          )
          break
        case 'favorites':
          conditions.push(
            and(eq(tasks.favorite, true), sql`${tasks.status} != 'completata'`)!,
          )
          break
        case 'completed':
          conditions.push(sql`${tasks.status} = 'completata'`)
          break
      }
    } else {
      // Manual filters (only when view is not set)
      if (filters.status && filters.status.length > 0) {
        conditions.push(inArray(tasks.status, filters.status))
      }
      if (filters.favorite === true) {
        conditions.push(eq(tasks.favorite, true))
      }
    }

    if (filters.priority && filters.priority.length > 0) {
      conditions.push(inArray(tasks.priority, filters.priority))
    }
    if (filters.search) {
      const query = filters.search.trim()
      conditions.push(sql`${tasks.searchVector} @@ plainto_tsquery('simple', ${query})`)
    }

    const sortCol = {
      sortOrder: tasks.sortOrder,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      title: tasks.title,
      createdAt: tasks.createdAt,
    }[filters.sort ?? 'sortOrder'] ?? tasks.sortOrder

    const orderDir = filters.order === 'desc' ? desc(sortCol) : asc(sortCol)

    return this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.pinned), orderDir)
      .limit(limit)
      .offset(offset)
  }

  async findById(id: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    const tags = await this.tagsService.getForTask(id)
    return { ...task, tags }
  }

  async create(spaceId: string, userId: string, dto: CreateTaskDto) {
    await this.spacesService.assertMember(spaceId, userId)

    const existing = await this.db
      .select({ sortOrder: tasks.sortOrder })
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.sortOrder))
      .limit(1)
      .then((r) => r[0])

    const sortOrder = (existing?.sortOrder ?? 0) + 10

    const [task] = await this.db
      .insert(tasks)
      .values({
        spaceId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'da_fare',
        priority: dto.priority ?? 'media',
        section: dto.section ?? 'oggi',
        assigneeId: dto.assigneeId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        favorite: dto.favorite ?? false,
        pinned: dto.pinned ?? false,
        sortOrder,
        createdBy: userId,
      })
      .returning()

    if (!task) throw new Error('Failed to create task')

    await this.updateSearchVector(task.id, task.title, task.description ?? null, [])
    return task
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.title !== undefined) updateData.title = dto.title
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.status !== undefined) updateData.status = dto.status
    if (dto.priority !== undefined) updateData.priority = dto.priority
    if (dto.section !== undefined) updateData.section = dto.section
    // null e' un valore legittimo: "nessun assegnatario". Per questo il check e' su undefined.
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null
    if (dto.favorite !== undefined) updateData.favorite = dto.favorite
    if (dto.pinned !== undefined) updateData.pinned = dto.pinned

    const [updated] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning()

    if (dto.title !== undefined || dto.description !== undefined) {
      const tagNames = await this.tagsService.getForTask(id).then((t) => t.map((t) => t.name))
      await this.updateSearchVector(
        id,
        updated?.title ?? task.title,
        updated?.description ?? task.description ?? null,
        tagNames,
      )
    }

    return updated!
  }

  async complete(id: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    const [updated] = await this.db
      .update(tasks)
      .set({ status: 'completata', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning()

    return updated!
  }

  async reopen(id: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    const [updated] = await this.db
      .update(tasks)
      .set({ status: 'da_fare', completedAt: null, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning()

    return updated!
  }

  async delete(id: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    await this.db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(eq(tasks.id, id))
  }

  async reorder(id: string, userId: string, newSortOrder: number, section?: 'oggi' | 'settimana' | 'prossime') {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    await this.db
      .update(tasks)
      .set({
        sortOrder: newSortOrder,
        // Rilasciare su un'altra sezione la adotta (mockup, punto 8): la data NON viene toccata.
        ...(section !== undefined ? { section } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))

    await this.renumberIfNeeded(task.spaceId)
  }

  private async renumberIfNeeded(spaceId: string) {
    const rows = await this.db
      .select({ id: tasks.id, sortOrder: tasks.sortOrder })
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.sortOrder))

    const needsRenumber = rows.some((r, i) => {
      if (i === 0) return false
      return (r.sortOrder - rows[i - 1]!.sortOrder) < 2
    })

    if (!needsRenumber) return

    for (let i = 0; i < rows.length; i++) {
      await this.db
        .update(tasks)
        .set({ sortOrder: (i + 1) * 10 })
        .where(eq(tasks.id, rows[i]!.id))
    }
  }

  async duplicate(id: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!task) throw new NotFoundException('Task not found')
    await this.spacesService.assertMember(task.spaceId, userId)

    const tags = await this.tagsService.getForTask(id)

    const lastInSpace = await this.db
      .select({ sortOrder: tasks.sortOrder })
      .from(tasks)
      .where(and(eq(tasks.spaceId, task.spaceId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.sortOrder))
      .limit(1)
      .then((r) => r[0])

    const sortOrder = (lastInSpace?.sortOrder ?? 0) + 10

    const [copy] = await this.db
      .insert(tasks)
      .values({
        spaceId: task.spaceId,
        title: task.title,
        description: task.description ?? undefined,
        status: 'da_fare',
        priority: task.priority,
        dueDate: task.dueDate ?? undefined,
        favorite: false,
        pinned: false,
        sortOrder,
        createdBy: userId,
      })
      .returning()

    if (!copy) throw new Error('Failed to duplicate task')

    if (tags.length > 0) {
      await this.db
        .insert(taskTaskTags)
        .values(tags.map((t) => ({ taskId: copy.id, tagId: t.id })))
    }

    await this.updateSearchVector(
      copy.id,
      copy.title,
      copy.description ?? null,
      tags.map((t) => t.name),
    )

    return copy
  }

  async updateSearchVector(
    taskId: string,
    title: string,
    description: string | null,
    tagNames: string[],
  ) {
    const content = [title, description ?? '', ...tagNames]
      .filter(Boolean)
      .join(' ')

    await this.db.execute(
      sql`UPDATE tasks SET search_vector = to_tsvector('simple', ${content}) WHERE id = ${taskId}`,
    )
  }
}
