import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Select } from '../../components/Select'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Dialog } from '../../components/Dialog'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAssignAdminMutation,
  useReplaceCustomerAdminMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import {
  normalizeError,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import './SuperAdminCustomers.css'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const TOPOLOGY_FILTER_OPTIONS = [
  { value: '', label: 'All topologies' },
  { value: 'SINGLE_TENANT', label: 'Single Tenant' },
  { value: 'MULTI_TENANT', label: 'Multi Tenant' },
]

const BILLING_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
]

const VMF_POLICY_OPTIONS = {
  SINGLE_TENANT: [
    { value: 'SINGLE', label: 'Single VMF' },
    { value: 'MULTI', label: 'Multiple VMFs' },
  ],
  MULTI_TENANT: [
    { value: 'PER_TENANT_SINGLE', label: 'Per Tenant Single VMF' },
    { value: 'PER_TENANT_MULTI', label: 'Per Tenant Multi VMF' },
  ],
}

const INITIAL_FORM = {
  name: '',
  website: '',
  topology: 'SINGLE_TENANT',
  vmfPolicy: 'SINGLE',
  licenseLevelId: '',
  maxTenants: '1',
  maxVmfsPerTenant: '1',
  planCode: 'FREE',
  billingCycle: 'MONTHLY',
}

const getCustomerId = (customer) => customer?.id ?? customer?._id
const displayStatus = (value) => (value === 'DISABLED' ? 'INACTIVE' : value || '--')
const getDefaultVmfPolicy = (topology) =>
  topology === 'MULTI_TENANT' ? 'PER_TENANT_SINGLE' : 'SINGLE'

const formatDate = (value) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleString()
}

const parsePositiveInt = (value) => Number.parseInt(String(value ?? '').trim(), 10)

const isValidUrl = (value) => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

const createFormFromCustomer = (customer) => ({
  name: customer?.name ?? '',
  website: customer?.website ?? '',
  topology: customer?.topology ?? 'SINGLE_TENANT',
  vmfPolicy: customer?.vmfPolicy ?? getDefaultVmfPolicy(customer?.topology),
  licenseLevelId: customer?.licenseLevelId ?? '',
  maxTenants: String(customer?.governance?.maxTenants ?? 1),
  maxVmfsPerTenant: String(customer?.governance?.maxVmfsPerTenant ?? 1),
  planCode: customer?.billing?.planCode ?? 'FREE',
  billingCycle: customer?.billing?.cycle ?? 'MONTHLY',
})

const validateForm = (form) => {
  const errors = {}
  const payload = {}

  const name = form.name.trim()
  if (!name) errors.name = 'Name is required.'
  else payload.name = name

  const website = form.website.trim()
  if (website && !isValidUrl(website)) errors.website = 'Website must be a valid URL.'
  else if (website) payload.website = website

  if (!form.licenseLevelId) errors.licenseLevelId = 'Licence level is required.'
  else payload.licenseLevelId = form.licenseLevelId

  const maxTenants = parsePositiveInt(form.maxTenants)
  const maxVmfsPerTenant = parsePositiveInt(form.maxVmfsPerTenant)
  if (!Number.isInteger(maxTenants) || maxTenants < 1) {
    errors.maxTenants = 'Max tenants must be at least 1.'
  }
  if (!Number.isInteger(maxVmfsPerTenant) || maxVmfsPerTenant < 1) {
    errors.maxVmfsPerTenant = 'Max VMFs per tenant must be at least 1.'
  }

  payload.topology = form.topology
  payload.vmfPolicy = form.vmfPolicy
  payload.isServiceProvider = form.topology === 'MULTI_TENANT'
  payload.governance = { maxTenants, maxVmfsPerTenant }
  payload.billing = {
    planCode: form.planCode.trim() || 'FREE',
    cycle: form.billingCycle,
  }

  return { errors, payload }
}

