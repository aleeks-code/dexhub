import { Module } from '@nestjs/common'
import { ChangelogController } from './controllers/changelog.controller'
import { ChangelogService } from './services/changelog.service'

@Module({
  controllers: [ChangelogController],
  providers: [ChangelogService],
})
export class ChangelogModule {}
