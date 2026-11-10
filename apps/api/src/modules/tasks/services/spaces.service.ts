import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  and,
  count,
  eq,
  getClient,
  isNull,
  taskSpaceInvites,
  taskSpaceMembers,
  taskSpaces,
  users,
} from '@dexhub/db'
import { JoinCodeService } from './join-code.service'
import type { CreateSpaceDto, UpdateSpaceDto } from '../dto/space.dto'

@Injectable()
export class SpacesService {
  private get db() {
    return getClient()
  }

  constructor(private readonly joinCodeService: JoinCodeService) {}

  async listForUser(userId: string) {
    const rows = await this.db
      .select({ space: taskSpaces })
      .from(taskSpaces)
      .innerJoin(taskSpaceMembers, eq(taskSpaceMembers.spaceId, taskSpaces.id))
      .where(and(eq(taskSpaceMembers.userId, userId), isNull(taskSpaces.deletedAt)))

    const spaces = rows.map((r) => r.space)

    // La modalita' "Personale" (mockup, punto 3) presuppone che una lista privata esista SEMPRE.
    // La migration 0025 aveva fatto un backfill una-tantum, ma un utente creato dopo nascerebbe
    // senza: qui si ripara da solo, alla prima lettura, per qualunque via sia nato l'utente
    // (invito, wizard di setup, restore da backup).
    // Create-only: se lo space personale c'e' gia', questo ramo non tocca NULLA.
    if (!spaces.some((sp) => sp.type === 'personal')) {
      const personal = await this.createPersonalSpace(userId)
      if (personal) spaces.unshift(personal)
    }

    return spaces
  }

  private async createPersonalSpace(userId: string) {
    const [space] = await this.db
      .insert(taskSpaces)
      .values({ name: 'Personale', type: 'personal', createdBy: userId })
      .returning()
    if (!space) return null
    await this.db.insert(taskSpaceMembers).values({ spaceId: space.id, userId })
    return space
  }

  async findByIdForUser(id: string, userId: string) {
    const row = await this.db
      .select({ space: taskSpaces })
      .from(taskSpaces)
      .innerJoin(taskSpaceMembers, eq(taskSpaceMembers.spaceId, taskSpaces.id))
      .where(
        and(
          eq(taskSpaces.id, id),
          eq(taskSpaceMembers.userId, userId),
          isNull(taskSpaces.deletedAt),
        ),
      )
      .limit(1)
      .then((r) => r[0])

    if (!row) throw new NotFoundException('Space not found')
    return row.space
  }

  async create(userId: string, dto: CreateSpaceDto) {
    const joinCode =
      dto.type === 'shared' ? await this.joinCodeService.generateUnique() : null

    const [space] = await this.db
      .insert(taskSpaces)
      .values({
        name: dto.name,
        description: dto.description,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
        joinCode,
        createdBy: userId,
      })
      .returning()

    if (!space) throw new Error('Failed to create space')

    await this.db.insert(taskSpaceMembers).values({ spaceId: space.id, userId })

    return space
  }

  async update(id: string, userId: string, dto: UpdateSpaceDto) {
    await this.findByIdForUser(id, userId)

    const [updated] = await this.db
      .update(taskSpaces)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(taskSpaces.id, id))
      .returning()

