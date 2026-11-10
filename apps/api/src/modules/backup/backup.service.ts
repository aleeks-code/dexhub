import { Injectable, NotFoundException } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import {
  backupJobs,
  getClient,
  moduleKvStore,
  moduleRegistry,
  moduleSettings,
  passkeys,
  permissions,
  recoveryCodes,
  rolePermissions,
  roles,
  settings,
  userRoles,
  users,
  type BackupJob,
  desc,
  eq,
} from '@dexhub/db'
import { BackupStorageService } from './backup-storage.service'
import { BackupRotationService } from './backup-rotation.service'

const ALGORITHM = 'aes-256-gcm' as const

interface BackupData {
  users: unknown[]
  passkeys: unknown[]
  recoveryCodes: unknown[]
  roles: unknown[]
  permissions: unknown[]
  rolePermissions: unknown[]
  userRoles: unknown[]
  settings: unknown[]
  moduleRegistry: unknown[]
  moduleSettings: unknown[]
  moduleKvStore: unknown[]
}

interface BackupManifest {
  dexhub_backup: true
  version: '1'
  createdAt: string
  encrypted: boolean
  checksum: string
  iv?: string
  authTag?: string
  payload?: string
  data?: BackupData
}

@Injectable()
export class BackupService {
  constructor(
    private readonly storage: BackupStorageService,
    private readonly rotation: BackupRotationService,
  ) {}

  async list(): Promise<BackupJob[]> {
    const db = getClient()
    return db.select().from(backupJobs).orderBy(desc(backupJobs.createdAt))
  }

  async findById(id: string): Promise<BackupJob> {
    const db = getClient()
    const [job] = await db.select().from(backupJobs).where(eq(backupJobs.id, id))
    if (!job) throw new NotFoundException(`Backup ${id} not found`)
    return job
  }

  async create(): Promise<BackupJob> {
    const db = getClient()

    const existing = await this.list()
    const type = this.rotation.classify(existing)
    const createdAt = new Date()
    const filename = `backup-${createdAt.toISOString().replace(/[:.]/g, '-')}-${type}.json`

    const [job] = await db.insert(backupJobs).values({ filename, type, status: 'pending' }).returning()
    if (!job) throw new Error('Failed to create backup job record')

    try {
      const data = await this.exportData()
      const json = JSON.stringify(data)
      const checksum = createHash('sha256').update(json).digest('hex')

      let manifest: BackupManifest
      const encrypted = this.isEncryptionEnabled()

      if (encrypted) {
        const { ciphertext, iv, authTag } = this.encrypt(Buffer.from(json, 'utf8'))
        manifest = {
          dexhub_backup: true,
          version: '1',
          createdAt: createdAt.toISOString(),
          encrypted: true,
          checksum,
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64'),
          payload: ciphertext.toString('base64'),
        }
      } else {
        manifest = {
          dexhub_backup: true,
          version: '1',
          createdAt: createdAt.toISOString(),
          encrypted: false,
          checksum,
          data,
        }
      }

      const content = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
      await this.storage.write(filename, content)
      const sizeBytes = content.length

      const [updated] = await db
        .update(backupJobs)
        .set({ status: 'completed', completedAt: new Date(), sizeBytes, checksum, encrypted })
        .where(eq(backupJobs.id, job.id))
        .returning()

      await this.runRotation()

      return updated!
    } catch (err) {
      await db
        .update(backupJobs)
        .set({ status: 'failed', error: String(err) })
        .where(eq(backupJobs.id, job.id))
      throw err
    }
  }

  async getFile(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const job = await this.findById(id)
    if (job.status !== 'completed') throw new NotFoundException('Backup file not available')
    const buffer = await this.storage.read(job.filename)
    return { buffer, filename: job.filename }
  }

  async delete(id: string): Promise<void> {
    const db = getClient()
    const job = await this.findById(id)
    await this.storage.delete(job.filename)
    await db.delete(backupJobs).where(eq(backupJobs.id, id))
  }

  async restore(input: { backupId?: string; content?: string }): Promise<void> {
    let rawContent: string

    if (input.backupId) {
      const { buffer } = await this.getFile(input.backupId)
      rawContent = buffer.toString('utf8')
    } else if (input.content) {
      rawContent = input.content
    } else {
      throw new Error('Provide backupId or content')
    }

    const manifest = JSON.parse(rawContent) as BackupManifest
    this.assertValidManifest(manifest)

    let data: BackupData

    if (manifest.encrypted) {
      const ciphertext = Buffer.from(manifest.payload!, 'base64')
      const iv = Buffer.from(manifest.iv!, 'base64')
      const authTag = Buffer.from(manifest.authTag!, 'base64')
      const decrypted = this.decrypt(ciphertext, iv, authTag).toString('utf8')
      const actualChecksum = createHash('sha256').update(decrypted).digest('hex')
      if (actualChecksum !== manifest.checksum) throw new Error('Backup checksum mismatch')
      data = JSON.parse(decrypted) as BackupData
    } else {
      const json = JSON.stringify(manifest.data)
      const actualChecksum = createHash('sha256').update(json).digest('hex')
      if (actualChecksum !== manifest.checksum) throw new Error('Backup checksum mismatch')
      data = manifest.data!
    }

    await this.importData(data)
  }

