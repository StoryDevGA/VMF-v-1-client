import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import {
  useActivateRuntimePathMutation,
  useDeprecateRuntimePathMutation,
  useDisableRuntimePathMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { RuntimePathRegistryListView } from './RuntimePathRegistryListView.jsx'
import { useRuntimePathRegistryManagement } from './useRuntimePathRegistryManagement.js'
import './SuperAdminRuntimePathRegistry.css'

function SuperAdminRuntimePathRegistry() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const mgmt = useRuntimePathRegistryManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)
  const [activateRuntimePath, { isLoading: isActivating }] = useActivateRuntimePathMutation()
  const [disableRuntimePath, { isLoading: isDisabling }] = useDisableRuntimePathMutation()
  const [deprecateRuntimePath, { isLoading: isDeprecating }] = useDeprecateRuntimePathMutation()
  const [disableConfirm, setDisableConfirm] = useState({
    open: false,
    row: null,
    details: null,
  })

  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  const handleCreatePath = useCallback(() => {
    navigate('/super-admin/runtime-control/runtime-paths/new')
  }, [navigate])

  const handleEditPath = useCallback((row) => {
    if (!row?.id) return
    navigate(`/super-admin/runtime-control/runtime-paths/${row.id}/edit`)
  }, [navigate])

  const handleDuplicatePath = useCallback((row) => {
    if (!row?.id) return
    navigate(`/super-admin/runtime-control/runtime-paths/new?duplicateFrom=${encodeURIComponent(row.id)}`)
  }, [navigate])

  const handleActivatePath = useCallback(async (row) => {
    if (!row?.id) return
    try {
      const res = await activateRuntimePath({ pathId: row.id }).unwrap()
      addToast({
        variant: 'success',
        title: 'Runtime path activated',
        description: `${res?.data?.pathKey ?? row.pathKey ?? 'Runtime path'} is ACTIVE.`,
      })
    } catch (err) {
      addToast({ variant: 'error', title: 'Activate failed', description: normalizeError(err).message })
    }
  }, [activateRuntimePath, addToast])

  const closeDisableConfirm = useCallback(() => {
    setDisableConfirm({ open: false, row: null, details: null })
  }, [])

  const disablePath = useCallback(async (row, { confirmDependencies = false } = {}) => {
    const res = await disableRuntimePath({ pathId: row.id, confirmDependencies }).unwrap()
    addToast({
      variant: 'success',
      title: 'Runtime path disabled',
      description: `${res?.data?.pathKey ?? row.pathKey ?? 'Runtime path'} is INACTIVE.`,
    })
    return res
  }, [addToast, disableRuntimePath])

  const handleDisablePath = useCallback(async (row) => {
    if (!row?.id) return

    try {
      await disablePath(row, { confirmDependencies: false })
    } catch (err) {
      const appErr = normalizeError(err)
      const requiresConfirmation = appErr?.code === 'DEPENDENCY_CONFIRMATION_REQUIRED'
      if (requiresConfirmation) {
        setDisableConfirm({ open: true, row, details: appErr?.details ?? null })
        return
      }

      addToast({ variant: 'error', title: 'Disable failed', description: appErr.message })
    }
  }, [addToast, disablePath])

  const handleConfirmDisable = useCallback(async () => {
    const row = disableConfirm.row
    if (!row?.id) {
      closeDisableConfirm()
      return
    }

    try {
      await disablePath(row, { confirmDependencies: true })
      closeDisableConfirm()
    } catch (err) {
      addToast({ variant: 'error', title: 'Disable failed', description: normalizeError(err).message })
      closeDisableConfirm()
    }
  }, [addToast, closeDisableConfirm, disableConfirm.row, disablePath])

  const handleDeprecatePath = useCallback(async (row) => {
    if (!row?.id) return
    try {
      const res = await deprecateRuntimePath({ pathId: row.id }).unwrap()
      addToast({
        variant: 'success',
        title: 'Runtime path deprecated',
        description: `${res?.data?.pathKey ?? row.pathKey ?? 'Runtime path'} is DEPRECATED.`,
      })
    } catch (err) {
      addToast({ variant: 'error', title: 'Deprecate failed', description: normalizeError(err).message })
    }
  }, [addToast, deprecateRuntimePath])

  return (
    <section
      className="super-admin-runtime-path-registry container"
      aria-label="Super admin runtime path registry"
    >
      <header className="super-admin-runtime-path-registry__header">
        <h1 className="super-admin-runtime-path-registry__title">Runtime Paths</h1>
        <p className="super-admin-runtime-path-registry__subtitle">
          Review the governed Runtime Path Registry used to validate skill and agent
          access boundaries across Runtime Control.
        </p>
      </header>
      <RuntimePathRegistryListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        operationFilter={mgmt.operationFilter}
        setOperationFilter={mgmt.setOperationFilter}
        protectedFilter={mgmt.protectedFilter}
        setProtectedFilter={mgmt.setProtectedFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        showPostSaveRefresh={showPostSaveRefresh}
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
        onCreatePath={handleCreatePath}
        onEditPath={handleEditPath}
        onDuplicatePath={handleDuplicatePath}
        onActivatePath={handleActivatePath}
        onDisablePath={handleDisablePath}
        onDeprecatePath={handleDeprecatePath}
        isActionLoading={isActivating || isDisabling || isDeprecating}
      />

      <Dialog
        open={disableConfirm.open}
        onClose={closeDisableConfirm}
        size="sm"
        variant="centered"
        aria-label="Confirm runtime path disable"
      >
        <Dialog.Header>
          <h2>Disable runtime path?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            This runtime path has active dependencies. Disabling it may break skills, agents, validations, or policies
            that rely on it.
          </p>
          {disableConfirm.details?.warnings?.length ? (
            <p>
              Warnings: {disableConfirm.details.warnings.join(' ')}
            </p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onClick={closeDisableConfirm} disabled={isDisabling}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={handleConfirmDisable} loading={isDisabling}>
            Disable anyway
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminRuntimePathRegistry
