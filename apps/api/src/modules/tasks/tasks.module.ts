import { Module } from '@nestjs/common'
import { SpacesController } from './controllers/spaces.controller'
import { TasksController } from './controllers/tasks.controller'
import { TagsController } from './controllers/tags.controller'
import { SpacesService } from './services/spaces.service'
import { TasksService } from './services/tasks.service'
import { TagsService } from './services/tags.service'
import { JoinCodeService } from './services/join-code.service'

@Module({
  controllers: [SpacesController, TasksController, TagsController],
  providers: [SpacesService, TasksService, TagsService, JoinCodeService],
  exports: [SpacesService, TasksService],
})
export class TasksModule {}
