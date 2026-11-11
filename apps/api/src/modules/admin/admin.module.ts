import { Module } from '@nestjs/common'
import { AuthModule } from '../../auth/auth.module'
import { SettingsModule } from '../settings/settings.module'
import { AdminUsersService } from './admin-users.service'
import { AdminUsersController } from './admin-users.controller'
import { AdminSecurityController } from './admin-security.controller'
import { AdminInviteController } from './admin-invite.controller'
import { AdminSystemController } from './admin-system.controller'
import { AdminAuditController } from './admin-audit.controller'
import { AdminMaintenanceController } from './admin-maintenance.controller'
import { AdminBroadcastController } from './admin-broadcast.controller'
import { BroadcastController } from './broadcast.controller'

@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [
    AdminUsersController,
    AdminSecurityController,
    AdminInviteController,
    AdminSystemController,
    AdminAuditController,
    AdminMaintenanceController,
    AdminBroadcastController,
    BroadcastController,
  ],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminModule {}
