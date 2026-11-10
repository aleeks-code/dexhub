'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Degrades a broken widget preview to neutral without touching module `lifecycle` — runtime failure is a separate axis. */
export class WidgetErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: unknown): void {
    console.error('[WidgetErrorBoundary] widget preview crashed:', error)
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
