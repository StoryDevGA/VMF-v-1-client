/**
 * Super Admin Denied Access Logs Page
 *
 * Displays audited access-denied events across the platform.
 */

import { useDeniedAccessLogManagement } from './useDeniedAccessLogManagement.js'
import { DeniedAccessFilters } from './DeniedAccessFilters.jsx'
import { DeniedAccessResultsView } from './DeniedAccessResultsView.jsx'
import './SuperAdminDeniedAccessLogs.css'

function SuperAdminDeniedAccessLogs() {
  const mgmt = useDeniedAccessLogManagement()

  return (
    <section
      className="super-admin-denied-logs container"
      aria-label="Super admin denied access logs"
    >
      <header className="super-admin-denied-logs__header">
        <h1 className="super-admin-denied-logs__title">Denied Access Logs</h1>
        <p className="super-admin-denied-logs__subtitle">
          Review platform-wide authorization denials for audit and troubleshooting.
        </p>
      </header>

      <DeniedAccessFilters
        draftFilters={mgmt.draftFilters}
        setDraftFilters={mgmt.setDraftFilters}
        isFetching={mgmt.isFetching}
        onApply={mgmt.applyFilters}
        onReset={mgmt.resetFilters}
      />

      <DeniedAccessResultsView
        rows={mgmt.rows}
        total={mgmt.total}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isLoading={mgmt.isLoading}
        isFetching={mgmt.isFetching}
        appError={mgmt.appError}
        setPage={mgmt.setPage}
      />
    </section>
  )
}

export default SuperAdminDeniedAccessLogs
