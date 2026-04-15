import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TestRuntimeAgentDialog } from './RuntimeAgentDialogs.jsx'
import { RuntimeAgentListView } from './RuntimeAgentListView.jsx'
import { useRuntimeAgentManagement } from './useRuntimeAgentManagement.js'
import './SuperAdminAgents.css'

function SuperAdminAgents() {
  const navigate = useNavigate()
  const mgmt = useRuntimeAgentManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])
  const handleCreateClick = useCallback(() => {
    navigate('/super-admin/runtime-control/agents/new')
  }, [navigate])
  const handleEditClick = useCallback(
    (agent) => {
      if (!agent?.id) return
      navigate(`/super-admin/runtime-control/agents/${agent.id}`)
    },
    [navigate],
  )

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
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        setAgentStatus={mgmt.setAgentStatus}
        validateAgent={mgmt.validateAgent}
        openTestDialog={mgmt.openTestDialog}
      />

      <TestRuntimeAgentDialog
        open={mgmt.testOpen}
        onClose={mgmt.closeTestDialog}
        agent={mgmt.testAgent}
        testForm={mgmt.testForm}
        setTestForm={mgmt.setTestForm}
        testErrors={mgmt.testErrors}
        testResult={mgmt.testResult}
        frameworkOptions={mgmt.activeFrameworkOptions}
        onSubmit={mgmt.handleTestSubmit}
      />
    </section>
  )
}

export default SuperAdminAgents
