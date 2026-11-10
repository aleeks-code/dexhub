'use client'

import React from 'react'

interface Props {
  moduleId: string
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Module "${this.props.moduleId}" crashed:`, error, info)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-error-muted bg-error-muted p-8 text-center">
          <p className="text-sm font-medium text-error">Module failed to load</p>
          <p className="text-xs text-text-muted">{this.state.error?.message}</p>
          <button
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
