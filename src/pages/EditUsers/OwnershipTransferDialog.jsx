import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import { useReplaceCustomerAdminMutation } from '../../store/api/customerApi.js'
import {
  appendRequestReference,
  getStepUpErrorSignal,
  normalizeError,
} from '../../utils/errors.js'
import './OwnershipTransferDialog.css'

const OWNERSHIP_TRANSFER_STEP_UP_REQUIRED_MESSAGE =
  'Step-up verification is required. Verify your current password, then retry Transfer Ownership.'
const OWNERSHIP_TRANSFER_STEP_UP_INVALID_MESSAGE =
  'Step-up verification has expired. Verify your current password again, then retry Transfer Ownership.'
const OWNERSHIP_TRANSFER_STEP_UP_UNAVAILABLE_MESSAGE =
  'Step-up verification is temporarily unavailable. Wait a moment, verify again, then retry Transfer Ownership.'

const OWNERSHIP_TRANSFER_REASON_MESSAGES = {
  INACTIVE_TARGET_USER:
    'Only active users can receive customer ownership. Reactivate this user or choose another replacement.',
  NO_CANONICAL_ADMIN:
    'No Canonical Admin is currently available to transfer. Refresh the page and retry.',
  CANONICAL_ADMIN_REFERENCE_INVALID:
    'The current Canonical Admin reference is out of sync. Refresh the page and retry.',
  CANONICAL_ADMIN_ROLE_MISSING:
    'The current Canonical Admin no longer has the required Customer Admin role. Refresh the page and retry.',
  REPLACEMENT_ROLLED_BACK:
    'Ownership transfer could not be completed and was rolled back. Retry the transfer or contact support.',
}

const OWNERSHIP_TRANSFER_HELP_TEXT =
  'Use Transfer Ownership only after the replacement user already has an active account. This workflow updates canonical ownership directly and replaces generic Customer Admin role toggles.'

const getTransferPayload = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const getTransferRequestId = (result) =>
  result?.meta?.requestId ??
  result?.requestId ??
  result?.data?.meta?.requestId ??
  result?.data?.requestId ??
  undefined

const getTransferErrorMessage = (appError) => {
  const stepUpSignal = getStepUpErrorSignal(appError)
  if (stepUpSignal === 'required') {
    return appendRequestReference(
      OWNERSHIP_TRANSFER_STEP_UP_REQUIRED_MESSAGE,
      appError?.requestId,
    )
  }
  if (stepUpSignal === 'invalid') {
    return appendRequestReference(
      OWNERSHIP_TRANSFER_STEP_UP_INVALID_MESSAGE,
      appError?.requestId,
    )
  }
  if (stepUpSignal === 'unavailable') {
    return appendRequestReference(
      OWNERSHIP_TRANSFER_STEP_UP_UNAVAILABLE_MESSAGE,
      appError?.requestId,
    )
  }

  const reason = String(appError?.details?.reason ?? '').trim().toUpperCase()
  if (reason && OWNERSHIP_TRANSFER_REASON_MESSAGES[reason]) {
    return appendRequestReference(
      OWNERSHIP_TRANSFER_REASON_MESSAGES[reason],
      appError?.requestId,
    )
  }

  return appError?.message || 'Ownership transfer failed. Please try again.'
}

