import type { EventBus, Unsubscribe, CoreEventPayloads } from '@dexhub/sdk'
import { EventEmitViolationError } from '@dexhub/sdk'

type AnyEvents = CoreEventPayloads & Record<string, unknown>

export class ScopedEventBus implements EventBus<AnyEvents> {
  constructor(
    private readonly inner: EventBus<AnyEvents>,
    private readonly moduleId: string,
    private readonly declaredEmits: string[],
  ) {}

  emit<K extends keyof AnyEvents>(event: K, payload: AnyEvents[K]): void {
    if (!this.declaredEmits.includes(event as string)) {
      throw new EventEmitViolationError(this.moduleId, event as string)
    }
    this.inner.emit(event, payload)
  }

  on<K extends keyof AnyEvents>(event: K, handler: (payload: AnyEvents[K]) => void): Unsubscribe {
    return this.inner.on(event, handler)
  }

  once<K extends keyof AnyEvents>(event: K, handler: (payload: AnyEvents[K]) => void): void {
    this.inner.once(event, handler)
  }

  off<K extends keyof AnyEvents>(event: K, handler: (payload: AnyEvents[K]) => void): void {
    this.inner.off(event, handler)
  }
}
