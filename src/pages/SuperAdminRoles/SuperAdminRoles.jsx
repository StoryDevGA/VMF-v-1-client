/**
 * Super Admin Roles Page
 *
 * Manage role-catalogue permissions from a matrix-first governance surface.
 */

import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { ConfirmDeleteRoleDialog, CreateRoleDialog, EditRoleDialog } from './RoleDialogs.jsx'
import { PermissionMatrix } from './PermissionMatrix.jsx'
import { SUPER_ADMIN_LOCKED_PERMISSION_KEYS } from './permissionCatalogue.constants.js'
import { usePermissionMatrix } from './usePermissionMatrix.js'
import { useRoleManagement } from './useRoleManagement.js'
import './SuperAdminRoles.css'

const LOCKED_PERMISSION_KEYS_BY_ROLE_KEY = {
  SUPER_ADMIN: SUPER_ADMIN_LOCKED_PERMISSION_KEYS,
}
const MATRIX_HELP_TEXT =
  'Use the matrix to compare role-catalogue permissions across system and custom roles. Permission changes update role definitions immediately. Affected users receive new runtime access after their next session refresh, token refresh, or sign-in.'

function SuperAdminRoles() {
  const mgmt = useRoleManagement()
  const matrix = usePermissionMatrix()

  return (
    <section className="super-admin-roles container" aria-label="Super admin roles">
      <header className="super-admin-roles__header">
        <h1 className="super-admin-roles__title">Role Permissions</h1>
        <p className="super-admin-roles__subtitle">
          Review seeded and custom role definitions through a single permission matrix.
        </p>
      </header>

      <Fieldset className="super-admin-roles__fieldset">
        <Fieldset.Legend className="sr-only">Role permission matrix</Fieldset.Legend>
        <Fieldset.Content className="super-admin-roles__fieldset-content">
          <Card variant="elevated" className="super-admin-roles__card">
            <Card.Body className="super-admin-roles__card-body super-admin-roles__card-body--compact">
              <div className="super-admin-roles__catalogue-actions">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={mgmt.openCreateDialog}
                  disabled={mgmt.createResult.isLoading}
                >
                  + New Role
                </Button>
              </div>

              <div className="super-admin-roles__toolbar">
                <Input
                  id="role-permission-search"
                  label="Search permissions"
                  size="sm"
                  value={matrix.search}
                  onChange={(event) => {
                    matrix.setSearch(event.target.value)
                  }}
                  placeholder="Search by permission label, key, or description"
                  fullWidth
                />
              </div>

              {matrix.error ? (
                <p className="super-admin-roles__error" role="alert">
                  {matrix.error.message}
                </p>
              ) : null}

              <p className="super-admin-roles__matrix-note">{MATRIX_HELP_TEXT}</p>

              {matrix.isLoading ? (
                <div className="super-admin-roles__matrix-loading">
                  <Spinner size="sm" type="circle" color="inherit" />
                  <p className="super-admin-roles__muted">Loading permission matrix...</p>
                </div>
              ) : (
                <HorizontalScroll
                  className="super-admin-roles__matrix-wrap"
                  ariaLabel="Role permission matrix"
                  gap="sm"
                >
                  <PermissionMatrix
                    roles={matrix.roles}
                    permissionGroups={matrix.permissionGroups}
                    onToggle={matrix.handleToggle}
                    onEditRole={mgmt.openEditDialog}
                    onDeleteRole={mgmt.openDeleteConfirm}
                    lockedPermissionKeysByRoleKey={LOCKED_PERMISSION_KEYS_BY_ROLE_KEY}
                    search={matrix.search}
                    pendingToggles={matrix.pendingToggles}
                  />
                </HorizontalScroll>
              )}

              {matrix.isFetching && !matrix.isLoading ? (
                <p className="super-admin-roles__muted">Refreshing permission matrix...</p>
              ) : null}
            </Card.Body>
          </Card>
        </Fieldset.Content>
      </Fieldset>

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

      <ConfirmDeleteRoleDialog
        open={mgmt.deleteConfirmOpen}
        onClose={mgmt.closeDeleteConfirm}
        onConfirm={mgmt.confirmDelete}
        role={mgmt.roleToDelete}
        isLoading={mgmt.deleteResult.isLoading}
      />
    </section>
  )
}

export default SuperAdminRoles
