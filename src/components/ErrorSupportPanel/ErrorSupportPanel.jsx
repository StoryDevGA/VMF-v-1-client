/**
 * ErrorSupportPanel Component (Phase 5.3)
 *
 * Inline error panel rendered below forms to surface structured error
 * information from the `normalizeError()` shape:
 *   - User-friendly error message
 *   - Rate-limit countdown (seconds remaining until retry)
 *   - Request ID correlation reference for support tickets
 *   - "Report Issue" button that copies a diagnostic payload to clipboard
 *
 * @param {{ error: import('../../utils/errors.js').AppError|null, context?: string, retryRemainingSeconds?: number }} props
 */

import { Button } from '../Button'
import { useToaster } from '../Toaster'
import { formatRetryAfter, isRateLimitError } from '../../utils/errors.js'
import './ErrorSupportPanel.css'
export function ErrorSupportPanel({
  error,
  context = 'ui',
  retryRemainingSeconds = 0,
}) {
  const { addToast } = useToaster()

  if (!error) return null

  const handleReportIssue = async () => {
    const payload = {
      context,
      code: error.code,
      status: error.status ?? null,
      requestId: error.requestId ?? null,
      message: error.message,
      path:
        typeof window !== 'undefined'
          ? window.location.pathname
          : undefined,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== 'undefined'
          ? navigator.userAgent
          : undefined,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      addToast({
        title: 'Issue details copied',
        description: 'Paste the copied details into your support ticket.',
        variant: 'success',
      })
    } catch {
      addToast({
        title: 'Unable to copy issue details',
        description: 'Clipboard access was blocked. Please try again.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="error-support" role="alert">
      <p className="error-support__message">{error.message}</p>

      {isRateLimitError(error) && retryRemainingSeconds > 0 && (
        <p className="error-support__retry" aria-live="polite">
          Retry available in {formatRetryAfter(retryRemainingSeconds)}.
        </p>
      )}

      {error.requestId && (
        <p className="error-support__request-id">
          Request ID: <code>{error.requestId}</code>
        </p>
      )}

      <div className="error-support__actions">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReportIssue}
        >
          Report Issue
        </Button>
      </div>
    </div>
  )
}

export default ErrorSupportPanel
