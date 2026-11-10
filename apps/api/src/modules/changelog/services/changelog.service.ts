import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { asc, desc, eq, getClient, inArray, sql, changelogChange, changelogRelease } from '@dexhub/db'
import type { CreateChangeDto, CreateReleaseDto, UpdateChangeDto, UpdateReleaseDto } from '../dto/changelog.dto'

// Drizzle wraps the raw postgres.js driver error — the real PostgresError (with the Postgres
// SQLSTATE `.code`, 23505 = unique_violation) sits on `.cause`, not on the thrown error itself
// (confirmed live: `err.code` undefined, `err.cause.code === '23505'`).
//
// changelog_release ha DUE vincoli unique (draft singola + versione, Diff UI-4A) — un bare
// code check non basta più per scegliere il messaggio giusto (bug trovato live: creare una
// versione duplicata restituiva il messaggio "release in bozza", sbagliato). Serve leggere
// `constraint_name` per distinguere quale vincolo ha reagito.
const UNIQUE_VIOLATION = '23505'

function uniqueViolationConstraint(err: unknown): string | null {
  const cause = (err as { cause?: { code?: string; constraint_name?: string } })?.cause
  if (cause?.code !== UNIQUE_VIOLATION) return null
  return cause.constraint_name ?? ''
}

@Injectable()
export class ChangelogService {
  private db = getClient()

  // ── Releases ─────────────────────────────────────────────────────────────────

  // Non-admin: solo published, niente ordinamento draft-first (non ci sono draft da anteporre).
  async listReleases(isAdmin: boolean) {
    const releases = isAdmin
      ? await this.db
          .select()
          .from(changelogRelease)
          .orderBy(
            sql`CASE WHEN ${changelogRelease.stato} = 'draft' THEN 0 ELSE 1 END`,
            desc(changelogRelease.dataPubblicazione),
            desc(changelogRelease.versione),
          )
      : await this.db
          .select()
          .from(changelogRelease)
          .where(eq(changelogRelease.stato, 'published'))
          .orderBy(desc(changelogRelease.dataPubblicazione), desc(changelogRelease.versione))
    return this.attachChanges(releases)
  }

  // Non-admin su una draft → 404, non 403: la risorsa non deve nemmeno risultare esistente.
  async getRelease(id: string, isAdmin: boolean) {
    const release = await this.requireRelease(id)
    if (!isAdmin && release.stato !== 'published') throw new NotFoundException('Release not found')
    const [withChanges] = await this.attachChanges([release])
    return withChanges!
  }

  // Dettaglio by-versione (pagina /changelog/[versione]) — versione ora garantita unica a DB
  // (Diff UI-4A). null su non trovata, il controller decide il 404 (nessuna NotFoundException
  // qui: stesso schema di "riga assente" già in uso altrove, il chiamante sceglie la risposta).
  // Stesso trattamento per una draft vista da non-admin: null, indistinguibile da "non esiste".
  async getReleaseByVersion(version: string, isAdmin: boolean) {
    const release = await this.db
      .select()
      .from(changelogRelease)
      .where(eq(changelogRelease.versione, version))
      .limit(1)
      .then((r) => r[0])

    if (!release) return null
    if (!isAdmin && release.stato !== 'published') return null

    const [withChanges] = await this.attachChanges([release])
    return withChanges!
  }

  async createRelease(dto: CreateReleaseDto) {
    try {
      const [row] = await this.db
        .insert(changelogRelease)
        .values({ versione: dto.versione, titolo: dto.titolo, descrizione: dto.descrizione ?? null })
        .returning()
      return row!
    } catch (err) {
      const constraint = uniqueViolationConstraint(err)
      if (constraint === 'idx_changelog_release_versione_unique') {
        throw new ConflictException('Esiste già una release con questa versione')
      }
      if (constraint !== null) {
        throw new ConflictException('Esiste già una release in bozza')
      }
      throw err
    }
  }

  async updateRelease(id: string, dto: UpdateReleaseDto) {
    const release = await this.requireRelease(id)
    if (release.stato !== 'draft') throw new ConflictException('Release pubblicata, immutabile')

    const [updated] = await this.db
      .update(changelogRelease)
      .set({
        versione: dto.versione,
        titolo: dto.titolo,
        descrizione: dto.descrizione ?? null,
        updatedAt: new Date(),
      })
      .where(eq(changelogRelease.id, id))
      .returning()
    const [withChanges] = await this.attachChanges([updated!])
    return withChanges!
  }

