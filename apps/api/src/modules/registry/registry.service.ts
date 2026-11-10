import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { validateManifest } from '@dexhub/sdk'
import type { ModuleManifest } from '@dexhub/sdk'
import {
  and,
  eq,
  getClient,
  moduleRegistry,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '@dexhub/db'

@Injectable()
export class RegistryService {
  private get db() {
    return getClient()
  }

  async list() {
    return this.db.select().from(moduleRegistry)
  }

  async findById(id: string) {
    const row = await this.db
      .select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, id))
      .limit(1)
      .then((r) => r[0])

    if (!row) throw new NotFoundException(`Module '${id}' not found`)
    return row
  }

  // ponytail: modules/ è escluso dal container API (Dockerfile boundary) — il frontend è
  // l'unico che vede il manifest sorgente vero, e lo ripropone qui a OGNI avvio app
  // (module-bootstrapper.tsx). Per questo install deve essere un upsert, non un reject:
  // altrimenti rinominare/modificare un manifest non si propaga mai al DB già popolato.
  async install(manifestInput: unknown, userId: string) {
    const result = validateManifest(manifestInput)
    if (!result.ok) throw new BadRequestException(result.error.message)

    const manifest: ModuleManifest = result.value

    const existing = await this.db
      .select({ id: moduleRegistry.id })
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, manifest.id))
      .limit(1)

    if (existing.length > 0) {
      // Già registrato — sincronizza nome/versione/manifest al sorgente attuale.
      // Non tocca `status`: un modulo disabilitato da un admin resta disabilitato.
      await this.db
        .update(moduleRegistry)
        .set({
          name: manifest.name,
          version: manifest.version,
          sdkVersion: manifest.sdkVersion,
          manifest: manifestInput as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(moduleRegistry.id, manifest.id))
    } else {
      await this.db.insert(moduleRegistry).values({
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        sdkVersion: manifest.sdkVersion,
        status: 'active',
        manifest: manifestInput as Record<string, unknown>,
      })
    }

    const declaredPermissions = manifest.permissions ?? []

    if (declaredPermissions.length > 0) {
      await this.db
        .insert(permissions)
        .values(
          declaredPermissions.map((p) => ({
            id: p.id,
            moduleId: manifest.id,
            label: p.label,
            description: p.description,
            dangerous: p.dangerous ?? false,
          })),
        )
        .onConflictDoNothing()

      // Find or create the system administrator role
      let adminRole = await this.db
        .select()
        .from(roles)
        .where(and(eq(roles.name, 'administrator'), eq(roles.isSystem, true)))
        .limit(1)
        .then((r) => r[0])

      if (!adminRole) {
        const [created] = await this.db
          .insert(roles)
          .values({ name: 'administrator', description: 'System administrator', isSystem: true })
          .returning()
        if (!created) throw new Error('Failed to create administrator role')
        adminRole = created
      }

      // Grant all module permissions to the administrator role
      await this.db
        .insert(rolePermissions)
        .values(declaredPermissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })))
        .onConflictDoNothing()

      // Assign administrator role to the installing user
      await this.db
        .insert(userRoles)
        .values({ userId, roleId: adminRole.id, grantedBy: userId })
        .onConflictDoNothing()
    }

    return this.findById(manifest.id)
  }

  async enable(id: string) {
    await this.findById(id)
    await this.db
      .update(moduleRegistry)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(moduleRegistry.id, id))
    return this.findById(id)
  }

  async disable(id: string) {
    await this.findById(id)
    await this.db
      .update(moduleRegistry)
      .set({ status: 'disabled', updatedAt: new Date() })
      .where(eq(moduleRegistry.id, id))
    return this.findById(id)
  }
}
