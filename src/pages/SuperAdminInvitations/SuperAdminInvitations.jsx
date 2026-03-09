/**
 * Super Admin Invitations Page
 *
 * Manage customer-admin onboarding invitations.
 */

import { useInvitationManagement } from './useInvitationManagement.js'
import { InvitationListView } from './InvitationListView.jsx'
import { ResendDialog, RevokeDialog, AuthLinkDialog } from './InvitationDialogs.jsx'
import './SuperAdminInvitations.css'

function SuperAdminInvitations() {
  return (
    <section className="container" aria-label="Super admin invitations">
      <SuperAdminInvitationsPanel headingLevel={1} />
    </section>
  )
}

export function SuperAdminInvitationsPanel({
  isActive = true,
  headingLevel = 2,
  embedded = false,
}) {
  const HeadingTag = headingLevel === 1 ? 'h1' : 'h2'
  const panelClasses = [
    'super-admin-invitations',
    embedded && 'super-admin-invitations--embedded',
  ]
    .filter(Boolean)
    .join(' ')

  const mgmt = useInvitationManagement({ isActive })

  return (
    <div className={panelClasses}>
      <header className="super-admin-invitations__header">
        <HeadingTag className="super-admin-invitations__title">Invitation Management</HeadingTag>
        <p className="super-admin-invitations__subtitle">
          Invitation Management - Track, resend, and revoke customer onboarding invitations.
        </p>
      </header>

      <InvitationListView
        search={mgmt.search}
        setSearch={mgmt.setSearch}
        statusFilter={mgmt.statusFilter}
        setStatusFilter={mgmt.setStatusFilter}
        setPage={mgmt.setPage}
        invitations={mgmt.invitations}
        currentPage={mgmt.currentPage}
        totalPages={mgmt.totalPages}
        isListLoading={mgmt.isListLoading}
        isListFetching={mgmt.isListFetching}
        normalizedListError={mgmt.normalizedListError}
        handleRowAction={mgmt.handleRowAction}
      />

      <ResendDialog
        open={mgmt.resendDialogOpen}
        onClose={mgmt.closeResendDialog}
        selectedInvitation={mgmt.selectedInvitation}
        onConfirm={mgmt.handleConfirmResend}
        isLoading={mgmt.resendInvitationResult.isLoading}
      />

      <RevokeDialog
        open={mgmt.revokeDialogOpen}
        onClose={mgmt.closeRevokeDialog}
        selectedInvitation={mgmt.selectedInvitation}
        onConfirm={mgmt.handleConfirmRevoke}
        isLoading={mgmt.revokeInvitationResult.isLoading}
        revokeReason={mgmt.revokeReason}
        setRevokeReason={mgmt.setRevokeReason}
        revokeReasonError={mgmt.revokeReasonError}
        setRevokeReasonError={mgmt.setRevokeReasonError}
        revokeStepUpToken={mgmt.revokeStepUpToken}
        setRevokeStepUpToken={mgmt.setRevokeStepUpToken}
      />

      <AuthLinkDialog
        open={mgmt.authLinkDialogOpen}
        onClose={() => mgmt.setAuthLinkDialogOpen(false)}
        lastAuthLink={mgmt.lastAuthLink}
        addToast={mgmt.addToast}
      />
    </div>
  )
}

export default SuperAdminInvitations
