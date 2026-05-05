import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import {
  useLazyGetValidationRegistryDependenciesQuery,
  useUpdateValidationRegistryMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { ValidationRegistryListView } from './ValidationRegistryListView.jsx'
import { useValidationRegistryManagement } from './useValidationRegistryManagement.js'
import { VALIDATION_REGISTRY_STATUSES } from './superAdminValidationRegistry.constants.js'
import './SuperAdminValidationRegistry.css'

function SuperAdminValidationRegistry() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const mgmt = useValidationRegistryManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)
  const [updateValidation, { isLoading: isUpdating }] = useUpdateValidationRegistryMutation()
  const [fetchDependencies] = useLazyGetValidationRegistryDependenciesQuery()
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  const handleCreateClick = useCallback(() => {
    navigate('/super-admin/runtime-control/validation-registry/new')
  }, [navigate])

  const handleEditClick = useCallback((row) => {
    navigate(`/super-admin/runtime-control/validation-registry/${row.id}`)
  }, [navigate])

  const handleCloneClick = useCallback((row) => {
    navigate(`/super-admin/runtime-control/validation-registry/new?cloneFrom=${encodeURIComponent(row.id)}`)
  }, [navigate])

  const commitStatus = useCallback(async (row, nextStatus) => {
    try {
      const res = await updateValidation({
        validationId: row.id,
        status: nextStatus,
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Saved',
        description: `Updated ${res?.data?.key ?? row.key}.`,
      })
    } catch (err) {
      const appErr = normalizeError(err)
      addToast({ variant: 'error', title: 'Update failed', description: appErr.message })
    }
  }, [addToast, updateValidation])

  const setValidationStatus = useCallback(async (row, nextStatus) => {
    const normalizedStatus = String(nextStatus ?? '').trim().toUpperCase()
    const shouldWarn = normalizedStatus === VALIDATION_REGISTRY_STATUSES.DEPRECATED
      || normalizedStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE

    if (shouldWarn) {
      try {
        const res = await fetchDependencies(row.id).unwrap()
        const summary = res?.data?.dependencies?.summary && typeof res.data.dependencies.summary === 'object'
          ? res.data.dependencies.summary
          : {}
        const workflowPolicies = Number(summary.workflowPolicies) || 0
        const frameworkPackages = Number(summary.frameworkPackages) || 0

        if (workflowPolicies + frameworkPackages > 0) {
          setPendingStatusChange({
            row,
            nextStatus: normalizedStatus,
            summary: { workflowPolicies, frameworkPackages },
          })
          return
        }
      } catch {
        // If dependencies cannot be resolved, fall through and allow the save.
      }
    }

    await commitStatus(row, normalizedStatus)
  }, [commitStatus, fetchDependencies])

  const closePending = useCallback(() => setPendingStatusChange(null), [])

  const confirmPending = useCallback(async () => {
    if (!pendingStatusChange?.row || !pendingStatusChange?.nextStatus) return
    await commitStatus(pendingStatusChange.row, pendingStatusChange.nextStatus)
    setPendingStatusChange(null)
  }, [commitStatus, pendingStatusChange])

  return (
    <section className="super-admin-validation-registry container" aria-label="Super admin validation registry">
      <header className="super-admin-validation-registry__header">
        <h1 className="super-admin-validation-registry__title">Validation Registry</h1>
        <p className="super-admin-validation-registry__subtitle">
          Register reusable governed validation checks used by workflow policies and framework packages.
        </p>
      </header>

      <ValidationRegistryListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        frameworkFilter={mgmt.frameworkFilter}
        setFrameworkFilter={mgmt.setFrameworkFilter}
        categoryFilter={mgmt.categoryFilter}
        setCategoryFilter={mgmt.setCategoryFilter}
        severityFilter={mgmt.severityFilter}
        setSeverityFilter={mgmt.setSeverityFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        showPostSaveRefresh={showPostSaveRefresh}
        listAppError={mgmt.listAppError}
        frameworks={mgmt.frameworkOptions}
        onBackClick={handleBackClick}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onCloneClick={handleCloneClick}
        setValidationStatus={setValidationStatus}
        isMutating={isUpdating}
      />

      <Dialog open={Boolean(pendingStatusChange)} onClose={closePending} size="sm">
        <Dialog.Header>
          <h2>
            {pendingStatusChange?.nextStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE
              ? 'Make validation inactive?'
              : 'Deprecate validation?'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-validation-registry__dialog-copy">
            This validation is currently referenced by{' '}
            {Number(pendingStatusChange?.summary?.workflowPolicies) || 0} workflow polic{Number(pendingStatusChange?.summary?.workflowPolicies) === 1 ? 'y' : 'ies'}
            {' '}and{' '}
            {Number(pendingStatusChange?.summary?.frameworkPackages) || 0} framework package{Number(pendingStatusChange?.summary?.frameworkPackages) === 1 ? '' : 's'}.
          </p>
          <p className="super-admin-validation-registry__dialog-helper">
            Making it {pendingStatusChange?.nextStatus ?? 'non-active'} will block new assignments but will not remove existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closePending} disabled={isUpdating}>
            Cancel
          </Button>
          {pendingStatusChange?.nextStatus === VALIDATION_REGISTRY_STATUSES.INACTIVE ? (
            <Button variant="primary" onClick={confirmPending} loading={isUpdating}>
              Mark Inactive
            </Button>
          ) : (
            <Button variant="danger" onClick={confirmPending} loading={isUpdating}>
              Deprecate
            </Button>
          )}
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminValidationRegistry

