import { Module } from '@nestjs/common'
import { MeModulesController } from './me-modules.controller'
import { MeModulesService } from './me-modules.service'

@Module({
  controllers: [MeModulesController],
  providers: [MeModulesService],
})
export class MeModulesModule {}
