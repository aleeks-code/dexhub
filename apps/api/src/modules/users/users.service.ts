import { Injectable, NotFoundException } from '@nestjs/common'
import { z } from 'zod'
import { eq, getClient, users } from '@dexhub/db'

export const UpdateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().max(250000).nullable().optional(),
})

export type UpdateMeDto = z.infer<typeof UpdateMeSchema>

@Injectable()
export class UsersService {
  private get db() {
    return getClient()
  }

  async findById(id: string) {
    const row = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((r) => r[0])

    if (!row) throw new NotFoundException('User not found')
    return row
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (dto.name !== undefined) updates.name = dto.name
    if (dto.image !== undefined) updates.image = dto.image

    await this.db.update(users).set(updates).where(eq(users.id, id))
    return this.findById(id)
  }
}
