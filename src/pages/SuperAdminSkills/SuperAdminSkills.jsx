import { CreateRuntimeSkillDialog, EditRuntimeSkillDialog } from './RuntimeSkillDialogs.jsx'
import { RuntimeSkillListView } from './RuntimeSkillListView.jsx'
import { useRuntimeSkillManagement } from './useRuntimeSkillManagement.js'
import './SuperAdminSkills.css'

function SuperAdminSkills() {
  const mgmt = useRuntimeSkillManagement()

  return (
    <section className="super-admin-skills container" aria-label="Super admin runtime skills">
      <header className="super-admin-skills__header">
        <h1 className="super-admin-skills__title">Skills</h1>
        <p className="super-admin-skills__subtitle">
          Register reusable runtime skills, control their availability, and align framework
          compatibility before packages and workflow policies reference them.
        </p>
      </header>

      <RuntimeSkillListView
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
        setSkillStatus={mgmt.setSkillStatus}
      />

      <CreateRuntimeSkillDialog
        open={mgmt.createOpen}
        onClose={mgmt.closeCreateDialog}
        createForm={mgmt.createForm}
        setCreateForm={mgmt.setCreateForm}
        createErrors={mgmt.createErrors}
        setCreateErrors={mgmt.setCreateErrors}
        onSubmit={mgmt.handleCreateSubmit}
      />

      <EditRuntimeSkillDialog
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

export default SuperAdminSkills
