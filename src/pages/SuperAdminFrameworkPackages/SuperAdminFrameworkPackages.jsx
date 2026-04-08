import { CreateFrameworkPackageDialog, EditFrameworkPackageDialog } from './FrameworkPackageDialogs.jsx'
import { FrameworkPackageListView } from './FrameworkPackageListView.jsx'
import { useFrameworkPackageManagement } from './useFrameworkPackageManagement.js'
import './SuperAdminFrameworkPackages.css'

function SuperAdminFrameworkPackages() {
  const mgmt = useFrameworkPackageManagement()

  return (
    <section
      className="super-admin-framework-packages container"
      aria-label="Super admin framework packages"
    >
      <header className="super-admin-framework-packages__header">
        <h1 className="super-admin-framework-packages__title">Framework Packages</h1>
        <p className="super-admin-framework-packages__subtitle">
          Define framework versions, lifecycle state, runtime dependencies, and the active
          default package used by Runtime Control.
        </p>
      </header>

      <FrameworkPackageListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        frameworkFilter={mgmt.frameworkFilter}
        setFrameworkFilter={mgmt.setFrameworkFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        listAppError={mgmt.listAppError}
        openCreateDialog={mgmt.openCreateDialog}
        openEditDialog={mgmt.openEditDialog}
        activatePackage={mgmt.activatePackage}
      />

      <CreateFrameworkPackageDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
      />

      <EditFrameworkPackageDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        onSubmit={mgmt.handleEditSubmit}
      />
    </section>
  )
}

export default SuperAdminFrameworkPackages
