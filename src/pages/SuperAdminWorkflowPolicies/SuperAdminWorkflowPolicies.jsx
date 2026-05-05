import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import { WorkflowPolicyListView } from './WorkflowPolicyListView.jsx'
import { useWorkflowPolicyManagement } from './useWorkflowPolicyManagement.js'
import './SuperAdminWorkflowPolicies.css'

function SuperAdminWorkflowPolicies() {
  const navigate = useNavigate()
  const mgmt = useWorkflowPolicyManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)

  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

  const handleCreateClick = useCallback(() => {
    navigate('/super-admin/runtime-control/workflow-policies/new')
  }, [navigate])

  const handleEditClick = useCallback((policy) => {
    if (!policy?.id) return
    navigate(`/super-admin/runtime-control/workflow-policies/${policy.id}/edit`)
  }, [navigate])

  const handleCloneClick = useCallback((policy) => {
    if (!policy?.id) return
    navigate(`/super-admin/runtime-control/workflow-policies/new?cloneFrom=${encodeURIComponent(policy.id)}`)
  }, [navigate])

  return (
    <section
      className="super-admin-workflow-policies container"
      aria-label="Super admin workflow policies"
    >
      <header className="super-admin-workflow-policies__header">
        <h1 className="super-admin-workflow-policies__title">Workflow Policies</h1>
        <p className="super-admin-workflow-policies__subtitle">
          Govern runtime policy scope, trigger rules, and controlled action decisions from a
          dedicated Workflow Policy catalogue.
        </p>
      </header>

      <WorkflowPolicyListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        frameworkFilter={mgmt.frameworkFilter}
        setFrameworkFilter={mgmt.setFrameworkFilter}
        typeFilter={mgmt.typeFilter}
        setTypeFilter={mgmt.setTypeFilter}
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
        setWorkflowPolicyStatus={mgmt.setWorkflowPolicyStatus}
      />
    </section>
  )
}

export default SuperAdminWorkflowPolicies
