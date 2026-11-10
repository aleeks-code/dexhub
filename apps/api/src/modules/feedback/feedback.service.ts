import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, desc, eq, getClient } from '@dexhub/db'
import { feedbacks } from '@dexhub/db'
import { users } from '@dexhub/db'

@Injectable()
export class FeedbackService {
  async create(
    userId: string,
    type: 'bug' | 'feature',
    title: string,
    message: string,
  ) {
    const [row] = await getClient()
      .insert(feedbacks)
      .values({ userId, type, title, message })
      .returning()
    return row!
  }

  async listMyBugs(userId: string) {
    return getClient()
      .select()
      .from(feedbacks)
      .where(and(eq(feedbacks.userId, userId), eq(feedbacks.type, 'bug')))
      .orderBy(desc(feedbacks.createdAt))
  }

  async listAll(type: 'bug' | 'feature') {
    return getClient()
      .select({
        id: feedbacks.id,
        userId: feedbacks.userId,
        userEmail: users.email,
        userName: users.name,
        type: feedbacks.type,
        title: feedbacks.title,
        message: feedbacks.message,
        status: feedbacks.status,
        createdAt: feedbacks.createdAt,
        updatedAt: feedbacks.updatedAt,
      })
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .where(eq(feedbacks.type, type))
      .orderBy(desc(feedbacks.createdAt))
  }

  async updateStatus(id: string, status: 'open' | 'in_progress' | 'closed') {
    const [row] = await getClient()
      .update(feedbacks)
      .set({ status, updatedAt: new Date() })
      .where(eq(feedbacks.id, id))
      .returning()
    if (!row) throw new NotFoundException('Feedback not found')
    return row
  }

  async delete(id: string): Promise<void> {
    await getClient().delete(feedbacks).where(eq(feedbacks.id, id))
  }

  async counts(): Promise<{ totalBugs: number; totalFeatures: number }> {
    const db = getClient()
    const [[bugRow], [featureRow]] = await Promise.all([
      db.select({ n: count() }).from(feedbacks).where(eq(feedbacks.type, 'bug')),
      db.select({ n: count() }).from(feedbacks).where(eq(feedbacks.type, 'feature')),
    ])
    return {
      totalBugs: bugRow?.n ?? 0,
      totalFeatures: featureRow?.n ?? 0,
    }
  }
}
