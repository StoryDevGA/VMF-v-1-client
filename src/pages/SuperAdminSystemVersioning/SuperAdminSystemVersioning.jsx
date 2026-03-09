/**
 * Super Admin System Versioning Page
 *
 * Manage governance policy versions.
 */

import { useSystemVersioningManagement } from './useSystemVersioningManagement.js'
import { VersioningPolicyView } from './VersioningPolicyView.jsx'
import { VersioningHistoryView } from './VersioningHistoryView.jsx'
import { EditMetadataDialog } from './VersioningDialogs.jsx'
import './SuperAdminSystemVersioning.css'

function SuperAdminSystemVersioning() {
  const mgmt = useSystemVersioningManagement()

  return (
    <section
      className="super-admin-system-versioning container"
      aria-label="Super admin system versioning"
    >
      <header className="super-admin-system-versioning__header">
        <h1 className="super-admin-system-versioning__title">
          System Versioning Policy
        </h1>
        <p className="super-admin-system-versioning__subtitle">
          Manage platform-wide governance policy versions.
        </p>
      </header>

      <VersioningPolicyView
        activePolicy={mgmt.activePolicy}
        isActivePolicyLoading={mgmt.isActivePolicyLoading}
        activePolicyAppError={mgmt.activePolicyAppError}
        noActivePolicy={mgmt.noActivePolicy}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        setCreateStepUpToken={mgmt.setCreateStepUpToken}
        handleCreatePolicy={mgmt.handleCreatePolicy}
        createPolicyResult={mgmt.createPolicyResult}
      />

      <VersioningHistoryView
        policyHistory={mgmt.policyHistory}
        historyCurrentPage={mgmt.historyCurrentPage}
        historyTotalPages={mgmt.historyTotalPages}
        isHistoryLoading={mgmt.isHistoryLoading}
        isHistoryFetching={mgmt.isHistoryFetching}
        historyAppError={mgmt.historyAppError}
        setHistoryPage={mgmt.setHistoryPage}
        openEditDialog={mgmt.openEditDialog}
      />

      <EditMetadataDialog
        open={mgmt.editDialogOpen}
        onClose={mgmt.closeEditDialog}
        editName={mgmt.editName}
        setEditName={mgmt.setEditName}
        editDescription={mgmt.editDescription}
        setEditDescription={mgmt.setEditDescription}
        editError={mgmt.editError}
        setEditError={mgmt.setEditError}
        setEditStepUpToken={mgmt.setEditStepUpToken}
        onSubmit={mgmt.handleUpdatePolicy}
        isLoading={mgmt.updatePolicyMetadataResult.isLoading}
      />
    </section>
  )
}

export default SuperAdminSystemVersioning
