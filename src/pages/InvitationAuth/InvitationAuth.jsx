/**
 * Fake Auth / Invitation Auth Page
 *
 * Simulates Identity Plus verification during development.
 * Reads invitationId from URL query params, displays invitation details,
 * and allows completing the fake verification.
 */

import { useSearchParams } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import {
  useFakeAuthInvitationQuery,
  useCompleteFakeAuthMutation,
} from '../../store/api/fakeAuthApi.js'
import { normalizeError } from '../../utils/errors.js'
import './InvitationAuth.css'

const STATUS_VARIANTS = {
  created: 'info',
  sent: 'success',
  send_failed: 'error',
  accessed: 'warning',
  authenticated: 'success',
  expired: 'neutral',
  revoked: 'neutral',
}

function InvitationAuth() {
  const [searchParams] = useSearchParams()
  const invitationId = searchParams.get('invitationId')

  const {
    data: response,
    isLoading,
    error: fetchError,
  } = useFakeAuthInvitationQuery(invitationId, { skip: !invitationId })

  const [completeFakeAuth, completeResult] = useCompleteFakeAuthMutation()

  const invitation = response?.data

  if (!invitationId) {
    return (
      <section className="invitation-auth container">
        <div className="invitation-auth__banner">Dev / Testing Mode</div>
        <div className="invitation-auth__error" role="alert">
          No invitation ID provided. Use the auth link from the invitation creation response.
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="invitation-auth container">
        <div className="invitation-auth__banner">Dev / Testing Mode</div>
        <Card variant="elevated">
          <Card.Body>
            <Spinner size="lg" />
            <p className="invitation-auth__hint">Loading invitation details...</p>
          </Card.Body>
        </Card>
      </section>
    )
  }

  if (fetchError) {
    const appError = normalizeError(fetchError)
    return (
      <section className="invitation-auth container">
        <div className="invitation-auth__banner">Dev / Testing Mode</div>
        <div className="invitation-auth__error" role="alert">
          {appError.message}
        </div>
      </section>
    )
  }

  if (!invitation) {
    return (
      <section className="invitation-auth container">
        <div className="invitation-auth__banner">Dev / Testing Mode</div>
        <div className="invitation-auth__error" role="alert">
          Invitation not found.
        </div>
      </section>
    )
  }

  const canComplete = invitation.status === 'accessed'
  const isCompleted = completeResult.isSuccess
  const completeError = completeResult.error ? normalizeError(completeResult.error) : null

  const handleComplete = async () => {
    try {
      await completeFakeAuth(invitationId).unwrap()
    } catch {
      // error is captured in completeResult
    }
  }

  return (
    <section className="invitation-auth container">
      <div className="invitation-auth__banner">Dev / Testing Mode</div>
      <h1 className="invitation-auth__title">Identity Verification</h1>

      <Card variant="elevated">
        <Card.Body>
          <div className="invitation-auth__details">
            <div className="invitation-auth__detail">
              <span className="invitation-auth__detail-label">Name</span>
              <span className="invitation-auth__detail-value">
                {invitation.recipientName ?? '--'}
              </span>
            </div>
            <div className="invitation-auth__detail">
              <span className="invitation-auth__detail-label">Email</span>
              <span className="invitation-auth__detail-value">
                {invitation.recipientEmail ?? '--'}
              </span>
            </div>
            <div className="invitation-auth__detail">
              <span className="invitation-auth__detail-label">Company</span>
              <span className="invitation-auth__detail-value">
                {invitation.companyName ?? '--'}
              </span>
            </div>
            <div className="invitation-auth__detail">
              <span className="invitation-auth__detail-label">Status</span>
              <span className="invitation-auth__detail-value">
                <Status
                  size="sm"
                  showIcon
                  variant={STATUS_VARIANTS[invitation.status] ?? 'neutral'}
                >
                  {invitation.status}
                </Status>
              </span>
            </div>
            <div className="invitation-auth__detail">
              <span className="invitation-auth__detail-label">Expires</span>
              <span className="invitation-auth__detail-value">
                {invitation.expiresAt
                  ? new Date(invitation.expiresAt).toLocaleString()
                  : '--'}
              </span>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="invitation-auth__actions">
        {isCompleted ? (
          <div className="invitation-auth__success" role="status">
            Verification complete! The user has been marked as trusted.
          </div>
        ) : (
          <>
            {completeError && (
              <div className="invitation-auth__error" role="alert">
                {completeError.message}
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleComplete}
              loading={completeResult.isLoading}
              disabled={!canComplete || completeResult.isLoading}
            >
              Complete Verification
            </Button>
            {!canComplete && (
              <p className="invitation-auth__hint">
                Verification can only be completed when the invitation status is "accessed".
                Current status: "{invitation.status}".
              </p>
            )}
          </>
        )}
      </div>

      <p className="invitation-auth__hint">
        This page simulates Identity Plus verification.
        It is only available when FAKE_AUTH_ENABLED is set.
      </p>
    </section>
  )
}

export default InvitationAuth
