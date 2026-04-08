import {
  CreateWorkflowPolicyDialog,
  EditWorkflowPolicyDialog,
} from './WorkflowPolicyDialogs.jsx'
import { WorkflowPolicyListView } from './WorkflowPolicyListView.jsx'
import { useWorkflowPolicyManagement } from './useWorkflowPolicyManagement.js'
import './SuperAdminWorkflowPolicies.css'

function SuperAdminWorkflowPolicies() {
  const mgmt = useWorkflowPolicyManagement()

  return (
    <section
      className="super-admin-workflow-policies container"
      aria-label="Super admin workflow policies"
    >
      <header className="super-admin-workflow-policies__header">
        <h1 className="super-admin-workflow-policies__title">Workflow Policies</h1>
        <p className="super-admin-workflow-policies__subtitle">
          Define policy sequencing, framework compatibility, and the agent and skill
          dependencies that gate Runtime Control execution paths.
        </p>
      </header>

      <WorkflowPolicyListView
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
        setWorkflowPolicyStatus={mgmt.setWorkflowPolicyStatus}
      />

      <CreateWorkflowPolicyDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
      />

      <EditWorkflowPolicyDialog
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

export default SuperAdminWorkflowPolicies
