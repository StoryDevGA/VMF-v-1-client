export const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'created', label: 'Created' },
  { value: 'sent', label: 'Sent' },
  { value: 'send_failed', label: 'Send Failed' },
  { value: 'accessed', label: 'Accessed' },
  { value: 'authenticated', label: 'Authenticated' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
]

export const STATUS_VARIANTS = {
  created: 'info',
  sent: 'success',
  send_failed: 'error',
  accessed: 'warning',
  authenticated: 'success',
  expired: 'neutral',
  revoked: 'neutral',
}

export const NON_RESENDABLE_STATUSES = new Set(['authenticated', 'expired', 'revoked'])
export const NON_REVOCABLE_STATUSES = new Set(['authenticated', 'expired', 'revoked'])