  async publishRelease(id: string) {
    const release = await this.requireRelease(id)
    if (release.stato === 'published') throw new ConflictException('Release già pubblicata')

    const [updated] = await this.db
      .update(changelogRelease)
      .set({ stato: 'published', dataPubblicazione: new Date(), updatedAt: new Date() })
      .where(eq(changelogRelease.id, id))
      .returning()
    return updated!
  }

  async deleteRelease(id: string) {
    const release = await this.requireRelease(id)
    if (release.stato !== 'draft') throw new ConflictException('Release pubblicata, immutabile')

    await this.db.delete(changelogRelease).where(eq(changelogRelease.id, id))
  }

  // ── Changes ──────────────────────────────────────────────────────────────────

  async createChange(releaseId: string, dto: CreateChangeDto) {
    const release = await this.requireRelease(releaseId)
    if (release.stato !== 'draft') throw new ConflictException('Release pubblicata, immutabile')

    const [row] = await this.db
      .insert(changelogChange)
      .values({
        releaseId,
        categoria: dto.categoria,
        visibilita: dto.visibilita ?? 'user',
        modulo: dto.modulo ?? null,
        titolo: dto.titolo,
        descrizione: dto.descrizione ?? null,
        linkWiki: dto.linkWiki ?? null,
        migrationNote: dto.migrationNote ?? null,
        ordine: dto.ordine ?? 0,
      })
      .returning()
    return row!
  }

  async updateChange(changeId: string, dto: UpdateChangeDto) {
    const { release } = await this.requireChangeWithRelease(changeId)
    if (release.stato !== 'draft') throw new ConflictException('Release pubblicata, immutabile')

    const [updated] = await this.db
      .update(changelogChange)
      .set({
        categoria: dto.categoria,
        visibilita: dto.visibilita ?? 'user',
        modulo: dto.modulo ?? null,
        titolo: dto.titolo,
        descrizione: dto.descrizione ?? null,
        linkWiki: dto.linkWiki ?? null,
        migrationNote: dto.migrationNote ?? null,
        ordine: dto.ordine ?? 0,
      })
      .where(eq(changelogChange.id, changeId))
      .returning()
    return updated!
  }

  async deleteChange(changeId: string) {
    const { release } = await this.requireChangeWithRelease(changeId)
    if (release.stato !== 'draft') throw new ConflictException('Release pubblicata, immutabile')

    await this.db.delete(changelogChange).where(eq(changelogChange.id, changeId))
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async requireRelease(id: string) {
    const release = await this.db
      .select()
      .from(changelogRelease)
      .where(eq(changelogRelease.id, id))
      .limit(1)
      .then((r) => r[0])
    if (!release) throw new NotFoundException('Release not found')
    return release
  }

  private async requireChangeWithRelease(changeId: string) {
    const row = await this.db
      .select({ change: changelogChange, release: changelogRelease })
      .from(changelogChange)
      .innerJoin(changelogRelease, eq(changelogChange.releaseId, changelogRelease.id))
      .where(eq(changelogChange.id, changeId))
      .limit(1)
      .then((r) => r[0])
    if (!row) throw new NotFoundException('Change not found')
    return row
  }

  // Single query for all changes across the given releases (no N+1), grouped in memory —
  // shared by listReleases() and getRelease() so the annidamento logic lives in one place.
  private async attachChanges<T extends { id: string }>(
    releases: T[],
  ): Promise<(T & { changes: (typeof changelogChange.$inferSelect)[] })[]> {
    if (releases.length === 0) return []

    const ids = releases.map((r) => r.id)
    const allChanges = await this.db
      .select()
      .from(changelogChange)
      .where(inArray(changelogChange.releaseId, ids))
      .orderBy(asc(changelogChange.ordine))

    const byRelease = new Map<string, (typeof changelogChange.$inferSelect)[]>()
    for (const c of allChanges) {
      if (!byRelease.has(c.releaseId)) byRelease.set(c.releaseId, [])
      byRelease.get(c.releaseId)!.push(c)
    }

    return releases.map((r) => ({ ...r, changes: byRelease.get(r.id) ?? [] }))
  }
}
