import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreateFrameworkPackageDialog, EditFrameworkPackageDialog } from './FrameworkPackageDialogs.jsx'
import { FrameworkPackageListView } from './FrameworkPackageListView.jsx'
import { useFrameworkPackageManagement } from './useFrameworkPackageManagement.js'
import './SuperAdminFrameworkPackages.css'

function SuperAdminFrameworkPackages() {
  const navigate = useNavigate()
  const mgmt = useFrameworkPackageManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

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
        frameworkOptions={mgmt.frameworkOptions}
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
        frameworkOptions={mgmt.frameworkOptions}
        frameworkNameLookup={mgmt.frameworkNameLookup}
      />

      <EditFrameworkPackageDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        onSubmit={mgmt.handleEditSubmit}
        frameworkOptions={mgmt.frameworkOptions}
        frameworkNameLookup={mgmt.frameworkNameLookup}
      />
    </section>
  )
}

export default SuperAdminFrameworkPackages
