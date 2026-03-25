/**
 * Super Admin Roles Page
 *
 * Manage custom role-catalogue entries for governance workflows.
 */

import { useCallback, useState } from 'react'
import { RoleListView } from './RoleListView.jsx'
import { CreateRoleDialog, EditRoleDialog, RolePermissionsDialog } from './RoleDialogs.jsx'
import { useRoleManagement } from './useRoleManagement.js'
import './SuperAdminRoles.css'

function SuperAdminRoles() {
  const mgmt = useRoleManagement()
  const [permissionsRole, setPermissionsRole] = useState(null)

  const openPermissionsDialog = useCallback((role) => {
    setPermissionsRole(role ?? null)
  }, [])

  const closePermissionsDialog = useCallback(() => {
    setPermissionsRole(null)
  }, [])

  return (
    <section className="super-admin-roles container" aria-label="Super admin roles">
      <header className="super-admin-roles__header">
        <h1 className="super-admin-roles__title">Role Definitions</h1>
        <p className="super-admin-roles__subtitle">
          Manage custom role-catalogue entries. Seeded system roles remain backend-protected.
        </p>
      </header>

      <RoleListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        scopeFilter={mgmt.scopeFilter}
        setScopeFilter={mgmt.setScopeFilter}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        systemFilter={mgmt.systemFilter}
        setSystemFilter={mgmt.setSystemFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        listAppError={mgmt.listAppError}
        openCreateDialog={mgmt.openCreateDialog}
        createIsLoading={mgmt.createResult.isLoading}
        openEditDialog={mgmt.openEditDialog}
        openPermissionsDialog={openPermissionsDialog}
        onDeleteRole={mgmt.handleDeleteRole}
        deleteIsLoading={mgmt.deleteResult.isLoading}
      />

      <CreateRoleDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
        isLoading={mgmt.createResult.isLoading}
      />

      <EditRoleDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        onSubmit={mgmt.handleEditSubmit}
        isLoading={mgmt.updateResult.isLoading}
        isFetchingSelected={mgmt.isFetchingSelected}
        selectedAppError={mgmt.selectedAppError}
        selectedRoleIsSystem={mgmt.selectedRoleIsSystem}
      />

      <RolePermissionsDialog
        open={Boolean(permissionsRole)}
        onClose={closePermissionsDialog}
        role={permissionsRole}
      />
    </section>
  )
}

export default SuperAdminRoles