  private async exportData(): Promise<BackupData> {
    const db = getClient()
    const [
      userRows,
      passkeyRows,
      recoveryCodeRows,
      roleRows,
      permissionRows,
      rolePermissionRows,
      userRoleRows,
      settingRows,
      moduleRegistryRows,
      moduleSettingRows,
      moduleKvRows,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(passkeys),
      db.select().from(recoveryCodes),
      db.select().from(roles),
      db.select().from(permissions),
      db.select().from(rolePermissions),
      db.select().from(userRoles),
      db.select().from(settings),
      db.select().from(moduleRegistry),
      db.select().from(moduleSettings),
      db.select().from(moduleKvStore),
    ])

    return {
      users: userRows,
      passkeys: passkeyRows,
      recoveryCodes: recoveryCodeRows,
      roles: roleRows,
      permissions: permissionRows,
      rolePermissions: rolePermissionRows,
      userRoles: userRoleRows,
      settings: settingRows,
      moduleRegistry: moduleRegistryRows,
      moduleSettings: moduleSettingRows,
      moduleKvStore: moduleKvRows,
    }
  }

  private async importData(data: BackupData): Promise<void> {
    const db = getClient()

    await db.transaction(async (tx) => {
      // Delete in FK-safe order; cascades handle dependent rows automatically
      await tx.delete(moduleKvStore)
      await tx.delete(moduleRegistry) // cascades moduleSettings
      await tx.delete(rolePermissions)
      await tx.delete(userRoles)
      await tx.delete(permissions)
      await tx.delete(roles)
      await tx.delete(settings)
      await tx.delete(users) // cascades passkeys, recoveryCodes, sessions, accounts

      // Insert in FK-respecting order (data comes from serialized JSON → cast to any[])
      if (data.users?.length) await tx.insert(users).values(data.users as any[])
      if (data.passkeys?.length) await tx.insert(passkeys).values(data.passkeys as any[])
      if (data.recoveryCodes?.length) await tx.insert(recoveryCodes).values(data.recoveryCodes as any[])
      if (data.roles?.length) await tx.insert(roles).values(data.roles as any[])
      if (data.permissions?.length) await tx.insert(permissions).values(data.permissions as any[])
      if (data.rolePermissions?.length) await tx.insert(rolePermissions).values(data.rolePermissions as any[])
      if (data.userRoles?.length) await tx.insert(userRoles).values(data.userRoles as any[])
      if (data.settings?.length) await tx.insert(settings).values(data.settings as any[])
      if (data.moduleRegistry?.length) await tx.insert(moduleRegistry).values(data.moduleRegistry as any[])
      if (data.moduleSettings?.length) await tx.insert(moduleSettings).values(data.moduleSettings as any[])
      if (data.moduleKvStore?.length) await tx.insert(moduleKvStore).values(data.moduleKvStore as any[])
    })
  }

  private assertValidManifest(m: unknown): asserts m is BackupManifest {
    if (!m || typeof m !== 'object' || (m as any).dexhub_backup !== true || (m as any).version !== '1') {
      throw new Error('Invalid backup file')
    }
    if ((m as any).encrypted) {
      if (!(m as any).payload || !(m as any).iv || !(m as any).authTag) {
        throw new Error('Encrypted backup is missing decryption fields')
      }
    } else if (!(m as any).data) {
      throw new Error('Backup is missing data payload')
    }
  }

  private isEncryptionEnabled(): boolean {
    return !!process.env['BACKUP_ENCRYPTION_KEY']
  }

  private encrypt(data: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
    const key = Buffer.from(process.env['BACKUP_ENCRYPTION_KEY']!, 'hex')
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
    return { ciphertext, iv, authTag: cipher.getAuthTag() }
  }

  private decrypt(ciphertext: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const key = Buffer.from(process.env['BACKUP_ENCRYPTION_KEY']!, 'hex')
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  }

  private async runRotation(): Promise<void> {
    const db = getClient()
    const jobs = await this.list()
    const expiredIds = this.rotation.getExpiredIds(jobs)
    for (const id of expiredIds) {
      try {
        const [job] = await db.select().from(backupJobs).where(eq(backupJobs.id, id))
        if (job) await this.storage.delete(job.filename)
        await db.delete(backupJobs).where(eq(backupJobs.id, id))
      } catch {
        // best effort
      }
    }
  }
}
