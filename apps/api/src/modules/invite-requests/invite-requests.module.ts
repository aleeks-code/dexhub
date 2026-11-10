import { Module } from '@nestjs/common'
import { InviteRequestsController } from './invite-requests.controller'
import { InviteRequestsService } from './invite-requests.service'
import { InviteRequestsCleanup } from './invite-requests.cleanup'

@Module({
  controllers: [InviteRequestsController],
  providers: [InviteRequestsService, InviteRequestsCleanup],
})
export class InviteRequestsModule {}
