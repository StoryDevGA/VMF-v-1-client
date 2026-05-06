import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  useCloneSkillRoleMutation,
  useGetSkillRoleQuery,
  useLazyGetSkillRoleDependenciesQuery,
  useUpdateSkillRoleMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  SKILL_ROLE_REGISTRY_FORM_ERROR_FIELDS,
  SKILL_ROLE_REGISTRY_CATEGORIES,
  SKILL_ROLE_REGISTRY_OPERATIONS,
  SKILL_ROLE_REGISTRY_STATUSES,
  validateSkillRoleRegistryForm,
} from '../SuperAdminSkillRoleRegistry/superAdminSkillRoleRegistry.constants.js'
import '../SuperAdminSkillRoleRegistry/SkillRoleRegistryListView.css'
import './SuperAdminSkillRoleEditor.css'

const INITIAL_SKILL_ROLE_FORM = Object.freeze({
  roleKey: '',
  label: '',
  description: '',
  status: SKILL_ROLE_REGISTRY_STATUSES.DRAFT,
  category: SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE,
  allowedOperations: [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
  allowedReadScopes: [],
  allowedWriteScopes: [],
  isSystem: false,
})

const STATUS_OPTIONS = Object.freeze([
  { value: SKILL_ROLE_REGISTRY_STATUSES.DRAFT, label: 'DRAFT' },
  { value: SKILL_ROLE_REGISTRY_STATUSES.ACTIVE, label: 'ACTIVE' },
  { value: SKILL_ROLE_REGISTRY_STATUSES.INACTIVE, label: 'INACTIVE' },
  { value: SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED, label: 'DEPRECATED' },
])

const CATEGORY_OPTIONS = Object.freeze(
  Object.values(SKILL_ROLE_REGISTRY_CATEGORIES).map((value) => ({ value, label: value })),
)

const parseListText = (value) => [
  ...new Set(String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)),
]

const formatListText = (values) => (Array.isArray(values) ? values.join('\n') : '')

