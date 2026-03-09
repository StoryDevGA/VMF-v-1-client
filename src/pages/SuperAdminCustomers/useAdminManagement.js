import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useCreateCustomerAdminInvitationMutation,
  useReplaceCustomerAdminMutation,
} from '../../store/api/customerApi.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import { EMAIL_REGEX } from './superAdminCustomers.constants.js'
import {
  getCustomerId,
  getAssignAdminErrorMessage,
  getReplaceAdminErrorMessage,
} from './superAdminCustomers.utils.js'

export function useAdminManagement({ onAuthLink, onAssignAdminSuccess }) {
  const { addToast } = useToaster()

  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminMode, setAdminMode] = useState('assign')
  const [adminCustomer, setAdminCustomer] = useState(null)
  const [adminRecipientName, setAdminRecipientName] = useState('')
  const [adminRecipientEmail, setAdminRecipientEmail] = useState('')
  const [adminUserId, setAdminUserId] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [adminStepUpToken, setAdminStepUpToken] = useState('')
  const [adminError, setAdminError] = useState('')

  const [createCustomerAdminInvitation, createAdminInvitationResult] =
    useCreateCustomerAdminInvitationMutation()
  const [replaceCustomerAdmin, replaceAdminResult] = useReplaceCustomerAdminMutation()

  const openAdminDialog = useCallback((mode, row, defaults = {}) => {
    const recipientName = String(defaults.recipientName ?? '')
    const recipientEmail = String(defaults.recipientEmail ?? '')
    setAdminMode(mode)
    setAdminCustomer(row)
    setAdminRecipientName(mode === 'assign' ? recipientName : '')
    setAdminRecipientEmail(mode === 'assign' ? recipientEmail : '')
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
    setAdminDialogOpen(true)
  }, [])

  const closeAdminDialog = useCallback(() => {
    setAdminDialogOpen(false)
    setAdminCustomer(null)
    setAdminRecipientName('')
    setAdminRecipientEmail('')
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
  }, [])

  const handleAdminMutation = useCallback(async () => {
    if (!adminCustomer) return
    const customerId = getCustomerId(adminCustomer)
    if (!customerId) return

    if (adminMode === 'assign') {
      if (!adminRecipientName.trim()) {
        setAdminError('Full name is required.')
        return
      }
      if (!adminRecipientEmail.trim()) {
        setAdminError('Email is required.')
        return
      }
      if (!EMAIL_REGEX.test(adminRecipientEmail.trim())) {
        setAdminError('Please enter a valid email address.')
        return
      }
    } else {
      if (!adminUserId.trim()) {
        setAdminError('Existing User ID is required.')
        return
      }
      if (!adminReason.trim()) {
        setAdminError('Reason is required.')
        return
      }
      if (!adminStepUpToken) {
        setAdminError('Step-up verification is required.')
        return
      }
    }

    try {
      if (adminMode === 'assign') {
        const result = await createCustomerAdminInvitation({
          customerId,
          recipientName: adminRecipientName.trim(),
          recipientEmail: adminRecipientEmail.trim(),
        }).unwrap()

        const outcome = result?.outcome ?? result?.data?.outcome
        if (outcome === 'send_failed') {
          addToast({
            title: 'Invitation created',
            description:
              'Invitation was created, but email delivery failed. Check Invitation Management for status.',
            variant: 'warning',
          })
        } else if (outcome === 'linked_existing') {
          addToast({
            title: 'Existing invitation linked',
            description: `An active invitation is already available for ${adminCustomer.name}.`,
            variant: 'success',
          })
        } else {
          addToast({
            title: 'Invitation created',
            description: `Invitation sent for ${adminCustomer.name}.`,
            variant: 'success',
          })
        }

        const authLink = result?.authLink ?? result?.data?.authLink
        if (authLink) {
          onAuthLink?.(authLink, true)
        } else {
          onAssignAdminSuccess?.()
        }
      } else {
        await replaceCustomerAdmin({
          customerId,
          newUserId: adminUserId.trim(),
          reason: adminReason.trim(),
          stepUpToken: adminStepUpToken,
        }).unwrap()
        addToast({
          title: 'Customer admin replaced',
          description: `Canonical admin updated for ${adminCustomer.name}.`,
          variant: 'success',
        })
      }
      closeAdminDialog()
    } catch (err) {
      const appError = normalizeError(err)
      if (adminMode === 'replace' && isCanonicalAdminConflictError(appError)) {
        setAdminError(
          getCanonicalAdminConflictMessage(
            appError,
            'update_roles',
          ),
        )
        return
      }

      if (adminMode === 'assign') {
        setAdminError(getAssignAdminErrorMessage(appError))
        return
      }

      setAdminError(getReplaceAdminErrorMessage(appError))
    }
  }, [
    addToast,
    adminCustomer,
    adminMode,
    adminRecipientEmail,
    adminRecipientName,
    adminReason,
    adminStepUpToken,
    adminUserId,
    closeAdminDialog,
    createCustomerAdminInvitation,
    onAssignAdminSuccess,
    onAuthLink,
    replaceCustomerAdmin,
  ])

  const adminMutationLoading =
    createAdminInvitationResult.isLoading || replaceAdminResult.isLoading

  return {
    adminDialogOpen,
    adminMode,
    adminCustomer,
    adminRecipientName,
    setAdminRecipientName,
    adminRecipientEmail,
    setAdminRecipientEmail,
    adminUserId,
    setAdminUserId,
    adminReason,
    setAdminReason,
    adminStepUpToken,
    setAdminStepUpToken,
    adminError,
    setAdminError,
    adminMutationLoading,
    openAdminDialog,
    closeAdminDialog,
    handleAdminMutation,
  }
}
