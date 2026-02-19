/**
 * StepUpAuthForm
 *
 * Re-verifies the current password and issues a short-lived step-up token.
 * Uses role="group" with onKeyDown instead of <form> to avoid nested form issues
 * when embedded inside another <form> element (e.g. create policy form).
 */

import { useCallback, useId, useState } from 'react'
import { Input } from '../Input'
import { Button } from '../Button'
import { useToaster } from '../Toaster'
import { useRequestStepUpMutation } from '../../store/api/authApi.js'
import { normalizeError } from '../../utils/errors.js'
import './StepUpAuthForm.css'

function StepUpAuthForm({
  onStepUpComplete,
  onCancel,
  onError,
  submitLabel = 'Verify Identity',
  className = '',
}) {
  const { addToast } = useToaster()
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [verified, setVerified] = useState(false)
  const [requestStepUp, requestStepUpResult] = useRequestStepUpMutation()
  const inputId = useId()

  const handleSubmit = useCallback(
    async () => {
      if (verified) return

      setFieldError('')
      setSuccessMessage('')

      if (!password.trim()) {
        setFieldError('Password is required to continue.')
        return
      }

      try {
        const response = await requestStepUp({ password }).unwrap()
        const payload = response?.data ?? response
        const stepUpToken = payload?.stepUpToken
        const expiresIn = payload?.expiresIn

        if (!stepUpToken) {
          throw new Error('Step-up token missing in response.')
        }

        setVerified(true)
        onStepUpComplete?.(stepUpToken, expiresIn)
        setPassword('')
        setSuccessMessage(
          expiresIn
            ? `Verification complete. Token valid for ${expiresIn} seconds.`
            : 'Verification complete.',
        )
      } catch (err) {
        const appError = normalizeError(err)
        setFieldError(appError.message)
        onError?.(appError)
        addToast({
          title: 'Step-up verification failed',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [password, verified, requestStepUp, onStepUpComplete, onError, addToast],
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const isDisabled = verified || requestStepUpResult.isLoading
  const classes = ['step-up-auth-form', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="group" aria-label="Step-up authentication" onKeyDown={handleKeyDown}>
      <Input
        id={inputId}
        type="password"
        label="Re-enter Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
        fullWidth
        error={fieldError}
        disabled={verified}
      />

      {successMessage ? (
        <p className="step-up-auth-form__success" role="status" aria-live="polite">
          {successMessage}
        </p>
      ) : null}

      <div className="step-up-auth-form__actions">
        <Button
          type="button"
          onClick={handleSubmit}
          loading={requestStepUpResult.isLoading}
          disabled={isDisabled}
        >
          {verified ? 'Verified' : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={requestStepUpResult.isLoading}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { StepUpAuthForm }
export default StepUpAuthForm
