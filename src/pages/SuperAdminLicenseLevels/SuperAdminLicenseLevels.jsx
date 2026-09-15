/**
 * Super Admin License Levels Page
 *
 * Manage licence-level catalog entries used by customer governance.
 */

import { useLicenseLevelManagement } from './useLicenseLevelManagement.js'
import { PageHeader, PageShell } from '../../components/PageShell'
import { LicenseLevelListView } from './LicenseLevelListView.jsx'
import { CreateDialog, EditDialog } from './LicenseLevelDialogs.jsx'
import './SuperAdminLicenseLevels.css'

function SuperAdminLicenseLevels() {
  const mgmt = useLicenseLevelManagement()

  return (
    <PageShell
      className="super-admin-license-levels container"
      aria-label="Super admin licence levels"
    >
      <PageHeader
        title="Licence Levels"
        subtitle="Define reusable licence tiers here. Assign them to customers during customer creation or update."
      />

      <p className="super-admin-license-levels__hint" role="status">
        Licence levels are catalogue items — create them independently, then select
        one when onboarding or editing a customer. The &ldquo;Customers&rdquo; column shows how
        many customers currently use each level.
      </p>

      <LicenseLevelListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        listAppError={mgmt.listAppError}
        openCreateDialog={mgmt.openCreateDialog}
        createIsLoading={mgmt.createResult.isLoading}
        openEditDialog={mgmt.openEditDialog}
      />

      <CreateDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
        isLoading={mgmt.createResult.isLoading}
      />

      <EditDialog
        open={mgmt.editOpen}
        onClose={mgmt.closeEditDialog}
        editForm={mgmt.editForm}
        setEditForm={mgmt.setEditForm}
        editErrors={mgmt.editErrors}
        onSubmit={mgmt.handleEditSubmit}
        isLoading={mgmt.updateResult.isLoading}
        isFetchingSelected={mgmt.isFetchingSelected}
        selectedAppError={mgmt.selectedAppError}
      />
    </PageShell>
  )
}

export default SuperAdminLicenseLevels
