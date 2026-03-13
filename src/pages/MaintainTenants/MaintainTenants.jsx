/**
 * Maintain Tenants Page
 *
 * Tenant management page at `/app/administration/maintain-tenants`.
 * Displays a data table of tenants for the current customer with
 * search, status filter, pagination, and row-level actions.
 *
 * Requires CUSTOMER_ADMIN role (multi-tenant / service-provider customers).
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Table } from '../../components/Table'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Dialog } from '../../components/Dialog'
import { ErrorSupportPanel } from '../../components/ErrorSupportPanel'
import { Spinner } from '../../components/Spinner'
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
import './MaintainTenants.css'

/** Debounce delay for search input (ms) */
const SEARCH_DEBOUNCE = 300

/** Status filter options */
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ENABLED', label: 'Enabled' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
]

/** Status variant mapping */
const STATUS_VARIANT_MAP = {
  ENABLED: 'success',
  DISABLED: 'error',
  ARCHIVED: 'neutral',
}

const MAINTAIN_TENANTS_INACTIVE_CUSTOMER_MESSAGE =
  'This customer is inactive. Tenant-management actions are unavailable until a Super Admin reactivates the customer.'

const MAINTAIN_TENANTS_SINGLE_TENANT_MESSAGE =
  'This customer uses single-tenant topology. Tenant management is only available for multi-tenant customers.'

const MAINTAIN_TENANTS_LIFECYCLE_NOTE =
  'Disable removes tenant access immediately. Enable restores access immediately. Default tenants stay enabled, and archived tenants are read-only.'

const getTenantCapacityCountLabel = (countMode) =>
  countMode === 'NON_ARCHIVED' ? 'non-archived' : 'active'

const getTenantStatus = (tenant) => String(tenant?.status ?? 'UNKNOWN').trim().toUpperCase()

const canEditTenant = (tenant) =>
  Boolean(tenant?._id || tenant?.id) && getTenantStatus(tenant) !== 'ARCHIVED'

const canEnableTenant = (tenant) =>
  Boolean(tenant?._id || tenant?.id) && getTenantStatus(tenant) === 'DISABLED'

const canDisableTenant = (tenant) =>
  Boolean(tenant?._id || tenant?.id)
  && getTenantStatus(tenant) === 'ENABLED'
  && tenant?.isDefault !== true

const getTenantLifecycleDetail = (tenant) => {
  const tenantStatus = getTenantStatus(tenant)

  if (tenantStatus === 'ENABLED') {
    return tenant?.isDefault
      ? 'Default tenant remains available and cannot be disabled here.'
      : 'Users assigned here retain access.'
  }

  if (tenantStatus === 'DISABLED') {
    return 'Users assigned here cannot access this tenant until it is re-enabled.'
  }

  if (tenantStatus === 'ARCHIVED') {
    return 'Archived tenants are read-only in this workspace.'
  }

  return 'Lifecycle state requires review before making access changes.'
}

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

/**
 * MaintainTenants Page Component
 */
function MaintainTenants() {
  const { addToast } = useToaster()
  const { user, isSuperAdmin } = useAuthorization()

  /* ---- Resolve customer context from shared store ---- */
  const { customerId, selectedCustomerTopology, supportsTenantManagement } = useTenantContext()

  /* ---- Tenant list hook ---- */
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
    page,
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

  /* ---- Debounced search ---- */
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE)
    return () => clearTimeout(timer)
  }, [searchInput, setSearch, setPage])

  /* ---- Dialog state ---- */
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

  /* ---- Action handlers ---- */

  const handleEnable = useCallback(
    async (tenant) => {
      try {
        await enableTenant(tenant._id)
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
      try {
        await disableTenant(tenant._id)
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

  /* ---- Table columns ---- */
  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'website',
        label: 'Website',
        render: (value) =>
          value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="maintain-tenants__link"
            >
              {value}
            </a>
          ) : (
            '—'
          ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => (
          <div className="maintain-tenants__status-cell">
            <Status
              variant={STATUS_VARIANT_MAP[row.status] ?? 'neutral'}
              size="sm"
              showIcon
            >
              {row.status ?? 'UNKNOWN'}
            </Status>
            <span className="maintain-tenants__status-detail">
              {getTenantLifecycleDetail(row)}
            </span>
          </div>
        ),
      },
      {
        key: 'isDefault',
        label: 'Default',
        render: (_value, row) => (row.isDefault ? 'Yes' : '—'),
      },
    ],
    [],
  )

  /* ---- Row actions ---- */
  const actions = useMemo(
    () => [
      {
        label: 'Edit',
        variant: 'ghost',
        disabled: (row) => isLifecycleMutationLoading || !canEditTenant(row),
      },
      {
        label: 'Enable',
        variant: 'ghost',
        disabled: (row) => isLifecycleMutationLoading || !canEnableTenant(row),
      },
      {
        label: 'Disable',
        variant: 'ghost',
        disabled: (row) => isLifecycleMutationLoading || !canDisableTenant(row),
      },
    ],
    [isLifecycleMutationLoading],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      switch (label) {
        case 'Edit':
          if (!canEditTenant(row)) {
            addToast({
              title: 'Archived tenant is read-only',
              description: 'Archived tenants cannot be edited from this workspace.',
              variant: 'info',
            })
            return
          }
          setEditingTenant(row)
          break
        case 'Enable':
          if (!canEnableTenant(row)) {
            if (getTenantStatus(row) === 'ENABLED') {
              addToast({
                title: 'Already enabled',
                description: `${row.name} is already enabled.`,
                variant: 'info',
              })
              return
            }
            if (getTenantStatus(row) === 'ARCHIVED') {
              addToast({
                title: 'Cannot enable archived tenant',
                description: 'Archived tenants are read-only and cannot be re-enabled here.',
                variant: 'warning',
              })
              return
            }
            addToast({
              title: 'Cannot enable tenant',
              description: 'Only disabled tenants can be re-enabled from this workspace.',
              variant: 'warning',
            })
            return
          }
          setConfirmAction({ type: 'enable', tenant: row })
          break
        case 'Disable':
          if (!canDisableTenant(row)) {
            if (row.isDefault) {
              addToast({
                title: 'Cannot disable default tenant',
                description: 'The default tenant must remain enabled for this customer.',
                variant: 'warning',
              })
              return
            }
            if (getTenantStatus(row) === 'DISABLED') {
              addToast({
                title: 'Already disabled',
                description: `${row.name} is already disabled.`,
                variant: 'info',
              })
              return
            }
            if (getTenantStatus(row) === 'ARCHIVED') {
              addToast({
                title: 'Cannot disable archived tenant',
                description: 'Archived tenants are read-only and cannot be disabled here.',
                variant: 'warning',
              })
              return
            }
            addToast({
              title: 'Cannot disable tenant',
              description: 'Only enabled non-default tenants can be disabled from this workspace.',
              variant: 'warning',
            })
            return
          }
          setConfirmAction({ type: 'disable', tenant: row })
          break
        default:
          break
      }
    },
    [addToast],
  )

  /* ---- Pagination handlers ---- */
  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1))
  }, [setPage])

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(pagination.totalPages, p + 1))
  }, [setPage, pagination.totalPages])

  /* ---- No customer ID guard ---- */
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
      {/* Page header */}
      <header className="maintain-tenants__header">
        <h1 className="maintain-tenants__title">Maintain Tenants</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateWizard(true)}
          disabled={isFetching || isTenantCreateBlocked}
        >
          Create Tenant
        </Button>
      </header>

      {tenantCapacityGuidance ? (
        <div
          className={[
            'maintain-tenants__note',
            tenantCapacityGuidance.tone === 'warning'
              ? 'maintain-tenants__note--warning'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role={tenantCapacityGuidance.tone === 'warning' ? 'alert' : 'status'}
          aria-label="Tenant capacity guidance"
        >
          <p className="maintain-tenants__note-title">{tenantCapacityGuidance.title}</p>
          <p className="maintain-tenants__note-text">{tenantCapacityGuidance.message}</p>
        </div>
      ) : null}

      <div className="maintain-tenants__lifecycle-note" role="note" aria-label="Tenant lifecycle guidance">
        <p className="maintain-tenants__lifecycle-title">Tenant lifecycle</p>
        <p className="maintain-tenants__lifecycle-text">{MAINTAIN_TENANTS_LIFECYCLE_NOTE}</p>
      </div>

      {/* Toolbar: search + filter */}
      <div className="maintain-tenants__toolbar">
        <div className="maintain-tenants__search">
          <Input
            id="tenant-search"
            type="search"
            label="Search"
            placeholder="Search by name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            fullWidth
          />
        </div>
        <div className="maintain-tenants__filter">
          <Select
            id="tenant-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {listTenantsAppError && (
        <ErrorSupportPanel
          error={listTenantsAppError}
          context="maintain-tenants-list"
        />
      )}

      {/* Data table */}
      <div className="maintain-tenants__table">
        <Table
          columns={columns}
          data={tenants}
          variant="striped"
          hoverable
          loading={isLoading}
          loadingRows={5}
          actions={actions}
          onRowAction={handleRowAction}
          emptyMessage="No tenants found."
          ariaLabel="Tenants table"
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="maintain-tenants__pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page <= 1 || isFetching}
          >
            Previous
          </Button>
          <span className="maintain-tenants__pagination-info">
            Page {pagination.page} of {pagination.totalPages}
            {pagination.total > 0 && ` (${pagination.total} tenants)`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= pagination.totalPages || isFetching}
          >
            Next
          </Button>
        </div>
      )}

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="maintain-tenants__fetching" role="status" aria-label="Updating">
          <Spinner size="sm" />
        </div>
      )}

      {/* Create Tenant Wizard */}
      <CreateTenantWizard
        open={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        customerId={customerId}
        tenantCapacity={tenantCapacity}
      />

      {/* Tenant Edit Drawer */}
      <TenantEditDrawer
        open={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        tenant={editingTenant}
        customerId={customerId}
      />

      {/* Confirm action dialog */}
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
