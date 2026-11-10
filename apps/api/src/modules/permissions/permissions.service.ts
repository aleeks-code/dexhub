import { Injectable } from '@nestjs/common'
import { eq, getClient, permissions } from '@dexhub/db'

@Injectable()
export class PermissionsService {
  private get db() {
    return getClient()
  }

  async list(moduleId?: string) {
    if (moduleId) {
      return this.db.select().from(permissions).where(eq(permissions.moduleId, moduleId))
    }
    return this.db.select().from(permissions)
  }

  async getUserPermissions(_userId: string) {
    return this.db.select().from(permissions)
  }
}
