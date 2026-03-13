import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TabView } from '../../components/TabView'
import { useToaster } from '../../components/Toaster'
import { SuperAdminInvitationsPanel } from '../SuperAdminInvitations/SuperAdminInvitations.jsx'
import { VIEW_CUSTOMERS, VIEW_INVITATIONS } from './superAdminCustomers.constants.js'
import { normalizeWorkspaceView, getCustomerId, getUserEmail } from './superAdminCustomers.utils.js'
import { useCustomerManagement } from './useCustomerManagement.js'
import { useUserManagement } from './useUserManagement.js'
import { useAdminManagement } from './useAdminManagement.js'
import { CustomerListView } from './CustomerListView.jsx'
import { CustomerUsersWorkspace } from './CustomerUsersWorkspace.jsx'
import { CreateCustomerDialog } from './CreateCustomerDialog.jsx'
import { EditCustomerDialog } from './EditCustomerDialog.jsx'
import {
  CreateUserDialog,
  EditUserDialog,
  UserLifecycleDialog,
  AuthLinkDialog,
} from './CustomerUserDialogs.jsx'
import { AdminDialog } from './AdminDialog.jsx'
import './SuperAdminCustomers.css'

export function SuperAdminCustomersPanel({ onAssignAdminSuccess }) {
  const { addToast } = useToaster()

  const [usersWorkspaceCustomer, setUsersWorkspaceCustomer] = useState(null)
  const [authLinkDialogOpen, setAuthLinkDialogOpen] = useState(false)
  const [lastAuthLink, setLastAuthLink] = useState('')
  const [pendingInvitationTabSwitch, setPendingInvitationTabSwitch] = useState(false)

  const usersWorkspaceCustomerId = getCustomerId(usersWorkspaceCustomer)
  const isUsersWorkspaceOpen = Boolean(usersWorkspaceCustomerId)

  const customerMgmt = useCustomerManagement()

  const currentUsersWorkspaceCustomer = useMemo(() => {
    if (!usersWorkspaceCustomerId) {
      return usersWorkspaceCustomer
    }

    return customerMgmt.rows.find((row) => (
      String(getCustomerId(row) ?? '') === String(usersWorkspaceCustomerId)
    )) ?? usersWorkspaceCustomer
  }, [customerMgmt.rows, usersWorkspaceCustomer, usersWorkspaceCustomerId])

  const handleAuthLink = useCallback((authLink, switchToInvitations) => {
    setLastAuthLink(authLink)
    setAuthLinkDialogOpen(true)
    setPendingInvitationTabSwitch(switchToInvitations)
  }, [])

  const userMgmt = useUserManagement({
    customer: currentUsersWorkspaceCustomer,
    onAuthLink: handleAuthLink,
  })

  const adminMgmt = useAdminManagement({
    onAuthLink: handleAuthLink,
    onAssignAdminSuccess,
  })

  const usersWorkspaceAdminMode = userMgmt.hasCanonicalAdmin ? 'replace' : 'assign'
  const canAssignAdminFromUserEdit = !userMgmt.hasCanonicalAdmin && Boolean(userMgmt.userEditEmail)

  const openUsersWorkspace = useCallback((row) => {
    const customerId = getCustomerId(row)
    if (!customerId) return
    setUsersWorkspaceCustomer(row)
    userMgmt.resetWorkspaceState()
  }, [userMgmt.resetWorkspaceState])

  const closeUsersWorkspace = useCallback(() => {
    setUsersWorkspaceCustomer(null)
    userMgmt.resetWorkspaceState()
  }, [userMgmt.resetWorkspaceState])

  const closeAuthLinkDialog = useCallback(() => {
    setAuthLinkDialogOpen(false)
    setLastAuthLink('')
    if (pendingInvitationTabSwitch) {
      setPendingInvitationTabSwitch(false)
      onAssignAdminSuccess?.()
    }
  }, [onAssignAdminSuccess, pendingInvitationTabSwitch])

  const handleOpenAssignAdminFromUserEdit = useCallback(() => {
    if (!currentUsersWorkspaceCustomer) return

    const recipientName = userMgmt.userEditName.trim() || String(userMgmt.userEditTarget?.name ?? '').trim()
    const recipientEmail = getUserEmail(userMgmt.userEditTarget)

    if (!recipientEmail) {
      addToast({
        title: 'Cannot assign admin',
        description: 'Selected user is missing an email address required for invitation.',
        variant: 'warning',
      })
      return
    }

    userMgmt.closeUserEditDialog()
    adminMgmt.openAdminDialog('assign', currentUsersWorkspaceCustomer, {
      recipientName,
      recipientEmail,
    })
  }, [
    addToast,
    currentUsersWorkspaceCustomer,
    userMgmt.closeUserEditDialog,
    adminMgmt.openAdminDialog,
    userMgmt.userEditName,
    userMgmt.userEditTarget,
  ])

  return (
    <section className="super-admin-customers" aria-label="Super admin customers">
      {isUsersWorkspaceOpen ? (
        <CustomerUsersWorkspace
          customer={currentUsersWorkspaceCustomer}
          customerId={usersWorkspaceCustomerId}
          userSearch={userMgmt.userSearch}
          onUserSearchChange={userMgmt.setUserSearch}
          userRoleFilter={userMgmt.userRoleFilter}
          onUserRoleFilterChange={userMgmt.setUserRoleFilter}
          userStatusFilter={userMgmt.userStatusFilter}
          onUserStatusFilterChange={userMgmt.setUserStatusFilter}
          userPage={userMgmt.userPage}
          onUserPageChange={userMgmt.setUserPage}
          userRows={userMgmt.userRows}
          isListUsersLoading={userMgmt.isListUsersLoading}
          isListUsersFetching={userMgmt.isListUsersFetching}
          listUsersAppError={userMgmt.listUsersAppError}
          listUsersErrorMessage={userMgmt.listUsersErrorMessage}
          userTotalPages={userMgmt.userTotalPages}
          userCurrentPage={userMgmt.userCurrentPage}
          userTotalCount={userMgmt.userTotalCount}
          hasCanonicalAdmin={userMgmt.hasCanonicalAdmin}
          adminMutationLoading={adminMgmt.adminMutationLoading}
          createUserLoading={userMgmt.createUserResult.isLoading}
          userLifecycleActions={userMgmt.userLifecycleActions}
          onUserLifecycleAction={userMgmt.handleUserLifecycleAction}
          onBackClick={closeUsersWorkspace}
          onCreateUserClick={userMgmt.openUserCreateDialog}
          onOpenAdminDialog={adminMgmt.openAdminDialog}
          usersWorkspaceAdminMode={usersWorkspaceAdminMode}
        />
      ) : (
        <CustomerListView
          search={customerMgmt.search}
          onSearchChange={customerMgmt.setSearch}
          statusFilter={customerMgmt.statusFilter}
          onStatusFilterChange={customerMgmt.setStatusFilter}
          topologyFilter={customerMgmt.topologyFilter}
          onTopologyFilterChange={customerMgmt.setTopologyFilter}
          rows={customerMgmt.rows}
          isListLoading={customerMgmt.isListLoading}
          isListFetching={customerMgmt.isListFetching}
          listAppError={customerMgmt.listAppError}
          totalPages={customerMgmt.totalPages}
          currentPage={customerMgmt.currentPage}
          onPageChange={customerMgmt.setPage}
          createButtonDisabled={customerMgmt.createResult.isLoading}
          onCreateClick={customerMgmt.openCreateDialog}
          onEditClick={customerMgmt.openEditDialog}
          onViewUsers={openUsersWorkspace}
          onUpdateStatus={customerMgmt.handleUpdateStatus}
          updateStatusLoading={customerMgmt.updateStatusResult.isLoading}
        />
      )}

      <CreateCustomerDialog
        open={customerMgmt.createOpen}
        onClose={customerMgmt.closeCreateDialog}
        form={customerMgmt.createForm}
        setForm={customerMgmt.setCreateForm}
        errors={customerMgmt.createErrors}
        setErrors={customerMgmt.setCreateErrors}
        licenseLevels={customerMgmt.licenseLevels}
        isLoadingLicenseLevels={customerMgmt.isLoadingLicenseLevels}
        onSubmit={customerMgmt.handleCreate}
        isSubmitting={customerMgmt.createResult.isLoading}
      />

      <EditCustomerDialog
        open={customerMgmt.editOpen}
        onClose={customerMgmt.closeEditDialog}
        form={customerMgmt.editForm}
        setForm={customerMgmt.setEditForm}
        errors={customerMgmt.editErrors}
        licenseLevels={customerMgmt.licenseLevels}
        isLoadingLicenseLevels={customerMgmt.isLoadingLicenseLevels}
        onSubmit={customerMgmt.handleUpdate}
        isSubmitting={customerMgmt.updateResult.isLoading}
        isFetchingDetails={customerMgmt.isFetchingCustomerDetails}
        detailsError={customerMgmt.customerDetailsAppError}
      />

      <EditUserDialog
        open={userMgmt.userEditOpen}
        onClose={userMgmt.closeUserEditDialog}
        customerName={currentUsersWorkspaceCustomer?.name}
        name={userMgmt.userEditName}
        onNameChange={userMgmt.setUserEditName}
        email={userMgmt.userEditEmail}
        roles={userMgmt.userEditRoles}
        onToggleRole={userMgmt.toggleUserEditRole}
        roleOptions={userMgmt.editUserRoleOptions}
        errors={userMgmt.userEditErrors}
        onClearNameError={() => {
          userMgmt.setUserEditErrors((currentErrors) => {
            if (!currentErrors.name && !currentErrors.form) return currentErrors
            const nextErrors = { ...currentErrors }
            delete nextErrors.name
            delete nextErrors.form
            return nextErrors
          })
        }}
        isSubmitting={userMgmt.updateUserResult.isLoading}
        adminMutationLoading={adminMgmt.adminMutationLoading}
        hasCanonicalAdmin={userMgmt.hasCanonicalAdmin}
        canAssignAdminFromUserEdit={canAssignAdminFromUserEdit}
        onAssignAdmin={handleOpenAssignAdminFromUserEdit}
        onSubmit={userMgmt.handleUserEditMutation}
      />

      <CreateUserDialog
        open={userMgmt.userCreateOpen}
        onClose={userMgmt.closeUserCreateDialog}
        customerName={currentUsersWorkspaceCustomer?.name}
        mode={userMgmt.userCreateMode}
        onModeChange={userMgmt.setUserCreateMode}
        name={userMgmt.userCreateName}
        onNameChange={userMgmt.setUserCreateName}
        email={userMgmt.userCreateEmail}
        onEmailChange={userMgmt.setUserCreateEmail}
        existingUserId={userMgmt.userCreateExistingUserId}
        onExistingUserIdChange={userMgmt.setUserCreateExistingUserId}
        roles={userMgmt.userCreateRoles}
        onToggleRole={userMgmt.toggleUserCreateRole}
        roleOptions={userMgmt.createUserRoleOptions}
        errors={userMgmt.userCreateErrors}
        onClearError={(field) => {
          if (field) {
            userMgmt.setUserCreateErrors((currentErrors) => {
              if (!currentErrors[field] && !currentErrors.form) return currentErrors
              const nextErrors = { ...currentErrors }
              delete nextErrors[field]
              delete nextErrors.form
              return nextErrors
            })
          } else {
            userMgmt.setUserCreateErrors({})
          }
        }}
        isSubmitting={userMgmt.createUserResult.isLoading}
        onSubmit={userMgmt.handleUserCreateMutation}
      />

      <AdminDialog
        open={adminMgmt.adminDialogOpen}
        onClose={adminMgmt.closeAdminDialog}
        mode={adminMgmt.adminMode}
        customer={adminMgmt.adminCustomer}
        recipientName={adminMgmt.adminRecipientName}
        onRecipientNameChange={adminMgmt.setAdminRecipientName}
        recipientEmail={adminMgmt.adminRecipientEmail}
        onRecipientEmailChange={adminMgmt.setAdminRecipientEmail}
        userId={adminMgmt.adminUserId}
        onUserIdChange={adminMgmt.setAdminUserId}
        reason={adminMgmt.adminReason}
        onReasonChange={adminMgmt.setAdminReason}
        stepUpToken={adminMgmt.adminStepUpToken}
        onStepUpComplete={adminMgmt.setAdminStepUpToken}
        error={adminMgmt.adminError}
        onErrorClear={() => adminMgmt.setAdminError('')}
        loading={adminMgmt.adminMutationLoading}
        onSubmit={adminMgmt.handleAdminMutation}
      />

      <UserLifecycleDialog
        confirm={userMgmt.userLifecycleConfirm}
        onClose={userMgmt.closeUserLifecycleConfirm}
        onConfirm={userMgmt.handleUserLifecycleConfirm}
        loading={userMgmt.userLifecycleMutationLoading}
      />

      <AuthLinkDialog
        open={authLinkDialogOpen}
        onClose={closeAuthLinkDialog}
        authLink={lastAuthLink}
      />
    </section>
  )
}

