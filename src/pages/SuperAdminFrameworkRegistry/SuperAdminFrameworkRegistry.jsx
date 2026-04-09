import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Dialog } from '../../components/Dialog'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Status } from '../../components/Status'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Textarea } from '../../components/Textarea'
import { useToaster } from '../../components/Toaster'
import { useGetFrameworkRegistryQuery, useCreateFrameworkRegistryMutation, useListFrameworkRegistriesQuery, useUpdateFrameworkRegistryMutation } from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  formatFrameworkRegistryStatus,
  FRAMEWORK_REGISTRY_FORM_STATUS_OPTIONS,
  FRAMEWORK_REGISTRY_FORM_TYPE_OPTIONS,
  FRAMEWORK_REGISTRY_HELP_TEXT,
  FRAMEWORK_REGISTRY_PAGE_SIZE,
  FRAMEWORK_REGISTRY_STATUSES,
  FRAMEWORK_REGISTRY_STATUS_OPTIONS,
  FRAMEWORK_REGISTRY_TYPE_OPTIONS,
  FRAMEWORK_REGISTRY_STRUCTURE_TYPE_OPTIONS,
  getFrameworkRegistryStatusVariant,
  getFrameworkRegistryStructureTypeLabel,
  getFrameworkRegistryTypeLabel,
  INITIAL_FRAMEWORK_REGISTRY_FORM,
  mapFrameworkRegistryToForm,
  validateFrameworkRegistryForm,
} from './superAdminFrameworkRegistry.constants.js'
import './SuperAdminFrameworkRegistry.css'

const ALL_REGISTRIES_QUERY = {
  page: 1,
  pageSize: 100,
  q: '',
}

const isFrameworkRegistryKeyConflictError = (appError) =>
  appError?.status === 409
  && String(appError?.details?.reason ?? '').trim().toUpperCase() === 'FRAMEWORK_REGISTRY_KEY_CONFLICT'

function FrameworkRegistryRowActionsMenu({ row, onAction }) {
  return (
    <div className="super-admin-framework-registry__row-actions">
      <Select
        size="sm"
        value=""
        placeholder="Actions"
        options={[
          { value: 'View details', label: 'View details' },
          { value: 'Edit', label: 'Edit' },
        ]}
        onChange={(event) => {
          const label = event.target.value
          if (label) {
            onAction(label, row)
          }
        }}
        aria-label={`Actions for ${row.frameworkKey}`}
      />
    </div>
  )
}

function renderRegistrySummary(_value, row) {
  return (
    <div className="super-admin-framework-registry__framework-summary">
      <span className="super-admin-framework-registry__framework-name">{row.name}</span>
      <span className="super-admin-framework-registry__framework-key">{row.frameworkKey}</span>
    </div>
  )
}

function renderTokenList(value) {
  const items = Array.isArray(value) ? value : []

  if (items.length === 0) {
    return '--'
  }

  return (
    <div className="super-admin-framework-registry__token-list">
      {items.slice(0, 2).map((item) => (
        <Badge key={item} variant="info" size="sm" pill outline>
          {item}
        </Badge>
      ))}
      {items.length > 2 ? (
        <Badge variant="neutral" size="sm" pill outline>
          +{items.length - 2}
        </Badge>
      ) : null}
    </div>
  )
}

