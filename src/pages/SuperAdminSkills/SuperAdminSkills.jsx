import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePostSaveListRefreshState } from '../../hooks/usePostSaveListRefreshState.js'
import { RuntimeSkillListView } from './RuntimeSkillListView.jsx'
import { useRuntimeSkillManagement } from './useRuntimeSkillManagement.js'
import './SuperAdminSkills.css'

function SuperAdminSkills() {
  const navigate = useNavigate()
  const mgmt = useRuntimeSkillManagement()
  const showPostSaveRefresh = usePostSaveListRefreshState(mgmt.isListLoading)
  const handleBackClick = useCallback(() => {
    navigate('/super-admin/runtime-control')
  }, [navigate])
  const handleCreateClick = useCallback(() => {
    navigate('/super-admin/runtime-control/skills/new')
  }, [navigate])
  const handleEditClick = useCallback(
    (skill) => {
      if (!skill?.id) return
      navigate(`/super-admin/runtime-control/skills/${skill.id}`)
    },
    [navigate],
  )

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
        setSkillStatus={mgmt.setSkillStatus}
      />
    </section>
  )
}

export default SuperAdminSkills
