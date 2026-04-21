import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { useToaster } from '../../components/Toaster'
import {
  useLazyGetSkillRoleDependenciesQuery,
  useUpdateSkillRoleMutation,
} from '../../store/api/runtimeControlApi.js'
import { SkillRoleRegistryListView } from './SkillRoleRegistryListView.jsx'
import { useSkillRoleRegistryManagement } from './useSkillRoleRegistryManagement.js'
import { normalizeError } from '../../utils/errors.js'
import './SuperAdminSkillRoleRegistry.css'

function SuperAdminSkillRoleRegistry() {
  const navigate = useNavigate()
  const { addToast } = useToaster()
  const mgmt = useSkillRoleRegistryManagement()
  const [updateSkillRole, { isLoading: isUpdating }] = useUpdateSkillRoleMutation()
  const [fetchSkillRoleDependencies] = useLazyGetSkillRoleDependenciesQuery()
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
    const normalizedStatus = String(nextStatus ?? '').trim().toUpperCase()
    const shouldWarn = normalizedStatus === 'DEPRECATED' || normalizedStatus === 'INACTIVE'

    if (shouldWarn) {
      try {
        const res = await fetchSkillRoleDependencies(row.id).unwrap()
        const summary = res?.data?.dependencies?.summary && typeof res.data.dependencies.summary === 'object'
          ? res.data.dependencies.summary
          : {}
        const skills = Number(summary.skills) || 0
        const agents = Number(summary.agents) || 0

        if (skills + agents > 0) {
          setPendingStatusChange({ row, nextStatus: normalizedStatus, summary: { skills, agents } })
          return
        }
      } catch (err) {
        const skillCount = Number(row?.usageCount) || 0
        if (skillCount > 0) {
          setPendingStatusChange({ row, nextStatus: normalizedStatus, summary: { skills: skillCount, agents: null } })
          return
        }
      }
    }

    await commitRoleStatus(row, nextStatus)
  }, [commitRoleStatus, fetchSkillRoleDependencies])

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
          <h2>
            {pendingStatusChange?.nextStatus === 'INACTIVE'
              ? 'Make skill role inactive?'
              : 'Deprecate skill role?'}
          </h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-skill-role-registry__dialog-copy">
            <Badge variant="primary" size="sm" pill outline>
              {pendingStatusChange?.row?.roleKey ?? 'UNKNOWN_ROLE'}
            </Badge>{' '}
            is currently used by{' '}
            {Number(pendingStatusChange?.summary?.skills) || 0} skill{Number(pendingStatusChange?.summary?.skills) === 1 ? '' : 's'}
            {pendingStatusChange?.summary?.agents === null
              ? '.'
              : ` and ${Number(pendingStatusChange?.summary?.agents) || 0} agent${Number(pendingStatusChange?.summary?.agents) === 1 ? '' : 's'}.`}
          </p>
          <p className="super-admin-skill-role-registry__dialog-helper">
            Making it {pendingStatusChange?.nextStatus ?? 'non-active'} will block new assignments but will not remove existing references.
          </p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closePendingStatusChange} disabled={isUpdating}>
            Cancel
          </Button>
          {pendingStatusChange?.nextStatus === 'INACTIVE' ? (
            <Button variant="primary" onClick={confirmPendingStatusChange} loading={isUpdating}>
              Mark Inactive
            </Button>
          ) : (
            <Button variant="danger" onClick={confirmPendingStatusChange} loading={isUpdating}>
              Deprecate Role
            </Button>
          )}
        </Dialog.Footer>
      </Dialog>
    </section>
  )
}

export default SuperAdminSkillRoleRegistry
