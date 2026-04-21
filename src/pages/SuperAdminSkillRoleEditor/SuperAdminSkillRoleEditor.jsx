import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import {
  useCreateSkillRoleMutation,
  useGetSkillRoleQuery,
  useUpdateSkillRoleMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  SKILL_ROLE_REGISTRY_STATUSES,
} from '../SuperAdminSkillRoleRegistry/superAdminSkillRoleRegistry.constants.js'
import '../SuperAdminSkillRoleRegistry/SkillRoleRegistryListView.css'
import './SuperAdminSkillRoleEditor.css'

const ROLE_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/

const INITIAL_SKILL_ROLE_FORM = Object.freeze({
  roleKey: '',
  label: '',
  description: '',
  status: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
  isSystem: false,
})

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
}

const validateSkillRoleForm = (form) => {
  const errors = {}

  const roleKey = String(form.roleKey ?? '').trim()
  if (!roleKey) {
    errors.roleKey = 'Role key is required.'
  } else if (!ROLE_KEY_REGEX.test(roleKey.toUpperCase())) {
    errors.roleKey = 'Role key must use uppercase letters, numbers, or underscores.'
  }

  if (!String(form.label ?? '').trim()) {
    errors.label = 'Label is required.'
  }

  if (!String(form.description ?? '').trim()) {
    errors.description = 'Description is required.'
  }

  if (!String(form.status ?? '').trim()) {
    errors.status = 'Status is required.'
  }

  return errors
}

function SkillRoleEditorLoadingState({ isEditMode }) {
  return (
    <Card variant="elevated" className="super-admin-skill-role-registry__card">
      <Card.Body className="super-admin-skill-role-editor__card-body super-admin-skill-role-editor__card-body--compact">
        <Spinner size="lg" />
        <p className="super-admin-skill-role-editor__helper">
          {isEditMode ? 'Loading skill role details...' : 'Preparing editor...'}
        </p>
      </Card.Body>
    </Card>
  )
}

