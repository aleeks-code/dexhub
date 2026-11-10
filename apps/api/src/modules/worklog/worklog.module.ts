import { Module } from '@nestjs/common'
import { WorklogController } from './controllers/worklog.controller'
import { WorklogService } from './services/worklog.service'
import { StimaService } from './services/stima.service'

@Module({
  controllers: [WorklogController],
  providers: [WorklogService, StimaService],
})
export class WorklogModule {}
