/**
 * UserTrustStatus Component
 *
 * Displays the Identity Plus trust state for a user:
 *   - UNTRUSTED (invitation pending) → warning variant with pulse
 *   - TRUSTED  (registration complete) → success variant
 *   - REVOKED  (trust removed) → error variant
 *
 * Optionally shows invitation date and trust establishment date.
 *
 * @example
 * <UserTrustStatus
 *   trustStatus="UNTRUSTED"
 *   invitedAt="2026-01-15T10:00:00Z"
 * />
 *
 * @example
 * <UserTrustStatus trustStatus="TRUSTED" trustedAt="2026-01-20T14:30:00Z" />
 */

import { Status } from '../Status'
import './UserTrustStatus.css'

/**
 * Map trust status to Status component props.
 * @type {Record<string, { variant: string, label: string, pulse: boolean }>}
 */
const TRUST_CONFIG = {
  UNTRUSTED: { variant: 'warning', label: 'Untrusted', pulse: true },
  TRUSTED: { variant: 'success', label: 'Trusted', pulse: false },
  REVOKED: { variant: 'error', label: 'Revoked', pulse: false },
}

/**
 * Format a date string for display (short date).
 * @param {string|Date|null} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * @param {Object} props
 * @param {'UNTRUSTED'|'TRUSTED'|'REVOKED'} props.trustStatus
 * @param {string|Date}  [props.invitedAt]  - Date invitation was sent
 * @param {string|Date}  [props.trustedAt]  - Date trust was established
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Status badge size
 * @param {boolean}      [props.showDates=false] - Whether to show dates inline
 * @param {string}       [props.className]
 */
export function UserTrustStatus({
  trustStatus,
  invitedAt,
  trustedAt,
  size = 'md',
  showDates = false,
  className = '',
}) {
  const config = TRUST_CONFIG[trustStatus] ?? TRUST_CONFIG.UNTRUSTED

  const classNames = ['user-trust-status', className].filter(Boolean).join(' ')

  return (
    <span className={classNames}>
      <Status
        variant={config.variant}
        size={size}
        pulse={config.pulse}
        showIcon
      >
        {config.label}
      </Status>

      {showDates && (
        <span className="user-trust-status__dates">
          {trustStatus === 'UNTRUSTED' && invitedAt && (
            <span className="user-trust-status__date">
              Invited {formatDate(invitedAt)}
            </span>
          )}
          {trustStatus === 'TRUSTED' && trustedAt && (
            <span className="user-trust-status__date">
              Trusted {formatDate(trustedAt)}
            </span>
          )}
          {trustStatus === 'REVOKED' && trustedAt && (
            <span className="user-trust-status__date">
              Revoked
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export default UserTrustStatus
