/**
 * Maintain Tenants Page
 *
 * Tenant management page at `/app/administration/maintain-tenants`.
 * Displays a tenant catalogue for the current customer with
 * search, status filter, pagination, and lifecycle actions.
 *
 * Requires CUSTOMER_ADMIN role (multi-tenant / service-provider customers).
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
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
import TenantEditDrawer from './TenantEditDrawer'
import TenantListView from './TenantListView'
import './MaintainTenants.css'

const SEARCH_DEBOUNCE = 300

const MAINTAIN_TENANTS_INACTIVE_CUSTOMER_MESSAGE =
  'This customer is inactive. Tenant-management actions are unavailable until a Super Admin reactivates the customer.'

const MAINTAIN_TENANTS_SINGLE_TENANT_MESSAGE =
  'This customer uses single-tenant topology. Tenant management is only available for multi-tenant customers.'

const MAINTAIN_TENANTS_LIFECYCLE_NOTE =
  'Use the Actions menu to edit tenant details or change lifecycle state. Default tenants stay enabled, and archived tenants remain read-only.'

const getTenantCapacityCountLabel = (countMode) =>
  countMode === 'NON_ARCHIVED' ? 'non-archived' : 'active'

const getTenantId = (tenant) => tenant?._id ?? tenant?.id ?? null

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

function MaintainTenants() {
  const { addToast } = useToaster()
  const { user, isSuperAdmin } = useAuthorization()
  const { customerId, selectedCustomerTopology, supportsTenantManagement } = useTenantContext()

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
  } = useTenants(customerId)

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

  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE)
    return () => clearTimeout(timer)
  }, [searchInput, setSearch, setPage])

  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const confirmActionCopy = useMemo(
    () => getLifecycleConfirmationCopy(confirmAction),
    [confirmAction],
  )

  useEffect(() => {
    if (!isInactiveCustomerLocked) return

    setShowCreateWizard(false)
    setEditingTenant(null)
    setConfirmAction(null)
  }, [isInactiveCustomerLocked])

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
    [enableTenant, addToast],
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
    [disableTenant, addToast],
  )

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return
    if (confirmAction.type === 'enable') {
      handleEnable(confirmAction.tenant)
    } else if (confirmAction.type === 'disable') {
      handleDisable(confirmAction.tenant)
    }
  }, [confirmAction, handleEnable, handleDisable])

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

  if (isInactiveCustomerLocked) {
    return (
      <MaintainTenantsBoundaryState
        message={inactiveCustomerMessage}
      />
    )
  }

  if (selectedCustomerTopology === 'SINGLE_TENANT' && !supportsTenantManagement) {
    return (
      <MaintainTenantsBoundaryState
        message={MAINTAIN_TENANTS_SINGLE_TENANT_MESSAGE}
      />
    )
  }

  return (
    <section className="maintain-tenants container" aria-label="Maintain Tenants">
      <TenantListView
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={(nextStatus) => {
          setStatusFilter(nextStatus)
          setPage(1)
        }}
        rows={tenants}
        isListLoading={isLoading}
        isListFetching={isFetching}
        listAppError={listTenantsAppError}
        totalPages={pagination.totalPages}
        currentPage={pagination.page}
        totalCount={pagination.total}
        onPageChange={setPage}
        createButtonDisabled={isFetching || isTenantCreateBlocked}
        onCreateClick={() => setShowCreateWizard(true)}
        onEditClick={setEditingTenant}
        onEnableClick={(tenant) => setConfirmAction({ type: 'enable', tenant })}
        onDisableClick={(tenant) => setConfirmAction({ type: 'disable', tenant })}
        tenantCapacityGuidance={tenantCapacityGuidance}
        lifecycleNote={MAINTAIN_TENANTS_LIFECYCLE_NOTE}
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

      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="sm"
        closeOnBackdropClick={!isLifecycleMutationLoading}
        closeOnEscape={!isLifecycleMutationLoading}
      >
        <Dialog.Header>
          <h2 className="maintain-tenants__confirm-title">{confirmActionCopy.title}</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>{confirmActionCopy.message}</p>
        </Dialog.Body>
        <Dialog.Footer className="maintain-tenants__confirm-footer">
          <Button
            variant="outline"
            onClick={() => setConfirmAction(null)}
            disabled={isLifecycleMutationLoading}
          >
            Cancel
          </Button>
          <Button
            variant={confirmAction?.type === 'disable' ? 'danger' : 'primary'}
            onClick={handleConfirmAction}
            loading={isLifecycleMutationLoading}
            disabled={isLifecycleMutationLoading}
          >
            {confirmActionCopy.confirmLabel}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default MaintainTenants