function SuperAdminSkillRoleEditor() {
  const navigate = useNavigate()
  const { roleId = '' } = useParams()
  const { addToast } = useToaster()
  const isEditMode = Boolean(roleId)

  const [form, setForm] = useState(INITIAL_SKILL_ROLE_FORM)
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null) // 'client' | 'server' | null
  const [pendingDeprecationWarning, setPendingDeprecationWarning] = useState(false)

  const {
    data: roleResponse,
    isLoading: isRoleLoading,
    error: roleError,
  } = useGetSkillRoleQuery(roleId, { skip: !isEditMode })

  const loadedRole = roleResponse?.data ?? null
  const roleAppError = roleError ? normalizeError(roleError) : null

  const [createSkillRole, { isLoading: isCreating }] = useCreateSkillRoleMutation()
  const [updateSkillRole, { isLoading: isUpdating }] = useUpdateSkillRoleMutation()

  const liveErrors = useMemo(() => validateSkillRoleForm(form), [form])
  const isSaving = isCreating || isUpdating
  const roleUsageCount = Number(loadedRole?.usageCount) || 0

  useEffect(() => {
    if (!isEditMode) return
    if (!loadedRole) return

    setForm((current) => {
      const next = {
        roleKey: loadedRole.roleKey ?? '',
        label: loadedRole.label ?? '',
        description: loadedRole.description ?? '',
        status: loadedRole.status ?? SKILL_ROLE_REGISTRY_STATUSES.ACTIVE,
        isSystem: Boolean(loadedRole.isSystem),
      }

      return shallowEqualObject(current, next) ? current : next
    })
  }, [isEditMode, loadedRole])

  const submitSkillRole = useCallback(async ({ bypassDeprecationWarning = false } = {}) => {
    const clientErrors = validateSkillRoleForm(form)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setErrorsSource('client')
      return
    }

    const nextStatus = String(form.status || '').trim().toUpperCase()
    const currentStatus = String(loadedRole?.status || '').trim().toUpperCase()
    const shouldWarnOnDeprecation = isEditMode
      && nextStatus === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
      && currentStatus !== SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
      && roleUsageCount > 0
      && !bypassDeprecationWarning

    if (shouldWarnOnDeprecation) {
      setPendingDeprecationWarning(true)
      return
    }

    try {
      if (isEditMode) {
        const res = await updateSkillRole({
          roleId,
          label: form.label.trim(),
          description: form.description.trim(),
          status: nextStatus,
        }).unwrap()

        addToast({
          variant: 'success',
          title: 'Saved',
          description: `Updated ${res?.data?.roleKey ?? 'skill role'}.`,
        })
      } else {
        const res = await createSkillRole({
          roleKey: form.roleKey.trim().toUpperCase(),
          label: form.label.trim(),
          description: form.description.trim(),
          status: nextStatus,
        }).unwrap()

        addToast({
          variant: 'success',
          title: 'Role created',
          description: `${res?.data?.roleKey ?? 'Skill role'} is now available in the Skill Role Registry.`,
        })

        setForm(INITIAL_SKILL_ROLE_FORM)
        requestAnimationFrame(() => {
          const el = document.getElementById('skill-role-editor-role-key')
          if (el && typeof el.focus === 'function') {
            el.focus()
          }
        })
      }

      setPendingDeprecationWarning(false)
      setErrors({})
      setErrorsSource(null)
    } catch (err) {
      const appErr = normalizeError(err)
      const details = appErr?.details
      if (details && typeof details === 'object') {
        setErrors(details)
        setErrorsSource('server')
      } else {
        addToast({ variant: 'error', title: 'Save failed', description: appErr.message })
      }
    }
  }, [
    addToast,
    createSkillRole,
    form,
    isEditMode,
    loadedRole?.status,
    roleId,
    roleUsageCount,
    updateSkillRole,
  ])

  const handleBack = useCallback(() => {
    navigate('/super-admin/runtime-control/skill-roles')
  }, [navigate])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    await submitSkillRole()
  }, [submitSkillRole])

  const closeDeprecationWarning = useCallback(() => {
    setPendingDeprecationWarning(false)
  }, [])

  const confirmDeprecationWarning = useCallback(async () => {
    await submitSkillRole({ bypassDeprecationWarning: true })
  }, [submitSkillRole])

  const canSave = Object.keys(liveErrors).length === 0 && !isSaving
  const roleKeyIsRequired = !isEditMode
  const statusIsRequired = true

  return (
    <section className="super-admin-skill-role-registry container" aria-label="Skill role editor">
      <header className="super-admin-skill-role-registry__header">
        <h1 className="super-admin-skill-role-registry__title">{isEditMode ? 'Edit Skill Role' : 'Create Skill Role'}</h1>
        <p className="super-admin-skill-role-registry__subtitle">
          Skill Roles classify execution responsibility and are referenced by Skills.
        </p>
      </header>

      <Fieldset className="super-admin-skill-role-registry__fieldset">
        <Fieldset.Legend className="sr-only">Skill role editor</Fieldset.Legend>
        {isEditMode && isRoleLoading ? <SkillRoleEditorLoadingState isEditMode /> : null}

        {isEditMode && roleAppError ? (
          <Card variant="elevated" className="super-admin-skill-role-registry__card">
            <Card.Body className="super-admin-skill-role-editor__card-body super-admin-skill-role-editor__card-body--compact">
              <p className="super-admin-skill-role-editor__error" role="alert">
                {roleAppError.message}
              </p>
              <div className="super-admin-skill-role-editor__top-actions">
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
              </div>
            </Card.Body>
          </Card>
        ) : null}

        {!isEditMode || (!isRoleLoading && !roleAppError) ? (
          <Card variant="elevated" className="super-admin-skill-role-registry__card">
            <Card.Body className="super-admin-skill-role-editor__card-body super-admin-skill-role-editor__card-body--compact">
              <div className="super-admin-skill-role-editor__top-actions">
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
              </div>

              {isEditMode ? (
                <div className="super-admin-skill-role-editor__summary" aria-label="Skill role summary">
                  <div className="super-admin-skill-role-editor__summary-item">
                    <span className="super-admin-skill-role-editor__summary-label">Skills Using</span>
                    <strong>{roleUsageCount}</strong>
                  </div>
                  <div className="super-admin-skill-role-editor__summary-item">
                    <span className="super-admin-skill-role-editor__summary-label">Role Type</span>
                    {loadedRole?.isSystem ? (
                      <Badge variant="info" size="sm" pill>
                        SYSTEM
                      </Badge>
                    ) : (
                      <span>Custom</span>
                    )}
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} aria-label="Skill role form">
                <div className="super-admin-skill-role-editor__row">
                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-role-key">
                      Role Key{roleKeyIsRequired ? <span className="input-label__required"> *</span> : null}
                    </label>
                    <Input
                      id="skill-role-editor-role-key"
                      value={form.roleKey}
                      onChange={(event) => setForm((current) => ({ ...current, roleKey: event.target.value }))}
                      error={errors.roleKey}
                      helperText={isEditMode ? 'Role key is immutable after creation.' : 'Uppercase token, e.g. VALIDATOR.'}
                      disabled={isEditMode}
                      required={roleKeyIsRequired}
                      fullWidth
                    />
                  </div>

                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-status">
                      Status{statusIsRequired ? <span className="input-label__required"> *</span> : null}
                    </label>
                    <Select
                      id="skill-role-editor-status"
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                      options={[
                        { value: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE, label: 'ACTIVE' },
                        { value: SKILL_ROLE_REGISTRY_STATUSES.INACTIVE, label: 'INACTIVE' },
                        { value: SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED, label: 'DEPRECATED' },
                      ]}
                      error={errors.status}
                      helperText={
                        roleUsageCount > 0 && form.status === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
                          ? `Used by ${roleUsageCount} skill${roleUsageCount === 1 ? '' : 's'}.`
                          : undefined
                      }
                      required={statusIsRequired}
                    />
                  </div>
                </div>

                <div className="super-admin-skill-role-editor__field">
                  <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-label">
                    Label<span className="input-label__required"> *</span>
                  </label>
                  <Input
                    id="skill-role-editor-label"
                    value={form.label}
                    onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                    error={errors.label}
                    required
                    fullWidth
                  />
                </div>

                <div className="super-admin-skill-role-editor__field">
                  <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-description">
                    Description<span className="input-label__required"> *</span>
                  </label>
                  <Textarea
                    id="skill-role-editor-description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    error={errors.description}
                    required
                    rows={4}
                    fullWidth
                  />
                </div>

                {errorsSource === 'server' && Object.keys(errors).length > 0 ? (
                  <p className="super-admin-skill-role-editor__error" role="alert">
                    Review the highlighted fields and try again.
                  </p>
                ) : null}

                <div className="super-admin-skill-role-editor__footer-actions">
                  <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSaving} disabled={!canSave}>
                    {isEditMode ? 'Save Changes' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        ) : null}
      </Fieldset>

      <Dialog open={pendingDeprecationWarning} onClose={closeDeprecationWarning} size="sm">
        <Dialog.Header>
          <h2>Deprecate skill role?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            {loadedRole?.roleKey ?? 'This skill role'} is used by {roleUsageCount} skill{roleUsageCount === 1 ? '' : 's'}.
            Deprecating it will not remove those existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeDeprecationWarning} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeprecationWarning} loading={isSaving}>
            Deprecate Role
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminSkillRoleEditor
