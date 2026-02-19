/**
 * Super Admin System Versioning Page
 *
 * Manage governance policy versions.
 */

import { useCallback, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Dialog } from '../../components/Dialog'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { useToaster } from '../../components/Toaster'
import {
  useCreatePolicyMutation,
  useGetActivePolicyQuery,
  useGetPolicyHistoryQuery,
  useUpdatePolicyMetadataMutation,
} from '../../store/api/systemVersioningApi.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminSystemVersioning.css'

const INITIAL_CREATE_FORM = {
  name: '',
  description: '',
  rules: '{\n  \n}',
  reason: '',
}

const formatDate = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

function SuperAdminSystemVersioning() {
  const { addToast } = useToaster()

  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM)
  const [createErrors, setCreateErrors] = useState({})
  const [createStepUpToken, setCreateStepUpToken] = useState('')

  const [historyPage, setHistoryPage] = useState(1)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')
  const [editStepUpToken, setEditStepUpToken] = useState('')

  const {
    data: activePolicyResponse,
    isLoading: isActivePolicyLoading,
    error: activePolicyError,
  } = useGetActivePolicyQuery()

  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error: historyError,
  } = useGetPolicyHistoryQuery({ page: historyPage, pageSize: 20 })

  const [createPolicy, createPolicyResult] = useCreatePolicyMutation()
  const [updatePolicyMetadata, updatePolicyMetadataResult] =
    useUpdatePolicyMetadataMutation()

  const activePolicy = activePolicyResponse?.data ?? null
  const policyHistory = historyResponse?.data ?? []
  const historyMeta = historyResponse?.meta ?? {}
  const historyTotalPages = Number(historyMeta.totalPages) || 1
  const activePolicyAppError = activePolicyError
    ? normalizeError(activePolicyError)
    : null
  const noActivePolicy =
    activePolicyAppError?.code === 'NO_ACTIVE_POLICY' ||
    activePolicyAppError?.status === 404
  const historyAppError = historyError ? normalizeError(historyError) : null

  const validateCreateForm = useCallback(() => {
    const nextErrors = {}
    if (!createForm.name.trim()) {
      nextErrors.name = 'Name is required.'
    }
    if (!createForm.rules.trim()) {
      nextErrors.rules = 'Rules JSON is required.'
    }
    if (!createForm.reason.trim()) {
      nextErrors.reason = 'Reason is required.'
    }
    if (!createStepUpToken) {
      nextErrors.stepUp = 'Step-up verification is required before creating a policy.'
    }

    if (createForm.rules.trim()) {
      try {
        JSON.parse(createForm.rules)
      } catch {
        nextErrors.rules = 'Rules must be valid JSON.'
      }
    }

    return nextErrors
  }, [createForm, createStepUpToken])

  const handleCreatePolicy = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const validationErrors = validateCreateForm()
      if (Object.keys(validationErrors).length > 0) {
        setCreateErrors(validationErrors)
        return
      }

      const payload = {
        name: createForm.name.trim(),
        ...(createForm.description.trim()
          ? { description: createForm.description.trim() }
          : {}),
        rules: JSON.parse(createForm.rules),
        reason: createForm.reason.trim(),
      }

      try {
        await createPolicy({ body: payload, stepUpToken: createStepUpToken }).unwrap()
        setCreateForm(INITIAL_CREATE_FORM)
        setCreateStepUpToken('')
        addToast({
          title: 'Policy version created',
          description: 'A new active system versioning policy was created.',
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        setCreateStepUpToken('')
        addToast({
          title: 'Failed to create policy',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createForm, createStepUpToken, validateCreateForm, createPolicy, addToast],
  )

  const openEditDialog = useCallback((policy) => {
    setSelectedPolicy(policy)
    setEditName(policy.name ?? '')
    setEditDescription(policy.description ?? '')
    setEditError('')
    setEditStepUpToken('')
    setEditDialogOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditDialogOpen(false)
    setSelectedPolicy(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
    setEditStepUpToken('')
  }, [])

  const handleUpdatePolicy = useCallback(async () => {
    if (!selectedPolicy) return

    if (!editName.trim()) {
      setEditError('Policy name is required.')
      return
    }

    if (!editStepUpToken) {
      setEditError('Step-up verification is required before updating.')
      return
    }

    setEditError('')

    try {
      await updatePolicyMetadata({
        policyId: selectedPolicy.id ?? selectedPolicy._id,
        stepUpToken: editStepUpToken,
        body: {
          name: editName.trim(),
          description: editDescription.trim(),
        },
      }).unwrap()

      addToast({
        title: 'Policy updated',
        description: 'Policy metadata updated successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      setEditStepUpToken('')
      setEditError(appError.message)
      addToast({
        title: 'Failed to update policy',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    selectedPolicy,
    editName,
    editDescription,
    editStepUpToken,
    updatePolicyMetadata,
    addToast,
    closeEditDialog,
  ])

  const historyColumns = useMemo(
    () => [
      {
        key: 'version',
        label: 'Version',
      },
      {
        key: 'name',
        label: 'Name',
      },
      {
        key: 'isActive',
        label: 'State',
        render: (value) => (
          <Status size="sm" showIcon variant={value ? 'success' : 'neutral'}>
            {value ? 'active' : 'inactive'}
          </Status>
        ),
      },
      {
        key: 'activatedAt',
        label: 'Activated',
        render: (value) => formatDate(value),
      },
      {
        key: 'createdAt',
        label: 'Created',
        render: (value) => formatDate(value),
      },
    ],
    [],
  )

  const historyActions = useMemo(
    () => [
      {
        label: 'Edit Metadata',
        variant: 'ghost',
      },
    ],
    [],
  )

  return (
    <section
      className="super-admin-system-versioning container"
      aria-label="Super admin system versioning"
    >
      <header className="super-admin-system-versioning__header">
        <h1 className="super-admin-system-versioning__title">
          System Versioning Policy
        </h1>
        <p className="super-admin-system-versioning__subtitle">
          Manage platform-wide governance policy versions.
        </p>
      </header>

      <div className="super-admin-system-versioning__grid">
        <Card variant="elevated">
          <Card.Header>
            <h2 className="super-admin-system-versioning__section-title">
              Active Policy
            </h2>
          </Card.Header>
          <Card.Body>
            {isActivePolicyLoading ? (
              <p className="super-admin-system-versioning__muted">Loading active policy...</p>
            ) : noActivePolicy ? (
              <p className="super-admin-system-versioning__muted">
                No active policy found. Create a policy to initialize governance rules.
              </p>
            ) : activePolicyAppError ? (
              <p className="super-admin-system-versioning__error" role="alert">
                {activePolicyAppError.message}
              </p>
            ) : activePolicy ? (
              <dl className="super-admin-system-versioning__active-policy">
                <div>
                  <dt>Name</dt>
                  <dd>{activePolicy.name ?? '--'}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{activePolicy.version ?? '--'}</dd>
                </div>
                <div>
                  <dt>Activated</dt>
                  <dd>{formatDate(activePolicy.activatedAt)}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{activePolicy.description || '--'}</dd>
                </div>
              </dl>
            ) : (
              <p className="super-admin-system-versioning__muted">
                No active policy data available.
              </p>
            )}
          </Card.Body>
        </Card>

        <Card variant="elevated">
          <Card.Header>
            <h2 className="super-admin-system-versioning__section-title">
              Create New Policy Version
            </h2>
          </Card.Header>
          <Card.Body>
            <form
              className="super-admin-system-versioning__form"
              onSubmit={handleCreatePolicy}
              noValidate
            >
              <Input
                id="policy-name"
                label="Policy Name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                error={createErrors.name}
                required
                fullWidth
              />
              <Textarea
                id="policy-description"
                label="Description (Optional)"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                fullWidth
              />
              <Textarea
                id="policy-rules"
                label="Rules JSON"
                value={createForm.rules}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, rules: event.target.value }))
                }
                error={createErrors.rules}
                rows={8}
                required
                fullWidth
              />
              <Textarea
                id="policy-reason"
                label="Change Reason"
                value={createForm.reason}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, reason: event.target.value }))
                }
                error={createErrors.reason}
                rows={3}
                required
                fullWidth
              />

              {createErrors.stepUp ? (
                <p className="super-admin-system-versioning__error" role="alert">
                  {createErrors.stepUp}
                </p>
              ) : null}

              <StepUpAuthForm
                onStepUpComplete={(token) => {
                  setCreateStepUpToken(token)
                  setCreateErrors((current) => {
                    const next = { ...current }
                    delete next.stepUp
                    return next
                  })
                }}
              />

              <div className="super-admin-system-versioning__form-actions">
                <Button
                  type="submit"
                  loading={createPolicyResult.isLoading}
                  disabled={createPolicyResult.isLoading}
                >
                  Create Policy Version
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>

      <Card variant="elevated">
        <Card.Header>
          <h2 className="super-admin-system-versioning__section-title">
            Policy History
          </h2>
        </Card.Header>
        <Card.Body>
          {historyAppError ? (
            <p className="super-admin-system-versioning__error" role="alert">
              {historyAppError.message}
            </p>
          ) : null}

          <Table
            columns={historyColumns}
            data={policyHistory}
            actions={historyActions}
            onRowAction={(label, policy) => {
              if (label === 'Edit Metadata') {
                openEditDialog(policy)
              }
            }}
            loading={isHistoryLoading}
            emptyMessage="No policy history available."
            variant="striped"
            hoverable
            ariaLabel="System versioning policy history"
          />

          {isHistoryFetching && !isHistoryLoading ? (
            <p className="super-admin-system-versioning__muted">Refreshing history...</p>
          ) : null}

          {historyTotalPages > 1 ? (
            <div className="super-admin-system-versioning__pagination">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                disabled={historyPage <= 1 || isHistoryFetching}
              >
                Previous
              </Button>
              <p className="super-admin-system-versioning__pagination-info">
                Page {Number(historyMeta.page) || historyPage} of {historyTotalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setHistoryPage((current) => Math.min(historyTotalPages, current + 1))
                }
                disabled={historyPage >= historyTotalPages || isHistoryFetching}
              >
                Next
              </Button>
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <Dialog open={editDialogOpen} onClose={closeEditDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-system-versioning__dialog-title">
            Update Policy Metadata
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <Input
            id="edit-policy-name"
            label="Policy Name"
            value={editName}
            onChange={(event) => {
              setEditName(event.target.value)
              setEditError('')
            }}
            required
            fullWidth
          />
          <Textarea
            id="edit-policy-description"
            label="Description"
            value={editDescription}
            onChange={(event) => {
              setEditDescription(event.target.value)
              setEditError('')
            }}
            rows={4}
            fullWidth
          />
          {editError ? (
            <p className="super-admin-system-versioning__error" role="alert">
              {editError}
            </p>
          ) : null}

          <StepUpAuthForm
            onStepUpComplete={(token) => {
              setEditStepUpToken(token)
              setEditError('')
            }}
            onCancel={closeEditDialog}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={closeEditDialog}
            disabled={updatePolicyMetadataResult.isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePolicy}
            loading={updatePolicyMetadataResult.isLoading}
            disabled={updatePolicyMetadataResult.isLoading}
          >
            Save Metadata
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminSystemVersioning
