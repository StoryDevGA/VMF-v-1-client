import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RuntimePathRegistryListView } from './RuntimePathRegistryListView.jsx'
import { useRuntimePathRegistryManagement } from './useRuntimePathRegistryManagement.js'
import './SuperAdminRuntimePathRegistry.css'

function SuperAdminRuntimePathRegistry() {
  const navigate = useNavigate()
  const mgmt = useRuntimePathRegistryManagement()

  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

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
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
      />
    </section>
  )
}

export default SuperAdminRuntimePathRegistry
