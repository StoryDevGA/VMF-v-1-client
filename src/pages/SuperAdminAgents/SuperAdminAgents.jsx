import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreateRuntimeAgentDialog, EditRuntimeAgentDialog } from './RuntimeAgentDialogs.jsx'
import { RuntimeAgentListView } from './RuntimeAgentListView.jsx'
import { useRuntimeAgentManagement } from './useRuntimeAgentManagement.js'
import './SuperAdminAgents.css'

function SuperAdminAgents() {
  const navigate = useNavigate()
  const mgmt = useRuntimeAgentManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  return (
    <section className="super-admin-agents container" aria-label="Super admin runtime agents">
      <header className="super-admin-agents__header">
        <h1 className="super-admin-agents__title">Agents</h1>
        <p className="super-admin-agents__subtitle">
          Register runtime agents, control their availability, and define the framework and
          skill metadata that downstream Runtime Control modules depend on.
        </p>
      </header>

      <RuntimeAgentListView
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
        setAgentStatus={mgmt.setAgentStatus}
      />

      <CreateRuntimeAgentDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        frameworkOptions={mgmt.activeFrameworkOptions}
        onSubmit={mgmt.handleCreateSubmit}
      />

      <EditRuntimeAgentDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        frameworkOptions={mgmt.activeFrameworkOptions}
        onSubmit={mgmt.handleEditSubmit}
      />
    </section>
  )
}

export default SuperAdminAgents
