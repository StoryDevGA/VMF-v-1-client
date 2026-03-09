import { useAuditLogManagement } from './useAuditLogManagement.js'
import { AuditLogListView } from './AuditLogListView.jsx'
import { AuditLogToolsView } from './AuditLogToolsView.jsx'
import './SuperAdminAuditLogs.css'

function SuperAdminAuditLogs() {
  const mgmt = useAuditLogManagement()

  return (
    <section className="super-admin-audit-logs container" aria-label="Super admin audit logs">
      <header className="super-admin-audit-logs__header">
        <h1 className="super-admin-audit-logs__title">Audit Logs Explorer</h1>
        <p className="super-admin-audit-logs__subtitle">
          Query audit trails, correlate by request/resource, and verify integrity.
        </p>
      </header>

      <AuditLogListView
        filters={mgmt.filters}
        setFilters={mgmt.setFilters}
        setPage={mgmt.setPage}
        rows={mgmt.rows}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isAuditListLoading={mgmt.isAuditListLoading}
        isAuditListFetching={mgmt.isAuditListFetching}
        listAppError={mgmt.listAppError}
      />

      <AuditLogToolsView
        requestLookupId={mgmt.requestLookupId}
        setRequestLookupId={mgmt.setRequestLookupId}
        lookupByRequest={mgmt.lookupByRequest}
        requestLookupResult={mgmt.requestLookupResult}
        requestRows={mgmt.requestRows}
        resourceLookup={mgmt.resourceLookup}
        setResourceLookup={mgmt.setResourceLookup}
        lookupByResource={mgmt.lookupByResource}
        resourceLookupResult={mgmt.resourceLookupResult}
        resourceRows={mgmt.resourceRows}
        stats={mgmt.stats}
        isStatsFetching={mgmt.isStatsFetching}
        verifyForm={mgmt.verifyForm}
        setVerifyForm={mgmt.setVerifyForm}
        verifyError={mgmt.verifyError}
        verifyResultData={mgmt.verifyResultData}
        verifyIntegrityResult={mgmt.verifyIntegrityResult}
        handleVerifyIntegrity={mgmt.handleVerifyIntegrity}
      />
    </section>
  )
}

export default SuperAdminAuditLogs