function SuperAdminCustomers() {
  const { addToast } = useToaster()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [topologyFilter, setTopologyFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editErrors, setEditErrors] = useState({})

  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminMode, setAdminMode] = useState('assign')
  const [adminCustomer, setAdminCustomer] = useState(null)
  const [adminUserId, setAdminUserId] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [adminStepUpToken, setAdminStepUpToken] = useState('')
  const [adminError, setAdminError] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListCustomersQuery({
    page,
    pageSize: 20,
    q: debouncedSearch.trim(),
    status: statusFilter,
    topology: topologyFilter,
  })

  const {
    data: licenseLevelsResponse,
    isLoading: isLoadingLicenseLevels,
  } = useListLicenseLevelsQuery({
    page: 1,
    pageSize: 100,
    isActive: true,
  })

  const {
    data: customerDetailsResponse,
    isFetching: isFetchingCustomerDetails,
    error: customerDetailsError,
  } = useGetCustomerQuery(editCustomerId, {
    skip: !editCustomerId,
  })

  const [createCustomer, createResult] = useCreateCustomerMutation()
  const [updateCustomer, updateResult] = useUpdateCustomerMutation()
  const [updateCustomerStatus, updateStatusResult] = useUpdateCustomerStatusMutation()
  const [assignAdmin, assignAdminResult] = useAssignAdminMutation()
  const [replaceCustomerAdmin, replaceAdminResult] = useReplaceCustomerAdminMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const licenseLevels = licenseLevelsResponse?.data ?? []

  useEffect(() => {
    if (!customerDetailsResponse?.data) return
    setEditForm(createFormFromCustomer(customerDetailsResponse.data))
  }, [customerDetailsResponse])

  const listAppError = listError ? normalizeError(listError) : null
  const customerDetailsAppError = customerDetailsError
    ? normalizeError(customerDetailsError)
    : null

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createCustomer(payload).unwrap()
        setCreateForm(INITIAL_FORM)
        addToast({
          title: 'Customer created',
          description: `${payload.name} was created successfully.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        if (appError.status === 409) {
          setCreateErrors({ name: appError.message })
          return
        }
        addToast({
          title: 'Failed to create customer',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createCustomer, createForm, addToast],
  )

  const openEditDialog = useCallback((row) => {
    const customerId = getCustomerId(row)
    if (!customerId) return
    setEditCustomerId(customerId)
    setEditErrors({})
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditCustomerId('')
    setEditErrors({})
    setEditForm(INITIAL_FORM)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editCustomerId) return
    setEditErrors({})

    const { errors, payload } = validateForm(editForm)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    try {
      await updateCustomer({ customerId: editCustomerId, ...payload }).unwrap()
      addToast({
        title: 'Customer updated',
        description: 'Customer settings were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      if (appError.status === 409) {
        setEditErrors({ name: appError.message })
        return
      }
      addToast({
        title: 'Failed to update customer',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [addToast, closeEditDialog, editCustomerId, editForm, updateCustomer])

  const handleUpdateStatus = useCallback(
    async (row, status) => {
      const customerId = getCustomerId(row)
      if (!customerId) return
      try {
        await updateCustomerStatus({ customerId, status }).unwrap()
        addToast({
          title: 'Status updated',
          description: `${row.name} is now ${status}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to update status',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, updateCustomerStatus],
  )

  const openAdminDialog = useCallback((mode, row) => {
    setAdminMode(mode)
    setAdminCustomer(row)
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
    setAdminDialogOpen(true)
  }, [])

  const closeAdminDialog = useCallback(() => {
    setAdminDialogOpen(false)
    setAdminCustomer(null)
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
  }, [])

  const handleAdminMutation = useCallback(async () => {
    if (!adminCustomer) return
    const customerId = getCustomerId(adminCustomer)
    if (!customerId) return

    if (!adminUserId.trim()) {
      setAdminError('User ID is required.')
      return
    }
    if (adminMode === 'replace') {
      if (!adminReason.trim()) {
        setAdminError('Reason is required.')
        return
      }
      if (!adminStepUpToken) {
        setAdminError('Step-up verification is required.')
        return
      }
    }

    try {
      if (adminMode === 'assign') {
        await assignAdmin({ customerId, userId: adminUserId.trim() }).unwrap()
      } else {
        await replaceCustomerAdmin({
          customerId,
          newUserId: adminUserId.trim(),
          reason: adminReason.trim(),
          stepUpToken: adminStepUpToken,
        }).unwrap()
      }
      addToast({
        title: adminMode === 'assign' ? 'Customer admin assigned' : 'Customer admin replaced',
        description: `Canonical admin updated for ${adminCustomer.name}.`,
        variant: 'success',
      })
      closeAdminDialog()
    } catch (err) {
      const appError = normalizeError(err)
      if (isCanonicalAdminConflictError(appError)) {
        setAdminError(
          getCanonicalAdminConflictMessage(
            appError,
            adminMode === 'assign' ? 'assign' : 'update_roles',
          ),
        )
        return
      }
      setAdminError(appError.message)
    }
  }, [
    addToast,
    adminCustomer,
    adminMode,
    adminReason,
    adminStepUpToken,
    adminUserId,
    assignAdmin,
    closeAdminDialog,
    replaceCustomerAdmin,
  ])

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={displayStatus(value) === 'ACTIVE' ? 'success' : 'warning'}>
            {displayStatus(value)}
          </Status>
        ),
      },
      {
        key: 'topology',
        label: 'Topology',
        render: (value) => (value === 'MULTI_TENANT' ? 'Multi Tenant' : 'Single Tenant'),
      },
      {
        key: 'governance',
        label: 'Limits',
        render: (_value, row) =>
          `${row?.governance?.maxTenants ?? '--'} / ${row?.governance?.maxVmfsPerTenant ?? '--'}`,
      },
      {
        key: 'customerAdminUserId',
        label: 'Canonical Admin',
        render: (_value, row) => row?.governance?.customerAdminUserId ?? '--',
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        render: (value) => formatDate(value),
      },
    ],
    [],
  )

  const actions = useMemo(
    () => [
      { label: 'Edit', variant: 'ghost' },
      {
        label: 'Set Active',
        variant: 'ghost',
        disabled: (row) => displayStatus(row?.status) === 'ACTIVE',
      },
      {
        label: 'Set Inactive',
        variant: 'ghost',
        disabled: (row) => displayStatus(row?.status) === 'INACTIVE',
      },
      { label: 'Assign Admin', variant: 'ghost' },
      { label: 'Replace Admin', variant: 'ghost' },
    ],
    [],
  )

  const adminMutationLoading =
    assignAdminResult.isLoading || replaceAdminResult.isLoading

  return (
    <section className="super-admin-customers container" aria-label="Super admin customers">
      <header className="super-admin-customers__header">
        <h1 className="super-admin-customers__title">Customers</h1>
        <p className="super-admin-customers__subtitle">
          Manage customer lifecycle, governance limits, and canonical customer admin flows.
        </p>
      </header>

      <div className="super-admin-customers__grid">
        <Fieldset className="super-admin-customers__fieldset">
          <Fieldset.Legend className="super-admin-customers__legend">
            <h2 className="super-admin-customers__section-title">Create Customer</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="super-admin-customers__card">
            <Card.Body>
              <form className="super-admin-customers__form" onSubmit={handleCreate} noValidate>
                <Input
                  id="sa-customer-name"
                  label="Customer Name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  error={createErrors.name}
                  required
                  fullWidth
                />
                <Input
                  id="sa-customer-website"
                  label="Website (Optional)"
                  value={createForm.website}
                  onChange={(event) => setCreateForm((current) => ({ ...current, website: event.target.value }))}
                  error={createErrors.website}
                  fullWidth
                />
                <div className="super-admin-customers__row">
                  <Select
                    id="sa-customer-topology"
                    label="Topology"
                    value={createForm.topology}
                    options={[
                      { value: 'SINGLE_TENANT', label: 'Single Tenant' },
                      { value: 'MULTI_TENANT', label: 'Multi Tenant' },
                    ]}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        topology: event.target.value,
                        vmfPolicy: getDefaultVmfPolicy(event.target.value),
                      }))
                    }
                  />
                  <Select
                    id="sa-customer-vmf-policy"
                    label="VMF Policy"
                    value={createForm.vmfPolicy}
                    options={VMF_POLICY_OPTIONS[createForm.topology]}
                    onChange={(event) => setCreateForm((current) => ({ ...current, vmfPolicy: event.target.value }))}
                  />
                </div>
                <Select
                  id="sa-customer-license"
                  label="Licence Level"
                  value={createForm.licenseLevelId}
                  options={[
                    { value: '', label: isLoadingLicenseLevels ? 'Loading...' : 'Select licence level' },
                    ...licenseLevels
                      .map((level) => {
                        const levelId = level.id ?? level._id
                        if (!levelId) return null
                        return { value: levelId, label: level.name ?? levelId }
                      })
                      .filter(Boolean),
                  ]}
                  onChange={(event) => setCreateForm((current) => ({ ...current, licenseLevelId: event.target.value }))}
                  error={createErrors.licenseLevelId}
                />
                <div className="super-admin-customers__row">
                  <Input
                    id="sa-customer-max-tenants"
                    type="number"
                    min={1}
                    label="Max Tenants"
                    value={createForm.maxTenants}
                    onChange={(event) => setCreateForm((current) => ({ ...current, maxTenants: event.target.value }))}
                    error={createErrors.maxTenants}
                    fullWidth
                  />
                  <Input
                    id="sa-customer-max-vmfs"
                    type="number"
                    min={1}
                    label="Max VMFs Per Tenant"
                    value={createForm.maxVmfsPerTenant}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, maxVmfsPerTenant: event.target.value }))
                    }
                    error={createErrors.maxVmfsPerTenant}
                    fullWidth
                  />
                </div>
                <div className="super-admin-customers__row">
                  <Input
                    id="sa-customer-plan"
                    label="Plan Code"
                    value={createForm.planCode}
                    onChange={(event) => setCreateForm((current) => ({ ...current, planCode: event.target.value }))}
                    fullWidth
                  />
                  <Select
                    id="sa-customer-billing"
                    label="Billing Cycle"
                    value={createForm.billingCycle}
                    options={BILLING_CYCLE_OPTIONS}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, billingCycle: event.target.value }))
                    }
                  />
                </div>
                <div className="super-admin-customers__form-actions">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={createResult.isLoading}
                    disabled={createResult.isLoading || licenseLevels.length === 0}
                  >
                    Create Customer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    disabled={createResult.isLoading}
                    onClick={() => {
                      setCreateForm(INITIAL_FORM)
                      setCreateErrors({})
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>
        </Fieldset>

        <Fieldset className="super-admin-customers__fieldset">
          <Fieldset.Legend className="super-admin-customers__legend">
            <h2 className="super-admin-customers__section-title">Customer Catalogue</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="super-admin-customers__card">
            <Card.Body>
              <div className="super-admin-customers__toolbar">
                <Input
                  id="sa-customer-search"
                  label="Search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  fullWidth
                />
                <Select
                  id="sa-customer-status-filter"
                  label="Status"
                  value={statusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                />
                <Select
                  id="sa-customer-topology-filter"
                  label="Topology"
                  value={topologyFilter}
                  options={TOPOLOGY_FILTER_OPTIONS}
                  onChange={(event) => {
                    setTopologyFilter(event.target.value)
                    setPage(1)
                  }}
                />
              </div>
              {listAppError ? (
                <p className="super-admin-customers__error" role="alert">
                  {listAppError.message}
                </p>
              ) : null}
              <HorizontalScroll className="super-admin-customers__table-wrap" ariaLabel="Customers table" gap="sm">
                <Table
                  className="super-admin-customers__table"
                  columns={columns}
                  data={rows}
                  actions={actions}
                  onRowAction={(label, row) => {
                    if (label === 'Edit') openEditDialog(row)
                    if (label === 'Set Active') handleUpdateStatus(row, 'ACTIVE')
                    if (label === 'Set Inactive') handleUpdateStatus(row, 'INACTIVE')
                    if (label === 'Assign Admin') openAdminDialog('assign', row)
                    if (label === 'Replace Admin') openAdminDialog('replace', row)
                  }}
                  loading={isListLoading}
                  variant="striped"
                  hoverable
                  emptyMessage="No customers found."
                  ariaLabel="Customers"
                />
              </HorizontalScroll>
              {isListFetching && !isListLoading ? (
                <p className="super-admin-customers__muted">Refreshing list...</p>
              ) : null}
              {totalPages > 1 ? (
                <div className="super-admin-customers__pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isListFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <p className="super-admin-customers__pagination-info">
                    Page {Number(meta.page) || page} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isListFetching}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

      <Dialog open={editOpen} onClose={closeEditDialog} size="lg">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">Update Customer</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          {customerDetailsAppError ? (
            <p className="super-admin-customers__error" role="alert">
              {customerDetailsAppError.message}
            </p>
          ) : null}
          <Input
            id="sa-customer-edit-name"
            label="Customer Name"
            value={editForm.name}
            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
            error={editErrors.name}
            fullWidth
            disabled={isFetchingCustomerDetails}
          />
          <Input
            id="sa-customer-edit-website"
            label="Website (Optional)"
            value={editForm.website}
            onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))}
            error={editErrors.website}
            fullWidth
            disabled={isFetchingCustomerDetails}
          />
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-edit-topology"
              label="Topology"
              value={editForm.topology}
              options={[
                { value: 'SINGLE_TENANT', label: 'Single Tenant' },
                { value: 'MULTI_TENANT', label: 'Multi Tenant' },
              ]}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  topology: event.target.value,
                  vmfPolicy: getDefaultVmfPolicy(event.target.value),
                }))
              }
            />
            <Select
              id="sa-customer-edit-vmf-policy"
              label="VMF Policy"
              value={editForm.vmfPolicy}
              options={VMF_POLICY_OPTIONS[editForm.topology]}
              onChange={(event) => setEditForm((current) => ({ ...current, vmfPolicy: event.target.value }))}
            />
          </div>
          <Select
            id="sa-customer-edit-license"
            label="Licence Level"
            value={editForm.licenseLevelId}
            options={[
              { value: '', label: isLoadingLicenseLevels ? 'Loading...' : 'Select licence level' },
              ...licenseLevels
                .map((level) => {
                  const levelId = level.id ?? level._id
                  if (!levelId) return null
                  return { value: levelId, label: level.name ?? levelId }
                })
                .filter(Boolean),
            ]}
            onChange={(event) => setEditForm((current) => ({ ...current, licenseLevelId: event.target.value }))}
            error={editErrors.licenseLevelId}
          />
          <div className="super-admin-customers__row">
            <Input
              id="sa-customer-edit-max-tenants"
              type="number"
              min={1}
              label="Max Tenants"
              value={editForm.maxTenants}
              onChange={(event) => setEditForm((current) => ({ ...current, maxTenants: event.target.value }))}
              error={editErrors.maxTenants}
              fullWidth
            />
            <Input
              id="sa-customer-edit-max-vmfs"
              type="number"
              min={1}
              label="Max VMFs Per Tenant"
              value={editForm.maxVmfsPerTenant}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, maxVmfsPerTenant: event.target.value }))
              }
              error={editErrors.maxVmfsPerTenant}
              fullWidth
            />
          </div>
          <div className="super-admin-customers__row">
            <Input
              id="sa-customer-edit-plan"
              label="Plan Code"
              value={editForm.planCode}
              onChange={(event) => setEditForm((current) => ({ ...current, planCode: event.target.value }))}
              fullWidth
            />
            <Select
              id="sa-customer-edit-billing"
              label="Billing Cycle"
              value={editForm.billingCycle}
              options={BILLING_CYCLE_OPTIONS}
              onChange={(event) => setEditForm((current) => ({ ...current, billingCycle: event.target.value }))}
            />
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeEditDialog} disabled={updateResult.isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            loading={updateResult.isLoading}
            disabled={updateResult.isLoading}
          >
            Save Changes
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={adminDialogOpen} onClose={closeAdminDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">
            {adminMode === 'assign' ? 'Assign Customer Admin' : 'Replace Customer Admin'}
          </h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          <p className="super-admin-customers__dialog-subtitle">
            Customer: <strong>{adminCustomer?.name ?? '--'}</strong>
          </p>
          <Input
            id="sa-admin-user-id"
            label={adminMode === 'assign' ? 'User ID' : 'New User ID'}
            value={adminUserId}
            onChange={(event) => {
              setAdminUserId(event.target.value)
              setAdminError('')
            }}
            fullWidth
          />
          {adminMode === 'replace' ? (
            <>
              <Textarea
                id="sa-admin-reason"
                label="Reason"
                value={adminReason}
                onChange={(event) => {
                  setAdminReason(event.target.value)
                  setAdminError('')
                }}
                rows={3}
                fullWidth
              />
              <StepUpAuthForm
                onStepUpComplete={(token) => {
                  setAdminStepUpToken(token)
                  setAdminError('')
                }}
              />
            </>
          ) : null}
          {adminError ? (
            <p className="super-admin-customers__error" role="alert">
              {adminError}
            </p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeAdminDialog} disabled={adminMutationLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAdminMutation}
            loading={adminMutationLoading}
            disabled={adminMutationLoading || (adminMode === 'replace' && !adminStepUpToken)}
          >
            {adminMode === 'assign' ? 'Assign Admin' : 'Replace Admin'}
          </Button>
        </Dialog.Footer>
      </Dialog>

      {updateStatusResult.isLoading ? (
        <p className="super-admin-customers__muted">Updating customer status...</p>
      ) : null}
    </section>
  )
}

export default SuperAdminCustomers
