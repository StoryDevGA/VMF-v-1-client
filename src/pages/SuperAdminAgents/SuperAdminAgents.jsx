import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, PageShell } from '../../components/PageShell'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import { TestRuntimeAgentDialog } from './RuntimeAgentDialogs.jsx'
import { RuntimeAgentListView } from './RuntimeAgentListView.jsx'
import { useRuntimeAgentManagement } from './useRuntimeAgentManagement.js'
import './SuperAdminAgents.css'

function SuperAdminAgents() {
  const navigate = useNavigate()
  const mgmt = useRuntimeAgentManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)
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
  const handleCloneClick = useCallback(
    (agent) => {
      if (!agent?.id) return
      navigate(`/super-admin/runtime-control/agents/new?cloneFrom=${encodeURIComponent(agent.id)}`)
    },
    [navigate],
  )

  return (
    <PageShell className="super-admin-agents container" aria-label="Super admin runtime agents">
      <PageHeader
        title="Agents"
        subtitle="Register runtime agents, control their availability, and define the framework and skill metadata that downstream Runtime Control modules depend on."
      />

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
        showPostSaveRefresh={showPostSaveRefresh}
        listAppError={mgmt.listAppError}
        onBackClick={handleBackClick}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onCloneClick={handleCloneClick}
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
    </PageShell>
  )
}

export default SuperAdminAgents
