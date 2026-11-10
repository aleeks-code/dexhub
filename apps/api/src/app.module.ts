import { Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { FastifyThrottlerGuard } from './common/guards/fastify-throttler.guard'

import { AuthModule } from './auth/auth.module'
import { AuthGuard } from './auth/auth.guard'
import { AuditModule } from './common/audit/audit.module'
import { AuditInterceptor } from './common/audit/audit.interceptor'

import { HealthModule } from './modules/health/health.module'
import { SetupModule } from './modules/setup/setup.module'
import { UsersModule } from './modules/users/users.module'
import { SettingsModule } from './modules/settings/settings.module'
import { RegistryModule } from './modules/registry/registry.module'
import { MeModulesModule } from './modules/me-modules/me-modules.module'
import { PermissionsModule } from './modules/permissions/permissions.module'
import { ModuleStorageModule } from './modules/module-storage/module-storage.module'
import { BackupModule } from './modules/backup/backup.module'
import { AdminModule } from './modules/admin/admin.module'
import { InviteRequestsModule } from './modules/invite-requests/invite-requests.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { FeedbackModule } from './modules/feedback/feedback.module'
import { WorklogModule } from './modules/worklog/worklog.module'
import { ChangelogModule } from './modules/changelog/changelog.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 200,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    AuditModule,
    HealthModule,
    SetupModule,
    UsersModule,
    SettingsModule,
    RegistryModule,
    MeModulesModule,
    PermissionsModule,
    ModuleStorageModule,
    BackupModule,
    AdminModule,
    InviteRequestsModule,
    TasksModule,
    FeedbackModule,
    WorklogModule,
    ChangelogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: FastifyThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
