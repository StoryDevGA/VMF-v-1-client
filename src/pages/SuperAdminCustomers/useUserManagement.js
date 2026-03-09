import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useDeleteUserMutation,
} from '../../store/api/userApi.js'
import {
  normalizeError,
  getErrorMessage,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import {
  EMAIL_REGEX,
  USER_CREATE_ROLE_OPTIONS,
  DEFAULT_USER_CREATE_ROLES,
} from './superAdminCustomers.constants.js'
import {
  getCustomerId,
  getUserId,
  getUserDisplayName,
  getUserEmail,
  getUserTrustStatus,
  getCustomerUserRoles,
  normalizeRoles,
  normalizeUserStatus,
  isSingleTenantTopology,
  getLifecycleActionVerb,
  normalizeMutationData,
  getFirstErrorDetailMessage,
  getCreateUserConflictMessage,
  mapFieldErrorsFromDetails,
  mapEditUserFieldErrorsFromDetails,
} from './superAdminCustomers.utils.js'

export function useUserManagement({ customer, onAuthLink }) {
  const { addToast } = useToaster()
  const customerId = getCustomerId(customer)

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [userPage, setUserPage] = useState(1)

  const [userCreateOpen, setUserCreateOpen] = useState(false)
  const [userCreateMode, setUserCreateMode] = useState('invite_new')
  const [userCreateName, setUserCreateName] = useState('')
  const [userCreateEmail, setUserCreateEmail] = useState('')
  const [userCreateExistingUserId, setUserCreateExistingUserId] = useState('')
  const [userCreateRoles, setUserCreateRoles] = useState(DEFAULT_USER_CREATE_ROLES)
  const [userCreateErrors, setUserCreateErrors] = useState({})

  const [userEditOpen, setUserEditOpen] = useState(false)
  const [userEditTarget, setUserEditTarget] = useState(null)
  const [userEditName, setUserEditName] = useState('')
  const [userEditRoles, setUserEditRoles] = useState([])
  const [userEditErrors, setUserEditErrors] = useState({})

  const [userLifecycleConfirm, setUserLifecycleConfirm] = useState(null)

  const debouncedUserSearch = useDebounce(userSearch, 300)

  const {
    data: listUsersResponse,
    isLoading: isListUsersLoading,
    isFetching: isListUsersFetching,
    error: listUsersError,
  } = useListUsersQuery(
    {
      customerId,
      page: userPage,
      pageSize: 20,
      q: debouncedUserSearch.trim(),
      role: userRoleFilter,
      status: userStatusFilter,
    },
    { skip: !customerId },
  )

  const [createUser, createUserResult] = useCreateUserMutation()
  const [updateUser, updateUserResult] = useUpdateUserMutation()
  const [disableUser, disableUserResult] = useDisableUserMutation()
  const [enableUser, enableUserResult] = useEnableUserMutation()
  const [deleteUser, deleteUserResult] = useDeleteUserMutation()

  const userRows = useMemo(
    () =>
      (listUsersResponse?.data?.users ?? []).map((row, index) => ({
        ...row,
        id: row?.id ?? row?._id ?? `customer-user-${index}`,
      })),
    [listUsersResponse],
  )
  const userMeta = listUsersResponse?.meta ?? {}
  const userTotalPages = Number(userMeta.totalPages) || 1
  const userCurrentPage = Number(userMeta.page) || userPage
  const userTotal = Number(userMeta.total)
  const userTotalCount = Number.isFinite(userTotal) ? userTotal : userRows.length

  const hasCanonicalAdmin = useMemo(() => {
    if (userRows.some((row) => Boolean(row?.isCanonicalAdmin))) {
      return true
    }
    return Boolean(String(customer?.governance?.customerAdminUserId ?? '').trim())
  }, [userRows, customer?.governance?.customerAdminUserId])

  const createUserRoleOptions = useMemo(() => (
    isSingleTenantTopology(customer?.topology)
      ? USER_CREATE_ROLE_OPTIONS.filter((option) => option.value !== 'TENANT_ADMIN')
      : USER_CREATE_ROLE_OPTIONS
  ), [customer?.topology])

  useEffect(() => {
    const allowedRoles = new Set(createUserRoleOptions.map((option) => option.value))
    setUserCreateRoles((currentRoles) => {
      const nextRoles = currentRoles.filter((role) => allowedRoles.has(role))
      if (nextRoles.length > 0) return nextRoles
      return DEFAULT_USER_CREATE_ROLES.filter((role) => allowedRoles.has(role))
    })
  }, [createUserRoleOptions])

  const listUsersAppError = listUsersError ? normalizeError(listUsersError) : null
  const listUsersErrorMessage = getFirstErrorDetailMessage(listUsersAppError?.details)
    || listUsersAppError?.message
    || ''

  const resetUserCreateForm = useCallback(() => {
    setUserCreateMode('invite_new')
    setUserCreateName('')
    setUserCreateEmail('')
    setUserCreateExistingUserId('')
    setUserCreateRoles(DEFAULT_USER_CREATE_ROLES)
    setUserCreateErrors({})
  }, [])

  const resetWorkspaceState = useCallback(() => {
    setUserSearch('')
    setUserRoleFilter('')
    setUserStatusFilter('')
    setUserPage(1)
    setUserCreateOpen(false)
    setUserEditOpen(false)
    setUserEditTarget(null)
    setUserEditName('')
    setUserEditRoles([])
    setUserEditErrors({})
    setUserLifecycleConfirm(null)
    resetUserCreateForm()
  }, [resetUserCreateForm])

  const openUserCreateDialog = useCallback(() => {
    if (!customerId) return
    resetUserCreateForm()
    setUserCreateOpen(true)
  }, [resetUserCreateForm, customerId])

  const closeUserCreateDialog = useCallback(() => {
    setUserCreateOpen(false)
    resetUserCreateForm()
  }, [resetUserCreateForm])

  const openUserEditDialog = useCallback((row) => {
    if (!row) return
    setUserEditTarget(row)
    setUserEditName(String(row?.name ?? ''))
    setUserEditRoles(normalizeRoles(getCustomerUserRoles(row, customerId)))
    setUserEditErrors({})
    setUserEditOpen(true)
  }, [customerId])

  const closeUserEditDialog = useCallback(() => {
    setUserEditOpen(false)
    setUserEditTarget(null)
    setUserEditName('')
    setUserEditRoles([])
    setUserEditErrors({})
  }, [])

  const toggleUserCreateRole = useCallback((role) => {
    setUserCreateRoles((previousRoles) => (
      previousRoles.includes(role)
        ? previousRoles.filter((currentRole) => currentRole !== role)
        : [...previousRoles, role]
    ))
    setUserCreateErrors((currentErrors) => {
      if (!currentErrors.roles && !currentErrors.form) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors.roles
      delete nextErrors.form
      return nextErrors
    })
  }, [])

  const toggleUserEditRole = useCallback((role) => {
    setUserEditRoles((previousRoles) => (
      previousRoles.includes(role)
        ? previousRoles.filter((currentRole) => currentRole !== role)
        : [...previousRoles, role]
    ))
    setUserEditErrors((currentErrors) => {
      if (!currentErrors.roles && !currentErrors.form) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors.roles
      delete nextErrors.form
      return nextErrors
    })
  }, [])

  const handleUserEditMutation = useCallback(async () => {
    if (!customerId || !userEditTarget) return

    const userId = getUserId(userEditTarget)
    if (!userId) {
      setUserEditErrors({
        form: 'This user row is missing an ID and cannot be updated.',
      })
      return
    }

    const trimmedName = userEditName.trim()
    const normalizedRoles = normalizeRoles(userEditRoles)
    const validationErrors = {}

    if (!trimmedName) {
      validationErrors.name = 'Full name is required.'
    }
    if (normalizedRoles.length === 0) {
      validationErrors.roles = 'Select at least one role.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setUserEditErrors(validationErrors)
      return
    }

    try {
      await updateUser({
        userId,
        body: {
          name: trimmedName,
          roles: normalizedRoles,
        },
      }).unwrap()
      addToast({
        title: 'User updated',
        description: `${trimmedName} was updated successfully.`,
        variant: 'success',
      })
      closeUserEditDialog()
    } catch (err) {
      const appError = normalizeError(err)

      if (
        normalizedRoles.includes('CUSTOMER_ADMIN')
        && isCanonicalAdminConflictError(appError)
      ) {
        setUserEditErrors({
          roles: getCanonicalAdminConflictMessage(appError, 'update_roles'),
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mappedErrors = mapEditUserFieldErrorsFromDetails(appError.details)
        if (Object.keys(mappedErrors).length > 0) {
          setUserEditErrors(mappedErrors)
          return
        }
      }

      const detailMessage = getFirstErrorDetailMessage(appError?.details)
      setUserEditErrors({
        form: detailMessage || appError.message || getErrorMessage(appError?.code),
      })
    }
  }, [
    addToast,
    closeUserEditDialog,
    updateUser,
    userEditName,
    userEditRoles,
    userEditTarget,
    customerId,
  ])

  const handleUserCreateMutation = useCallback(async () => {
    if (!customerId) return

    const validationErrors = {}
    if (userCreateMode === 'assign_existing') {
      if (!userCreateExistingUserId.trim()) {
        validationErrors.existingUserId = 'Existing User ID is required.'
      }
    } else {
      if (!userCreateName.trim()) {
        validationErrors.name = 'Full name is required.'
      }
      if (!userCreateEmail.trim()) {
        validationErrors.email = 'Email is required.'
      } else if (!EMAIL_REGEX.test(userCreateEmail.trim())) {
        validationErrors.email = 'Please enter a valid email address.'
      }
    }

    if (userCreateRoles.length === 0) {
      validationErrors.roles = 'Select at least one role.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setUserCreateErrors(validationErrors)
      return
    }

    const body = {
      roles: userCreateRoles,
    }

    if (userCreateMode === 'assign_existing') {
      body.existingUserId = userCreateExistingUserId.trim()
    } else {
      body.name = userCreateName.trim()
      body.email = userCreateEmail.trim()
    }

    try {
      const result = await createUser({
        customerId,
        body,
      }).unwrap()
      const outcomeData = normalizeMutationData(result)
      const outcome = String(outcomeData?.outcome ?? '')
        .trim()
        .toLowerCase()
      const invitationOutcome = String(outcomeData?.invitationOutcome ?? '')
        .trim()
        .toLowerCase()
      const inviteEmail = userCreateEmail.trim()

      if (outcome === 'assigned_existing') {
        addToast({
          title: 'User assigned',
          description: 'Existing user assigned to this customer.',
          variant: 'success',
        })
      } else if (outcome === 'invited_new') {
        if (invitationOutcome === 'send_failed') {
          addToast({
            title: 'User created, invitation not sent',
            description: `User account created for ${inviteEmail}. Invitation email delivery failed. Check Invitation Management for status.`,
            variant: 'warning',
          })
        } else if (invitationOutcome === 'sent') {
          addToast({
            title: 'User created and invited',
            description: `User account created for ${inviteEmail}. Invitation email sent.`,
            variant: 'success',
          })
        } else {
          addToast({
            title: 'User created, invitation status unknown',
            description: `User account created for ${inviteEmail}. Invitation delivery status is unavailable. Check Invitation Management for status.`,
            variant: 'warning',
          })
        }
      } else {
        addToast({
          title: 'User created',
          description: 'User created successfully.',
          variant: 'success',
        })
      }

      const authLink = String(outcomeData?.authLink ?? '').trim()
      if (outcome === 'invited_new' && authLink) {
        onAuthLink?.(authLink, false)
      }

      closeUserCreateDialog()
    } catch (err) {
      const appError = normalizeError(err)

      if (
        userCreateRoles.includes('CUSTOMER_ADMIN')
        && isCanonicalAdminConflictError(appError)
      ) {
        setUserCreateErrors({
          roles: getCanonicalAdminConflictMessage(appError, 'assign'),
        })
        return
      }

      if (
        appError.status === 409
        && (appError.code === 'USER_ALREADY_EXISTS' || appError.code === 'USER_CUSTOMER_CONFLICT')
      ) {
        const conflictMessage = getCreateUserConflictMessage(appError)
        const targetField =
          userCreateMode === 'assign_existing'
            ? 'existingUserId'
            : appError.code === 'USER_ALREADY_EXISTS'
              ? 'email'
              : 'form'
        setUserCreateErrors({
          [targetField]: conflictMessage,
        })
        return
      }

      if (appError.status === 422 && appError.details) {
        const mappedErrors = mapFieldErrorsFromDetails(appError.details)
        if (Object.keys(mappedErrors).length > 0) {
          setUserCreateErrors(mappedErrors)
          return
        }
      }

      const detailMessage = getFirstErrorDetailMessage(appError?.details)
      setUserCreateErrors({
        form: detailMessage || appError.message || getErrorMessage(appError?.code),
      })
    }
  }, [
    addToast,
    closeUserCreateDialog,
    createUser,
    userCreateEmail,
    userCreateExistingUserId,
    userCreateMode,
    userCreateName,
    userCreateRoles,
    customerId,
    onAuthLink,
  ])

  const closeUserLifecycleConfirm = useCallback(() => {
    setUserLifecycleConfirm(null)
  }, [])

  const handleUserLifecycleAction = useCallback(
    (label, row) => {
      if (!customerId) return

      const userId = getUserId(row)
      if (!userId) {
        addToast({
          title: 'Action unavailable',
          description: 'This user row is missing an ID and cannot be updated.',
          variant: 'warning',
        })
        return
      }

      const status = normalizeUserStatus(row)
      const userName = getUserDisplayName(row)

      if (label === 'Edit User') {
        openUserEditDialog(row)
        return
      }

      if (label === 'Deactivate') {
        if (status !== 'ACTIVE') {
          addToast({
            title: 'Already inactive',
            description: `${userName} is already inactive.`,
            variant: 'info',
          })
          return
        }
        setUserLifecycleConfirm({
          type: 'disable',
          userId,
          userName,
        })
        return
      }

      if (label === 'Reactivate') {
        if (status !== 'INACTIVE') {
          addToast({
            title: 'Already active',
            description: `${userName} is already active.`,
            variant: 'info',
          })
          return
        }
        setUserLifecycleConfirm({
          type: 'enable',
          userId,
          userName,
        })
        return
      }

      if (label === 'Archive') {
        if (status === 'ACTIVE') {
          addToast({
            title: 'Cannot archive active user',
            description: 'Deactivate the user before archiving.',
            variant: 'warning',
          })
          return
        }
        setUserLifecycleConfirm({
          type: 'archive',
          userId,
          userName,
        })
      }
    },
    [addToast, openUserEditDialog, customerId],
  )

  const handleUserLifecycleConfirm = useCallback(async () => {
    if (!userLifecycleConfirm) return

    const { type, userId, userName } = userLifecycleConfirm

    try {
      if (type === 'enable') {
        const result = await enableUser({ userId }).unwrap()
        const enabledUser = normalizeMutationData(result)
        const trustStatus = getUserTrustStatus(enabledUser)
        if (trustStatus === 'UNTRUSTED') {
          addToast({
            title: 'User reactivated',
            description: `${userName} is active, but trust is UNTRUSTED. Ask them to complete sign-in again.`,
            variant: 'warning',
          })
        } else {
          addToast({
            title: 'User reactivated',
            description: `${userName} is active again.`,
            variant: 'success',
          })
        }
      } else if (type === 'archive') {
        await deleteUser({ userId }).unwrap()
        addToast({
          title: 'User archived',
          description: `${userName} has been permanently removed.`,
          variant: 'success',
        })
      } else {
        await disableUser({ userId }).unwrap()
        addToast({
          title: 'User deactivated',
          description: `${userName} is now inactive.`,
          variant: 'success',
        })
      }
      setUserLifecycleConfirm(null)
    } catch (err) {
      const appError = normalizeError(err)

      if (type !== 'enable' && isCanonicalAdminConflictError(appError)) {
        addToast({
          title: type === 'archive' ? 'Cannot archive user' : 'Cannot deactivate user',
          description: getCanonicalAdminConflictMessage(
            appError,
            type === 'archive' ? 'delete' : 'disable',
          ),
          variant: 'warning',
        })
        setUserLifecycleConfirm(null)
        return
      }

      const detailMessage = getFirstErrorDetailMessage(appError?.details)
      addToast({
        title: `${getLifecycleActionVerb(type)} failed`,
        description: detailMessage || appError.message || getErrorMessage(appError?.code),
        variant: 'error',
      })
      setUserLifecycleConfirm(null)
    }
  }, [addToast, deleteUser, disableUser, enableUser, userLifecycleConfirm])

  const userLifecycleActions = useMemo(
    () => [
      {
        label: 'Edit User',
        variant: 'ghost',
        disabled: (row) =>
          updateUserResult.isLoading
          || createUserResult.isLoading
          || disableUserResult.isLoading
          || enableUserResult.isLoading
          || deleteUserResult.isLoading
          || !getUserId(row),
      },
      {
        label: 'Deactivate',
        variant: 'ghost',
        disabled: (row) =>
          updateUserResult.isLoading
          || createUserResult.isLoading
          || disableUserResult.isLoading
          || enableUserResult.isLoading
          || deleteUserResult.isLoading
          || normalizeUserStatus(row) !== 'ACTIVE',
      },
      {
        label: 'Reactivate',
        variant: 'ghost',
        disabled: (row) =>
          updateUserResult.isLoading
          || createUserResult.isLoading
          || disableUserResult.isLoading
          || enableUserResult.isLoading
          || deleteUserResult.isLoading
          || normalizeUserStatus(row) !== 'INACTIVE',
      },
      {
        label: 'Archive',
        variant: 'ghost',
        disabled: (row) =>
          updateUserResult.isLoading
          || createUserResult.isLoading
          || disableUserResult.isLoading
          || enableUserResult.isLoading
          || deleteUserResult.isLoading
          || normalizeUserStatus(row) === 'ACTIVE',
      },
    ],
    [
      createUserResult.isLoading,
      deleteUserResult.isLoading,
      disableUserResult.isLoading,
      enableUserResult.isLoading,
      updateUserResult.isLoading,
    ],
  )

  const userLifecycleMutationLoading =
    disableUserResult.isLoading || enableUserResult.isLoading || deleteUserResult.isLoading
  const userEditEmail = getUserEmail(userEditTarget)

  return {
    userSearch,
    setUserSearch,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    userPage,
    setUserPage,
    userCreateOpen,
    userCreateMode,
    setUserCreateMode,
    userCreateName,
    setUserCreateName,
    userCreateEmail,
    setUserCreateEmail,
    userCreateExistingUserId,
    setUserCreateExistingUserId,
    userCreateRoles,
    userCreateErrors,
    setUserCreateErrors,
    userEditOpen,
    userEditTarget,
    userEditName,
    setUserEditName,
    userEditRoles,
    userEditErrors,
    setUserEditErrors,
    userLifecycleConfirm,
    userRows,
    userTotalPages,
    userCurrentPage,
    userTotalCount,
    hasCanonicalAdmin,
    createUserRoleOptions,
    isListUsersLoading,
    isListUsersFetching,
    listUsersAppError,
    listUsersErrorMessage,
    createUserResult,
    updateUserResult,
    userLifecycleActions,
    userLifecycleMutationLoading,
    userEditEmail,
    resetWorkspaceState,
    openUserCreateDialog,
    closeUserCreateDialog,
    openUserEditDialog,
    closeUserEditDialog,
    toggleUserCreateRole,
    toggleUserEditRole,
    handleUserEditMutation,
    handleUserCreateMutation,
    closeUserLifecycleConfirm,
    handleUserLifecycleAction,
    handleUserLifecycleConfirm,
  }
}
