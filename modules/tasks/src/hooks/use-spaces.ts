'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { spacesApi, type TaskSpace } from '../api/tasks-client'

const SPACES_KEY = ['tasks', 'spaces']

export function useSpaces() {
  return useQuery({
    queryKey: SPACES_KEY,
    queryFn: () => spacesApi.list(),
  })
}

export function useSpace(id: string | null) {
  return useQuery({
    queryKey: [...SPACES_KEY, id],
    queryFn: () => spacesApi.get(id!),
    enabled: !!id,
  })
}

export function useSpaceMembers(spaceId: string | null) {
  return useQuery({
    queryKey: [...SPACES_KEY, spaceId, 'members'],
    queryFn: () => spacesApi.members(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: spacesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: SPACES_KEY }),
  })
}

export function useUpdateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof spacesApi.update>[1]) =>
      spacesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPACES_KEY }),
  })
}

export function useDeleteSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: spacesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: SPACES_KEY }),
  })
}

export function useJoinSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => spacesApi.join(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPACES_KEY }),
  })
}

export function useLeaveSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: spacesApi.leave,
    onSuccess: () => qc.invalidateQueries({ queryKey: SPACES_KEY }),
  })
}

export function useRegenerateCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: spacesApi.regenerateCode,
    onSuccess: (data: TaskSpace) => {
      qc.invalidateQueries({ queryKey: SPACES_KEY })
      qc.setQueryData([...SPACES_KEY, data.id], data)
    },
  })
}

// ─── Inviti e membri (mockup, punto 11) ────────────────────────────────────

export function useSpaceInvites(spaceId: string | null) {
  return useQuery({
    queryKey: [...SPACES_KEY, spaceId, 'invites'],
    queryFn: () => spacesApi.invites(spaceId!),
    enabled: !!spaceId,
  })
}

/** Invalida membri E inviti dello stesso workspace: un invito accettato sposta una riga
 *  dall'uno all'altro, quindi guardarne solo una darebbe una vista incoerente. */
function invalidateRoster(qc: ReturnType<typeof useQueryClient>, spaceId: string) {
  qc.invalidateQueries({ queryKey: [...SPACES_KEY, spaceId, 'members'] })
  qc.invalidateQueries({ queryKey: [...SPACES_KEY, spaceId, 'invites'] })
}

export function useInviteToSpace(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => spacesApi.invite(spaceId, email),
    onSuccess: () => invalidateRoster(qc, spaceId),
  })
}

export function useCancelInvite(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => spacesApi.cancelInvite(spaceId, inviteId),
    onSuccess: () => invalidateRoster(qc, spaceId),
  })
}

export function useRemoveMember(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => spacesApi.removeMember(spaceId, userId),
    onSuccess: () => invalidateRoster(qc, spaceId),
  })
}
