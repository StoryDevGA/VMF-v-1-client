/**
 * Maintain Tenants Page
 *
 * Tenant management page at `/app/administration/maintain-tenants`.
 * Displays a tenant catalogue for the current customer with
 * search, status filter, pagination, and lifecycle actions.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import { useTenants } from '../../hooks/useTenants.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { getCustomerLifecycleStatus } from '../../utils/authorization.js'
import {
  normalizeError,
  isCustomerInactiveError,
  getCustomerInactiveMessage,
} from '../../utils/errors.js'
import CreateTenantWizard from './CreateTenantWizard'
import TenantAdminAssignmentDialog from './TenantAdminAssignmentDialog'
import TenantEditDrawer from './TenantEditDrawer'
import TenantListView from './TenantListView'
import {
  getTenantCapacityCountLabel,
  getTenantId,
} from './tenantUtils.js'
import './MaintainTenants.css'

const SEARCH_DEBOUNCE = 300

const MAINTAIN_TENANTS_INACTIVE_CUSTOMER_MESSAGE =
  'This customer is inactive. Tenant-management actions are unavailable until a Super Admin reactivates the customer.'

const MAINTAIN_TENANTS_UNAUTHORIZED_MESSAGE =
  'You do not have permission to access tenant maintenance for this customer.'

const MAINTAIN_TENANTS_SINGLE_TENANT_MESSAGE =
  'This customer uses single-tenant topology. Tenant management is only available for multi-tenant customers.'

const MAINTAIN_TENANTS_LIFECYCLE_NOTE =
  'Use the Actions menu to edit tenant details or change lifecycle state. Default tenants stay enabled, and archived tenants remain read-only.'

const MAINTAIN_TENANTS_TENANT_ADMIN_LIFECYCLE_NOTE =
  'Use the Actions menu to edit tenant details or change lifecycle state for the tenants you administer.'

const MAINTAIN_TENANTS_TENANT_ADMIN_SCOPE_NOTE =
  'Showing only tenants where you are the assigned tenant admin.'

const getTenantAdminUserId = (tenant) =>
  String(tenant?.tenantAdmin?.id ?? tenant?.tenantAdmin?._id ?? '').trim()

const getLifecycleConfirmationCopy = (confirmAction) => {
  const tenantName = confirmAction?.tenant?.name ?? 'this tenant'

  if (confirmAction?.type === 'enable') {
    return {
      title: 'Enable Tenant',
      message:
        `Enable ${tenantName}? Users assigned to this tenant will regain access immediately.`,
      confirmLabel: 'Enable',
    }
  }

  return {
    title: 'Disable Tenant',
    message:
      `Disable ${tenantName}? Users assigned to this tenant will lose access immediately. `
      + 'The tenant remains available for future re-enablement.',
    confirmLabel: 'Disable',
  }
}

const getTenantCapacityGuidance = (tenantCapacity) => {
  if (!tenantCapacity) return null

  const currentCount = tenantCapacity.currentCount
  const maxTenants = tenantCapacity.maxTenants
  const remainingCount = tenantCapacity.remainingCount
  const countLabel = getTenantCapacityCountLabel(tenantCapacity.countMode)

  if (tenantCapacity.isAtCapacity && currentCount !== null && maxTenants !== null) {
    return {
      tone: 'warning',
      title: 'Tenant capacity reached',
      message:
        `This customer is already using ${currentCount} of ${maxTenants} ${countLabel} tenant slots. `
        + 'Disable or archive an existing tenant, or update customer limits before creating another.',
    }
  }

  if (remainingCount === 1 && currentCount !== null && maxTenants !== null) {
    return {
      tone: 'warning',
      title: 'Final tenant slot',
      message:
        `This customer has 1 ${countLabel} tenant slot remaining (${currentCount} of ${maxTenants} in use). `
        + 'The next successful create will exhaust the current capacity.',
    }
  }

  if (currentCount !== null && remainingCount !== null && maxTenants !== null) {
    const remainingLabel = remainingCount === 1 ? 'slot' : 'slots'

    return {
      tone: 'info',
      title: 'Tenant usage',
      message:
        `${currentCount} of ${maxTenants} ${countLabel} tenant slots are in use. `
        + `${remainingCount} ${remainingLabel} remaining.`,
    }
  }

  return null
}

function MaintainTenantsBoundaryState({
  title = 'Maintain Tenants',
  message,
  supportPanel = null,
}) {
  return (
    <section className="maintain-tenants container" aria-label="Maintain Tenants">
      <header className="maintain-tenants__header">
        <h1 className="maintain-tenants__title">{title}</h1>
      </header>

      <Fieldset className="maintain-tenants__fieldset">
        <Fieldset.Legend className="sr-only">Maintain tenants state</Fieldset.Legend>
        <Card variant="elevated" className="maintain-tenants__card">
          <Card.Body className="maintain-tenants__card-body maintain-tenants__card-body--state">
            <p className="maintain-tenants__state-message">{message}</p>
            {supportPanel}
          </Card.Body>
        </Card>
      </Fieldset>
    </section>
  )
}

function MaintainTenantsWorkspace({
  customerId,
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  rows,
  isListLoading,
  isListFetching,
  listAppError,
  totalPages,
  currentPage,
  totalCount,
  onPageChange,
  createButtonDisabled,
  showCreateAction,
  showTenantAdminColumn,
  allowAssignAdmin,
  allowLifecycleActions,
  tenantAdminScopeNote,
  tenantCapacityGuidance,
  tenantCapacity,
  lifecycleNote,
  isLifecycleMutationLoading,
  enableTenant,
  disableTenant,
}) {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [assigningTenantAdmin, setAssigningTenantAdmin] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const confirmActionCopy = useMemo(
    () => getLifecycleConfirmationCopy(confirmAction),
    [confirmAction],
  )

  const handleEnable = useCallback(
    async (tenant) => {
      const tenantId = getTenantId(tenant)

      if (!tenantId) {
        addToast({
          title: 'Missing tenant identifier',
          description: 'This tenant record is missing an identifier, so enable could not be completed.',
          variant: 'error',
        })
        setConfirmAction(null)
        return
      }

      try {
        await enableTenant(tenantId)
        addToast({
          title: 'Tenant enabled',
          description: `${tenant.name} is enabled. Users assigned to this tenant can access it immediately.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to enable tenant',
          description: appError.message,
          variant: 'error',
        })
      }
      setConfirmAction(null)
    },
    [addToast, enableTenant],
  )

  const handleDisable = useCallback(
    async (tenant) => {
      const tenantId = getTenantId(tenant)

      if (!tenantId) {
        addToast({
          title: 'Missing tenant identifier',
          description: 'This tenant record is missing an identifier, so disable could not be completed.',
          variant: 'error',
        })
        setConfirmAction(null)
        return
      }

      try {
        await disableTenant(tenantId)
        addToast({
          title: 'Tenant disabled',
          description: `${tenant.name} is disabled. Users assigned to this tenant lost access immediately.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to disable tenant',
          description: appError.message,
          variant: 'error',
        })
      }
      setConfirmAction(null)
    },
    [addToast, disableTenant],
  )

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return
    if (confirmAction.type === 'enable') {
      await handleEnable(confirmAction.tenant)
    } else if (confirmAction.type === 'disable') {
      await handleDisable(confirmAction.tenant)
    }
  }, [confirmAction, handleDisable, handleEnable])

  return (
    <section className="maintain-tenants container" aria-label="Maintain Tenants">
      <TenantListView
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        rows={rows}
        isListLoading={isListLoading}
        isListFetching={isListFetching}
        listAppError={listAppError}
        totalPages={totalPages}
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        createButtonDisabled={createButtonDisabled}
        showCreateAction={showCreateAction}
        showTenantAdminColumn={showTenantAdminColumn}
        allowAssignAdmin={allowAssignAdmin}
        allowLifecycleActions={allowLifecycleActions}
        tenantAdminScopeNote={tenantAdminScopeNote}
        onCreateClick={() => setShowCreateWizard(true)}
        onEditClick={(tenant) => {
          setAssigningTenantAdmin(null)
          setEditingTenant(tenant)
        }}
        onLinkedUsersClick={(tenant) => {
          const tenantId = getTenantId(tenant)

          if (!tenantId) {
            addToast({
              title: 'Missing tenant identifier',
              description: 'This tenant record is missing an identifier, so linked users could not be opened.',
              variant: 'error',
            })
            return
          }

          navigate(`/app/administration/maintain-tenants/${tenantId}/linked-users`, {
            state: { tenant },
          })
        }}
        onAssignAdminClick={(tenant) => {
          setEditingTenant(null)
          setAssigningTenantAdmin(tenant)
        }}
        onEnableClick={(tenant) => setConfirmAction({ type: 'enable', tenant })}
        onDisableClick={(tenant) => setConfirmAction({ type: 'disable', tenant })}
        tenantCapacityGuidance={tenantCapacityGuidance}
        lifecycleNote={lifecycleNote}
        isLifecycleMutationLoading={isLifecycleMutationLoading}
      />

      <CreateTenantWizard
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        customerId={customerId}
        tenantCapacity={tenantCapacity}
      />

      <TenantEditDrawer
        open={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        tenant={editingTenant}
        customerId={customerId}
      />

      <TenantAdminAssignmentDialog
        open={!!assigningTenantAdmin}
        onClose={() => setAssigningTenantAdmin(null)}
        tenant={assigningTenantAdmin}
        customerId={customerId}
      />

      {confirmAction ? (
        <Dialog
          open
          onClose={() => setConfirmAction(null)}
          size="sm"
          closeOnBackdropClick={!isLifecycleMutationLoading}
          closeOnEscape={!isLifecycleMutationLoading}
        >
          <Dialog.Header>
            <h2 className="maintain-tenants__dialog-title maintain-tenants__confirm-title">
              {confirmActionCopy.title}
            </h2>
          </Dialog.Header>
          <Dialog.Body className="maintain-tenants__confirm-body">
            <p className="maintain-tenants__confirm-message">{confirmActionCopy.message}</p>
          </Dialog.Body>
          <Dialog.Footer className="maintain-tenants__dialog-footer maintain-tenants__confirm-footer">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isLifecycleMutationLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction.type === 'disable' ? 'danger' : 'primary'}
              onClick={handleConfirmAction}
              loading={isLifecycleMutationLoading}
              disabled={isLifecycleMutationLoading}
            >
              {confirmActionCopy.confirmLabel}
            </Button>
          </Dialog.Footer>
        </Dialog>
      ) : null}
    </section>
  )
}

function MaintainTenants() {
  const {
    user,
    isSuperAdmin,
    hasCustomerRole,
    hasTenantRole,
    getAccessibleTenants,
  } = useAuthorization()
  const { customerId, selectedCustomerTopology, supportsTenantManagement } = useTenantContext()
  const currentUserId = useMemo(
    () => String(user?._id ?? user?.id ?? '').trim(),
    [user],
  )

  const isSelectedCustomerCustomerAdmin = useMemo(
    () => Boolean(customerId && hasCustomerRole(customerId, 'CUSTOMER_ADMIN')),
    [customerId, hasCustomerRole],
  )
  const isSelectedCustomerCustomerScopedTenantAdmin = useMemo(
    () => Boolean(customerId && hasCustomerRole(customerId, 'TENANT_ADMIN')),
    [customerId, hasCustomerRole],
  )

  const selectedCustomerTenantAdminIds = useMemo(() => {
    if (!customerId) return []

    return getAccessibleTenants(customerId).filter(
      (tenantId) => hasTenantRole(customerId, tenantId, 'TENANT_ADMIN'),
    )
  }, [customerId, getAccessibleTenants, hasTenantRole])

  const isSelectedCustomerTenantAdmin =
    selectedCustomerTenantAdminIds.length > 0 || isSelectedCustomerCustomerScopedTenantAdmin
  const hasTenantMaintenanceAccess =
    isSuperAdmin || isSelectedCustomerCustomerAdmin || isSelectedCustomerTenantAdmin
  const isTenantAdminScopedView =
    !isSuperAdmin && !isSelectedCustomerCustomerAdmin && isSelectedCustomerTenantAdmin

  const {
    tenants,
    pagination,
    isLoading,
    isFetching,
    error: listError,
    tenantCapacity,
    setSearch,
    statusFilter,
    setStatusFilter,
    setPage,
    enableTenant,
    enableTenantResult,
    disableTenant,
    disableTenantResult,
  } = useTenants(customerId, {
    skipListQuery: !customerId || !hasTenantMaintenanceAccess,
  })

  const tenantAdminScopeSet = useMemo(
    () => new Set(selectedCustomerTenantAdminIds.map((tenantId) => tenantId.toString())),
    [selectedCustomerTenantAdminIds],
  )

  const visibleTenants = useMemo(() => {
    if (!isTenantAdminScopedView) return tenants

    if (tenantAdminScopeSet.size > 0) {
      return tenants.filter((tenant) => {
        const tenantId = getTenantId(tenant)
        return Boolean(tenantId) && tenantAdminScopeSet.has(tenantId.toString())
      })
    }

    if (!currentUserId) return []

    return tenants.filter((tenant) => getTenantAdminUserId(tenant) === currentUserId)
  }, [currentUserId, isTenantAdminScopedView, tenantAdminScopeSet, tenants])

  const isClientFilteredTenantAdminView = useMemo(
    () => isTenantAdminScopedView && visibleTenants.length !== tenants.length,
    [isTenantAdminScopedView, tenants.length, visibleTenants.length],
  )

  const scopedPagination = useMemo(
    () =>
      isClientFilteredTenantAdminView
        ? {
            totalPages: 1,
            page: 1,
            total: visibleTenants.length,
          }
        : pagination,
    [isClientFilteredTenantAdminView, pagination, visibleTenants.length],
  )

  const listTenantsAppError = useMemo(
    () => (listError ? normalizeError(listError) : null),
    [listError],
  )
  const tenantCapacityGuidance = useMemo(
    () => getTenantCapacityGuidance(tenantCapacity),
    [tenantCapacity],
  )

  const selectedCustomerLifecycleStatus = useMemo(
    () => getCustomerLifecycleStatus(user, customerId),
    [customerId, user],
  )

  const inactiveCustomerAppError = useMemo(
    () => (isCustomerInactiveError(listTenantsAppError) ? listTenantsAppError : null),
    [listTenantsAppError],
  )

  const isInactiveCustomerLocked =
    selectedCustomerLifecycleStatus === 'INACTIVE' || Boolean(inactiveCustomerAppError)
  const isTenantCreateBlocked = tenantCapacity?.isAtCapacity === true
  const isLifecycleMutationLoading =
    Boolean(enableTenantResult?.isLoading) || Boolean(disableTenantResult?.isLoading)

  const inactiveCustomerMessage = useMemo(
    () => getCustomerInactiveMessage(
      inactiveCustomerAppError,
      MAINTAIN_TENANTS_INACTIVE_CUSTOMER_MESSAGE,
    ),
    [inactiveCustomerAppError],
  )

  const canCreateTenant = !isTenantAdminScopedView
  const canAssignTenantAdmin = !isTenantAdminScopedView
  const canRunLifecycleActions = hasTenantMaintenanceAccess
  const showTenantAdminColumn = !isTenantAdminScopedView

  const lifecycleNote = isTenantAdminScopedView
    ? MAINTAIN_TENANTS_TENANT_ADMIN_LIFECYCLE_NOTE
    : MAINTAIN_TENANTS_LIFECYCLE_NOTE

  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE)
    return () => clearTimeout(timer)
  }, [searchInput, setSearch, setPage])

  if (!customerId && !isSuperAdmin) {
    return (
      <MaintainTenantsBoundaryState
        message="No customer context available. Please contact your administrator."
      />
    )
  }

  if (!customerId && isSuperAdmin) {
    return (
      <MaintainTenantsBoundaryState
        message="Please select a customer from the dashboard context panel to manage tenants."
      />
    )
  }

  if (!hasTenantMaintenanceAccess) {
    return (
      <MaintainTenantsBoundaryState
        message={MAINTAIN_TENANTS_UNAUTHORIZED_MESSAGE}
      />
    )
  }

  if (isInactiveCustomerLocked) {
    return (
      <MaintainTenantsBoundaryState
        message={inactiveCustomerMessage}
      />
    )
  }

  if (
    selectedCustomerTopology === 'SINGLE_TENANT'
    && !supportsTenantManagement
    && !isTenantAdminScopedView
  ) {
    return (
      <MaintainTenantsBoundaryState
        message={MAINTAIN_TENANTS_SINGLE_TENANT_MESSAGE}
      />
    )
  }

  return (
    <MaintainTenantsWorkspace
      key={[
        customerId,
        showTenantAdminColumn ? 'full' : 'tenant-scoped',
        canCreateTenant ? 'create' : 'no-create',
        canAssignTenantAdmin ? 'assign' : 'no-assign',
        canRunLifecycleActions ? 'lifecycle' : 'no-lifecycle',
      ].join(':')}
      customerId={customerId}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      statusFilter={statusFilter}
      onStatusFilterChange={(nextStatus) => {
        setStatusFilter(nextStatus)
        setPage(1)
      }}
      rows={visibleTenants}
      isListLoading={isLoading}
      isListFetching={isFetching}
      listAppError={listTenantsAppError}
      totalPages={scopedPagination.totalPages}
      currentPage={scopedPagination.page}
      totalCount={scopedPagination.total}
      onPageChange={setPage}
      createButtonDisabled={!canCreateTenant || isFetching || isTenantCreateBlocked}
      showCreateAction={canCreateTenant}
      showTenantAdminColumn={showTenantAdminColumn}
      allowAssignAdmin={canAssignTenantAdmin}
      allowLifecycleActions={canRunLifecycleActions}
      tenantAdminScopeNote={isTenantAdminScopedView ? MAINTAIN_TENANTS_TENANT_ADMIN_SCOPE_NOTE : null}
      tenantCapacityGuidance={tenantCapacityGuidance}
      tenantCapacity={tenantCapacity}
      lifecycleNote={lifecycleNote}
      isLifecycleMutationLoading={isLifecycleMutationLoading}
      enableTenant={enableTenant}
      disableTenant={disableTenant}
    />
  )
}

export default MaintainTenants
