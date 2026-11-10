'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksApi, type TaskFilters, type TaskSection } from '../api/tasks-client'

export const tasksKey = (filters: TaskFilters) => ['tasks', 'list', filters]
const taskKey = (id: string) => ['tasks', 'task', id]

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: tasksKey(filters),
    queryFn: () => tasksApi.list(filters),
  })
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKey(id ?? ''),
    queryFn: () => tasksApi.get(id!),
    enabled: !!id,
  })
}

function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['tasks', 'list'] })
}

export function useCreateTask(spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof tasksApi.create>[1]) =>
      tasksApi.create(spaceId, body),
    onSuccess: () => invalidateTasks(qc),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof tasksApi.update>[1]) =>
      tasksApi.update(id, body),
    onSuccess: (data) => {
      invalidateTasks(qc)
      qc.setQueryData(taskKey(data.id), data)
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => invalidateTasks(qc),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.complete,
    onSuccess: (data) => {
      invalidateTasks(qc)
      qc.setQueryData(taskKey(data.id), data)
    },
  })
}

export function useReopenTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.reopen,
    onSuccess: (data) => {
      invalidateTasks(qc)
      qc.setQueryData(taskKey(data.id), data)
    },
  })
}

export function useDuplicateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksApi.duplicate(id),
    onSuccess: () => invalidateTasks(qc),
  })
}

/** Riordino da drag&drop. `section` opzionale: rilasciare su un'altra sezione la adotta
 *  (mockup, punto 8) senza toccare la data dell'attivita'. */
export function useReorderTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sortOrder, section }: { id: string; sortOrder: number; section?: TaskSection }) =>
      tasksApi.reorder(id, sortOrder, section),
    onSuccess: () => invalidateTasks(qc),
  })
}