function SuperAdminCustomers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const activeView = normalizeWorkspaceView(requestedView)
  const activeTab = activeView === VIEW_INVITATIONS ? 1 : 0

  const updateWorkspaceView = useCallback(
    (nextView, { replace = false } = {}) => {
      const normalizedView = normalizeWorkspaceView(nextView)
      if (normalizedView === requestedView) return

      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('view', normalizedView)
      setSearchParams(nextSearchParams, { replace })
    },
    [requestedView, searchParams, setSearchParams],
  )

  useEffect(() => {
    // Only normalize when an explicit but invalid ?view param is present.
    // A missing param (null) is left as-is so the base URL stays clean.
    if (requestedView === null) return
    if (requestedView === activeView) return
    updateWorkspaceView(activeView, { replace: true })
  }, [activeView, requestedView, updateWorkspaceView])

  const handleTabChange = useCallback(
    (tabIndex) => {
      // Tab 0 = Customers, Tab 1 = Invitations — matches TabView.Tab declaration order below.
      updateWorkspaceView(tabIndex === 1 ? VIEW_INVITATIONS : VIEW_CUSTOMERS)
    },
    [updateWorkspaceView],
  )

  const handleAssignAdminSuccess = useCallback(() => {
    updateWorkspaceView(VIEW_INVITATIONS)
  }, [updateWorkspaceView])

  return (
    <section className="super-admin-customer-admin container" aria-label="Customer admin workspace">
      <h1 className="sr-only">Customer Admin</h1>

      <TabView
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="pills"
        className="super-admin-customer-admin__tabs"
        aria-label="Customer admin views"
      >
        <TabView.Tab label="Customers">
          <SuperAdminCustomersPanel onAssignAdminSuccess={handleAssignAdminSuccess} />
        </TabView.Tab>
        <TabView.Tab label="Invitations">
          <SuperAdminInvitationsPanel
            isActive={activeView === VIEW_INVITATIONS}
            embedded
          />
        </TabView.Tab>
      </TabView>
    </section>
  )
}

export default SuperAdminCustomers
