export type Unsubscribe = () => void

export interface EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe
  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void
  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void
}
