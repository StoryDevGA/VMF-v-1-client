import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, PageShell } from '../../components/PageShell'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import { FrameworkPackageListView } from './FrameworkPackageListView.jsx'
import { useFrameworkPackageManagement } from './useFrameworkPackageManagement.js'
import './SuperAdminFrameworkPackages.css'

function SuperAdminFrameworkPackages() {
  const navigate = useNavigate()
  const mgmt = useFrameworkPackageManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])
  const handleCreatePackage = useCallback(() => {
    navigate('/super-admin/runtime-control/framework-packages/new')
  }, [navigate])
  const handleEditPackage = useCallback((pkg, tab) => {
    const tabQuery = tab ? `?tab=${encodeURIComponent(tab)}` : ''
    navigate(`/super-admin/runtime-control/framework-packages/${pkg.id}/edit${tabQuery}`)
  }, [navigate])
  const handleClonePackage = useCallback((pkg) => {
    navigate(`/super-admin/runtime-control/framework-packages/new?cloneFrom=${encodeURIComponent(pkg.id)}`)
  }, [navigate])

  return (
    <PageShell
      className="super-admin-framework-packages container"
      aria-label="Super admin framework packages"
    >
      <PageHeader
        title="Framework Packages"
        subtitle="Define framework versions, lifecycle state, runtime dependencies, and the active default package used by Runtime Control."
      />

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
        showPostSaveRefresh={showPostSaveRefresh}
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
        onCreatePackage={handleCreatePackage}
        onEditPackage={handleEditPackage}
        onClonePackage={handleClonePackage}
        activatePackage={mgmt.activatePackage}
      />
    </PageShell>
  )
}

export default SuperAdminFrameworkPackages
