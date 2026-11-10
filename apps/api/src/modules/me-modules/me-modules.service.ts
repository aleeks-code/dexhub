import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, getClient, moduleRegistry, userModulePreferences } from '@dexhub/db'

@Injectable()
export class MeModulesService {
  private get db() {
    return getClient()
  }

  async list(userId: string) {
    return this.db
      .select({ moduleId: userModulePreferences.moduleId, enabled: userModulePreferences.enabled })
      .from(userModulePreferences)
      .where(eq(userModulePreferences.userId, userId))
  }

  async setPreference(userId: string, moduleId: string, enabled: boolean) {
    const mod = await this.db
      .select({ status: moduleRegistry.status })
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, moduleId))
      .limit(1)
      .then((r) => r[0])

    if (!mod) throw new NotFoundException(`Module '${moduleId}' not found`)
    if (mod.status !== 'active') throw new ConflictException(`Module '${moduleId}' is not active`)

    await this.db
      .insert(userModulePreferences)
      .values({ userId, moduleId, enabled })
      .onConflictDoUpdate({
        target: [userModulePreferences.userId, userModulePreferences.moduleId],
        set: { enabled, updatedAt: new Date() },
      })

    return { moduleId, enabled }
  }
}
