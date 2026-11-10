import { Module } from '@nestjs/common'
import { SetupController } from './setup.controller'
import { SetupService } from './setup.service'
import { RecoveryCodesService } from '../../auth/recovery-codes.service'

@Module({
  controllers: [SetupController],
  providers: [SetupService, RecoveryCodesService],
  exports: [SetupService],
})
export class SetupModule {}
