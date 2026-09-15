/**
 * Super Admin Denied Access Logs Page
 *
 * Displays audited access-denied events across the platform.
 */

import { useDeniedAccessLogManagement } from './useDeniedAccessLogManagement.js'
import { PageHeader, PageShell } from '../../components/PageShell'
import { DeniedAccessFilters } from './DeniedAccessFilters.jsx'
import { DeniedAccessResultsView } from './DeniedAccessResultsView.jsx'
import './SuperAdminDeniedAccessLogs.css'

function SuperAdminDeniedAccessLogs() {
  const mgmt = useDeniedAccessLogManagement()

  return (
    <PageShell
      className="super-admin-denied-logs container"
      aria-label="Super admin denied access logs"
    >
      <PageHeader
        title="Denied Access Logs"
        subtitle="Review platform-wide authorization denials for audit and troubleshooting."
      />

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
    </PageShell>
  )
}

export default SuperAdminDeniedAccessLogs
