import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FrameworkPackageListView } from './FrameworkPackageListView.jsx'
import { useFrameworkPackageManagement } from './useFrameworkPackageManagement.js'
import './SuperAdminFrameworkPackages.css'

function SuperAdminFrameworkPackages() {
  const navigate = useNavigate()
  const mgmt = useFrameworkPackageManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])
  const handleCreatePackage = useCallback(() => {
    navigate('/super-admin/runtime-control/framework-packages/new')
  }, [navigate])
  const handleEditPackage = useCallback((pkg) => {
    navigate(`/super-admin/runtime-control/framework-packages/${pkg.id}/edit`)
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
        onCreatePackage={handleCreatePackage}
        onEditPackage={handleEditPackage}
        activatePackage={mgmt.activatePackage}
      />
    </section>
  )
}

export default SuperAdminFrameworkPackages
