import { Injectable } from '@nestjs/common'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

@Injectable()
export class BackupStorageService {
  private readonly dir: string

  constructor() {
    this.dir = process.env['BACKUP_DIR'] ?? join(process.cwd(), 'backups')
  }

  async write(filename: string, data: Buffer): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    await writeFile(join(this.dir, filename), data)
  }

  async read(filename: string): Promise<Buffer> {
    return readFile(join(this.dir, filename))
  }

  async delete(filename: string): Promise<void> {
    await unlink(join(this.dir, filename)).catch(() => {})
  }
}
