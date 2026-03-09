import { useCallback, useState } from 'react'
import {
  useListInvitationsQuery,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from '../../store/api/invitationApi.js'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import { normalizeError } from '../../utils/errors.js'
import {
  NON_RESENDABLE_STATUSES,
  NON_REVOCABLE_STATUSES,
} from './superAdminInvitations.constants.js'

export function useInvitationManagement({ isActive = true } = {}) {
  const { addToast } = useToaster()

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
  const currentPage = Number(pagination.page) || page

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

  const normalizedListError = listError ? normalizeError(listError) : null

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,

    invitations,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    normalizedListError,

    handleRowAction,

    resendDialogOpen,
    closeResendDialog,
    handleConfirmResend,
    resendInvitationResult,
    selectedInvitation,

    revokeDialogOpen,
    closeRevokeDialog,
    handleConfirmRevoke,
    revokeInvitationResult,
    revokeReason,
    setRevokeReason,
    revokeReasonError,
    setRevokeReasonError,
    setRevokeStepUpToken,

    authLinkDialogOpen,
    setAuthLinkDialogOpen,
    lastAuthLink,
    addToast,
  }
}