function FrameworkRegistryListView({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  setPage,
  rows,
  currentPage,
  totalPages,
  isListLoading,
  isListFetching,
  listAppError,
  onBackClick,
  openCreateDialog,
  openEditDialog,
  openDetailDialog,
}) {
  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'View details') {
        openDetailDialog(row)
      }

      if (label === 'Edit') {
        openEditDialog(row)
      }
    },
    [openDetailDialog, openEditDialog],
  )

  const columns = useMemo(
    () => [
      {
        key: 'frameworkKey',
        label: 'Framework',
        mobileLabel: 'Framework',
        render: renderRegistrySummary,
      },
      {
        key: 'type',
        label: 'Type',
        mobileLabel: 'Type',
        render: (value) => getFrameworkRegistryTypeLabel(value),
      },
      {
        key: 'structureType',
        label: 'Structure',
        mobileLabel: 'Structure',
        render: (value) => getFrameworkRegistryStructureTypeLabel(value),
      },
      {
        key: 'supportedWorkflowKeys',
        label: 'Workflow Keys',
        mobileLabel: 'Workflow Keys',
        render: renderTokenList,
      },
      {
        key: 'status',
        label: 'Status',
        mobileLabel: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={getFrameworkRegistryStatusVariant(value)}>
            {formatFrameworkRegistryStatus(value)}
          </Status>
        ),
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        mobileLabel: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'rowActions',
        label: 'Actions',
        mobileLabel: 'Actions',
        align: 'center',
        width: '164px',
        render: (_value, row) => (
          <FrameworkRegistryRowActionsMenu row={row} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction],
  )

  return (
    <Fieldset className="super-admin-framework-registry__fieldset">
        <Fieldset.Legend className="sr-only">Framework registry catalogue</Fieldset.Legend>
        <Card variant="elevated" className="super-admin-framework-registry__card">
          <Card.Body className="super-admin-framework-registry__card-body super-admin-framework-registry__card-body--compact">
            <div className="super-admin-framework-registry__catalogue-actions">
              <Button type="button" variant="outline" size="sm" onClick={onBackClick}>
                Back
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={openCreateDialog}>
                Create Framework Key
              </Button>
            </div>

          <div className="super-admin-framework-registry__toolbar">
            <Input
              id="framework-registry-search"
              label="Search"
              size="sm"
              value={search}
              placeholder="Search by framework key, name, type, or workflow key"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              fullWidth
            />
            <Select
              id="framework-registry-status-filter"
              label="Status"
              size="sm"
              value={statusFilter}
              options={FRAMEWORK_REGISTRY_STATUS_OPTIONS}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select
              id="framework-registry-type-filter"
              label="Type"
              size="sm"
              value={typeFilter}
              options={FRAMEWORK_REGISTRY_TYPE_OPTIONS}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {listAppError ? (
            <p className="super-admin-framework-registry__error" role="alert">
              {listAppError.message}
            </p>
          ) : null}

          <p className="super-admin-framework-registry__table-note">{FRAMEWORK_REGISTRY_HELP_TEXT}</p>

          <HorizontalScroll
            className="super-admin-framework-registry__table-wrap"
            ariaLabel="Framework registry table"
            gap="sm"
          >
            <Table
              className="super-admin-framework-registry__table"
              columns={columns}
              data={rows}
              loading={isListLoading}
              variant="striped"
              hoverable
              emptyMessage="No framework registry entries found."
              ariaLabel="Framework Registry"
            />
          </HorizontalScroll>

          {isListFetching && !isListLoading ? (
            <p className="super-admin-framework-registry__muted">Refreshing list...</p>
          ) : null}

          {totalPages > 1 ? (
            <div
              className="super-admin-framework-registry__pagination"
              role="navigation"
              aria-label="Framework registry pagination"
            >
              <div className="super-admin-framework-registry__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isListFetching}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isListFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
              </div>

              <p className="super-admin-framework-registry__pagination-info">
                Page {currentPage} of {totalPages}
              </p>

              <div className="super-admin-framework-registry__pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isListFetching}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                </Button>
              </div>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </Fieldset>
  )
}

function FrameworkRegistryFormFields({ prefix, form, setForm, errors }) {
  return (
    <div className="super-admin-framework-registry__dialog-body">
      <div className="super-admin-framework-registry__row">
        <Input
          id={`${prefix}-framework-key`}
          label="Framework Key"
          value={form.frameworkKey}
          onChange={(event) =>
            setForm((current) => ({ ...current, frameworkKey: event.target.value }))
          }
          error={errors.frameworkKey}
          helperText="Canonical key used across runtime-control resources."
          fullWidth
        />

        <Input
          id={`${prefix}-name`}
          label="Framework Name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={errors.name}
          fullWidth
        />

        <Select
          id={`${prefix}-status`}
          label="Status"
          value={form.status}
          options={FRAMEWORK_REGISTRY_FORM_STATUS_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
        />
      </div>

      <div className="super-admin-framework-registry__row">
        <Select
          id={`${prefix}-type`}
          label="Type"
          value={form.type}
          options={FRAMEWORK_REGISTRY_FORM_TYPE_OPTIONS}
          onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          error={errors.type}
        />

        <Select
          id={`${prefix}-structure-type`}
          label="Structure Type"
          value={form.structureType}
          options={FRAMEWORK_REGISTRY_STRUCTURE_TYPE_OPTIONS}
          onChange={(event) =>
            setForm((current) => ({ ...current, structureType: event.target.value }))
          }
          error={errors.structureType}
        />
      </div>

      <div className="super-admin-framework-registry__row">
        <Textarea
          id={`${prefix}-workflow-keys`}
          label="Supported Workflow Keys"
          helperText="Use commas or new lines."
          value={form.supportedWorkflowKeys}
          onChange={(event) =>
            setForm((current) => ({ ...current, supportedWorkflowKeys: event.target.value }))
          }
          error={errors.supportedWorkflowKeys}
          rows={4}
          fullWidth
        />

        <Textarea
          id={`${prefix}-behavior-profile`}
          label="Default Behavior Profile"
          helperText="Enter valid JSON object for the framework defaults."
          value={form.defaultBehaviorProfile}
          onChange={(event) =>
            setForm((current) => ({ ...current, defaultBehaviorProfile: event.target.value }))
          }
          error={errors.defaultBehaviorProfile}
          rows={8}
          fullWidth
        />
      </div>
    </div>
  )
}

function CreateFrameworkRegistryDialog({
  open,
  onClose,
  createForm,
  setCreateForm,
  createErrors,
  setCreateErrors,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-framework-registry__dialog-title">Create Framework Key</h2>
      </Dialog.Header>
      <Dialog.Body>
        <form
          id="framework-registry-create-form"
          className="super-admin-framework-registry__form"
          onSubmit={onSubmit}
          noValidate
        >
          <FrameworkRegistryFormFields
            prefix="framework-registry-create"
            form={createForm}
            setForm={setCreateForm}
            errors={createErrors}
          />
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setCreateForm({
              ...INITIAL_FRAMEWORK_REGISTRY_FORM,
            })
            setCreateErrors({})
          }}
        >
          Reset
        </Button>
        <Button type="submit" form="framework-registry-create-form" variant="primary">
          Create Framework Key
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

function EditFrameworkRegistryDialog({
  open,
  onClose,
  editForm,
  setEditForm,
  editErrors,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-framework-registry__dialog-title">Update Framework Key</h2>
      </Dialog.Header>
      <Dialog.Body>
        <FrameworkRegistryFormFields
          prefix="framework-registry-edit"
          form={editForm}
          setForm={setEditForm}
          errors={editErrors}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Save Changes
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

function FrameworkRegistryDetailDialog({ open, onClose, registry, isLoading }) {
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <Dialog.Header>
        <h2 className="super-admin-framework-registry__dialog-title">
          Framework Registry Details
        </h2>
      </Dialog.Header>
      <Dialog.Body>
        {isLoading ? (
          <p className="super-admin-framework-registry__muted">Loading framework registry entry...</p>
        ) : registry ? (
          <div className="super-admin-framework-registry__detail">
            <div className="super-admin-framework-registry__detail-summary">
              <div>
                <h3 className="super-admin-framework-registry__detail-name">{registry.name}</h3>
                <p className="super-admin-framework-registry__detail-key">{registry.frameworkKey}</p>
              </div>
              <Status size="sm" showIcon variant={getFrameworkRegistryStatusVariant(registry.status)}>
                {formatFrameworkRegistryStatus(registry.status)}
              </Status>
            </div>

            <dl className="super-admin-framework-registry__detail-grid">
              <div className="super-admin-framework-registry__detail-item">
                <dt>Type</dt>
                <dd>{getFrameworkRegistryTypeLabel(registry.type)}</dd>
              </div>
              <div className="super-admin-framework-registry__detail-item">
                <dt>Structure type</dt>
                <dd>{getFrameworkRegistryStructureTypeLabel(registry.structureType)}</dd>
              </div>
              <div className="super-admin-framework-registry__detail-item">
                <dt>Supported workflow keys</dt>
                <dd>{renderTokenList(registry.supportedWorkflowKeys)}</dd>
              </div>
              <div className="super-admin-framework-registry__detail-item">
                <dt>Updated</dt>
                <dd>
                  <TableDateTime value={registry.updatedAt} />
                </dd>
              </div>
              <div className="super-admin-framework-registry__detail-item">
                <dt>Updated by</dt>
                <dd>{registry.updatedBy?.name ?? '--'}</dd>
              </div>
              <div className="super-admin-framework-registry__detail-item super-admin-framework-registry__detail-item--full">
                <dt>Default behavior profile</dt>
                <dd>
                  <pre className="super-admin-framework-registry__detail-json">
                    {JSON.stringify(registry.defaultBehaviorProfile ?? {}, null, 2)}
                  </pre>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="super-admin-framework-registry__muted">Framework registry entry not found.</p>
        )}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}

function useFrameworkRegistryManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [stepUpToken, setStepUpToken] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    ...INITIAL_FRAMEWORK_REGISTRY_FORM,
  })
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editRegistryId, setEditRegistryId] = useState('')
  const [editForm, setEditForm] = useState({
    ...INITIAL_FRAMEWORK_REGISTRY_FORM,
  })
  const [editErrors, setEditErrors] = useState({})

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRegistryId, setDetailRegistryId] = useState('')
  const [detailRegistrySnapshot, setDetailRegistrySnapshot] = useState(null)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListFrameworkRegistriesQuery({
    page,
    pageSize: FRAMEWORK_REGISTRY_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  })

  const {
    data: allRegistriesResponse,
  } = useListFrameworkRegistriesQuery(ALL_REGISTRIES_QUERY)

  const {
    data: detailResponse,
    isFetching: isDetailFetching,
  } = useGetFrameworkRegistryQuery(detailRegistryId, {
    skip: !detailOpen || !detailRegistryId,
  })

  const [createFrameworkRegistry] = useCreateFrameworkRegistryMutation()
  const [updateFrameworkRegistry] = useUpdateFrameworkRegistryMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const allRegistryRows = allRegistriesResponse?.data ?? []
  const detailRegistry = detailResponse?.data ?? detailRegistrySnapshot

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm({
      ...INITIAL_FRAMEWORK_REGISTRY_FORM,
    })
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({
      ...INITIAL_FRAMEWORK_REGISTRY_FORM,
    })
    setCreateErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateFrameworkRegistryForm(createForm, allRegistryRows)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      if (!stepUpToken) {
        addToast({
          title: 'Step-up verification required',
          description: 'Verify identity before creating a framework key.',
          variant: 'warning',
        })
        return
      }

      try {
        await createFrameworkRegistry({ ...payload, stepUpToken }).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Framework key created',
          description: `${payload.frameworkKey} is now available in the registry.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'frameworkKey',
          'name',
          'type',
          'structureType',
          'supportedWorkflowKeys',
          'compatibleWorkflowKeys',
          'defaultBehaviorProfile',
          'status',
        ])

        if (isFrameworkRegistryKeyConflictError(appError)) {
          setCreateErrors({
            frameworkKey: appError.message || 'Framework key is already in use.',
          })
          return
        }

        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to create framework key',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, allRegistryRows, closeCreateDialog, createForm, createFrameworkRegistry, stepUpToken],
  )

  const openEditDialog = useCallback((registry) => {
    setEditRegistryId(registry.id)
    setEditErrors({})
    setEditForm(mapFrameworkRegistryToForm(registry))
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditRegistryId('')
    setEditForm({
      ...INITIAL_FRAMEWORK_REGISTRY_FORM,
    })
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(
    async () => {
      if (!editRegistryId) return

      setEditErrors({})
      const { errors, payload } = validateFrameworkRegistryForm(
        editForm,
        allRegistryRows,
        editRegistryId,
      )
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      if (!stepUpToken) {
        addToast({
          title: 'Step-up verification required',
          description: 'Verify identity before updating a framework key.',
          variant: 'warning',
        })
        return
      }

      try {
        await updateFrameworkRegistry({
          registryId: editRegistryId,
          ...payload,
          stepUpToken,
        }).unwrap()

        addToast({
          title: 'Framework key updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
        closeEditDialog()
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'frameworkKey',
          'name',
          'type',
          'structureType',
          'supportedWorkflowKeys',
          'compatibleWorkflowKeys',
          'defaultBehaviorProfile',
          'status',
        ])

        if (isFrameworkRegistryKeyConflictError(appError)) {
          setEditErrors({
            frameworkKey: appError.message || 'Framework key is already in use.',
          })
          return
        }

        if (Object.keys(fieldErrors).length > 0) {
          setEditErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to update framework key',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, allRegistryRows, closeEditDialog, editForm, editRegistryId, stepUpToken, updateFrameworkRegistry],
  )

  const openDetailDialog = useCallback((registry) => {
    setDetailRegistryId(registry.id)
    setDetailRegistrySnapshot(registry)
    setDetailOpen(true)
  }, [])

  const closeDetailDialog = useCallback(() => {
    setDetailOpen(false)
    setDetailRegistryId('')
    setDetailRegistrySnapshot(null)
  }, [])

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    stepUpToken,
    setStepUpToken,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
    createOpen,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    openCreateDialog,
    closeCreateDialog,
    handleCreateSubmit,
    editOpen,
    editForm,
    setEditForm,
    editErrors,
    openEditDialog,
    closeEditDialog,
    handleEditSubmit,
    detailOpen,
    detailRegistry,
    isDetailFetching,
    openDetailDialog,
    closeDetailDialog,
  }
}

function SuperAdminFrameworkRegistry() {
  const navigate = useNavigate()
  const mgmt = useFrameworkRegistryManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  return (
    <section
      className="super-admin-framework-registry container"
      aria-label="Super admin framework registry"
    >
      <header className="super-admin-framework-registry__header">
        <h1 className="super-admin-framework-registry__title">Framework Registry</h1>
        <p className="super-admin-framework-registry__subtitle">
          Define canonical framework keys, structure boundaries, and compatibility metadata for
          Runtime Control catalogue surfaces.
        </p>
      </header>

      <Card variant="elevated" className="super-admin-framework-registry__step-up-card">
        <Card.Body className="super-admin-framework-registry__step-up-body">
          <div className="super-admin-framework-registry__step-up-copy">
            <h2 className="super-admin-framework-registry__step-up-title">
              Step-up verification
            </h2>
            <p className="super-admin-framework-registry__step-up-description">
              Verify identity once to unlock create and update actions for canonical framework
              entries.
            </p>
          </div>
          <StepUpAuthForm
            passwordLabel="Current Super Admin Password"
            passwordHelperText="Enter your current Super Admin password to verify protected Runtime Control actions."
            submitLabel="Verify Runtime Control Access"
            onStepUpComplete={mgmt.setStepUpToken}
            onCancel={() => mgmt.setStepUpToken('')}
          />
        </Card.Body>
      </Card>

      <FrameworkRegistryListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        typeFilter={mgmt.typeFilter}
        setTypeFilter={mgmt.setTypeFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
        openCreateDialog={mgmt.openCreateDialog}
        openEditDialog={mgmt.openEditDialog}
        openDetailDialog={mgmt.openDetailDialog}
      />

      <CreateFrameworkRegistryDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
      />

      <EditFrameworkRegistryDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        onSubmit={mgmt.handleEditSubmit}
      />

      <FrameworkRegistryDetailDialog
        open={mgmt.detailOpen}
        onClose={mgmt.closeDetailDialog}
        registry={mgmt.detailRegistry}
        isLoading={mgmt.isDetailFetching && !mgmt.detailRegistry}
      />
    </section>
  )
}

export default SuperAdminFrameworkRegistry