function OwnershipTransferDialog({
  open,
  onClose,
  customerId,
  currentCanonicalUser,
  targetUser,
}) {
  const { addToast } = useToaster()
  const [replaceCustomerAdmin, replaceCustomerAdminResult] = useReplaceCustomerAdminMutation()
  const [reason, setReason] = useState('')
  const [stepUpToken, setStepUpToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [dialogError, setDialogError] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('')
    setStepUpToken('')
    setFieldErrors({})
    setDialogError('')
  }, [open, targetUser?._id])

  const currentOwnerLabel = useMemo(
    () => currentCanonicalUser?.name || currentCanonicalUser?.email || currentCanonicalUser?._id || '--',
    [currentCanonicalUser],
  )

  const targetUserLabel = useMemo(
    () => targetUser?.name || targetUser?.email || targetUser?._id || '--',
    [targetUser],
  )

  const handleClose = useCallback(() => {
    setReason('')
    setStepUpToken('')
    setFieldErrors({})
    setDialogError('')
    onClose?.()
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    const nextErrors = {}

    if (!targetUser?._id) {
      nextErrors.target = 'Choose an active replacement user before continuing.'
    }
    if (!reason.trim()) {
      nextErrors.reason = 'Reason is required.'
    }
    if (!stepUpToken) {
      nextErrors.stepUp = 'Step-up verification is required before transferring ownership.'
    }

    setFieldErrors(nextErrors)
    setDialogError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      const result = await replaceCustomerAdmin({
        customerId,
        newUserId: targetUser._id,
        reason: reason.trim(),
        stepUpToken,
      }).unwrap()

      const payload = getTransferPayload(result)
      const requestId = getTransferRequestId(result)
      const successMessage = payload?.message || `Canonical ownership moved to ${targetUserLabel}.`

      addToast({
        title: 'Ownership transferred',
        description: appendRequestReference(successMessage, requestId),
        variant: 'success',
      })

      handleClose()
    } catch (err) {
      const appError = normalizeError(err)
      const resolvedMessage = getTransferErrorMessage(appError)
      setDialogError(resolvedMessage)
      addToast({
        title: 'Ownership transfer failed',
        description: resolvedMessage,
        variant: 'warning',
      })
    }
  }, [
    addToast,
    customerId,
    handleClose,
    reason,
    replaceCustomerAdmin,
    stepUpToken,
    targetUser,
    targetUserLabel,
  ])

  if (!open || !targetUser) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="lg"
      className="ownership-transfer-dialog"
      closeOnBackdropClick={!replaceCustomerAdminResult.isLoading}
      closeOnEscape={!replaceCustomerAdminResult.isLoading}
    >
      <Dialog.Header>
        <h2 className="ownership-transfer-dialog__title">Transfer Customer Admin Ownership</h2>
      </Dialog.Header>

      <Dialog.Body className="ownership-transfer-dialog__body">
        <p className="ownership-transfer-dialog__subtitle">
          Move canonical ownership from <strong>{currentOwnerLabel}</strong> to{' '}
          <strong>{targetUserLabel}</strong>. This governed flow replaces generic Customer Admin
          role edits.
        </p>

        <div className="ownership-transfer-dialog__summary" role="list" aria-label="Ownership transfer summary">
          <div className="ownership-transfer-dialog__summary-card" role="listitem">
            <p className="ownership-transfer-dialog__summary-label">Current Canonical Admin</p>
            <p className="ownership-transfer-dialog__summary-value">{currentOwnerLabel}</p>
            <p className="ownership-transfer-dialog__summary-meta">
              {currentCanonicalUser?.email || currentCanonicalUser?._id || '--'}
            </p>
          </div>

          <div className="ownership-transfer-dialog__summary-card" role="listitem">
            <p className="ownership-transfer-dialog__summary-label">Replacement User</p>
            <p className="ownership-transfer-dialog__summary-value">{targetUserLabel}</p>
            <p className="ownership-transfer-dialog__summary-meta">
              {targetUser?.email || targetUser?._id || '--'}
            </p>
          </div>
        </div>

        <p className="ownership-transfer-dialog__help" role="note">
          {OWNERSHIP_TRANSFER_HELP_TEXT}
        </p>

        {fieldErrors.target ? (
          <p className="ownership-transfer-dialog__error" role="alert">
            {fieldErrors.target}
          </p>
        ) : null}

        <Textarea
          id="ownership-transfer-reason"
          label="Reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setFieldErrors((prev) => ({ ...prev, reason: '', stepUp: '' }))
            setDialogError('')
          }}
          error={fieldErrors.reason}
          helperText="Explain why ownership is moving. This is required for support and audit correlation."
          rows={3}
          fullWidth
        />

        <div className="ownership-transfer-dialog__step-up">
          <StepUpAuthForm
            passwordLabel="Current Password"
            passwordHelperText="Enter your current password to verify this ownership transfer."
            onStepUpComplete={(token) => {
              setStepUpToken(token)
              setFieldErrors((prev) => ({ ...prev, stepUp: '' }))
              setDialogError('')
            }}
            onError={() => setStepUpToken('')}
          />
          {fieldErrors.stepUp ? (
            <p className="ownership-transfer-dialog__error" role="alert">
              {fieldErrors.stepUp}
            </p>
          ) : null}
        </div>

        {dialogError ? (
          <p className="ownership-transfer-dialog__error" role="alert">
            {dialogError}
          </p>
        ) : null}
      </Dialog.Body>

      <Dialog.Footer className="ownership-transfer-dialog__footer">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={replaceCustomerAdminResult.isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={replaceCustomerAdminResult.isLoading}
          disabled={replaceCustomerAdminResult.isLoading || !stepUpToken}
        >
          Transfer Ownership
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

export default OwnershipTransferDialog
