import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { and, getClient, inviteRequests, isNotNull, lt } from '@dexhub/db'

@Injectable()
export class InviteRequestsCleanup {
  private readonly logger = new Logger(InviteRequestsCleanup.name)

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpired() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const result = await getClient()
      .delete(inviteRequests)
      .where(and(isNotNull(inviteRequests.deletedAt), lt(inviteRequests.deletedAt, cutoff)))

    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0
    if (count > 0) {
      this.logger.log(`Purged ${count} expired invite request(s)`)
    }
  }
}
