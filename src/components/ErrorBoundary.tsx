'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.critical('React Error Boundary Caught Exception', error, { 
      componentStack: errorInfo.componentStack 
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] h-full w-full flex flex-col items-center justify-center p-8 text-center bg-brand-background border border-brand-border rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-brand-error/10 text-brand-error flex items-center justify-center mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-text-secondary max-w-md mb-8">
            An unexpected error occurred in this component. Our engineering team has been notified via the logging system.
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary flex items-center gap-2"
            >
              Reload Page
            </button>
            <button 
              onClick={this.handleReset}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} /> Try Again
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-black/40 border border-brand-border rounded-lg text-left max-w-2xl w-full overflow-auto">
              <p className="text-brand-error font-mono text-sm mb-2 font-bold">{this.state.error.toString()}</p>
              <pre className="text-text-muted font-mono text-xs whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
