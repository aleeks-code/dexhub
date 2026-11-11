import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, getClient, moduleRegistry, userModulePreferences } from '@dexhub/db'

@Injectable()
export class MeModulesService {
  private get db() {
    return getClient()
  }

  async list(userId: string) {
    return this.db
      .select({
        moduleId: userModulePreferences.moduleId,
        enabled: userModulePreferences.enabled,
        inOverview: userModulePreferences.inOverview,
      })
      .from(userModulePreferences)
      .where(eq(userModulePreferences.userId, userId))
  }

  async setPreference(
    userId: string,
    moduleId: string,
    prefs: { enabled?: boolean; inOverview?: boolean },
  ) {
    const mod = await this.db
      .select({ status: moduleRegistry.status })
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, moduleId))
      .limit(1)
      .then((r) => r[0])

    if (!mod) throw new NotFoundException(`Module '${moduleId}' not found`)
    if (mod.status !== 'active') throw new ConflictException(`Module '${moduleId}' is not active`)

    const existing = await this.db
      .select()
      .from(userModulePreferences)
      .where(
        and(
          eq(userModulePreferences.userId, userId),
          eq(userModulePreferences.moduleId, moduleId),
        ),
      )
      .limit(1)
      .then((r) => r[0])

    const nextEnabled =
      prefs.enabled !== undefined
        ? prefs.enabled
        : (existing?.enabled ?? false)

    let nextInOverview: boolean
    if (prefs.inOverview !== undefined) {
      nextInOverview = prefs.inOverview
    } else if (existing !== undefined) {
      nextInOverview = existing.inOverview
    } else {
      nextInOverview = nextEnabled
    }

    // Se il modulo viene disattivato, escludi automaticamente dalla panoramica
    if (!nextEnabled) {
      nextInOverview = false
    }

    await this.db
      .insert(userModulePreferences)
      .values({
        userId,
        moduleId,
        enabled: nextEnabled,
        inOverview: nextInOverview,
      })
      .onConflictDoUpdate({
        target: [userModulePreferences.userId, userModulePreferences.moduleId],
        set: {
          enabled: nextEnabled,
          inOverview: nextInOverview,
          updatedAt: new Date(),
        },
      })

    return { moduleId, enabled: nextEnabled, inOverview: nextInOverview }
  }
}
