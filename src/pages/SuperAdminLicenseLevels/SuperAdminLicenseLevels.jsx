/**
 * Super Admin License Levels Page
 *
 * Manage licence-level catalog entries used by customer governance.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Select } from '../../components/Select'
import { Tickbox } from '../../components/Tickbox'
import { Button } from '../../components/Button'
import { Table } from '../../components/Table'
import { TableDateTime } from '../../components/TableDateTime'
import { Status } from '../../components/Status'
import { Dialog } from '../../components/Dialog'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  useListLicenseLevelsQuery,
  useCreateLicenseLevelMutation,
  useGetLicenseLevelQuery,
  useUpdateLicenseLevelMutation,
} from '../../store/api/licenseLevelApi.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminLicenseLevels.css'

const ENTITLEMENT_PATTERN = /^[A-Z][A-Z0-9_]*$/
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const INITIAL_FORM = {
  name: '',
  description: '',
  entitlements: '',
  isActive: true,
}

const normalizeEntitlementToken = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^[\[{(]+/, '')
    .replace(/[\]})]+$/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .toUpperCase()

const parseEntitlements = (value) =>
  [...new Set(
    String(value ?? '')
      .split(/[\n,]+/)
      .map(normalizeEntitlementToken)
      .filter(Boolean),
  )]

const formatEntitlements = (items) =>
  Array.isArray(items) ? items.join('\n') : ''

const getStatusVariant = (isActive) => (isActive ? 'success' : 'neutral')

function validateForm(formState) {
  const errors = {}
  const name = formState.name.trim()
  const description = formState.description.trim()
  const entitlements = parseEntitlements(formState.entitlements)

  if (!name) {
    errors.name = 'Name is required.'
  } else if (name.length > 255) {
    errors.name = 'Name must be 255 characters or fewer.'
  }

  if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.'
  }

  const invalid = entitlements.find((item) => !ENTITLEMENT_PATTERN.test(item))
  if (invalid) {
    errors.entitlements = `Invalid entitlement key "${invalid}". Use uppercase letters, numbers, and underscores.`
  }

  return {
    errors,
    payload: {
      name,
      ...(description ? { description } : {}),
      featureEntitlements: entitlements,
      isActive: Boolean(formState.isActive),
    },
  }
}

function mapValidationErrors(appError) {
  const nextErrors = {}
  const details = appError?.details

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return nextErrors
  }

  if (details.name) nextErrors.name = details.name
  if (details.description) nextErrors.description = details.description
  if (details.featureEntitlements) {
    nextErrors.entitlements = details.featureEntitlements
  }
  if (details['']) {
    nextErrors.entitlements = details['']
  }

  return nextErrors
}

function SuperAdminLicenseLevels() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [selectedLicenseLevelId, setSelectedLicenseLevelId] = useState('')
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editBase, setEditBase] = useState(INITIAL_FORM)
  const [editErrors, setEditErrors] = useState({})

  const debouncedSearch = useDebounce(search, 300)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListLicenseLevelsQuery({
    page,
    pageSize: 20,
    q: debouncedSearch.trim(),
    isActive: statusFilter || undefined,
  })

  const {
    data: selectedResponse,
    isFetching: isFetchingSelected,
    error: selectedError,
  } = useGetLicenseLevelQuery(selectedLicenseLevelId, {
    skip: !selectedLicenseLevelId,
  })

  const [createLicenseLevel, createResult] = useCreateLicenseLevelMutation()
  const [updateLicenseLevel, updateResult] = useUpdateLicenseLevelMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1

  useEffect(() => {
    if (!selectedResponse?.data) return

    const details = selectedResponse.data
    const next = {
      name: details.name ?? '',
      description: details.description ?? '',
      entitlements: formatEntitlements(details.featureEntitlements),
      isActive: Boolean(details.isActive),
    }

    setEditForm(next)
    setEditBase(next)
  }, [selectedResponse])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createLicenseLevel(payload).unwrap()
        setCreateForm(INITIAL_FORM)
        addToast({
          title: 'Licence level created',
          description: `${payload.name} is now available for customer governance.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = mapValidationErrors(appError)

        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }

        if (appError.status === 409) {
          setCreateErrors({ name: appError.message })
          return
        }

        addToast({
          title: 'Failed to create licence level',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createForm, createLicenseLevel, addToast],
  )

  const openEditDialog = useCallback((row) => {
    const id = row.id ?? row._id
    if (!id) return

    setSelectedLicenseLevelId(id)
    setEditErrors({})
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setSelectedLicenseLevelId('')
    setEditForm(INITIAL_FORM)
    setEditBase(INITIAL_FORM)
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(async () => {
    if (!selectedLicenseLevelId) return

    setEditErrors({})
    const { errors, payload } = validateForm(editForm)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    const patch = {}
    if (payload.name !== editBase.name.trim()) patch.name = payload.name
    if ((payload.description ?? '') !== editBase.description.trim()) {
      patch.description = payload.description ?? ''
    }
    if (payload.isActive !== Boolean(editBase.isActive)) {
      patch.isActive = payload.isActive
    }

    const baseEntitlements = parseEntitlements(editBase.entitlements).join('|')
    const nextEntitlements = (payload.featureEntitlements ?? []).join('|')
    if (baseEntitlements !== nextEntitlements) {
      patch.featureEntitlements = payload.featureEntitlements ?? []
    }

    if (Object.keys(patch).length === 0) {
      setEditErrors({
        name: 'Make at least one change before saving.',
      })
      return
    }

    try {
      await updateLicenseLevel({
        licenseLevelId: selectedLicenseLevelId,
        ...patch,
      }).unwrap()

      addToast({
        title: 'Licence level updated',
        description: 'Changes were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = mapValidationErrors(appError)

      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors)
        return
      }

      if (appError.status === 409) {
        setEditErrors({ name: appError.message })
        return
      }

      addToast({
        title: 'Failed to update licence level',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    closeEditDialog,
    editBase,
    editForm,
    selectedLicenseLevelId,
    updateLicenseLevel,
    addToast,
  ])

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      {
        key: 'isActive',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={getStatusVariant(Boolean(value))}>
            {value ? 'active' : 'inactive'}
          </Status>
        ),
      },
      {
        key: 'customerCount',
        label: 'Customers',
        render: (value) => value ?? 0,
      },
      {
        key: 'featureEntitlements',
        label: 'Entitlements',
        render: (value) => {
          const items = Array.isArray(value) ? value : []
          if (items.length === 0) return '--'
          if (items.length <= 3) return items.join(', ')
          return `${items.slice(0, 3).join(', ')} +${items.length - 3}`
        },
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
    ],
    [],
  )

  const listAppError = listError ? normalizeError(listError) : null
  const selectedAppError = selectedError ? normalizeError(selectedError) : null

  return (
    <section
      className="super-admin-license-levels container"
      aria-label="Super admin licence levels"
    >
      <header className="super-admin-license-levels__header">
        <h1 className="super-admin-license-levels__title">Licence Levels</h1>
        <p className="super-admin-license-levels__subtitle">
          Define reusable licence tiers here. Assign them to customers during customer creation or update.
        </p>
      </header>

      <p className="super-admin-license-levels__hint" role="status">
        Licence levels are catalogue items — create them independently, then select
        one when onboarding or editing a customer. The &ldquo;Customers&rdquo; column shows how
        many customers currently use each level.
      </p>

      <div className="super-admin-license-levels__grid">
        <Fieldset className="super-admin-license-levels__fieldset">
          <Fieldset.Legend className="super-admin-license-levels__legend">
            <h2 className="super-admin-license-levels__section-title">Create Licence Level</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="super-admin-license-levels__card">
            <Card.Body>
              <form
                className="super-admin-license-levels__form"
                onSubmit={handleCreateSubmit}
                noValidate
              >
                <Input
                  id="license-level-name"
                  label="Name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  error={createErrors.name}
                  required
                  fullWidth
                />

                <Textarea
                  id="license-level-description"
                  label="Description (Optional)"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  error={createErrors.description}
                  rows={3}
                  fullWidth
                />

                <Textarea
                  id="license-level-entitlements"
                  label="Feature Entitlements"
                  helperText="Use commas/new lines. Optional brackets/quotes are ignored."
                  value={createForm.entitlements}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, entitlements: event.target.value }))
                  }
                  error={createErrors.entitlements}
                  rows={6}
                  fullWidth
                />

                <Tickbox
                  id="license-level-is-active"
                  label="Active"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />

                <div className="super-admin-license-levels__form-actions">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={createResult.isLoading}
                    disabled={createResult.isLoading}
                  >
                    Create Licence Level
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

        <Fieldset className="super-admin-license-levels__fieldset">
          <Fieldset.Legend className="super-admin-license-levels__legend">
            <h2 className="super-admin-license-levels__section-title">Catalogue</h2>
          </Fieldset.Legend>
          <Card variant="elevated" className="super-admin-license-levels__card">
            <Card.Body>
              <div className="super-admin-license-levels__toolbar">
                <Input
                  id="license-level-search"
                  label="Search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by name or description"
                  fullWidth
                />
                <Select
                  id="license-level-status"
                  label="Status"
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {listAppError ? (
                <p className="super-admin-license-levels__error" role="alert">
                  {listAppError.message}
                </p>
              ) : null}

              <HorizontalScroll
                className="super-admin-license-levels__table-wrap"
                ariaLabel="Licence levels table"
                gap="sm"
              >
                <Table
                  className="super-admin-license-levels__table"
                  columns={columns}
                  data={rows}
                  actions={[{ label: 'Edit', variant: 'ghost' }]}
                  onRowAction={(label, row) => {
                    if (label === 'Edit') {
                      openEditDialog(row)
                    }
                  }}
                  loading={isListLoading}
                  hoverable
                  variant="striped"
                  emptyMessage="No licence levels found."
                  ariaLabel="Licence levels"
                />
              </HorizontalScroll>

              {isListFetching && !isListLoading ? (
                <p className="super-admin-license-levels__muted">Refreshing list...</p>
              ) : null}

              {totalPages > 1 ? (
                <div className="super-admin-license-levels__pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isListFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <p className="super-admin-license-levels__pagination-info">
                    Page {Number(meta.page) || page} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isListFetching}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </Card.Body>
          </Card>
        </Fieldset>
      </div>

      <Dialog open={editOpen} onClose={closeEditDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-license-levels__dialog-title">Update Licence Level</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-license-levels__dialog-body">
          {selectedAppError ? (
            <p className="super-admin-license-levels__error" role="alert">
              {selectedAppError.message}
            </p>
          ) : null}

          <Input
            id="license-level-edit-name"
            label="Name"
            value={editForm.name}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, name: event.target.value }))
            }
            error={editErrors.name}
            required
            fullWidth
            disabled={isFetchingSelected}
          />

          <Textarea
            id="license-level-edit-description"
            label="Description"
            value={editForm.description}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, description: event.target.value }))
            }
            error={editErrors.description}
            rows={3}
            fullWidth
            disabled={isFetchingSelected}
          />

          <Textarea
            id="license-level-edit-entitlements"
            label="Feature Entitlements"
            value={editForm.entitlements}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, entitlements: event.target.value }))
            }
            error={editErrors.entitlements}
            rows={6}
            fullWidth
            disabled={isFetchingSelected}
          />

          <Tickbox
            id="license-level-edit-is-active"
            label="Active"
            checked={editForm.isActive}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, isActive: event.target.checked }))
            }
            disabled={isFetchingSelected}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeEditDialog} disabled={updateResult.isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditSubmit}
            loading={updateResult.isLoading}
            disabled={updateResult.isLoading || isFetchingSelected}
          >
            Save Changes
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminLicenseLevels
