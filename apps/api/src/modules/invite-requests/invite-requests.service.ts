import { Injectable } from '@nestjs/common'
import { desc, eq, getClient, inviteRequests, isNull, type InviteRequest } from '@dexhub/db'

@Injectable()
export class InviteRequestsService {
  async create(email: string, phone?: string): Promise<void> {
    await getClient().insert(inviteRequests).values({
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
    })
  }

  async list(): Promise<InviteRequest[]> {
    return getClient().select().from(inviteRequests).orderBy(desc(inviteRequests.createdAt))
  }

  async updateStatus(id: string, status: 'pending' | 'invited' | 'dismissed'): Promise<void> {
    await getClient()
      .update(inviteRequests)
      .set({ status })
      .where(eq(inviteRequests.id, id))
  }

  async delete(id: string): Promise<void> {
    await getClient()
      .update(inviteRequests)
      .set({ deletedAt: new Date() })
      .where(eq(inviteRequests.id, id))
  }
}
