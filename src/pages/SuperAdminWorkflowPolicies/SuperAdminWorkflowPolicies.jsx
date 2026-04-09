import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import {
  CreateWorkflowPolicyDialog,
  EditWorkflowPolicyDialog,
} from './WorkflowPolicyDialogs.jsx'
import { WorkflowPolicyListView } from './WorkflowPolicyListView.jsx'
import { useWorkflowPolicyManagement } from './useWorkflowPolicyManagement.js'
import './SuperAdminWorkflowPolicies.css'

function SuperAdminWorkflowPolicies() {
  const navigate = useNavigate()
  const mgmt = useWorkflowPolicyManagement()
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])

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

      <Card variant="elevated" className="super-admin-workflow-policies__step-up-card">
        <Card.Body className="super-admin-workflow-policies__step-up-body">
          <div className="super-admin-workflow-policies__step-up-copy">
            <h2 className="super-admin-workflow-policies__step-up-title">
              Step-up verification
            </h2>
            <p className="super-admin-workflow-policies__step-up-description">
              Verify identity once to unlock create, update, and status actions.
            </p>
          </div>
          <StepUpAuthForm
            passwordLabel="Current Super Admin Password"
            passwordHelperText="Enter your current Super Admin password to verify protected Runtime Control actions."
            submitLabel="Verify Runtime Control Access"
            onStepUpComplete={mgmt.setStepUpToken}
            onCancel={() => mgmt.setStepUpToken('')}
          />
        </Card.Body>
      </Card>

      <WorkflowPolicyListView
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
