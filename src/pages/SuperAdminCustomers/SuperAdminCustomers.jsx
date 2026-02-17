/**
 * Super Admin Customers Page
 *
 * Customer onboarding invitation surface for SUPER_ADMIN users.
 * Captures invitation requests while delivery/auth integration is pending.
 */

import { useCallback, useMemo, useState } from 'react'
import { MdMarkEmailUnread } from 'react-icons/md'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Fieldset } from '../../components/Fieldset'
import { useToaster } from '../../components/Toaster'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import './SuperAdminCustomers.css'

const INITIAL_FORM = {
  fullName: '',
  companyName: '',
  email: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SuperAdminCustomers() {
  const { addToast } = useToaster()
  const { user } = useAuthorization()

  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastRequest, setLastRequest] = useState(null)

  const requestedBy = user?.name?.trim() || 'Super Admin'

  const clearForm = useCallback(() => {
    setFormValues(INITIAL_FORM)
    setFieldErrors({})
  }, [])

  const validate = useCallback(() => {
    const errors = {}

    if (!formValues.fullName.trim()) {
      errors.fullName = 'Full name is required.'
    }

    if (!formValues.companyName.trim()) {
      errors.companyName = 'Company name is required.'
    }

    if (!formValues.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(formValues.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    return errors
  }, [formValues])

  const handleFieldChange = useCallback((field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      setFieldErrors({})

      const errors = validate()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      const payload = {
        fullName: formValues.fullName.trim(),
        companyName: formValues.companyName.trim(),
        email: formValues.email.trim().toLowerCase(),
        requestedBy,
      }

      setLastRequest(payload)
      clearForm()
      addToast({
        title: 'Invitation request recorded',
        description:
          'Customer authentication URL and email delivery will be connected in a later release.',
        variant: 'success',
      })
    },
    [addToast, clearForm, formValues, requestedBy, validate],
  )

  const invitationFlow = useMemo(
    () => [
      'Super admin submits customer contact details.',
      'Platform generates a secure invitation URL.',
      'Customer receives the invitation email and completes authentication.',
    ],
    [],
  )

  return (
    <section
      className="super-admin-customers container"
      aria-label="Super admin customer invitations"
    >
      <header className="super-admin-customers__header">
        <h1 className="super-admin-customers__title">Customer Invitations</h1>
        <p className="super-admin-customers__subtitle">
          Invite new customer administrators into the platform onboarding flow.
        </p>
      </header>

      <div className="super-admin-customers__grid">
        <Fieldset className="super-admin-customers__form-fieldset">
          <Fieldset.Legend className="super-admin-customers__form-legend">
            <h2 className="super-admin-customers__form-title">
              Invite New Customer
            </h2>
          </Fieldset.Legend>
          <Card
            variant="elevated"
            className="super-admin-customers__section super-admin-customers__section--form"
          >
            <Card.Header>
              <p className="super-admin-customers__form-subtitle">
                Capture minimum onboarding details for invitation delivery.
              </p>
            </Card.Header>
            <Card.Body>
              <form
                className="super-admin-customers__form"
                onSubmit={handleSubmit}
                noValidate
              >
                <Input
                  id="super-admin-customer-full-name"
                  label="Full Name"
                  value={formValues.fullName}
                  onChange={(event) =>
                    handleFieldChange('fullName', event.target.value)
                  }
                  error={fieldErrors.fullName}
                  autoComplete="name"
                  required
                  fullWidth
                />

                <Input
                  id="super-admin-customer-company-name"
                  label="Company Name"
                  value={formValues.companyName}
                  onChange={(event) =>
                    handleFieldChange('companyName', event.target.value)
                  }
                  error={fieldErrors.companyName}
                  autoComplete="organization"
                  required
                  fullWidth
                />

                <Input
                  id="super-admin-customer-email"
                  type="email"
                  label="Email Address"
                  value={formValues.email}
                  onChange={(event) =>
                    handleFieldChange('email', event.target.value)
                  }
                  error={fieldErrors.email}
                  autoComplete="email"
                  required
                  fullWidth
                />

                <div className="super-admin-customers__actions">
                  <Button type="submit" leftIcon={<MdMarkEmailUnread />}>
                    Send Invitation
                  </Button>
                  <Button type="button" variant="outline" onClick={clearForm}>
                    Clear Form
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        </Fieldset>

        <Card
          variant="elevated"
          className="super-admin-customers__section super-admin-customers__section--status"
        >
          <Card.Header>
            <h2 className="super-admin-customers__section-title">
              Workflow Status
            </h2>
            <p className="super-admin-customers__section-subtitle">
              Invitation URL generation and email delivery are staged for a
              follow-up implementation.
            </p>
          </Card.Header>
          <Card.Body>
            <div className="super-admin-customers__status-row">
              <Status variant="warning" size="sm" showIcon>
                Integration Pending
              </Status>
            </div>

            <ol className="super-admin-customers__flow">
              {invitationFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            {lastRequest && (
              <div
                className="super-admin-customers__last-request"
                role="status"
                aria-live="polite"
              >
                <h3 className="super-admin-customers__last-request-title">
                  Latest Request
                </h3>
                <dl className="super-admin-customers__request-list">
                  <div className="super-admin-customers__request-item">
                    <dt>Full Name</dt>
                    <dd>{lastRequest.fullName}</dd>
                  </div>
                  <div className="super-admin-customers__request-item">
                    <dt>Company</dt>
                    <dd>{lastRequest.companyName}</dd>
                  </div>
                  <div className="super-admin-customers__request-item">
                    <dt>Email</dt>
                    <dd>{lastRequest.email}</dd>
                  </div>
                  <div className="super-admin-customers__request-item">
                    <dt>Requested By</dt>
                    <dd>{lastRequest.requestedBy}</dd>
                  </div>
                </dl>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </section>
  )
}

export default SuperAdminCustomers
