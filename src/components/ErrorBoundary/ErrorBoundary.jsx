/**
 * Application-level render error boundary.
 *
 * Keeps a render-time failure from replacing the entire document with a blank
 * screen and gives the user a safe recovery action.
 */

import { Component } from 'react'
import './ErrorBoundary.css'

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Keep the component deliberately free of app-specific logging services:
    // this boundary must remain usable when the rest of the app is failing.
    console.error('Unhandled application render error', error, errorInfo)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="error-boundary" aria-labelledby="error-boundary-title">
        <div className="error-boundary__panel" role="alert">
          <p className="error-boundary__eyebrow">StoryLineOS</p>
          <h1 id="error-boundary-title" className="error-boundary__title">
            Something went wrong
          </h1>
          <p className="error-boundary__message">
            This screen could not be displayed. Reload the application to try again.
          </p>
          <button
            type="button"
            className="error-boundary__reload"
            onClick={this.handleReload}
          >
            Reload application
          </button>
        </div>
      </main>
    )
  }
}

export default ErrorBoundary
