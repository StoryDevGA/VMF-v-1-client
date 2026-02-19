/**
 * Super Admin Invitations Page
 *
 * Manage customer-admin onboarding invitations.
 */

import { useCallback, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import {
  useCreateInvitationMutation,
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminInvitations.css'

const INITIAL_FORM = {
  recipientName: '',
  recipientEmail: '',
  companyName: '',
  website: '',
}

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

const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const formatDate = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

function SuperAdminInvitations() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})

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
  })

  const [createInvitation, createInvitationResult] = useCreateInvitationMutation()
  const [resendInvitation, resendInvitationResult] = useResendInvitationMutation()
  const [revokeInvitation, revokeInvitationResult] = useRevokeInvitationMutation()

  const invitations = listResponse?.data ?? []
  const pagination = listResponse?.meta ?? {}
  const totalPages = Number(pagination.totalPages) || 1

  const validateCreateForm = useCallback(() => {
    const nextErrors = {}

    if (!createForm.recipientName.trim()) {
      nextErrors.recipientName = 'Recipient name is required.'
    }
    if (!createForm.recipientEmail.trim()) {
      nextErrors.recipientEmail = 'Recipient email is required.'
    } else if (!EMAIL_REGEX.test(createForm.recipientEmail.trim())) {
      nextErrors.recipientEmail = 'Please enter a valid email address.'
    }
    if (!createForm.companyName.trim()) {
      nextErrors.companyName = 'Company name is required.'
    }

    if (createForm.website.trim()) {
      try {
        const url = new URL(createForm.website.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          nextErrors.website = 'Website must start with http:// or https://.'
        }
      } catch {
        nextErrors.website = 'Website must be a valid URL.'
      }
    }

    return nextErrors
  }, [createForm])

  const handleCreateInvitation = useCallback(
    async (event) => {
      event.preventDefault()
      setFormErrors({})

      const validationErrors = validateCreateForm()
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors(validationErrors)
        return
      }

      const payload = {
        recipientEmail: createForm.recipientEmail.trim().toLowerCase(),
        recipientName: createForm.recipientName.trim(),
        company: {
          name: createForm.companyName.trim(),
          ...(createForm.website.trim()
            ? { website: createForm.website.trim() }
            : {}),
        },
      }

      try {
        await createInvitation(payload).unwrap()
        setCreateForm(INITIAL_FORM)
        addToast({
          title: 'Invitation created',
          description: 'The invitation request was submitted successfully.',
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to create invitation',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createForm, validateCreateForm, createInvitation, addToast],
  )

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
      await resendInvitation(invitationId).unwrap()
      addToast({
        title: 'Invitation resent',
        description: `Invitation resent to ${selectedInvitation.recipientEmail}.`,
        variant: 'success',
      })
      closeResendDialog()
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
        render: (value) => formatDate(value),
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        render: (value) => formatDate(value),
      },
    ],
    [],
  )

  const actions = useMemo(
    () => [
      { label: 'Resend', variant: 'ghost' },
      { label: 'Revoke', variant: 'danger' },
    ],
    [],
  )

  const normalizedListError = listError ? normalizeError(listError) : null

  return (
    <section
      className="super-admin-invitations container"
      aria-label="Super admin invitations"
    >
      <header className="super-admin-invitations__header">
        <h1 className="super-admin-invitations__title">Invitation Management</h1>
        <p className="super-admin-invitations__subtitle">
          Create, resend, and revoke customer onboarding invitations.
        </p>
      </header>

      <div className="super-admin-invitations__grid">
        <Card
          variant="elevated"
          className="super-admin-invitations__card super-admin-invitations__card--form"
        >
          <Card.Header>
            <h2 className="super-admin-invitations__section-title">
              Create Invitation
            </h2>
          </Card.Header>
          <Card.Body>
            <form
              className="super-admin-invitations__form"
              onSubmit={handleCreateInvitation}
              noValidate
            >
              <Input
                id="invitation-recipient-name"
                label="Recipient Name"
                value={createForm.recipientName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    recipientName: event.target.value,
                  }))
                }
                error={formErrors.recipientName}
                required
                fullWidth
              />
              <Input
                id="invitation-recipient-email"
                type="email"
                label="Recipient Email"
                value={createForm.recipientEmail}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    recipientEmail: event.target.value,
                  }))
                }
                error={formErrors.recipientEmail}
                required
                fullWidth
              />
              <Input
                id="invitation-company-name"
                label="Company Name"
                value={createForm.companyName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
                error={formErrors.companyName}
                required
                fullWidth
              />
              <Input
                id="invitation-company-website"
                label="Company Website (Optional)"
                value={createForm.website}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    website: event.target.value,
                  }))
                }
                error={formErrors.website}
                fullWidth
              />

              <div className="super-admin-invitations__form-actions">
                <Button
                  type="submit"
                  loading={createInvitationResult.isLoading}
                  disabled={createInvitationResult.isLoading}
                >
                  Send Invitation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateForm(INITIAL_FORM)
                    setFormErrors({})
                  }}
                  disabled={createInvitationResult.isLoading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        <Card
          variant="elevated"
          className="super-admin-invitations__card super-admin-invitations__card--list"
        >
          <Card.Header>
            <h2 className="super-admin-invitations__section-title">
              Invitation History
            </h2>
          </Card.Header>
          <Card.Body>
            <div className="super-admin-invitations__toolbar">
              <Input
                id="invitation-search"
                type="search"
                label="Search"
                placeholder="Name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
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

            <div className="super-admin-invitations__table-wrap">
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
            </div>

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
            label="Reason"
            value={revokeReason}
            onChange={(event) => {
              setRevokeReason(event.target.value)
              setRevokeReasonError('')
            }}
            error={revokeReasonError}
            required
            fullWidth
          />

          <StepUpAuthForm
            onStepUpComplete={(token) => {
              setRevokeStepUpToken(token)
              setRevokeReasonError('')
            }}
            onCancel={closeRevokeDialog}
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
            disabled={revokeInvitationResult.isLoading}
          >
            Confirm Revoke
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminInvitations
