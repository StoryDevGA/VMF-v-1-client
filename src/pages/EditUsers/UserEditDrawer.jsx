/**
 * User Edit Workspace
 *
 * In-page workspace for editing an existing user's roles and tenant visibility.
 * Opens beneath the catalogue when a user row's Edit action is triggered.
 *
 * @param {Object}  props
 * @param {boolean} props.open       — controls dialog visibility
 * @param {Function} props.onClose   — called when drawer should close
 * @param {Object}  props.user       — the user object being edited
 * @param {string}  props.customerId — customer scope
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Tickbox } from '../../components/Tickbox'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Status } from '../../components/Status'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { useToaster } from '../../components/Toaster'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useUpdateUserMutation } from '../../store/api/userApi.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
  getUserEmailConflictMessage,
  getUserLifecycleMessage,
} from '../../utils/errors.js'
import './UserEditDrawer.css'

const EDITABLE_ROLES = ['TENANT_ADMIN', 'USER']
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const CUSTOMER_ADMIN_EDIT_GUIDANCE =
  'Customer Admin ownership is governed separately. Generic role edits here do not add or remove the governed Customer Admin assignment.'

const CUSTOMER_ADMIN_TRANSFER_GUIDANCE =
  'Use Transfer Ownership when this user should become the Canonical Admin.'

const TENANT_ADMIN_TOPOLOGY_GUIDANCE =
  'Tenant Admin is only available for multi-tenant customers.'

const TENANT_ADMIN_HIDDEN_ASSIGNMENT_GUIDANCE =
  'This user has a Tenant Admin assignment that is not editable for the current customer topology. Saving role changes will remove that assignment.'

const ACTIVE_EMAIL_HELP_TEXT =
  'Changing email resets Identity Plus trust. If trust returns as UNTRUSTED after save, use Resend Invitation from the user row because backend does not auto-send a new invite.'

const DISABLED_EMAIL_HELP_TEXT =
  'Changing email while this user is disabled keeps resend unavailable until reactivation succeeds.'

const TENANT_VISIBILITY_EDIT_GUIDANCE =
  'Select the tenants this user should be able to access. Clear all selections to remove stored explicit tenant visibility.'

const TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE =
  'No selectable tenants are currently available for this customer.'

const TENANT_VISIBILITY_PRESERVED_MESSAGE =
  'Previously selected tenants that are no longer selectable stay preserved until you remove them.'

const TENANT_VISIBILITY_SERVICE_PROVIDER_HINT =
  'This customer uses guided tenant visibility for multi-tenant access.'

const EMAIL_CHANGE_RESEND_GUIDANCE =
  'Email updated. Trust reset to UNTRUSTED. Use Resend Invitation from the user row if the new address still needs an invite.'

const EMAIL_CHANGE_REACTIVATION_GUIDANCE =
  'Email updated. Because this user is disabled, resend invitation stays unavailable until reactivation succeeds.'

const normalizeText = (value) => String(value ?? '').trim()
const normalizeEmail = (value) => normalizeText(value).toLowerCase()
const normalizeTenantVisibilityIds = (tenantIds) => (
  [...new Set((tenantIds ?? []).map((tenantId) => String(tenantId ?? '').trim()).filter(Boolean))]
    .sort()
)

const normalizeRoles = (roles) => (
  [...new Set((roles ?? []).map((role) => String(role ?? '').trim().toUpperCase()).filter(Boolean))]
    .sort()
)

const getUpdateUserPayload = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const getCustomerScopedRoles = (user, customerId) => {
  const memberships = Array.isArray(user?.memberships) ? user.memberships : []
  const scopedMemberships = memberships.filter((membership) => {
    if (!customerId) return true
    return String(membership?.customerId ?? '') === String(customerId)
  })

  return scopedMemberships.flatMap((membership) => membership?.roles ?? []).filter(Boolean)
}

const getUserTrustStatus = (user) =>
  String(user?.trustStatus ?? user?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

const getTopologyAwareRoles = (roles, topology) => {
  const normalizedTopology = String(topology ?? '')
    .trim()
    .toUpperCase()

  if (normalizedTopology === 'SINGLE_TENANT') {
    return roles.filter((role) => role !== 'TENANT_ADMIN')
  }

  return roles
}

const getTenantId = (tenant) => String(tenant?.id ?? tenant?._id ?? '').trim()

const normalizeTenantOption = (tenant) => {
  const id = getTenantId(tenant)

  return {
    id,
    name: String(tenant?.name ?? id ?? '--').trim() || '--',
    status: String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase(),
    isSelectable: tenant?.isSelectable === true,
    isDefault: tenant?.isDefault === true,
    selectionState: String(tenant?.selectionState ?? '').trim().toUpperCase(),
  }
}

const getTenantVisibilityValidationMessage = (appError) => {
  const reason = String(appError?.details?.reason ?? '').trim().toUpperCase()

  if (reason === 'TENANT_VISIBILITY_NOT_ALLOWED') {
    return `Tenant visibility is not available for this customer topology.${appError?.requestId ? ` (Ref: ${appError.requestId})` : ''}`
  }

  if (reason === 'TENANT_VISIBILITY_INVALID_TENANT_IDS') {
    const invalidTenantIds = Array.isArray(appError?.details?.invalidTenantIds)
      ? appError.details.invalidTenantIds
        .map((tenantId) => String(tenantId ?? '').trim())
        .filter(Boolean)
      : []

    return [
      'One or more tenant selections are no longer valid.',
      invalidTenantIds.length > 0
        ? `Remove invalid tenant selections: ${invalidTenantIds.join(', ')}.`
        : 'Remove invalid tenant selections and retry.',
      appError?.requestId ? `(Ref: ${appError.requestId})` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return ''
}

const getFieldErrorMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.message === 'string' &&
        entry.message.trim()
      ) {
        return entry.message.trim()
      }
    }
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return value.message.trim()
  }

  return ''
}

const normalizeEditFieldName = (field) => {
  const compact = String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (!compact) return ''
  if (compact.includes('tenantvisibility')) return 'tenantVisibility'
  if (compact.includes('roles')) return 'roles'
  if (compact.includes('email')) return 'email'
  if (compact.endsWith('name')) return 'name'

  return ''
}

const mapEditValidationErrors = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeEditFieldName(detail.field)
      const message = getFieldErrorMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeEditFieldName(field)
    const message = getFieldErrorMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}

/**
 * UserEditDrawer Component
 */
function UserEditDrawer({
  open,
  onClose,
  user,
  customerId,
  onStartOwnershipTransfer,
  hasCanonicalAdmin = false,
}) {
  const { addToast } = useToaster()
  const [updateUserMutation, { isLoading }] = useUpdateUserMutation()
  const workspaceRef = useRef(null)
  const {
    customerId: activeCustomerId,
    tenants: tenantRows,
    tenantVisibilityMeta,
    isLoadingTenants: rawIsLoadingTenants,
    tenantsError,
  } = useTenantContext()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [tenantVisibility, setTenantVisibility] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!user) return
    setName(String(user?.name ?? ''))
    setEmail(String(user?.email ?? ''))
    setSelectedRoles(
      getCustomerScopedRoles(user, customerId).filter((role) => editableRoleOptions.includes(role)),
    )
    setTenantVisibility(normalizeTenantVisibilityIds(user?.tenantVisibility))
    setFieldErrors({})
  }, [user, customerId])

  const isCustomerContextAligned =
    !customerId
    || !activeCustomerId
    || String(customerId) === String(activeCustomerId)

  const tenants = useMemo(
    () => (isCustomerContextAligned ? tenantRows.map(normalizeTenantOption).filter((tenant) => tenant.id) : []),
    [isCustomerContextAligned, tenantRows],
  )

  const normalizedTenantsError = useMemo(
    () => (tenantsError ? normalizeError(tenantsError) : null),
    [tenantsError],
  )

  const effectiveTenantVisibilityMeta = isCustomerContextAligned ? tenantVisibilityMeta : null
  const isLoadingTenants = isCustomerContextAligned ? rawIsLoadingTenants : false
  const editableRoleOptions = useMemo(
    () => getTopologyAwareRoles(EDITABLE_ROLES, effectiveTenantVisibilityMeta?.topology),
    [effectiveTenantVisibilityMeta?.topology],
  )
  const allowsTenantAdminRole = editableRoleOptions.includes('TENANT_ADMIN')
  const shouldShowTenantVisibilityEditor =
    effectiveTenantVisibilityMeta?.allowed === true
    && effectiveTenantVisibilityMeta?.topology === 'MULTI_TENANT'
  const shouldHideTenantVisibilitySection =
    effectiveTenantVisibilityMeta?.topology === 'SINGLE_TENANT'
  const customerScopedRoles = useMemo(
    () => getCustomerScopedRoles(user, customerId),
    [customerId, user],
  )
  const hasHiddenTenantAdminAssignment =
    !allowsTenantAdminRole && customerScopedRoles.includes('TENANT_ADMIN')

  const initialRoles = useMemo(
    () => normalizeRoles(customerScopedRoles.filter((role) => editableRoleOptions.includes(role))),
    [customerScopedRoles, editableRoleOptions],
  )
  const normalizedSelectedRoles = useMemo(
    () => normalizeRoles(selectedRoles),
    [selectedRoles],
  )
  const initialTenantVisibility = useMemo(
    () => normalizeTenantVisibilityIds(user?.tenantVisibility),
    [user?.tenantVisibility],
  )
  const normalizedTenantVisibility = useMemo(
    () => normalizeTenantVisibilityIds(tenantVisibility),
    [tenantVisibility],
  )

  const normalizedInitialName = useMemo(() => normalizeText(user?.name), [user?.name])
  const normalizedInitialEmail = useMemo(() => normalizeEmail(user?.email), [user?.email])
  const normalizedName = normalizeText(name)
  const normalizedUserEmail = normalizeEmail(email)

  const hasNameChange = normalizedName !== normalizedInitialName
  const hasEmailChange = normalizedUserEmail !== normalizedInitialEmail
  const hasRoleChange = normalizedSelectedRoles.join('|') !== initialRoles.join('|')
  const hasTenantVisibilityChange =
    normalizedTenantVisibility.join('|') !== initialTenantVisibility.join('|')
  const hasChanges =
    hasNameChange || hasEmailChange || hasRoleChange || hasTenantVisibilityChange
  const draftRoles = normalizedSelectedRoles.length > 0 ? normalizedSelectedRoles : []

  const tenantLookup = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant])),
    [tenants],
  )

  const selectableTenantOptions = useMemo(
    () => tenants.filter((tenant) => tenant.isSelectable),
    [tenants],
  )

  const resolvedSelectedTenants = useMemo(
    () => normalizedTenantVisibility.map((tenantId) => {
      const matchedTenant = tenantLookup.get(tenantId)
      if (matchedTenant) return matchedTenant

      return {
        id: tenantId,
        name: tenantId,
        status: 'UNKNOWN',
        isSelectable: false,
        isDefault: false,
        selectionState: 'MISSING',
      }
    }),
    [normalizedTenantVisibility, tenantLookup],
  )

  const preservedSelectedTenants = useMemo(
    () => resolvedSelectedTenants.filter((tenant) => !tenant.isSelectable),
    [resolvedSelectedTenants],
  )

  const clearFieldErrors = useCallback((...keys) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        delete next[key]
      }
      delete next.form
      return next
    })
  }, [])

  useEffect(() => {
    setSelectedRoles((prev) => {
      const next = prev.filter((role) => editableRoleOptions.includes(role))
      return next.length === prev.length ? prev : next
    })
  }, [editableRoleOptions])

  useEffect(() => {
    if (!open || !user || !workspaceRef.current) return

    const prefersReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof workspaceRef.current.scrollIntoView === 'function') {
      workspaceRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }

    if (typeof workspaceRef.current.focus === 'function') {
      workspaceRef.current.focus({ preventScroll: true })
    }
  }, [open, user])

  const toggleRole = useCallback((role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((candidate) => candidate !== role) : [...prev, role],
    )
    clearFieldErrors('roles')
  }, [clearFieldErrors])

  const toggleTenantSelection = useCallback((tenantId) => {
    setTenantVisibility((prev) =>
      prev.includes(tenantId)
        ? prev.filter((candidate) => candidate !== tenantId)
        : [...prev, tenantId],
    )
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors])

  const handleSelectAllTenants = useCallback(() => {
    setTenantVisibility((prev) => {
      const preservedIds = normalizeTenantVisibilityIds(prev).filter((tenantId) => {
        const tenant = tenantLookup.get(tenantId)
        return !tenant || !tenant.isSelectable
      })

      return [...new Set([...preservedIds, ...selectableTenantOptions.map((tenant) => tenant.id)])]
    })
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors, selectableTenantOptions, tenantLookup])

  const handleClearTenantSelection = useCallback(() => {
    setTenantVisibility([])
    clearFieldErrors('tenantVisibility')
  }, [clearFieldErrors])

  const validate = useCallback(() => {
    const errors = {}

    if (!normalizedName) {
      errors.name = 'Full name is required.'
    }

    if (!normalizedUserEmail) {
      errors.email = 'Email is required.'
    } else if (!EMAIL_REGEX.test(normalizedUserEmail)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (normalizedSelectedRoles.length === 0) {
      errors.roles = 'Select at least one role.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [normalizedName, normalizedSelectedRoles, normalizedUserEmail])

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      addToast({
        title: 'No changes to save',
        description: 'Update at least one editable field before saving.',
        variant: 'info',
      })
      return
    }

    if (!validate()) return

    const body = {}
    if (hasNameChange) body.name = normalizedName
    if (hasEmailChange) body.email = normalizedUserEmail
    if (hasRoleChange) body.roles = normalizedSelectedRoles
    if (hasTenantVisibilityChange && shouldShowTenantVisibilityEditor) {
      body.tenantVisibility = normalizedTenantVisibility
    }

    try {
      const result = await updateUserMutation({
        customerId,
        userId: user._id,
        body,
      }).unwrap()
      const updatedUser = getUpdateUserPayload(result)
      const updatedName = normalizeText(updatedUser?.name) || normalizedName || user?.name
      const updatedTrustStatus = getUserTrustStatus(updatedUser)
      const updatedIsActive =
        typeof updatedUser?.isActive === 'boolean' ? updatedUser.isActive : Boolean(user?.isActive)

      let description = `${updatedName} was updated successfully.`
      let variant = 'success'

      if (hasEmailChange && updatedIsActive && updatedTrustStatus === 'UNTRUSTED') {
        description = EMAIL_CHANGE_RESEND_GUIDANCE
        variant = 'warning'
      } else if (hasEmailChange && !updatedIsActive) {
        description = EMAIL_CHANGE_REACTIVATION_GUIDANCE
        variant = 'info'
      }

      addToast({
        title: 'User updated',
        description,
        variant,
      })
      onClose?.()
    } catch (err) {
      const appError = normalizeError(err)

      if (isCanonicalAdminConflictError(appError)) {
        const conflictMessage = getCanonicalAdminConflictMessage(
          appError,
          'update_roles',
        )

        setFieldErrors((prev) => ({
          ...prev,
          roles: conflictMessage,
        }))

        addToast({
          title: 'Customer admin conflict',
          description: conflictMessage,
          variant: 'warning',
        })
        return
      }

      if (
        appError.status === 409 &&
        (appError.code === 'USER_ALREADY_EXISTS' || appError.code === 'USER_CUSTOMER_CONFLICT')
      ) {
        const emailConflictMessage = getUserEmailConflictMessage(appError)
        setFieldErrors((prev) => ({
          ...prev,
          email: emailConflictMessage,
        }))
        addToast({
          title: 'Cannot update user',
          description: emailConflictMessage,
          variant: 'warning',
        })
        return
      }

      const tenantVisibilityMessage = getTenantVisibilityValidationMessage(appError)
      if (tenantVisibilityMessage) {
        setFieldErrors((prev) => ({
          ...prev,
          tenantVisibility: tenantVisibilityMessage,
        }))
        addToast({
          title: 'Tenant visibility needs attention',
          description: tenantVisibilityMessage,
          variant: 'warning',
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mappedErrors = mapEditValidationErrors(appError.details)
        if (Object.keys(mappedErrors).length > 0) {
          setFieldErrors((prev) => ({
            ...prev,
            ...mappedErrors,
          }))
          return
        }
      }

      const lifecycleMessage = getUserLifecycleMessage(appError, 'Failed to update user.')
      setFieldErrors((prev) => ({
        ...prev,
        form: lifecycleMessage,
      }))
      addToast({
        title: 'Failed to update user',
        description: lifecycleMessage,
        variant: 'error',
      })
    }
  }, [
    addToast,
    hasChanges,
    hasEmailChange,
    hasNameChange,
    hasRoleChange,
    hasTenantVisibilityChange,
    normalizedName,
    normalizedSelectedRoles,
    normalizedTenantVisibility,
    normalizedUserEmail,
    onClose,
    shouldShowTenantVisibilityEditor,
    updateUserMutation,
    user,
    validate,
  ])

  if (!open || !user) return null

  const hasGovernedCustomerAdminRole =
    user.isCanonicalAdmin || selectedRoles.includes('CUSTOMER_ADMIN')
  const canStartOwnershipTransfer =
    Boolean(onStartOwnershipTransfer) &&
    hasCanonicalAdmin &&
    !user.isCanonicalAdmin &&
    user.isActive

  const transferAvailabilityMessage = !hasCanonicalAdmin
    ? 'Ownership transfer is unavailable until a Canonical Admin is present for this customer.'
    : user.isCanonicalAdmin
      ? 'This user is the current Canonical Admin. Choose another active user to transfer ownership.'
      : !user.isActive
        ? 'Only active users can receive customer ownership.'
        : CUSTOMER_ADMIN_TRANSFER_GUIDANCE

  const workspaceIdentity = user?.name || user?.email || 'this user'
  const workspaceChangeSummary = hasChanges
    ? 'You have unsaved changes in this workspace.'
    : 'No changes staged yet. Update any editable field to enable save.'
  const workspaceRoleSummary = hasGovernedCustomerAdminRole
    ? 'Canonical Admin'
    : normalizedSelectedRoles.length > 0
      ? normalizedSelectedRoles.join(', ').replace(/_/g, ' ')
      : 'No editable roles selected'

  return (
    <section
      ref={workspaceRef}
      className="user-edit-drawer user-edit-drawer--workspace"
      aria-label={`Edit user workspace for ${workspaceIdentity}`}
      tabIndex={-1}
    >
      <Fieldset className="user-edit-drawer__workspace-fieldset">
        <Fieldset.Legend className="sr-only">Edit user workspace</Fieldset.Legend>
        <Card variant="elevated" className="user-edit-drawer__workspace-card">
          <Card.Header className="user-edit-drawer__workspace-header">
            <div className="user-edit-drawer__workspace-heading">
              <div className="user-edit-drawer__header">
                <p className="user-edit-drawer__workspace-kicker">User workspace</p>
                <h2 className="user-edit-drawer__title">Edit User</h2>
                <p className="user-edit-drawer__subtitle">
                  Update profile, lifecycle-aware access, and customer-scoped visibility for {workspaceIdentity}.
                </p>
              </div>
              <div className="user-edit-drawer__workspace-header-actions">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
                  Close Editor
                </Button>
              </div>
            </div>
            <div className="user-edit-drawer__workspace-summary" aria-label="Selected user summary">
              <div className="user-edit-drawer__workspace-summary-item">
                <span className="user-edit-drawer__label">Status</span>
                <Status variant={user.isActive ? 'success' : 'error'} size="sm" showIcon>
                  {user.isActive ? 'Active' : 'Disabled'}
                </Status>
              </div>
              <div className="user-edit-drawer__workspace-summary-item">
                <span className="user-edit-drawer__label">Trust</span>
                <UserTrustStatus trustStatus={getUserTrustStatus(user)} size="sm" />
              </div>
              <div className="user-edit-drawer__workspace-summary-item">
                <span className="user-edit-drawer__label">Access scope</span>
                <Badge variant={hasGovernedCustomerAdminRole ? 'info' : 'neutral'} size="sm">
                  {workspaceRoleSummary}
                </Badge>
              </div>
            </div>
          </Card.Header>

          <Card.Body className="user-edit-drawer__workspace-body">
            <div className="user-edit-drawer__layout">
          <Card variant="outlined" className="user-edit-drawer__section">
            <Card.Header className="user-edit-drawer__section-header">
              <div>
                <h3 className="user-edit-drawer__section-title">Account Details</h3>
                <p className="user-edit-drawer__section-text">
                  Update the saved profile values for this customer-scoped user record.
                </p>
              </div>
            </Card.Header>
            <Card.Body className="user-edit-drawer__section-body">
              <div className="user-edit-drawer__info">
                <Input
                  id="edit-user-name"
                  label="Name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    clearFieldErrors('name')
                  }}
                  error={fieldErrors.name}
                  fullWidth
                />
                <Input
                  id="edit-user-email"
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearFieldErrors('email')
                  }}
                  error={fieldErrors.email}
                  helperText={user.isActive ? ACTIVE_EMAIL_HELP_TEXT : DISABLED_EMAIL_HELP_TEXT}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  fullWidth
                />
              </div>
            </Card.Body>
          </Card>

          <div className="user-edit-drawer__summary-grid">
            <Card variant="outlined" className="user-edit-drawer__section">
              <Card.Header className="user-edit-drawer__section-header">
                <div>
                  <h3 className="user-edit-drawer__section-title">Access Snapshot</h3>
                  <p className="user-edit-drawer__section-text">
                    Review the current lifecycle and trust state before changing access.
                  </p>
                </div>
              </Card.Header>
              <Card.Body className="user-edit-drawer__section-body">
                <dl className="user-edit-drawer__snapshot-list">
                  <div className="user-edit-drawer__snapshot-item">
                    <dt className="user-edit-drawer__label">Status</dt>
                    <dd className="user-edit-drawer__snapshot-value">
                      <Status
                        variant={user.isActive ? 'success' : 'error'}
                        size="sm"
                        showIcon
                      >
                        {user.isActive ? 'Active' : 'Disabled'}
                      </Status>
                    </dd>
                  </div>
                  <div className="user-edit-drawer__snapshot-item">
                    <dt className="user-edit-drawer__label">Trust</dt>
                    <dd className="user-edit-drawer__snapshot-value">
                      <UserTrustStatus
                        trustStatus={getUserTrustStatus(user)}
                        invitedAt={user.identityPlus?.invitedAt}
                        trustedAt={user.identityPlus?.trustedAt}
                        size="sm"
                        showDates
                      />
                    </dd>
                  </div>
                  <div className="user-edit-drawer__snapshot-item">
                    <dt className="user-edit-drawer__label">Draft roles</dt>
                    <dd className="user-edit-drawer__snapshot-value">
                      <div className="user-edit-drawer__badge-list">
                        {draftRoles.length > 0
                          ? draftRoles.map((role) => (
                            <Badge key={role} variant="neutral" size="sm">
                              {role.replace(/_/g, ' ')}
                            </Badge>
                          ))
                          : <span className="user-edit-drawer__muted">No editable roles selected.</span>}
                      </div>
                    </dd>
                  </div>
                </dl>
              </Card.Body>
            </Card>

            <Card variant="outlined" className="user-edit-drawer__section">
              <Card.Header className="user-edit-drawer__section-header">
                <div>
                  <h3 className="user-edit-drawer__section-title">Role Access</h3>
                  <p className="user-edit-drawer__section-text">
                    Governance rules apply here. Ownership changes still require the guided transfer flow.
                  </p>
                </div>
              </Card.Header>
              <Card.Body className="user-edit-drawer__section-body">
                <Fieldset className="user-edit-drawer__fieldset">
                  <Fieldset.Legend className="user-edit-drawer__legend">Editable Roles</Fieldset.Legend>
                  <Fieldset.Content className="user-edit-drawer__fieldset-content">
                    <div
                      className="user-edit-drawer__governance"
                      role="note"
                      aria-label="Customer admin governance guidance"
                    >
                      <p className="user-edit-drawer__governance-title">Customer Admin governance</p>
                      <p className="user-edit-drawer__governance-text">
                        {hasGovernedCustomerAdminRole
                          ? CUSTOMER_ADMIN_EDIT_GUIDANCE
                          : 'Customer Admin ownership is managed through Transfer Ownership rather than this role editor.'}
                      </p>
                      <p className="user-edit-drawer__governance-text">
                        {transferAvailabilityMessage}
                      </p>
                      {!allowsTenantAdminRole ? (
                        <p className="user-edit-drawer__governance-text">
                          {hasHiddenTenantAdminAssignment
                            ? TENANT_ADMIN_HIDDEN_ASSIGNMENT_GUIDANCE
                            : TENANT_ADMIN_TOPOLOGY_GUIDANCE}
                        </p>
                      ) : null}
                      {canStartOwnershipTransfer ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            onStartOwnershipTransfer?.(user)
                            onClose?.()
                          }}
                        >
                          Transfer Ownership to This User
                        </Button>
                      ) : null}
                    </div>
                    <div className="user-edit-drawer__role-list">
                      {editableRoleOptions.map((role) => (
                        <Tickbox
                          key={role}
                          id={`edit-role-${role}`}
                          label={role.replace(/_/g, ' ')}
                          checked={selectedRoles.includes(role)}
                          onChange={() => toggleRole(role)}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {fieldErrors.roles && (
                      <p className="user-edit-drawer__error" role="alert">
                        {fieldErrors.roles}
                      </p>
                    )}
                  </Fieldset.Content>
                </Fieldset>
              </Card.Body>
            </Card>
          </div>

          {!shouldHideTenantVisibilitySection ? (
            <Card variant="outlined" className="user-edit-drawer__section">
              <Card.Header className="user-edit-drawer__section-header">
                <div>
                  <h3 className="user-edit-drawer__section-title">Tenant Visibility</h3>
                  <p className="user-edit-drawer__section-text">
                    Use guided tenant selection when this customer topology allows scoped visibility.
                  </p>
                </div>
              </Card.Header>
              <Card.Body className="user-edit-drawer__section-body">
                <Fieldset className="user-edit-drawer__fieldset">
                  <Fieldset.Legend className="user-edit-drawer__legend">Tenant Visibility</Fieldset.Legend>
                  <Fieldset.Content className="user-edit-drawer__fieldset-content">
                    {shouldShowTenantVisibilityEditor ? (
                      <div className="user-edit-drawer__tenant-visibility">
                        <p className="user-edit-drawer__tenant-visibility-text">
                          {TENANT_VISIBILITY_EDIT_GUIDANCE}
                        </p>
                        {effectiveTenantVisibilityMeta?.isServiceProvider ? (
                          <p className="user-edit-drawer__tenant-visibility-hint">
                            {TENANT_VISIBILITY_SERVICE_PROVIDER_HINT}
                          </p>
                        ) : null}
                        {effectiveTenantVisibilityMeta?.selectableStatuses?.length > 0 ? (
                          <p className="user-edit-drawer__tenant-visibility-hint">
                            Selectable statuses: {effectiveTenantVisibilityMeta.selectableStatuses.join(', ')}.
                          </p>
                        ) : null}

                        {isLoadingTenants ? (
                          <p className="user-edit-drawer__tenant-visibility-text" role="status">
                            Loading tenant options...
                          </p>
                        ) : null}

                        {normalizedTenantsError ? (
                          <ErrorSupportPanel
                            error={normalizedTenantsError}
                            context="user-edit-drawer-tenant-visibility"
                          />
                        ) : null}

                        {!isLoadingTenants && !normalizedTenantsError ? (
                          <>
                            <div className="user-edit-drawer__tenant-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleSelectAllTenants}
                                disabled={selectableTenantOptions.length === 0 || isLoading}
                              >
                                Select All Available
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClearTenantSelection}
                                disabled={normalizedTenantVisibility.length === 0 || isLoading}
                              >
                                Clear Selection
                              </Button>
                            </div>

                            {selectableTenantOptions.length > 0 ? (
                              <div className="user-edit-drawer__tenant-list" role="group" aria-label="Editable tenant visibility">
                                {selectableTenantOptions.map((tenant) => (
                                  <div key={tenant.id} className="user-edit-drawer__tenant-option">
                                    <Tickbox
                                      id={`edit-tenant-${tenant.id}`}
                                      label={tenant.name}
                                      checked={normalizedTenantVisibility.includes(tenant.id)}
                                      onChange={() => toggleTenantSelection(tenant.id)}
                                      disabled={isLoading}
                                    />
                                    <p className="user-edit-drawer__tenant-meta">
                                      Status: {tenant.status}
                                      {tenant.isDefault ? ' | Default tenant' : ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="user-edit-drawer__tenant-visibility-hint">
                                {TENANT_VISIBILITY_EMPTY_OPTIONS_MESSAGE}
                              </p>
                            )}

                            {preservedSelectedTenants.length > 0 ? (
                              <div className="user-edit-drawer__tenant-preserved">
                                <p className="user-edit-drawer__tenant-visibility-hint">
                                  {TENANT_VISIBILITY_PRESERVED_MESSAGE}
                                </p>
                                <ul className="user-edit-drawer__tenant-preserved-list">
                                  {preservedSelectedTenants.map((tenant) => (
                                    <li key={tenant.id} className="user-edit-drawer__tenant-preserved-item">
                                      <div className="user-edit-drawer__tenant-preserved-details">
                                        <span className="user-edit-drawer__tenant-preserved-name">{tenant.name}</span>
                                        <span className="user-edit-drawer__tenant-preserved-meta">
                                          Status: {tenant.status}
                                          {tenant.selectionState ? ` | State: ${tenant.selectionState}` : ''}
                                        </span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleTenantSelection(tenant.id)}
                                        disabled={isLoading}
                                      >
                                        Remove
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {fieldErrors.tenantVisibility ? (
                      <p className="user-edit-drawer__error" role="alert">
                        {fieldErrors.tenantVisibility}
                      </p>
                    ) : null}
                  </Fieldset.Content>
                </Fieldset>
              </Card.Body>
            </Card>
          ) : null}

            {fieldErrors.form && (
              <p className="user-edit-drawer__error" role="alert">
                {fieldErrors.form}
              </p>
            )}
          </div>
          </Card.Body>

          <Card.Footer className="user-edit-drawer__workspace-footer">
            <p className="user-edit-drawer__workspace-footer-text" role="status" aria-live="polite">
              {workspaceChangeSummary}
            </p>
            <div className="user-edit-drawer__footer">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Close Editor
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isLoading}
                disabled={isLoading || !hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </Fieldset>
    </section>
  )
}

export default UserEditDrawer
