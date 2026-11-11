import { Module } from '@nestjs/common'
import { InviteRequestsController } from './invite-requests.controller'
import { InviteRequestsService } from './invite-requests.service'
import { InviteRequestsCleanup } from './invite-requests.cleanup'
import { AdminModule } from '../admin/admin.module'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [AdminModule, MailModule],
  controllers: [InviteRequestsController],
  providers: [InviteRequestsService, InviteRequestsCleanup],
  exports: [InviteRequestsService],
})
export class InviteRequestsModule {}
