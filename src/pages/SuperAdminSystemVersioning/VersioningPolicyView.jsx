import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { Fieldset } from '../../components/Fieldset'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { formatDateTime } from '../../utils/dateTime.js'
import './VersioningPolicyView.css'

export function VersioningPolicyView({
  activePolicy,
  isActivePolicyLoading,
  activePolicyAppError,
  noActivePolicy,
  createForm,
  setCreateForm,
  createErrors,
  setCreateErrors,
  setCreateStepUpToken,
  handleCreatePolicy,
  createPolicyResult,
}) {
  return (
    <div className="super-admin-system-versioning__grid">
      <Fieldset className="super-admin-system-versioning__fieldset super-admin-system-versioning__fieldset--active">
        <Fieldset.Legend className="super-admin-system-versioning__legend">
          <h2 className="super-admin-system-versioning__section-title">
            Active Policy
          </h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="super-admin-system-versioning__card">
          <Card.Body>
            {isActivePolicyLoading ? (
              <p className="super-admin-system-versioning__muted">Loading active policy...</p>
            ) : noActivePolicy ? (
              <p className="super-admin-system-versioning__muted">
                No active policy found. Create a policy to initialize governance rules.
              </p>
            ) : activePolicyAppError ? (
              <p className="super-admin-system-versioning__error" role="alert">
                {activePolicyAppError.message}
              </p>
            ) : activePolicy ? (
              <dl className="super-admin-system-versioning__active-policy">
                <div>
                  <dt>Name</dt>
                  <dd>{activePolicy.name ?? '--'}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{activePolicy.version ?? '--'}</dd>
                </div>
                <div>
                  <dt>Activated</dt>
                  <dd>{formatDateTime(activePolicy.activatedAt)}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{activePolicy.description || '--'}</dd>
                </div>
              </dl>
            ) : (
              <p className="super-admin-system-versioning__muted">
                No active policy data available.
              </p>
            )}
          </Card.Body>
        </Card>
      </Fieldset>

      <Fieldset className="super-admin-system-versioning__fieldset super-admin-system-versioning__fieldset--form">
        <Fieldset.Legend className="super-admin-system-versioning__legend">
          <h2 className="super-admin-system-versioning__section-title">
            Create New Policy Version
          </h2>
        </Fieldset.Legend>
        <Card variant="elevated" className="super-admin-system-versioning__card">
          <Card.Body>
            <form
              className="super-admin-system-versioning__form"
              onSubmit={handleCreatePolicy}
              noValidate
            >
              <Input
                id="policy-name"
                label="Policy Name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                error={createErrors.name}
                required
                fullWidth
              />
              <Textarea
                id="policy-description"
                label="Description (Optional)"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                fullWidth
              />
              <Textarea
                id="policy-rules"
                label="Rules JSON"
                value={createForm.rules}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, rules: event.target.value }))
                }
                error={createErrors.rules}
                rows={8}
                required
                fullWidth
              />
              <Textarea
                id="policy-reason"
                label="Change Reason"
                value={createForm.reason}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, reason: event.target.value }))
                }
                error={createErrors.reason}
                rows={3}
                required
                fullWidth
              />

              {createErrors.stepUp ? (
                <p className="super-admin-system-versioning__error" role="alert">
                  {createErrors.stepUp}
                </p>
              ) : null}

              <StepUpAuthForm
                onStepUpComplete={(token) => {
                  setCreateStepUpToken(token)
                  setCreateErrors((current) => {
                    const next = { ...current }
                    delete next.stepUp
                    return next
                  })
                }}
              />

              <div className="super-admin-system-versioning__form-actions">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={createPolicyResult.isLoading}
                  disabled={createPolicyResult.isLoading}
                >
                  Create Policy Version
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </Fieldset>
    </div>
  )
}