    return updated
  }

  // "Elimina workspace per tutti" (mockup, punto 11): riservato al Proprietario, e vale ANCHE
  // con altri membri dentro — prima era vietato con memberCount > 1, ma la spec lo prevede
  // esplicitamente come azione del proprietario. Chi non e' proprietario usa `leave`.
  async delete(id: string, userId: string) {
    await this.assertOwner(id, userId)

    await this.db
      .update(taskSpaces)
      .set({ deletedAt: new Date() })
      .where(eq(taskSpaces.id, id))
  }

  async join(userId: string, rawCode: string) {
    const code = this.joinCodeService.normalize(rawCode)

    const space = await this.db
      .select()
      .from(taskSpaces)
      .where(and(eq(taskSpaces.joinCode, code), isNull(taskSpaces.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!space) throw new NotFoundException('Join code not found or space no longer exists')

    const already = await this.db
      .select()
      .from(taskSpaceMembers)
      .where(and(eq(taskSpaceMembers.spaceId, space.id), eq(taskSpaceMembers.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (already) throw new ConflictException('You are already a member of this space')

    await this.db.insert(taskSpaceMembers).values({ spaceId: space.id, userId })

    // Se questa persona era stata invitata via email, l'invito ha finito il suo lavoro:
    // "In attesa" diventa membro effettivo e la riga sparisce.
    const [me] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (me?.email) {
      await this.db
        .delete(taskSpaceInvites)
        .where(and(eq(taskSpaceInvites.spaceId, space.id), eq(taskSpaceInvites.email, me.email)))
    }

    return space
  }

  async leave(spaceId: string, userId: string) {
    await this.findByIdForUser(spaceId, userId)

    const countResult2 = await this.db
      .select({ value: count() })
      .from(taskSpaceMembers)
      .where(eq(taskSpaceMembers.spaceId, spaceId))
    const memberCount = Number(countResult2[0]?.value ?? 0)

    await this.db
      .delete(taskSpaceMembers)
      .where(
        and(eq(taskSpaceMembers.spaceId, spaceId), eq(taskSpaceMembers.userId, userId)),
      )

    if (memberCount <= 1) {
      await this.db
        .update(taskSpaces)
        .set({ deletedAt: new Date() })
        .where(eq(taskSpaces.id, spaceId))
    }
  }

  async regenerateCode(spaceId: string, userId: string) {
    const space = await this.findByIdForUser(spaceId, userId)

    if (space.type !== 'shared') {
      throw new ForbiddenException('Only shared spaces have a join code')
    }

    const newCode = await this.joinCodeService.generateUnique()

    const [updated] = await this.db
      .update(taskSpaces)
      .set({ joinCode: newCode, updatedAt: new Date() })
      .where(eq(taskSpaces.id, spaceId))
      .returning()

    if (!updated) throw new NotFoundException('Space not found after update')
    return updated
  }

  async getMembers(spaceId: string, userId: string) {
    const space = await this.findByIdForUser(spaceId, userId)

    const members = await this.db
      .select({
        userId: taskSpaceMembers.userId,
        spaceId: taskSpaceMembers.spaceId,
        joinedAt: taskSpaceMembers.joinedAt,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(taskSpaceMembers)
      .innerJoin(users, eq(users.id, taskSpaceMembers.userId))
      .where(eq(taskSpaceMembers.spaceId, spaceId))

    // Gerarchia piatta (mockup, punto 14): l'unico ruolo che esiste e' Proprietario.
    return members.map((m) => ({ ...m, isOwner: m.userId === space.createdBy }))
  }

  async getInvites(spaceId: string, userId: string) {
    await this.findByIdForUser(spaceId, userId)
    return this.db
      .select({
        id: taskSpaceInvites.id,
        email: taskSpaceInvites.email,
        createdAt: taskSpaceInvites.createdAt,
      })
      .from(taskSpaceInvites)
      .where(eq(taskSpaceInvites.spaceId, spaceId))
  }

  async invite(spaceId: string, userId: string, rawEmail: string) {
    const space = await this.findByIdForUser(spaceId, userId)
    if (space.type !== 'shared') {
      throw new ForbiddenException('Only shared workspaces can have invites')
    }

    const email = rawEmail.trim().toLowerCase()
    if (!email.includes('@')) throw new ConflictException('Invalid email address')

    // Gia' dentro? Non ha senso invitarlo: lo dice il chiamante, non lo scopre dopo.
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .innerJoin(taskSpaceMembers, eq(taskSpaceMembers.userId, users.id))
      .where(and(eq(users.email, email), eq(taskSpaceMembers.spaceId, spaceId)))
      .limit(1)
      .then((r) => r[0])
    if (existing) throw new ConflictException('This person is already a member')

    const [invite] = await this.db
      .insert(taskSpaceInvites)
      .values({ spaceId, email, invitedBy: userId })
      .onConflictDoNothing({ target: [taskSpaceInvites.spaceId, taskSpaceInvites.email] })
      .returning()

    // onConflictDoNothing non torna righe se l'invito esisteva gia': non e' un errore,
    // l'esito voluto ("questa email e' invitata") e' comunque vero.
    if (invite) return invite
    return this.db
      .select()
      .from(taskSpaceInvites)
      .where(and(eq(taskSpaceInvites.spaceId, spaceId), eq(taskSpaceInvites.email, email)))
      .limit(1)
      .then((r) => r[0])
  }

  async cancelInvite(spaceId: string, userId: string, inviteId: string) {
    await this.assertOwner(spaceId, userId)
    await this.db
      .delete(taskSpaceInvites)
      .where(and(eq(taskSpaceInvites.spaceId, spaceId), eq(taskSpaceInvites.id, inviteId)))
  }

  async removeMember(spaceId: string, userId: string, targetUserId: string) {
    await this.assertOwner(spaceId, userId)
    if (targetUserId === userId) {
      // Il proprietario non si rimuove da solo: quello e' "elimina workspace" oppure `leave`.
      throw new ConflictException('The owner cannot remove themselves')
    }
    await this.db
      .delete(taskSpaceMembers)
      .where(and(eq(taskSpaceMembers.spaceId, spaceId), eq(taskSpaceMembers.userId, targetUserId)))
  }

  async assertOwner(spaceId: string, userId: string) {
    const space = await this.findByIdForUser(spaceId, userId)
    if (space.createdBy !== userId) {
      throw new ForbiddenException('Only the workspace owner can do this')
    }
    return space
  }

  async assertMember(spaceId: string, userId: string) {
    const member = await this.db
      .select()
      .from(taskSpaceMembers)
      .where(and(eq(taskSpaceMembers.spaceId, spaceId), eq(taskSpaceMembers.userId, userId)))
      .limit(1)
      .then((r) => r[0])

    if (!member) throw new ForbiddenException('You are not a member of this space')
  }
}
