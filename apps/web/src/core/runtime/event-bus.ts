import type { EventBus, Unsubscribe } from '@dexhub/sdk'

type Handler<T> = (payload: T) => void

export class EventBusImpl<TEvents extends Record<string, unknown>>
  implements EventBus<TEvents>
{
  private readonly handlers = new Map<keyof TEvents, Set<Handler<unknown>>>()

  private getHandlers<K extends keyof TEvents>(event: K): Set<Handler<unknown>> {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    return set
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${String(event)}":`, err)
      }
    }
  }

  on<K extends keyof TEvents>(event: K, handler: Handler<TEvents[K]>): Unsubscribe {
    this.getHandlers(event).add(handler as Handler<unknown>)
    return () => this.off(event, handler)
  }

  once<K extends keyof TEvents>(event: K, handler: Handler<TEvents[K]>): void {
    const wrapper: Handler<TEvents[K]> = (payload) => {
      this.off(event, wrapper)
      handler(payload)
    }
    this.on(event, wrapper)
  }

  off<K extends keyof TEvents>(event: K, handler: Handler<TEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>)
  }

  listenerCount(event: keyof TEvents): number {
    return this.handlers.get(event)?.size ?? 0
  }
}
