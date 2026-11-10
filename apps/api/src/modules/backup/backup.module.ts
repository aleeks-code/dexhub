import { Module } from '@nestjs/common'
import { BackupController } from './backup.controller'
import { BackupService } from './backup.service'
import { BackupStorageService } from './backup-storage.service'
import { BackupRotationService } from './backup-rotation.service'

@Module({
  controllers: [BackupController],
  providers: [BackupService, BackupStorageService, BackupRotationService],
})
export class BackupModule {}