const shallowEqualObject = (left, right) => {
  if (left === right) return true
  if (!left || !right) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
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
  const [searchParams] = useSearchParams()
  const cloneFrom = searchParams.get('cloneFrom') || ''
  const { addToast } = useToaster()
  const isEditMode = Boolean(roleId)
  const isCloneMode = !isEditMode && Boolean(cloneFrom)

  const [form, setForm] = useState(INITIAL_SKILL_ROLE_FORM)
  const [errors, setErrors] = useState({})
  const [errorsSource, setErrorsSource] = useState(null) // 'client' | 'server' | null
  const [pendingStatusWarning, setPendingStatusWarning] = useState(null) // { nextStatus, summary } | null

  const {
    data: roleResponse,
    isLoading: isRoleLoading,
    error: roleError,
  } = useGetSkillRoleQuery(roleId, { skip: !isEditMode })
  const {
    data: cloneSourceResponse,
    isLoading: isCloneSourceLoading,
    error: cloneSourceError,
  } = useGetSkillRoleQuery(cloneFrom, { skip: !isCloneMode })

  const loadedRole = roleResponse?.data ?? null
  const cloneSourceRole = cloneSourceResponse?.data ?? null
  const roleAppError = roleError || cloneSourceError ? normalizeError(roleError || cloneSourceError) : null

  const [createSkillRole, { isLoading: isCreating }] = useCreateSkillRoleMutation()
  const [cloneSkillRole, { isLoading: isCloning }] = useCloneSkillRoleMutation()
  const [updateSkillRole, { isLoading: isUpdating }] = useUpdateSkillRoleMutation()
  const [fetchSkillRoleDependencies] = useLazyGetSkillRoleDependenciesQuery()

  const liveErrors = useMemo(() => validateSkillRoleRegistryForm(form), [form])
  const isSaving = isCreating || isUpdating || isCloning
  const roleUsageCount = Number(loadedRole?.usageCount) || 0
  const isLoadingRole = isRoleLoading || isCloneSourceLoading
  const formSourceRole = isCloneMode ? cloneSourceRole : loadedRole
  const isLocked = isEditMode && Boolean(loadedRole?.isLocked)

  useEffect(() => {
    if (!isEditMode && !isCloneMode) return undefined
    if (!formSourceRole) return undefined

    const timeoutId = window.setTimeout(() => {
      setForm((current) => {
        const next = {
          roleKey: isCloneMode ? `${formSourceRole.roleKey ?? ''}_CLONE` : formSourceRole.roleKey ?? '',
          label: formSourceRole.label ?? '',
          description: formSourceRole.description ?? '',
          status: isCloneMode
            ? SKILL_ROLE_REGISTRY_STATUSES.DRAFT
            : formSourceRole.status ?? SKILL_ROLE_REGISTRY_STATUSES.DRAFT,
          category: formSourceRole.category ?? SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE,
          allowedOperations: Array.isArray(formSourceRole.allowedOperations)
            ? formSourceRole.allowedOperations
            : [SKILL_ROLE_REGISTRY_OPERATIONS.READ],
          allowedReadScopes: Array.isArray(formSourceRole.allowedReadScopes) ? formSourceRole.allowedReadScopes : [],
          allowedWriteScopes: Array.isArray(formSourceRole.allowedWriteScopes) ? formSourceRole.allowedWriteScopes : [],
          isSystem: isCloneMode ? false : Boolean(formSourceRole.isSystem),
        }

        return shallowEqualObject(current, next) ? current : next
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [formSourceRole, isCloneMode, isEditMode])

  const submitSkillRole = useCallback(async ({ bypassStatusWarning = false } = {}) => {
    const clientErrors = validateSkillRoleRegistryForm(form)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setErrorsSource('client')
      return
    }

    if (isLocked) {
      addToast({
        variant: 'warning',
        title: 'Locked record',
        description: 'Clone this Skill Role to make behavior changes.',
      })
      return
    }

    const nextStatus = String(form.status || '').trim().toUpperCase()
    const currentStatus = String(loadedRole?.status || '').trim().toUpperCase()
    const shouldCheckDependencies = isEditMode
      && nextStatus
      && nextStatus !== currentStatus
      && (nextStatus === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
        || nextStatus === SKILL_ROLE_REGISTRY_STATUSES.INACTIVE)
      && !bypassStatusWarning

    if (shouldCheckDependencies) {
      try {
        const res = await fetchSkillRoleDependencies(roleId).unwrap()
        const summary = res?.data?.dependencies?.summary && typeof res.data.dependencies.summary === 'object'
          ? res.data.dependencies.summary
          : {}
        const skills = Number(summary.skills) || 0
        const agents = Number(summary.agents) || 0

        if (skills + agents > 0) {
          setPendingStatusWarning({ nextStatus, summary: { skills, agents } })
          return
        }
      } catch {
        // If we cannot resolve dependencies, fallback to skill-only usageCount.
        if (roleUsageCount > 0) {
          setPendingStatusWarning({ nextStatus, summary: { skills: roleUsageCount, agents: null } })
          return
        }
      }
    }

    try {
      const payload = {
        label: form.label.trim(),
        description: form.description.trim(),
        status: nextStatus,
        category: String(form.category || SKILL_ROLE_REGISTRY_CATEGORIES.EXECUTION_ROLE).trim().toUpperCase(),
        allowedOperations: Array.isArray(form.allowedOperations) ? form.allowedOperations : [],
        allowedReadScopes: Array.isArray(form.allowedReadScopes) ? form.allowedReadScopes : [],
        allowedWriteScopes: Array.isArray(form.allowedWriteScopes) ? form.allowedWriteScopes : [],
      }

      if (isEditMode) {
        const res = await updateSkillRole({
          roleId,
          ...payload,
        }).unwrap()

        addToast({
          variant: 'success',
          title: 'Saved',
          description: `Updated ${res?.data?.roleKey ?? 'skill role'}.`,
        })
      } else if (isCloneMode) {
        const res = await cloneSkillRole({
          roleId: cloneFrom,
          roleKey: form.roleKey.trim().toUpperCase(),
          ...payload,
          status: SKILL_ROLE_REGISTRY_STATUSES.DRAFT,
        }).unwrap()

        addToast({
          variant: 'success',
          title: 'Role cloned',
          description: `${res?.data?.roleKey ?? 'Skill role'} is now an editable draft.`,
        })

        navigate(`/super-admin/runtime-control/skill-roles/${res?.data?.id ?? ''}`)
      } else {
        const res = await createSkillRole({
          roleKey: form.roleKey.trim().toUpperCase(),
          ...payload,
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

      setPendingStatusWarning(null)
      setErrors({})
      setErrorsSource(null)
    } catch (err) {
      const appErr = normalizeError(err)
      const details = appErr?.details
      const fieldErrors = getRuntimeControlFieldErrorMap(appErr, SKILL_ROLE_REGISTRY_FORM_ERROR_FIELDS)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        setErrorsSource('server')
      } else if (details && typeof details === 'object') {
        setErrors(details)
        setErrorsSource('server')
      } else {
        addToast({ variant: 'error', title: 'Save failed', description: appErr.message })
      }
    }
  }, [
    addToast,
    cloneFrom,
    cloneSkillRole,
    createSkillRole,
    fetchSkillRoleDependencies,
    form,
    isCloneMode,
    isEditMode,
    isLocked,
    loadedRole?.status,
    navigate,
    roleId,
    roleUsageCount,
    updateSkillRole,
  ])

  const handleBack = useCallback(() => {
    navigate('/super-admin/runtime-control/skill-roles')
  }, [navigate])

  const handleClone = useCallback(() => {
    const loadedRoleId = loadedRole?.id
    if (!loadedRoleId) return
    navigate(`/super-admin/runtime-control/skill-roles/new?cloneFrom=${encodeURIComponent(loadedRoleId)}`)
  }, [loadedRole, navigate])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    await submitSkillRole()
  }, [submitSkillRole])

  const closeStatusWarning = useCallback(() => {
    setPendingStatusWarning(null)
  }, [])

  const confirmStatusWarning = useCallback(async () => {
    const shouldBypass = Boolean(pendingStatusWarning)
    setPendingStatusWarning(null)
    if (shouldBypass) {
      await submitSkillRole({ bypassStatusWarning: true })
    }
  }, [pendingStatusWarning, submitSkillRole])

  const canSave = Object.keys(liveErrors).length === 0 && !isSaving && !isLocked
  const roleKeyIsRequired = !isEditMode
  const statusIsRequired = true

  return (
    <section className="super-admin-skill-role-registry container" aria-label="Skill role editor">
      <header className="super-admin-skill-role-registry__header">
        <h1 className="super-admin-skill-role-registry__title">
          {isCloneMode ? 'Clone Skill Role' : isEditMode ? 'Edit Skill Role' : 'Create Skill Role'}
        </h1>
        <p className="super-admin-skill-role-registry__subtitle">
          Skill Roles classify execution responsibility and are referenced by Skills.
        </p>
      </header>

      <Fieldset className="super-admin-skill-role-registry__fieldset">
        <Fieldset.Legend className="sr-only">Skill role editor</Fieldset.Legend>
        {(isEditMode || isCloneMode) && isLoadingRole ? <SkillRoleEditorLoadingState isEditMode={isEditMode} /> : null}

        {(isEditMode || isCloneMode) && roleAppError ? (
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

        {(!isEditMode && !isCloneMode) || (!isLoadingRole && !roleAppError) ? (
          <Card variant="elevated" className="super-admin-skill-role-registry__card">
            <Card.Body className="super-admin-skill-role-editor__card-body super-admin-skill-role-editor__card-body--compact">
              <div className="super-admin-skill-role-editor__top-actions">
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                  Back
                </Button>
                {isEditMode ? (
                  <Button type="button" variant="primary" size="sm" onClick={handleClone}>
                    Clone
                  </Button>
                ) : null}
              </div>

              {isLocked ? (
                <div className="super-admin-skill-role-editor__locked-banner" role="status">
                  <Badge variant="warning" size="sm" pill>
                    Locked
                  </Badge>
                  <span>Referenced by validated or active Framework Packages. Clone to make behavior changes.</span>
                  <div className="super-admin-skill-role-editor__package-chips" aria-label="Locking packages">
                    {(loadedRole?.lockedByPackageKeys || []).map((packageKey) => (
                      <Badge key={packageKey} variant="neutral" size="sm" pill outline>
                        {packageKey}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

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
                    disabled={isEditMode || isLocked}
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
                        ...STATUS_OPTIONS,
                      ]}
                      error={errors.status}
                      helperText={
                        roleUsageCount > 0
                        && (form.status === SKILL_ROLE_REGISTRY_STATUSES.DEPRECATED
                          || form.status === SKILL_ROLE_REGISTRY_STATUSES.INACTIVE)
                          ? (() => {
                              const summary = pendingStatusWarning?.summary
                              const agents = summary?.agents
                              if (agents === null || agents === undefined) {
                                return `Used by ${roleUsageCount} skill${roleUsageCount === 1 ? '' : 's'}.`
                              }
                              const skills = Number(summary?.skills) || roleUsageCount
                              return `Used by ${skills} skill${skills === 1 ? '' : 's'} and ${agents} agent${agents === 1 ? '' : 's'}.`
                            })()
                          : undefined
                      }
                      required={statusIsRequired}
                      disabled={isLocked}
                    />
                  </div>
                </div>

                <div className="super-admin-skill-role-editor__row">
                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-category">
                      Category<span className="input-label__required"> *</span>
                    </label>
                    <Select
                      id="skill-role-editor-category"
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      options={CATEGORY_OPTIONS}
                      error={errors.category}
                      required
                      disabled={isLocked}
                    />
                  </div>

                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-operations">
                      Allowed Operations<span className="input-label__required"> *</span>
                    </label>
                    <Textarea
                      id="skill-role-editor-operations"
                      value={formatListText(form.allowedOperations)}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        allowedOperations: parseListText(event.target.value).map((value) => value.toUpperCase()),
                      }))}
                      error={errors.allowedOperations}
                      helperText="One per line or comma-separated: READ, WRITE, EXECUTE."
                      rows={3}
                      disabled={isLocked}
                      fullWidth
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
                    disabled={isLocked}
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
                    disabled={isLocked}
                    fullWidth
                  />
                </div>

                <div className="super-admin-skill-role-editor__row">
                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-read-scopes">
                      Allowed Read Scopes
                    </label>
                    <Textarea
                      id="skill-role-editor-read-scopes"
                      value={formatListText(form.allowedReadScopes)}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        allowedReadScopes: parseListText(event.target.value),
                      }))}
                      error={errors.allowedReadScopes}
                      helperText="Runtime path keys or wildcard scopes. One per line or comma-separated."
                      rows={4}
                      disabled={isLocked}
                      fullWidth
                    />
                  </div>

                  <div className="super-admin-skill-role-editor__field">
                    <label className="super-admin-skill-role-editor__field-label" htmlFor="skill-role-editor-write-scopes">
                      Allowed Write Scopes
                    </label>
                    <Textarea
                      id="skill-role-editor-write-scopes"
                      value={formatListText(form.allowedWriteScopes)}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        allowedWriteScopes: parseListText(event.target.value),
                      }))}
                      error={errors.allowedWriteScopes}
                      helperText="Runtime Skill write paths must be covered by these scopes."
                      rows={4}
                      disabled={isLocked}
                      fullWidth
                    />
                  </div>
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
                    {isCloneMode ? 'Save Clone' : isEditMode ? 'Save Changes' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        ) : null}
      </Fieldset>

      <Dialog open={Boolean(pendingStatusWarning)} onClose={closeStatusWarning} size="sm">
        <Dialog.Header>
          <h2>
            {pendingStatusWarning?.nextStatus === SKILL_ROLE_REGISTRY_STATUSES.INACTIVE
              ? 'Make skill role inactive?'
              : 'Deprecate skill role?'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-skill-role-editor__dialog-copy">
            <Badge variant="primary" size="sm" pill outline>
              {loadedRole?.roleKey ?? 'UNKNOWN_ROLE'}
            </Badge>{' '}
            is currently used by{' '}
            {Number(pendingStatusWarning?.summary?.skills) || 0} skill{Number(pendingStatusWarning?.summary?.skills) === 1 ? '' : 's'}
            {pendingStatusWarning?.summary?.agents === null
              ? '.'
              : ` and ${Number(pendingStatusWarning?.summary?.agents) || 0} agent${Number(pendingStatusWarning?.summary?.agents) === 1 ? '' : 's'}.`}
          </p>
          <p className="super-admin-skill-role-editor__dialog-helper">
            Making it {pendingStatusWarning?.nextStatus ?? 'non-active'} will block new assignments but will not remove existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeStatusWarning} disabled={isSaving}>
            Cancel
          </Button>
          {pendingStatusWarning?.nextStatus === SKILL_ROLE_REGISTRY_STATUSES.INACTIVE ? (
            <Button variant="primary" onClick={confirmStatusWarning} loading={isSaving}>
              Mark Inactive
            </Button>
          ) : (
            <Button variant="danger" onClick={confirmStatusWarning} loading={isSaving}>
              Deprecate Role
            </Button>
          )}
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminSkillRoleEditor
