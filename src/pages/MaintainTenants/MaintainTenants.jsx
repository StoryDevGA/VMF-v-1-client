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
import { useSelector } from 'react-redux'
import { Table } from '../../components/Table'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Dialog } from '../../components/Dialog'
import { Spinner } from '../../components/Spinner'
import { useToaster } from '../../components/Toaster'
import { useTenants } from '../../hooks/useTenants.js'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { selectCurrentUser } from '../../store/slices/authSlice.js'
import { normalizeError } from '../../utils/errors.js'
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

/**
 * MaintainTenants Page Component
 */
function MaintainTenants() {
  const { addToast } = useToaster()
  const currentUser = useSelector(selectCurrentUser)
  const { isSuperAdmin } = useAuthorization()

  /* ---- Resolve customer ID from current user ---- */
  const customerId = useMemo(() => {
    if (!currentUser) return null
    const membership = currentUser.memberships?.find(
      (m) => m.customerId && m.roles?.includes('CUSTOMER_ADMIN'),
    )
    return membership?.customerId ?? null
  }, [currentUser])

  /* ---- Tenant list hook ---- */
  const {
    tenants,
    pagination,
    isLoading,
    isFetching,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    enableTenant,
    disableTenant,
  } = useTenants(customerId)

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

  /* ---- Action handlers ---- */

  const handleEnable = useCallback(
    async (tenant) => {
      try {
        await enableTenant(tenant._id)
        addToast({
          title: 'Tenant enabled',
          description: `${tenant.name} has been enabled.`,
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
          description: `${tenant.name} has been disabled.`,
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
          <Status
            variant={STATUS_VARIANT_MAP[row.status] ?? 'neutral'}
            size="sm"
            showIcon
          >
            {row.status ?? 'UNKNOWN'}
          </Status>
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
      { label: 'Edit', variant: 'ghost' },
      { label: 'Enable', variant: 'ghost' },
      { label: 'Disable', variant: 'ghost' },
    ],
    [],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      switch (label) {
        case 'Edit':
          setEditingTenant(row)
          break
        case 'Enable':
          if (row.status === 'ENABLED') {
            addToast({
              title: 'Already enabled',
              description: `${row.name} is already enabled.`,
              variant: 'info',
            })
            return
          }
          if (row.status === 'ARCHIVED') {
            addToast({
              title: 'Cannot enable archived tenant',
              description: 'Archived tenants cannot be re-enabled.',
              variant: 'warning',
            })
            return
          }
          setConfirmAction({ type: 'enable', tenant: row })
          break
        case 'Disable':
          if (row.isDefault) {
            addToast({
              title: 'Cannot disable default tenant',
              description: 'The default tenant cannot be disabled.',
              variant: 'warning',
            })
            return
          }
          if (row.status === 'DISABLED') {
            addToast({
              title: 'Already disabled',
              description: `${row.name} is already disabled.`,
              variant: 'info',
            })
            return
          }
          if (row.status === 'ARCHIVED') {
            addToast({
              title: 'Cannot disable archived tenant',
              description: 'Archived tenants cannot be disabled.',
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
      <section className="maintain-tenants container" aria-label="Maintain Tenants">
        <p className="maintain-tenants__empty">
          No customer context available. Please contact your administrator.
        </p>
      </section>
    )
  }

  return (
    <section className="maintain-tenants container" aria-label="Maintain Tenants">
      {/* Page header */}
      <div className="maintain-tenants__header">
        <h1 className="maintain-tenants__title">Maintain Tenants</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateWizard(true)}
          disabled={isFetching}
        >
          Create Tenant
        </Button>
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
      />

      {/* Tenant Edit Drawer */}
      <TenantEditDrawer
        open={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        tenant={editingTenant}
      />

      {/* Confirm action dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="sm"
      >
        <Dialog.Header>
          <h2 className="maintain-tenants__confirm-title">
            {confirmAction?.type === 'enable'
              ? 'Enable Tenant'
              : 'Disable Tenant'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            {confirmAction?.type === 'enable'
              ? `Are you sure you want to enable ${confirmAction?.tenant?.name}? Users will regain access to this tenant immediately.`
              : `Are you sure you want to disable ${confirmAction?.tenant?.name}? All users will immediately lose access to this tenant.`}
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={() => setConfirmAction(null)}
          >
            Cancel
          </Button>
          <Button
            variant={confirmAction?.type === 'disable' ? 'danger' : 'primary'}
            onClick={handleConfirmAction}
          >
            {confirmAction?.type === 'enable' ? 'Enable' : 'Disable'}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default MaintainTenants
