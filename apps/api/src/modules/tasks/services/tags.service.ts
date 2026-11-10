import { Injectable, NotFoundException } from '@nestjs/common'
import {
  and,
  eq,
  getClient,
  isNull,
  sql,
  taskTags,
  taskTaskTags,
  tasks,
} from '@dexhub/db'
import { SpacesService } from './spaces.service'
import type { CreateTagDto, UpdateTagDto } from '../dto/tag.dto'

@Injectable()
export class TagsService {
  private get db() {
    return getClient()
  }

  constructor(private readonly spacesService: SpacesService) {}

  async listForSpace(spaceId: string, userId: string) {
    await this.spacesService.assertMember(spaceId, userId)
    return this.db.select().from(taskTags).where(eq(taskTags.spaceId, spaceId))
  }

  async create(spaceId: string, userId: string, dto: CreateTagDto) {
    await this.spacesService.assertMember(spaceId, userId)
    const [tag] = await this.db
      .insert(taskTags)
      .values({ spaceId, name: dto.name, color: dto.color })
      .returning()
    return tag!
  }

  async update(id: string, userId: string, dto: UpdateTagDto) {
    const tag = await this.findById(id)
    await this.spacesService.assertMember(tag.spaceId, userId)
    const [updated] = await this.db
      .update(taskTags)
      .set(dto)
      .where(eq(taskTags.id, id))
      .returning()
    return updated!
  }

  async delete(id: string, userId: string) {
    const tag = await this.findById(id)
    await this.spacesService.assertMember(tag.spaceId, userId)
    await this.db.delete(taskTaskTags).where(eq(taskTaskTags.tagId, id))
    await this.db.delete(taskTags).where(eq(taskTags.id, id))
  }

  async addToTask(taskId: string, tagId: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])
    if (!task) throw new NotFoundException('Task not found')

    await this.spacesService.assertMember(task.spaceId, userId)

    await this.db
      .insert(taskTaskTags)
      .values({ taskId, tagId })
      .onConflictDoNothing()

    await this.updateSearchVector(taskId)
  }

  async removeFromTask(taskId: string, tagId: string, userId: string) {
    const task = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
      .limit(1)
      .then((r) => r[0])
    if (!task) throw new NotFoundException('Task not found')

    await this.spacesService.assertMember(task.spaceId, userId)

    await this.db
      .delete(taskTaskTags)
      .where(and(eq(taskTaskTags.taskId, taskId), eq(taskTaskTags.tagId, tagId)))

    await this.updateSearchVector(taskId)
  }

  async getForTask(taskId: string) {
    return this.db
      .select({ id: taskTags.id, name: taskTags.name, color: taskTags.color, spaceId: taskTags.spaceId })
      .from(taskTags)
      .innerJoin(taskTaskTags, eq(taskTaskTags.tagId, taskTags.id))
      .where(eq(taskTaskTags.taskId, taskId))
  }

  async updateSearchVector(taskId: string) {
    const tagRows = await this.db
      .select({ name: taskTags.name })
      .from(taskTags)
      .innerJoin(taskTaskTags, eq(taskTaskTags.tagId, taskTags.id))
      .where(eq(taskTaskTags.taskId, taskId))

    const tagNames = tagRows.map((t) => t.name).join(' ')

    await this.db.execute(sql`
      UPDATE tasks
      SET search_vector = to_tsvector('simple',
        COALESCE(title, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        ${tagNames}
      )
      WHERE id = ${taskId}
    `)
  }

  private async findById(id: string) {
    const tag = await this.db
      .select()
      .from(taskTags)
      .where(eq(taskTags.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!tag) throw new NotFoundException('Tag not found')
    return tag
  }
}
