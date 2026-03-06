/**
 * Super Admin Invitations Page
 *
 * Manage customer-admin onboarding invitations.
 */

import { useCallback, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Fieldset } from '../../components/Fieldset'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Dialog } from '../../components/Dialog'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { useToaster } from '../../components/Toaster'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import {
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminInvitations.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'created', label: 'Created' },
  { value: 'sent', label: 'Sent' },
  { value: 'send_failed', label: 'Send Failed' },
  { value: 'accessed', label: 'Accessed' },
  { value: 'authenticated', label: 'Authenticated' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
]

const STATUS_VARIANTS = {
  created: 'info',
  sent: 'success',
  send_failed: 'error',
  accessed: 'warning',
  authenticated: 'success',
  expired: 'neutral',
  revoked: 'neutral',
}

const NON_RESENDABLE_STATUSES = new Set(['authenticated', 'expired', 'revoked'])
const NON_REVOCABLE_STATUSES = new Set(['authenticated', 'expired', 'revoked'])

function SuperAdminInvitations() {
  return (
    <section className="container" aria-label="Super admin invitations">
      <SuperAdminInvitationsPanel headingLevel={1} />
    </section>
  )
}

export function SuperAdminInvitationsPanel({
  isActive = true,
  headingLevel = 2,
  embedded = false,
}) {
  const { addToast } = useToaster()
  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2'
  const panelClasses = [
    'super-admin-invitations',
    embedded && 'super-admin-invitations--embedded',
  ]
    .filter(Boolean)
    .join(' ')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [authLinkDialogOpen, setAuthLinkDialogOpen] = useState(false)
  const [lastAuthLink, setLastAuthLink] = useState('')

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeReasonError, setRevokeReasonError] = useState('')
  const [revokeStepUpToken, setRevokeStepUpToken] = useState('')

  const debouncedSearch = useDebounce(search, 350)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListInvitationsQuery({
    page,
    pageSize: 20,
    q: debouncedSearch.trim(),
    status: statusFilter,
  }, { skip: !isActive })

  const [resendInvitation, resendInvitationResult] = useResendInvitationMutation()
  const [revokeInvitation, revokeInvitationResult] = useRevokeInvitationMutation()

  const invitations = listResponse?.data ?? []
  const pagination = listResponse?.meta ?? {}
  const totalPages = Number(pagination.totalPages) || 1

  const closeRevokeDialog = useCallback(() => {
    setRevokeDialogOpen(false)
    setSelectedInvitation(null)
    setRevokeReason('')
    setRevokeReasonError('')
    setRevokeStepUpToken('')
  }, [])

  const closeResendDialog = useCallback(() => {
    setResendDialogOpen(false)
    setSelectedInvitation(null)
  }, [])

  const handleRowAction = useCallback(
    (label, invitation) => {
      const invitationId = invitation.id ?? invitation._id
      if (!invitationId) return

      if (label === 'Resend') {
        if (NON_RESENDABLE_STATUSES.has(invitation.status)) {
          addToast({
            title: 'Resend unavailable',
            description: 'This invitation can no longer be resent.',
            variant: 'warning',
          })
          return
        }
        setSelectedInvitation(invitation)
        setResendDialogOpen(true)
        return
      }

      if (label === 'Revoke') {
        if (NON_REVOCABLE_STATUSES.has(invitation.status)) {
          addToast({
            title: 'Revoke unavailable',
            description: 'This invitation is already in a terminal state.',
            variant: 'warning',
          })
          return
        }
        setSelectedInvitation(invitation)
        setRevokeDialogOpen(true)
      }
    },
    [addToast],
  )

  const handleConfirmResend = useCallback(async () => {
    if (!selectedInvitation) return

    const invitationId = selectedInvitation.id ?? selectedInvitation._id
    try {
      const result = await resendInvitation(invitationId).unwrap()
      addToast({
        title: 'Invitation resent',
        description: `Invitation resent to ${selectedInvitation.recipientEmail}.`,
        variant: 'success',
      })
      closeResendDialog()
      if (result?.authLink) {
        setLastAuthLink(result.authLink)
        setAuthLinkDialogOpen(true)
      }
    } catch (err) {
      const appError = normalizeError(err)
      addToast({
        title: 'Failed to resend invitation',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [selectedInvitation, resendInvitation, addToast, closeResendDialog])

  const handleConfirmRevoke = useCallback(async () => {
    if (!selectedInvitation) return

    const trimmedReason = revokeReason.trim()
    if (!trimmedReason) {
      setRevokeReasonError('Reason is required to revoke an invitation.')
      return
    }

    if (!revokeStepUpToken) {
      setRevokeReasonError('Step-up verification is required before revoking.')
      return
    }

    setRevokeReasonError('')

    try {
      await revokeInvitation({
        invitationId: selectedInvitation.id ?? selectedInvitation._id,
        reason: trimmedReason,
        stepUpToken: revokeStepUpToken,
      }).unwrap()

      addToast({
        title: 'Invitation revoked',
        description: 'The invitation has been revoked successfully.',
        variant: 'success',
      })
      closeRevokeDialog()
    } catch (err) {
      const appError = normalizeError(err)
      setRevokeStepUpToken('')
      addToast({
        title: 'Failed to revoke invitation',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    selectedInvitation,
    revokeReason,
    revokeStepUpToken,
    revokeInvitation,
    addToast,
    closeRevokeDialog,
  ])

  const columns = useMemo(
    () => [
      {
        key: 'recipient',
        label: 'Recipient',
        render: (_value, row) => (
          <div className="super-admin-invitations__recipient">
            <strong>{row.recipientName ?? '--'}</strong>
            <span>{row.recipientEmail ?? '--'}</span>
          </div>
        ),
      },
      {
        key: 'company',
        label: 'Company',
        render: (_value, row) => row.company?.name ?? '--',
      },
      {
        key: 'provisionedCustomerId',
        label: 'Customer',
        render: (_value, row) => {
          const status = row.provisionedCustomerId?.status
          if (!status) return '--'
          const variantMap = { ACTIVE: 'success', DISABLED: 'warning', ARCHIVED: 'neutral' }
          return (
            <Status size="sm" showIcon variant={variantMap[status] ?? 'neutral'}>
              {status}
            </Status>
          )
        },
      },
      {
        key: 'provisionedUserId',
        label: 'User Trust',
        render: (_value, row) => {
          const trust = row.provisionedUserId?.identityPlus?.trustStatus
          if (!trust) return '--'
          const variant = trust === 'TRUSTED' ? 'success' : 'warning'
          return (
            <Status size="sm" showIcon variant={variant}>
              {trust}
            </Status>
          )
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Status
            size="sm"
            showIcon
            variant={STATUS_VARIANTS[value] ?? 'neutral'}
          >
            {value ?? 'unknown'}
          </Status>
        ),
      },
      {
        key: 'expiresAt',
        label: 'Expires',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  const actions = useMemo(
    () => [
      { label: 'Resend', variant: 'ghost' },
      {
        label: 'Revoke',
        variant: 'danger',
        disabled: (row) => row?.status === 'revoked',
      },
    ],
    [],
  )

  const normalizedListError = listError ? normalizeError(listError) : null

  return (
    <div className={panelClasses}>
      <header className="super-admin-invitations__header">
        <HeadingTag className="super-admin-invitations__title">Invitation Management</HeadingTag>
        <p className="super-admin-invitations__subtitle">
          Invitation Management - Track, resend, and revoke customer onboarding invitations.
        </p>
      </header>

      <div className="super-admin-invitations__grid">
        <Fieldset className="super-admin-invitations__fieldset super-admin-invitations__fieldset--list">
          <Fieldset.Legend className="super-admin-invitations__legend">
            <h2 className="super-admin-invitations__section-title">
              Invitation History
            </h2>
          </Fieldset.Legend>
          <Card
            variant="elevated"
            className="super-admin-invitations__card super-admin-invitations__card--list"
          >
            <Card.Body>
              <div className="super-admin-invitations__toolbar">
                {/* Extra browser hints reduce sticky search autofill in Safari/iOS beyond autocomplete=off. */}
                <Input
                  id="invitation-search"
                  name="invitation-search"
                  type="search"
                  label="Search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  fullWidth
                />
                <Select
                  id="invitation-status"
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {normalizedListError ? (
                <p className="super-admin-invitations__error" role="alert">
                  {normalizedListError.message}
                </p>
              ) : null}

              <HorizontalScroll
                className="super-admin-invitations__table-wrap"
                ariaLabel="Invitation history table"
                gap="sm"
              >
                <Table
                  className="super-admin-invitations__history-table"
                  columns={columns}
                  data={invitations}
                  actions={actions}
                  onRowAction={handleRowAction}
                  loading={isListLoading}
                  hoverable
                  variant="striped"
                  emptyMessage="No invitations found."
                  ariaLabel="Invitation table"
                />
              </HorizontalScroll>

              <div className="super-admin-invitations__pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || isListFetching}
                >
                  Previous
                </Button>
                <p className="super-admin-invitations__pagination-info">
                  Page {Number(pagination.page) || page} of {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || isListFetching}
                >
                  Next
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

      {/* Resend Confirmation Dialog */}
      <Dialog
        open={resendDialogOpen}
        onClose={closeResendDialog}
        size="sm"
        closeOnBackdropClick={!resendInvitationResult.isLoading}
      >
        <Dialog.Header>
          <h2 className="super-admin-invitations__dialog-title">
            Resend Invitation
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-invitations__dialog-subtitle">
            A new invitation email will be sent to{' '}
            <strong>{selectedInvitation?.recipientEmail ?? '--'}</strong>.
            The previous invitation link will be invalidated.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={closeResendDialog}
            disabled={resendInvitationResult.isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmResend}
            loading={resendInvitationResult.isLoading}
            disabled={resendInvitationResult.isLoading}
          >
            Confirm Resend
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Revoke Dialog with Step-Up */}
      <Dialog
        open={revokeDialogOpen}
        onClose={closeRevokeDialog}
        size="md"
        closeOnBackdropClick={!revokeInvitationResult.isLoading}
      >
        <Dialog.Header>
          <h2 className="super-admin-invitations__dialog-title">
            Revoke Invitation
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-invitations__dialog-subtitle">
            Revoke invitation for {selectedInvitation?.recipientEmail ?? '--'}.
          </p>

          <Input
            id="revoke-invitation-reason"
            name="revoke-invitation-reason"
            label="Reason"
            value={revokeReason}
            onChange={(event) => {
              setRevokeReason(event.target.value)
              setRevokeReasonError('')
            }}
            autoComplete="off"
            error={revokeReasonError}
            required
            fullWidth
          />

          <StepUpAuthForm
            onStepUpComplete={(token) => {
              setRevokeStepUpToken(token)
              setRevokeReasonError('')
            }}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={closeRevokeDialog}
            disabled={revokeInvitationResult.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmRevoke}
            loading={revokeInvitationResult.isLoading}
            disabled={
              revokeInvitationResult.isLoading ||
              !revokeReason.trim() ||
              !revokeStepUpToken
            }
          >
            Confirm Revoke
          </Button>
        </Dialog.Footer>
      </Dialog>

      {/* Auth Link Dialog (fake auth / dev mode, from resend responses) */}
      <Dialog
        open={authLinkDialogOpen}
        onClose={() => setAuthLinkDialogOpen(false)}
        size="md"
      >
        <Dialog.Header>
          <h2 className="super-admin-invitations__dialog-title">
            Auth Link (Dev Mode)
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-invitations__dialog-subtitle">
            Email is in mock mode. Use this link to simulate the invitation
            auth flow:
          </p>
          <div className="super-admin-invitations__auth-link-box">
            <code className="super-admin-invitations__auth-link-code">
              {lastAuthLink}
            </code>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={() => setAuthLinkDialogOpen(false)}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(lastAuthLink)
                addToast({
                  title: 'Copied',
                  description: 'Auth link copied to clipboard.',
                  variant: 'success',
                })
              } catch {
                addToast({
                  title: 'Copy failed',
                  description: 'Could not copy to clipboard. Select and copy manually.',
                  variant: 'warning',
                })
              }
            }}
          >
            Copy Link
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}

export default SuperAdminInvitations
