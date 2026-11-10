import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RecoveryCodesService } from './recovery-codes.service'
import { EmergencyAccessController } from './emergency-access.controller'
import { PasskeyAuthController } from './passkey-auth.controller'
import { PasskeyManageController } from './passkey-manage.controller'
import { LogoutController } from './logout.controller'
import { RecoveryLoginController } from './recovery-login.controller'

@Module({
  controllers: [AuthController, EmergencyAccessController, PasskeyAuthController, PasskeyManageController, LogoutController, RecoveryLoginController],
  providers: [AuthService, RecoveryCodesService],
  exports: [AuthService, RecoveryCodesService],
})
export class AuthModule {}
