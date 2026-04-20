import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import { useUpdateSkillRoleMutation } from '../../store/api/runtimeControlApi.js'
import { SkillRoleRegistryListView } from './SkillRoleRegistryListView.jsx'
import { useSkillRoleRegistryManagement } from './useSkillRoleRegistryManagement.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminSkillRoleRegistry.css'

function SuperAdminSkillRoleRegistry() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const mgmt = useSkillRoleRegistryManagement()
  const [updateSkillRole, { isLoading: isUpdating }] = useUpdateSkillRoleMutation()
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  const handleCreateClick = useCallback(() => {
    navigate('/super-admin/runtime-control/skill-roles/new')
  }, [navigate])

  const handleEditClick = useCallback((row) => {
    navigate(`/super-admin/runtime-control/skill-roles/${row.id}`)
  }, [navigate])

  const commitRoleStatus = useCallback(async (row, nextStatus) => {
    try {
      const res = await updateSkillRole({
        roleId: row.id,
        status: nextStatus,
      }).unwrap()

      addToast({
        variant: 'success',
        title: 'Saved',
        description: `Updated ${res?.data?.roleKey ?? row.roleKey}.`,
      })
    } catch (err) {
      const appErr = normalizeError(err)
      addToast({ variant: 'error', title: 'Update failed', description: appErr.message })
    }
  }, [addToast, updateSkillRole])

  const setRoleStatus = useCallback(async (row, nextStatus) => {
    if (nextStatus === 'DEPRECATED' && Number(row?.usageCount) > 0) {
      setPendingStatusChange({ row, nextStatus })
      return
    }

    await commitRoleStatus(row, nextStatus)
  }, [commitRoleStatus])

  const closePendingStatusChange = useCallback(() => {
    setPendingStatusChange(null)
  }, [])

  const confirmPendingStatusChange = useCallback(async () => {
    if (!pendingStatusChange?.row || !pendingStatusChange?.nextStatus) return

    await commitRoleStatus(pendingStatusChange.row, pendingStatusChange.nextStatus)
    setPendingStatusChange(null)
  }, [commitRoleStatus, pendingStatusChange])

  return (
    <section
      className="super-admin-skill-role-registry container"
      aria-label="Super admin skill role registry"
    >
      <header className="super-admin-skill-role-registry__header">
        <h1 className="super-admin-skill-role-registry__title">Skill Roles</h1>
        <p className="super-admin-skill-role-registry__subtitle">
          Maintain the governed Skill Role Registry that classifies execution responsibility across Runtime Control.
        </p>
      </header>

      <SkillRoleRegistryListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        sortValue={mgmt.sortValue}
        setSortValue={mgmt.setSortValue}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        setRoleStatus={setRoleStatus}
        isMutating={isUpdating}
      />

      <Dialog open={Boolean(pendingStatusChange)} onClose={closePendingStatusChange} size="sm">
        <Dialog.Header>
          <h2>Deprecate skill role?</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p>
            {pendingStatusChange?.row?.roleKey ?? 'This skill role'} is still referenced by{' '}
            {Number(pendingStatusChange?.row?.usageCount) || 0} skill(s). Deprecating it will not
            remove those existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closePendingStatusChange} disabled={isUpdating}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmPendingStatusChange} loading={isUpdating}>
            Deprecate Role
          </Button>
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminSkillRoleRegistry
