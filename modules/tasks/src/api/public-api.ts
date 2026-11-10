import { spacesApi, tasksApi } from './tasks-client'

export const publicAPI: Record<string, (...args: unknown[]) => unknown> = {
  listSpaces: () => spacesApi.list(),
  listTasks: (filters?: unknown) => tasksApi.list(filters as never),
  getTask: (id: unknown) => tasksApi.get(id as string),
  createTask: (spaceId: unknown, body: unknown) =>
    tasksApi.create(spaceId as string, body as never),
  completeTask: (id: unknown) => tasksApi.complete(id as string),
}
