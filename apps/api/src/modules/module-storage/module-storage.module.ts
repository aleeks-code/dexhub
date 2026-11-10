import { Module } from '@nestjs/common'
import { ModuleStorageController } from './module-storage.controller'
import { ModuleStorageService } from './module-storage.service'

@Module({
  controllers: [ModuleStorageController],
  providers: [ModuleStorageService],
  exports: [ModuleStorageService],
})
export class ModuleStorageModule {}
