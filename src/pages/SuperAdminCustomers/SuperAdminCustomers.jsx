import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Fieldset } from '../../components/Fieldset'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Select } from '../../components/Select'
import { Tickbox } from '../../components/Tickbox'
import { Button } from '../../components/Button'
import { Status } from '../../components/Status'
import { Table } from '../../components/Table'
import { Dialog } from '../../components/Dialog'
import { HorizontalScroll } from '../../components/HorizontalScroll'
import { TabView } from '../../components/TabView'
import { StepUpAuthForm } from '../../components/StepUpAuthForm'
import { Accordion } from '../../components/Accordion'
import { TableDateTime } from '../../components/TableDateTime'
import { UserTrustStatus } from '../../components/UserTrustStatus'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import { SuperAdminInvitationsPanel } from '../SuperAdminInvitations/SuperAdminInvitations.jsx'
import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useCreateCustomerAdminInvitationMutation,
  useReplaceCustomerAdminMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import {
  useListUsersQuery,
  useCreateUserMutation,
} from '../../store/api/userApi.js'
import {
  appendRequestReference,
  getStepUpErrorSignal,
  normalizeError,
  getErrorMessage,
  isCanonicalAdminConflictError,
  getCanonicalAdminConflictMessage,
} from '../../utils/errors.js'
import './SuperAdminCustomers.css'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const TOPOLOGY_FILTER_OPTIONS = [
  { value: '', label: 'All topologies' },
  { value: 'SINGLE_TENANT', label: 'Single Tenant' },
  { value: 'MULTI_TENANT', label: 'Multi Tenant' },
]

const USER_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const USER_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'CUSTOMER_ADMIN', label: 'Customer Admin' },
  { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
  { value: 'USER', label: 'User' },
]

const USER_CREATE_ROLE_OPTIONS = USER_ROLE_FILTER_OPTIONS.filter((option) => option.value)
const USER_CREATE_MODE_OPTIONS = [
  { value: 'invite_new', label: 'Invite New User' },
  { value: 'assign_existing', label: 'Assign Existing User' },
]

const BILLING_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
]

const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE =
  'An active invitation for this email is already tied to another user and is not linked to this customer yet. Revoke that invitation or wait for expiry, then retry.'
const ASSIGN_INVITATION_ALREADY_ACTIVE_FALLBACK_MESSAGE =
  'An active invitation for this email already exists. Review Invitation Management before retrying.'
const REPLACE_ADMIN_HELP_ITEMS = [
  {
    id: 'replace-admin-when',
    title: 'When to use Replace Admin',
    detail: 'Use only when the replacement person already has an account. This updates canonical ownership immediately.',
  },
  {
    id: 'assign-admin-when',
    title: 'When to use Assign Admin',
    detail: 'If no account exists yet, invite first with Assign Admin. Canonical ownership stays unchanged until onboarding completes.',
  },
  {
    id: 'replace-admin-user-id-verification',
    title: 'User ID and Verification',
    detail: 'Enter an existing User ID and verify with your current Super Admin password before replacing.',
  },
]
const REPLACE_ADMIN_STEP_UP_REQUIRED_MESSAGE =
  'Step-up verification is required. Verify using your current Super Admin password before replacing admin.'
const REPLACE_ADMIN_STEP_UP_INVALID_MESSAGE =
  'Step-up verification has expired. Verify again using your current Super Admin password, then retry Replace Admin.'
const REPLACE_ADMIN_STEP_UP_UNAVAILABLE_MESSAGE =
  'Step-up verification is temporarily unavailable. Wait a moment, then verify using your current Super Admin password and retry.'
const INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP = {
  DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  ACTIVE_INVITATION_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  INVITATION_ALREADY_ACTIVE_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  EMAIL_ACTIVE_FOR_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
}
const CANONICAL_ADMIN_HELP_TEXT =
  'Canonical Admin shows the governance owner user ID for each customer. It changes only after Replace Admin succeeds.'

const INITIAL_FORM = {
  name: '',
  website: '',
  topology: 'SINGLE_TENANT',
  vmfPolicy: 'SINGLE',
  licenseLevelId: '',
  maxTenants: '1',
  maxVmfsPerTenant: '1',
  planCode: 'FREE',
  billingCycle: 'MONTHLY',
}

const VIEW_CUSTOMERS = 'customers'
const VIEW_INVITATIONS = 'invitations'

const normalizeWorkspaceView = (value) =>
  value === VIEW_INVITATIONS ? VIEW_INVITATIONS : VIEW_CUSTOMERS

const getCustomerId = (customer) => customer?.id ?? customer?._id
const displayStatus = (value) => (value === 'DISABLED' ? 'INACTIVE' : value || '--')

const parsePositiveInt = (value) => Number.parseInt(String(value ?? '').trim(), 10)

const getRowActionMenuId = (row) => {
  const rawId = String(getCustomerId(row) ?? row?.name ?? 'customer').toLowerCase()
  const safeId = rawId.replace(/[^a-z0-9_-]/g, '-')
  return `sa-customer-row-actions-${safeId}`
}

const getVmfPolicyForCount = (topology, vmfCount) => {
  const parsedCount = parsePositiveInt(vmfCount)
  const normalizedCount = Number.isInteger(parsedCount) && parsedCount > 1 ? parsedCount : 1

  if (topology === 'MULTI_TENANT') {
    return normalizedCount > 1 ? 'PER_TENANT_MULTI' : 'PER_TENANT_SINGLE'
  }
  return normalizedCount > 1 ? 'MULTI' : 'SINGLE'
}

const normalizeUserStatus = (row) => {
  const explicitStatus = String(row?.status ?? '')
    .trim()
    .toUpperCase()
  if (explicitStatus) return explicitStatus
  return row?.isActive ? 'ACTIVE' : 'INACTIVE'
}

const getUserTrustStatus = (row) =>
  String(row?.trustStatus ?? row?.identityPlus?.trustStatus ?? 'UNTRUSTED')
    .trim()
    .toUpperCase()

const getCustomerUserRoles = (row, customerId) => {
  if (Array.isArray(row?.customerRoles) && row.customerRoles.length > 0) {
    return row.customerRoles
  }

  if (!Array.isArray(row?.memberships)) return []
  const targetCustomerId = String(customerId ?? '')
  const membership = row.memberships.find((item) =>
    String(item?.customerId ?? '') === targetCustomerId,
  )

  return Array.isArray(membership?.roles) ? membership.roles : []
}

const isValidUrl = (value) => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

const createFormFromCustomer = (customer) => ({
  name: customer?.name ?? '',
  website: customer?.website ?? '',
  topology: customer?.topology ?? 'SINGLE_TENANT',
  vmfPolicy: customer?.vmfPolicy ?? getVmfPolicyForCount(
    customer?.topology ?? 'SINGLE_TENANT',
    customer?.governance?.maxVmfsPerTenant ?? 1,
  ),
  licenseLevelId: customer?.licenseLevelId ?? '',
  maxTenants: String(customer?.governance?.maxTenants ?? 1),
  maxVmfsPerTenant: String(customer?.governance?.maxVmfsPerTenant ?? 1),
  planCode: customer?.billing?.planCode ?? 'FREE',
  billingCycle: customer?.billing?.cycle ?? 'MONTHLY',
})

const validateForm = (form) => {
  const errors = {}
  const payload = {}

  const name = form.name.trim()
  if (!name) errors.name = 'Name is required.'
  else payload.name = name

  const website = form.website.trim()
  if (website && !isValidUrl(website)) errors.website = 'Website must be a valid URL.'
  else if (website) payload.website = website

  if (!form.licenseLevelId) errors.licenseLevelId = 'Licence level is required.'
  else payload.licenseLevelId = form.licenseLevelId

  let maxTenants = 1
  if (form.topology === 'MULTI_TENANT') {
    maxTenants = parsePositiveInt(form.maxTenants)
    if (!Number.isInteger(maxTenants) || maxTenants < 1) {
      errors.maxTenants = 'Max tenants must be at least 1.'
    }
  }

  const maxVmfsPerTenant = parsePositiveInt(form.maxVmfsPerTenant)
  if (!Number.isInteger(maxVmfsPerTenant) || maxVmfsPerTenant < 1) {
    errors.maxVmfsPerTenant = 'VMF count must be at least 1.'
  }

  payload.topology = form.topology
  payload.vmfPolicy = getVmfPolicyForCount(form.topology, maxVmfsPerTenant)
  payload.isServiceProvider = form.topology === 'MULTI_TENANT'
  payload.governance = { maxTenants, maxVmfsPerTenant }
  payload.billing = {
    planCode: form.planCode.trim() || 'FREE',
    cycle: form.billingCycle,
  }

  return { errors, payload }
}

const getFirstErrorDetailMessage = (details) => {
  if (!details || typeof details !== 'object') return ''

  const stack = [details]
  while (stack.length > 0) {
    const current = stack.shift()

    if (typeof current === 'string' && current.trim()) {
      return current.trim()
    }

    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }

    if (current && typeof current === 'object') {
      if (typeof current.message === 'string' && current.message.trim()) {
        return current.message.trim()
      }
      stack.push(...Object.values(current))
    }
  }

  return ''
}

const normalizeCreateUserErrorField = (candidate) => {
  const normalized = String(candidate ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return ''

  const compact = normalized.replace(/[^a-z]/g, '')
  if (!compact) return ''

  if (compact.includes('existinguserid')) return 'existingUserId'
  if (compact.includes('email')) return 'email'
  if (compact.includes('roles') || compact.includes('customerroles')) return 'roles'
  if (compact.endsWith('name')) return 'name'

  return ''
}

const getFieldDetailMessage = (value) => {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim()
      if (
        entry
        && typeof entry === 'object'
        && typeof entry.message === 'string'
        && entry.message.trim()
      ) {
        return entry.message.trim()
      }
    }
    return ''
  }

  if (value && typeof value === 'object' && typeof value.message === 'string') {
    const message = value.message.trim()
    if (message) return message
  }

  return ''
}

const mapFieldErrorsFromDetails = (details) => {
  const mapped = {}

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== 'object') continue
      const field = normalizeCreateUserErrorField(detail.field)
      const message = getFieldDetailMessage(detail.message)
      if (!field || !message) continue
      mapped[field] = message
    }
    return mapped
  }

  if (!details || typeof details !== 'object') return mapped

  for (const [field, value] of Object.entries(details)) {
    const normalizedField = normalizeCreateUserErrorField(field)
    const message = getFieldDetailMessage(value)
    if (!normalizedField || !message) continue
    mapped[normalizedField] = message
  }

  return mapped
}

const normalizeMutationData = (result) => {
  if (result?.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
    return result.data
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result
  }

  return {}
}

const getCreateUserConflictMessage = (appError) => {
  const reason = String(appError?.details?.reason ?? '')
    .trim()
    .toLowerCase()
  const existingUserId = String(appError?.details?.existingUserId ?? '').trim()
  const existingUserSuffix = existingUserId ? ` (User ID: ${existingUserId})` : ''

  if (appError?.code === 'USER_ALREADY_EXISTS') {
    if (reason === 'already-in-customer') {
      return appendRequestReference(
        `A user with this email already exists in this customer${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
    if (reason === 'other-customer') {
      return appendRequestReference(
        'This email belongs to a user in another customer and cannot be invited here.',
        appError?.requestId,
      )
    }
    if (reason === 'existing-identity') {
      return appendRequestReference(
        `An existing identity already uses this email${existingUserSuffix}.`,
        appError?.requestId,
      )
    }
  }

  if (appError?.code === 'USER_CUSTOMER_CONFLICT' && reason === 'other-customer') {
    return appendRequestReference(
      'This user belongs to another customer and cannot be assigned to this customer.',
      appError?.requestId,
    )
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}

const getAssignAdminErrorMessage = (appError) => {
  if (appError?.status === 409 && appError?.code === 'INVITATION_ALREADY_ACTIVE') {
    const reason = String(appError?.details?.reason ?? '')
      .trim()
      .toUpperCase()
    if (reason && INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP[reason]) {
      return INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP[reason]
    }

    const detailMessage = getFirstErrorDetailMessage(appError?.details)
    if (detailMessage && detailMessage.trim().toUpperCase() !== reason) {
      return detailMessage
    }

    const backendMessage = String(appError?.message ?? '').trim()
    const genericMessage = getErrorMessage('INVITATION_ALREADY_ACTIVE')
    const backendMessageIsGeneric =
      !backendMessage ||
      backendMessage === genericMessage ||
      backendMessage.startsWith(`${genericMessage} (Ref:`)

    if (!backendMessageIsGeneric) {
      return backendMessage
    }

    return ASSIGN_INVITATION_ALREADY_ACTIVE_FALLBACK_MESSAGE
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}

const getReplaceAdminErrorMessage = (appError) => {
  const signal = getStepUpErrorSignal(appError)
  if (signal === 'required') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_REQUIRED_MESSAGE, appError?.requestId)
  }
  if (signal === 'invalid') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_INVALID_MESSAGE, appError?.requestId)
  }
  if (signal === 'unavailable') {
    return appendRequestReference(REPLACE_ADMIN_STEP_UP_UNAVAILABLE_MESSAGE, appError?.requestId)
  }

  const detailMessage = getFirstErrorDetailMessage(appError?.details)
  if (detailMessage) return detailMessage

  return appError?.message || getErrorMessage(appError?.code)
}

function CustomerRowActionsMenu({ row, actions, onAction }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const menuId = getRowActionMenuId(row)
  const rowName = row?.name || row?.id || 'customer'

  useEffect(() => {
    if (!isOpen) return undefined

    const handleDocumentPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [isOpen])

  return (
    <div className="super-admin-customers__row-actions" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="super-admin-customers__row-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`Actions for ${rowName}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        Actions
      </Button>
      {isOpen ? (
        <div
          id={menuId}
          className="super-admin-customers__row-actions-menu"
          role="menu"
          aria-label={`Actions for ${rowName}`}
        >
          {actions.map((action) => {
            const isDisabled = typeof action.disabled === 'function'
              ? action.disabled(row)
              : Boolean(action.disabled)

            return (
              <button
                key={action.label}
                type="button"
                className="super-admin-customers__row-action"
                role="menuitem"
                disabled={isDisabled}
                aria-label={`${action.label} ${rowName}`}
                onClick={() => {
                  if (isDisabled) return
                  onAction(action.label, row)
                  setIsOpen(false)
                }}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function SuperAdminCustomersPanel({ onAssignAdminSuccess }) {
  const { addToast } = useToaster()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [topologyFilter, setTopologyFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editErrors, setEditErrors] = useState({})

  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [adminMode, setAdminMode] = useState('assign')
  const [adminCustomer, setAdminCustomer] = useState(null)
  const [adminRecipientName, setAdminRecipientName] = useState('')
  const [adminRecipientEmail, setAdminRecipientEmail] = useState('')
  const [adminUserId, setAdminUserId] = useState('')
  const [adminReason, setAdminReason] = useState('')
  const [adminStepUpToken, setAdminStepUpToken] = useState('')
  const [adminError, setAdminError] = useState('')
  const [authLinkDialogOpen, setAuthLinkDialogOpen] = useState(false)
  const [lastAuthLink, setLastAuthLink] = useState('')
  const [pendingInvitationTabSwitch, setPendingInvitationTabSwitch] = useState(false)
  const [usersWorkspaceCustomer, setUsersWorkspaceCustomer] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userCreateOpen, setUserCreateOpen] = useState(false)
  const [userCreateMode, setUserCreateMode] = useState('invite_new')
  const [userCreateName, setUserCreateName] = useState('')
  const [userCreateEmail, setUserCreateEmail] = useState('')
  const [userCreateExistingUserId, setUserCreateExistingUserId] = useState('')
  const [userCreateRoles, setUserCreateRoles] = useState([])
  const [userCreateErrors, setUserCreateErrors] = useState({})

  const debouncedSearch = useDebounce(search, 300)
  const debouncedUserSearch = useDebounce(userSearch, 300)
  const usersWorkspaceCustomerId = getCustomerId(usersWorkspaceCustomer)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListCustomersQuery({
    page,
    pageSize: 20,
    q: debouncedSearch.trim(),
    status: statusFilter,
    topology: topologyFilter,
  })

  const {
    data: licenseLevelsResponse,
    isLoading: isLoadingLicenseLevels,
  } = useListLicenseLevelsQuery({
    page: 1,
    pageSize: 100,
    isActive: true,
  })

  const {
    data: customerDetailsResponse,
    isFetching: isFetchingCustomerDetails,
    error: customerDetailsError,
  } = useGetCustomerQuery(editCustomerId, {
    skip: !editCustomerId,
  })

  const [createCustomer, createResult] = useCreateCustomerMutation()
  const [updateCustomer, updateResult] = useUpdateCustomerMutation()
  const [updateCustomerStatus, updateStatusResult] = useUpdateCustomerStatusMutation()
  const [createCustomerAdminInvitation, createAdminInvitationResult] =
    useCreateCustomerAdminInvitationMutation()
  const [replaceCustomerAdmin, replaceAdminResult] = useReplaceCustomerAdminMutation()
  const [createUser, createUserResult] = useCreateUserMutation()

  const {
    data: listUsersResponse,
    isLoading: isListUsersLoading,
    isFetching: isListUsersFetching,
    error: listUsersError,
  } = useListUsersQuery(
    {
      customerId: usersWorkspaceCustomerId,
      page: userPage,
      pageSize: 20,
      q: debouncedUserSearch.trim(),
      role: userRoleFilter,
      status: userStatusFilter,
    },
    { skip: !usersWorkspaceCustomerId },
  )

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const licenseLevels = licenseLevelsResponse?.data ?? []
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

  useEffect(() => {
    if (!customerDetailsResponse?.data) return
    setEditForm(createFormFromCustomer(customerDetailsResponse.data))
  }, [customerDetailsResponse])

  const listAppError = listError ? normalizeError(listError) : null
  const listUsersAppError = listUsersError ? normalizeError(listUsersError) : null
  const listUsersErrorMessage = getFirstErrorDetailMessage(listUsersAppError?.details)
    || listUsersAppError?.message
    || ''
  const customerDetailsAppError = customerDetailsError
    ? normalizeError(customerDetailsError)
    : null

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createCustomer(payload).unwrap()
        setCreateForm(INITIAL_FORM)
        setCreateErrors({})
        setCreateOpen(false)
        addToast({
          title: 'Customer created',
          description: `${payload.name} was created successfully.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        if (appError.status === 409) {
          setCreateErrors({ name: appError.message })
          return
        }
        addToast({
          title: 'Failed to create customer',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createCustomer, createForm, addToast],
  )

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm(INITIAL_FORM)
    setCreateErrors({})
  }, [])

  const openEditDialog = useCallback((row) => {
    const customerId = getCustomerId(row)
    if (!customerId) return
    setEditCustomerId(customerId)
    setEditErrors({})
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditCustomerId('')
    setEditErrors({})
    setEditForm(INITIAL_FORM)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!editCustomerId) return
    setEditErrors({})

    const { errors, payload } = validateForm(editForm)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    try {
      await updateCustomer({ customerId: editCustomerId, ...payload }).unwrap()
      addToast({
        title: 'Customer updated',
        description: 'Customer settings were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      if (appError.status === 409) {
        setEditErrors({ name: appError.message })
        return
      }
      addToast({
        title: 'Failed to update customer',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [addToast, closeEditDialog, editCustomerId, editForm, updateCustomer])

  const handleUpdateStatus = useCallback(
    async (row, status) => {
      const customerId = getCustomerId(row)
      if (!customerId) return
      try {
        await updateCustomerStatus({ customerId, status }).unwrap()
        addToast({
          title: 'Status updated',
          description: `${row.name} is now ${status}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to update status',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, updateCustomerStatus],
  )

  const resetUserCreateForm = useCallback(() => {
    setUserCreateMode('invite_new')
    setUserCreateName('')
    setUserCreateEmail('')
    setUserCreateExistingUserId('')
    setUserCreateRoles([])
    setUserCreateErrors({})
  }, [])

  const openUsersWorkspace = useCallback((row) => {
    const customerId = getCustomerId(row)
    if (!customerId) return
    setUsersWorkspaceCustomer(row)
    setUserSearch('')
    setUserRoleFilter('')
    setUserStatusFilter('')
    setUserPage(1)
    setUserCreateOpen(false)
    resetUserCreateForm()
  }, [resetUserCreateForm])

  const closeUsersWorkspace = useCallback(() => {
    setUsersWorkspaceCustomer(null)
    setUserSearch('')
    setUserRoleFilter('')
    setUserStatusFilter('')
    setUserPage(1)
    setUserCreateOpen(false)
    resetUserCreateForm()
  }, [resetUserCreateForm])

  const openUserCreateDialog = useCallback(() => {
    if (!usersWorkspaceCustomerId) return
    resetUserCreateForm()
    setUserCreateOpen(true)
  }, [resetUserCreateForm, usersWorkspaceCustomerId])

  const closeUserCreateDialog = useCallback(() => {
    setUserCreateOpen(false)
    resetUserCreateForm()
  }, [resetUserCreateForm])

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

  const handleUserCreateMutation = useCallback(async () => {
    if (!usersWorkspaceCustomerId) return

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
        customerId: usersWorkspaceCustomerId,
        body,
      }).unwrap()
      const outcomeData = normalizeMutationData(result)
      const outcome = String(outcomeData?.outcome ?? '')
        .trim()
        .toLowerCase()
      const invitationOutcome = String(outcomeData?.invitationOutcome ?? '')
        .trim()
        .toLowerCase()

      if (outcome === 'assigned_existing') {
        addToast({
          title: 'User assigned',
          description: 'Existing user assigned to this customer.',
          variant: 'success',
        })
      } else if (outcome === 'invited_new' && invitationOutcome === 'send_failed') {
        addToast({
          title: 'User created',
          description: `User created for ${userCreateEmail.trim()}, but invitation email delivery failed.`,
          variant: 'warning',
        })
      } else if (outcome === 'invited_new') {
        addToast({
          title: 'User created',
          description: `Invitation sent to ${userCreateEmail.trim()}.`,
          variant: 'success',
        })
      } else {
        addToast({
          title: 'User created',
          description: 'User created successfully.',
          variant: 'success',
        })
      }

      const authLink = String(outcomeData?.authLink ?? '').trim()
      if (outcome === 'invited_new' && authLink) {
        setLastAuthLink(authLink)
        setAuthLinkDialogOpen(true)
        setPendingInvitationTabSwitch(false)
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
    usersWorkspaceCustomerId,
  ])

  const openAdminDialog = useCallback((mode, row) => {
    setAdminMode(mode)
    setAdminCustomer(row)
    setAdminRecipientName('')
    setAdminRecipientEmail('')
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
    setAdminDialogOpen(true)
  }, [])

  const closeAdminDialog = useCallback(() => {
    setAdminDialogOpen(false)
    setAdminCustomer(null)
    setAdminRecipientName('')
    setAdminRecipientEmail('')
    setAdminUserId('')
    setAdminReason('')
    setAdminStepUpToken('')
    setAdminError('')
  }, [])

  const closeAuthLinkDialog = useCallback(() => {
    setAuthLinkDialogOpen(false)
    setLastAuthLink('')
    if (pendingInvitationTabSwitch) {
      setPendingInvitationTabSwitch(false)
      onAssignAdminSuccess?.()
    }
  }, [onAssignAdminSuccess, pendingInvitationTabSwitch])

  const handleAdminMutation = useCallback(async () => {
    if (!adminCustomer) return
    const customerId = getCustomerId(adminCustomer)
    if (!customerId) return

    if (adminMode === 'assign') {
      if (!adminRecipientName.trim()) {
        setAdminError('Full name is required.')
        return
      }
      if (!adminRecipientEmail.trim()) {
        setAdminError('Email is required.')
        return
      }
      if (!EMAIL_REGEX.test(adminRecipientEmail.trim())) {
        setAdminError('Please enter a valid email address.')
        return
      }
    } else {
      if (!adminUserId.trim()) {
        setAdminError('Existing User ID is required.')
        return
      }
      if (!adminReason.trim()) {
        setAdminError('Reason is required.')
        return
      }
      if (!adminStepUpToken) {
        setAdminError('Step-up verification is required.')
        return
      }
    }

    try {
      if (adminMode === 'assign') {
        const result = await createCustomerAdminInvitation({
          customerId,
          recipientName: adminRecipientName.trim(),
          recipientEmail: adminRecipientEmail.trim(),
        }).unwrap()

        const outcome = result?.outcome ?? result?.data?.outcome
        if (outcome === 'send_failed') {
          addToast({
            title: 'Invitation created',
            description:
              'Invitation was created, but email delivery failed. Check Invitation Management for status.',
            variant: 'warning',
          })
        } else if (outcome === 'linked_existing') {
          addToast({
            title: 'Existing invitation linked',
            description: `An active invitation is already available for ${adminCustomer.name}.`,
            variant: 'success',
          })
        } else {
          addToast({
            title: 'Invitation created',
            description: `Invitation sent for ${adminCustomer.name}.`,
            variant: 'success',
          })
        }

        const authLink = result?.authLink ?? result?.data?.authLink
        if (authLink) {
          setLastAuthLink(authLink)
          setAuthLinkDialogOpen(true)
          setPendingInvitationTabSwitch(true)
        } else {
          onAssignAdminSuccess?.()
        }
      } else {
        await replaceCustomerAdmin({
          customerId,
          newUserId: adminUserId.trim(),
          reason: adminReason.trim(),
          stepUpToken: adminStepUpToken,
        }).unwrap()
        addToast({
          title: 'Customer admin replaced',
          description: `Canonical admin updated for ${adminCustomer.name}.`,
          variant: 'success',
        })
      }
      closeAdminDialog()
    } catch (err) {
      const appError = normalizeError(err)
      if (adminMode === 'replace' && isCanonicalAdminConflictError(appError)) {
        setAdminError(
          getCanonicalAdminConflictMessage(
            appError,
            'update_roles',
          ),
        )
        return
      }

      if (adminMode === 'assign') {
        setAdminError(getAssignAdminErrorMessage(appError))
        return
      }

      setAdminError(getReplaceAdminErrorMessage(appError))
    }
  }, [
    addToast,
    adminCustomer,
    adminMode,
    adminRecipientEmail,
    adminRecipientName,
    adminReason,
    adminStepUpToken,
    adminUserId,
    closeAdminDialog,
    createCustomerAdminInvitation,
    onAssignAdminSuccess,
    replaceCustomerAdmin,
  ])

  const rowActions = useMemo(
    () => [
      { label: 'Edit' },
      { label: 'View Users' },
      {
        label: 'Set Active',
        disabled: (row) => displayStatus(row?.status) === 'ACTIVE',
      },
      {
        label: 'Set Inactive',
        disabled: (row) => displayStatus(row?.status) === 'INACTIVE',
      },
      { label: 'Assign Admin' },
      { label: 'Replace Admin' },
    ],
    [],
  )

  const handleRowAction = useCallback(
    (label, row) => {
      if (label === 'Edit') openEditDialog(row)
      if (label === 'View Users') openUsersWorkspace(row)
      if (label === 'Set Active') handleUpdateStatus(row, 'ACTIVE')
      if (label === 'Set Inactive') handleUpdateStatus(row, 'INACTIVE')
      if (label === 'Assign Admin') openAdminDialog('assign', row)
      if (label === 'Replace Admin') openAdminDialog('replace', row)
    },
    [handleUpdateStatus, openAdminDialog, openEditDialog, openUsersWorkspace],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        render: (value, row) => {
          const customerId = getCustomerId(row)
          if (!customerId) return value || '--'

          return (
            <button
              type="button"
              className="super-admin-customers__name-button"
              onClick={() => openEditDialog(row)}
            >
              {value || '--'}
            </button>
          )
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Status size="sm" showIcon variant={displayStatus(value) === 'ACTIVE' ? 'success' : 'warning'}>
            {displayStatus(value)}
          </Status>
        ),
      },
      {
        key: 'topology',
        label: 'Topology',
        render: (value) => (value === 'MULTI_TENANT' ? 'Multi Tenant' : 'Single Tenant'),
      },
      {
        key: 'governance',
        label: 'Limits',
        render: (_value, row) =>
          `${row?.governance?.maxTenants ?? '--'} / ${row?.governance?.maxVmfsPerTenant ?? '--'}`,
      },
      {
        key: 'customerAdminUserId',
        label: 'Canonical Admin',
        width: '220px',
        render: (_value, row) => {
          const canonicalAdminUserId = row?.governance?.customerAdminUserId
          if (!canonicalAdminUserId) {
            return <span className="super-admin-customers__canonical-admin-empty">Not assigned</span>
          }
          return <code className="super-admin-customers__canonical-admin-id">{canonicalAdminUserId}</code>
        },
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        width: '156px',
        render: (value) => <TableDateTime value={value} />,
      },
      {
        key: 'rowActions',
        label: 'Actions',
        width: '168px',
        render: (_value, row) => (
          <CustomerRowActionsMenu row={row} actions={rowActions} onAction={handleRowAction} />
        ),
      },
    ],
    [handleRowAction, openEditDialog, rowActions],
  )

  const userColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        render: (value) => value || '--',
      },
      {
        key: 'email',
        label: 'Email',
        render: (value) => value || '--',
      },
      {
        key: 'customerRoles',
        label: 'Roles',
        render: (_value, row) => {
          const roles = getCustomerUserRoles(row, usersWorkspaceCustomerId)
          return roles.length > 0 ? roles.join(', ') : '--'
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (_value, row) => {
          const status = normalizeUserStatus(row)
          return (
            <Status size="sm" showIcon variant={status === 'ACTIVE' ? 'success' : 'neutral'}>
              {status}
            </Status>
          )
        },
      },
      {
        key: 'trustStatus',
        label: 'Trust',
        render: (_value, row) => (
          <UserTrustStatus trustStatus={getUserTrustStatus(row)} size="sm" />
        ),
      },
      {
        key: 'isCanonicalAdmin',
        label: 'Canonical Admin',
        width: '180px',
        render: (_value, row) =>
          row?.isCanonicalAdmin
            ? (
              <Status size="sm" showIcon variant="info">
                Canonical
              </Status>
            )
            : <span className="super-admin-customers__canonical-admin-empty">--</span>,
      },
    ],
    [usersWorkspaceCustomerId],
  )

  const adminMutationLoading =
    createAdminInvitationResult.isLoading || replaceAdminResult.isLoading
  const isUsersWorkspaceOpen = Boolean(usersWorkspaceCustomerId)

  return (
    <section className="super-admin-customers" aria-label="Super admin customers">
      {isUsersWorkspaceOpen ? (
        <>
          <header className="super-admin-customers__header">
            <h2 className="super-admin-customers__title">Customer Users</h2>
            <p className="super-admin-customers__subtitle">
              View users, trust state, and customer-role assignments for{' '}
              <strong>{usersWorkspaceCustomer?.name ?? '--'}</strong>.
            </p>
          </header>

          <Fieldset className="super-admin-customers__fieldset">
            <Fieldset.Legend className="sr-only">Customer users</Fieldset.Legend>
            <Card variant="elevated" className="super-admin-customers__card">
              <Card.Body>
                <div className="super-admin-customers__catalogue-actions super-admin-customers__users-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeUsersWorkspace}
                  >
                    Back to Customers
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={openUserCreateDialog}
                    disabled={createUserResult.isLoading}
                  >
                    Create User
                  </Button>
                </div>
                <p className="super-admin-customers__users-note">
                  Showing users for <strong>{usersWorkspaceCustomer?.name ?? '--'}</strong>.
                </p>
                <div className="super-admin-customers__toolbar super-admin-customers__users-toolbar">
                  <Input
                    id="sa-customer-user-search"
                    label="Search"
                    value={userSearch}
                    onChange={(event) => {
                      setUserSearch(event.target.value)
                      setUserPage(1)
                    }}
                    fullWidth
                  />
                  <Select
                    id="sa-customer-user-role-filter"
                    label="Role"
                    value={userRoleFilter}
                    options={USER_ROLE_FILTER_OPTIONS}
                    onChange={(event) => {
                      setUserRoleFilter(event.target.value)
                      setUserPage(1)
                    }}
                  />
                  <Select
                    id="sa-customer-user-status-filter"
                    label="Status"
                    value={userStatusFilter}
                    options={USER_STATUS_FILTER_OPTIONS}
                    onChange={(event) => {
                      setUserStatusFilter(event.target.value)
                      setUserPage(1)
                    }}
                  />
                </div>
                {listUsersAppError ? (
                  <p className="super-admin-customers__error" role="alert">
                    {listUsersErrorMessage}
                  </p>
                ) : null}
                <HorizontalScroll className="super-admin-customers__table-wrap" ariaLabel="Customer users table" gap="sm">
                  <Table
                    className="super-admin-customers__table super-admin-customers__users-table"
                    columns={userColumns}
                    data={userRows}
                    loading={isListUsersLoading}
                    variant="striped"
                    hoverable
                    emptyMessage="No users found for this customer."
                    ariaLabel={`Users for ${usersWorkspaceCustomer?.name ?? 'customer'}`}
                  />
                </HorizontalScroll>
                {isListUsersFetching && !isListUsersLoading ? (
                  <p className="super-admin-customers__muted">Refreshing users...</p>
                ) : null}
                {userTotalPages > 1 ? (
                  <div className="super-admin-customers__pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage <= 1 || isListUsersFetching}
                      onClick={() => setUserPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <p className="super-admin-customers__pagination-info">
                      Page {userCurrentPage} of {userTotalPages}
                      {userTotalCount > 0 ? ` (${userTotalCount} users)` : ''}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage >= userTotalPages || isListUsersFetching}
                      onClick={() => setUserPage((current) => Math.min(userTotalPages, current + 1))}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          </Fieldset>
        </>
      ) : (
        <>
          <header className="super-admin-customers__header">
            <h2 className="super-admin-customers__title">Customers</h2>
            <p className="super-admin-customers__subtitle">
              Customers - Manage customer lifecycle, governance limits, and canonical customer admin flows.
            </p>
          </header>

          <Fieldset className="super-admin-customers__fieldset">
            <Fieldset.Legend className="sr-only">Customer catalogue</Fieldset.Legend>
            <Card variant="elevated" className="super-admin-customers__card">
              <Card.Body>
                <div className="super-admin-customers__catalogue-actions">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={openCreateDialog}
                    disabled={createResult.isLoading}
                  >
                    Create
                  </Button>
                </div>
                <div className="super-admin-customers__toolbar">
                  <Input
                    id="sa-customer-search"
                    label="Search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    fullWidth
                  />
                  <Select
                    id="sa-customer-status-filter"
                    label="Status"
                    value={statusFilter}
                    options={STATUS_FILTER_OPTIONS}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      setPage(1)
                    }}
                  />
                  <Select
                    id="sa-customer-topology-filter"
                    label="Topology"
                    value={topologyFilter}
                    options={TOPOLOGY_FILTER_OPTIONS}
                    onChange={(event) => {
                      setTopologyFilter(event.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                {listAppError ? (
                  <p className="super-admin-customers__error" role="alert">
                    {listAppError.message}
                  </p>
                ) : null}
                <p className="super-admin-customers__table-note">{CANONICAL_ADMIN_HELP_TEXT}</p>
                <HorizontalScroll className="super-admin-customers__table-wrap" ariaLabel="Customers table" gap="sm">
                  <Table
                    className="super-admin-customers__table"
                    columns={columns}
                    data={rows}
                    loading={isListLoading}
                    variant="striped"
                    hoverable
                    emptyMessage="No customers found."
                    ariaLabel="Customers"
                  />
                </HorizontalScroll>
                {isListFetching && !isListLoading ? (
                  <p className="super-admin-customers__muted">Refreshing list...</p>
                ) : null}
                {totalPages > 1 ? (
                  <div className="super-admin-customers__pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isListFetching}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <p className="super-admin-customers__pagination-info">
                      Page {Number(meta.page) || page} of {totalPages}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isListFetching}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          </Fieldset>
        </>
      )}

      <Dialog open={createOpen} onClose={closeCreateDialog} size="lg">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">Create Customer</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          <form className="super-admin-customers__form" onSubmit={handleCreate} noValidate>
            <Input
              id="sa-customer-name"
              label="Customer Name"
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              error={createErrors.name}
              required
              fullWidth
            />
            <Input
              id="sa-customer-website"
              label="Website (Optional)"
              value={createForm.website}
              onChange={(event) => setCreateForm((current) => ({ ...current, website: event.target.value }))}
              error={createErrors.website}
              fullWidth
            />
            <div className="super-admin-customers__row">
              <Select
                id="sa-customer-topology"
                label="Topology"
                value={createForm.topology}
                options={[
                  { value: 'SINGLE_TENANT', label: 'Single Tenant' },
                  { value: 'MULTI_TENANT', label: 'Multi Tenant' },
                ]}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    topology: event.target.value,
                  }))
                }
              />
              <div className="super-admin-customers__field">
                <label htmlFor="sa-customer-vmf-count" className="super-admin-customers__field-label">
                  VMF Count
                </label>
                <Input
                  id="sa-customer-vmf-count"
                  type="number"
                  min={1}
                  value={createForm.maxVmfsPerTenant}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, maxVmfsPerTenant: event.target.value }))
                  }
                  error={createErrors.maxVmfsPerTenant}
                  fullWidth
                />
              </div>
            </div>
            {createForm.topology === 'MULTI_TENANT' ? (
              <Input
                id="sa-customer-max-tenants"
                type="number"
                min={1}
                label="Max Tenants"
                value={createForm.maxTenants}
                onChange={(event) => setCreateForm((current) => ({ ...current, maxTenants: event.target.value }))}
                error={createErrors.maxTenants}
                fullWidth
              />
            ) : null}
            <Select
              id="sa-customer-license"
              label="Licence Level"
              value={createForm.licenseLevelId}
              options={[
                { value: '', label: isLoadingLicenseLevels ? 'Loading...' : 'Select licence level' },
                ...licenseLevels
                  .map((level) => {
                    const levelId = level.id ?? level._id
                    if (!levelId) return null
                    return { value: levelId, label: level.name ?? levelId }
                  })
                  .filter(Boolean),
              ]}
              onChange={(event) => setCreateForm((current) => ({ ...current, licenseLevelId: event.target.value }))}
              error={createErrors.licenseLevelId}
            />
            <div className="super-admin-customers__row">
              <Select
                id="sa-customer-billing"
                label="Billing Cycle"
                value={createForm.billingCycle}
                options={BILLING_CYCLE_OPTIONS}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, billingCycle: event.target.value }))
                }
              />
              <div className="super-admin-customers__field">
                <label htmlFor="sa-customer-plan" className="super-admin-customers__field-label">
                  Plan Code
                </label>
                <Input
                  id="sa-customer-plan"
                  value={createForm.planCode}
                  onChange={(event) => setCreateForm((current) => ({ ...current, planCode: event.target.value }))}
                  fullWidth
                />
              </div>
            </div>
            <div className="super-admin-customers__form-actions">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={createResult.isLoading}
                disabled={createResult.isLoading || licenseLevels.length === 0}
              >
                Create Customer
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={createResult.isLoading}
                onClick={() => {
                  setCreateForm(INITIAL_FORM)
                  setCreateErrors({})
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Dialog.Body>
      </Dialog>

      <Dialog open={editOpen} onClose={closeEditDialog} size="lg">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">Update Customer</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          {customerDetailsAppError ? (
            <p className="super-admin-customers__error" role="alert">
              {customerDetailsAppError.message}
            </p>
          ) : null}
          <Input
            id="sa-customer-edit-name"
            label="Customer Name"
            value={editForm.name}
            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
            error={editErrors.name}
            fullWidth
            disabled={isFetchingCustomerDetails}
          />
          <Input
            id="sa-customer-edit-website"
            label="Website (Optional)"
            value={editForm.website}
            onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))}
            error={editErrors.website}
            fullWidth
            disabled={isFetchingCustomerDetails}
          />
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-edit-topology"
              label="Topology"
              value={editForm.topology}
              options={[
                { value: 'SINGLE_TENANT', label: 'Single Tenant' },
                { value: 'MULTI_TENANT', label: 'Multi Tenant' },
              ]}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  topology: event.target.value,
                }))
              }
            />
            <div className="super-admin-customers__field">
              <label htmlFor="sa-customer-edit-vmf-count" className="super-admin-customers__field-label">
                VMF Count
              </label>
              <Input
                id="sa-customer-edit-vmf-count"
                type="number"
                min={1}
                value={editForm.maxVmfsPerTenant}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, maxVmfsPerTenant: event.target.value }))
                }
                error={editErrors.maxVmfsPerTenant}
                fullWidth
              />
            </div>
          </div>
          {editForm.topology === 'MULTI_TENANT' ? (
            <Input
              id="sa-customer-edit-max-tenants"
              type="number"
              min={1}
              label="Max Tenants"
              value={editForm.maxTenants}
              onChange={(event) => setEditForm((current) => ({ ...current, maxTenants: event.target.value }))}
              error={editErrors.maxTenants}
              fullWidth
            />
          ) : null}
          <Select
            id="sa-customer-edit-license"
            label="Licence Level"
            value={editForm.licenseLevelId}
            options={[
              { value: '', label: isLoadingLicenseLevels ? 'Loading...' : 'Select licence level' },
              ...licenseLevels
                .map((level) => {
                  const levelId = level.id ?? level._id
                  if (!levelId) return null
                  return { value: levelId, label: level.name ?? levelId }
                })
                .filter(Boolean),
            ]}
            onChange={(event) => setEditForm((current) => ({ ...current, licenseLevelId: event.target.value }))}
            error={editErrors.licenseLevelId}
          />
          <div className="super-admin-customers__row">
            <Select
              id="sa-customer-edit-billing"
              label="Billing Cycle"
              value={editForm.billingCycle}
              options={BILLING_CYCLE_OPTIONS}
              onChange={(event) => setEditForm((current) => ({ ...current, billingCycle: event.target.value }))}
            />
            <div className="super-admin-customers__field">
              <label htmlFor="sa-customer-edit-plan" className="super-admin-customers__field-label">
                Plan Code
              </label>
              <Input
                id="sa-customer-edit-plan"
                value={editForm.planCode}
                onChange={(event) => setEditForm((current) => ({ ...current, planCode: event.target.value }))}
                fullWidth
              />
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeEditDialog} disabled={updateResult.isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            loading={updateResult.isLoading}
            disabled={updateResult.isLoading}
          >
            Save Changes
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={userCreateOpen} onClose={closeUserCreateDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">Create Customer User</h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          <p className="super-admin-customers__dialog-subtitle">
            Customer: <strong>{usersWorkspaceCustomer?.name ?? '--'}</strong>
          </p>
          <Select
            id="sa-customer-user-create-mode"
            label="Create Mode"
            value={userCreateMode}
            options={USER_CREATE_MODE_OPTIONS}
            onChange={(event) => {
              setUserCreateMode(event.target.value)
              setUserCreateErrors({})
            }}
          />
          {userCreateMode === 'assign_existing' ? (
            <Input
              id="sa-customer-user-create-existing-id"
              label="Existing User ID"
              value={userCreateExistingUserId}
              onChange={(event) => {
                setUserCreateExistingUserId(event.target.value)
                setUserCreateErrors((currentErrors) => {
                  if (!currentErrors.existingUserId && !currentErrors.form) return currentErrors
                  const nextErrors = { ...currentErrors }
                  delete nextErrors.existingUserId
                  delete nextErrors.form
                  return nextErrors
                })
              }}
              error={userCreateErrors.existingUserId}
              fullWidth
            />
          ) : (
            <>
              <Input
                id="sa-customer-user-create-name"
                label="User Full Name"
                value={userCreateName}
                onChange={(event) => {
                  setUserCreateName(event.target.value)
                  setUserCreateErrors((currentErrors) => {
                    if (!currentErrors.name && !currentErrors.form) return currentErrors
                    const nextErrors = { ...currentErrors }
                    delete nextErrors.name
                    delete nextErrors.form
                    return nextErrors
                  })
                }}
                error={userCreateErrors.name}
                autoComplete="off"
                fullWidth
              />
              <Input
                id="sa-customer-user-create-email"
                type="email"
                label="User Email"
                value={userCreateEmail}
                onChange={(event) => {
                  setUserCreateEmail(event.target.value)
                  setUserCreateErrors((currentErrors) => {
                    if (!currentErrors.email && !currentErrors.form) return currentErrors
                    const nextErrors = { ...currentErrors }
                    delete nextErrors.email
                    delete nextErrors.form
                    return nextErrors
                  })
                }}
                error={userCreateErrors.email}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                fullWidth
              />
            </>
          )}
          <fieldset className="super-admin-customers__roles-fieldset">
            <legend className="super-admin-customers__roles-legend">Roles</legend>
            <div className="super-admin-customers__roles-grid">
              {USER_CREATE_ROLE_OPTIONS.map((roleOption) => (
                <Tickbox
                  key={roleOption.value}
                  id={`sa-customer-user-role-${String(roleOption.value).toLowerCase()}`}
                  label={roleOption.label}
                  checked={userCreateRoles.includes(roleOption.value)}
                  onChange={() => toggleUserCreateRole(roleOption.value)}
                  disabled={createUserResult.isLoading}
                />
              ))}
            </div>
          </fieldset>
          {userCreateErrors.roles ? (
            <p className="super-admin-customers__error" role="alert">
              {userCreateErrors.roles}
            </p>
          ) : null}
          {userCreateErrors.form ? (
            <p className="super-admin-customers__error" role="alert">
              {userCreateErrors.form}
            </p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={closeUserCreateDialog}
            disabled={createUserResult.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUserCreateMutation}
            loading={createUserResult.isLoading}
            disabled={createUserResult.isLoading}
          >
            {userCreateMode === 'assign_existing' ? 'Assign User' : 'Create User'}
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={adminDialogOpen} onClose={closeAdminDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">
            {adminMode === 'assign' ? 'Assign Customer Admin' : 'Replace Customer Admin'}
          </h2>
        </Dialog.Header>
        <Dialog.Body className="super-admin-customers__dialog-body">
          <p className="super-admin-customers__dialog-subtitle">
            Customer: <strong>{adminCustomer?.name ?? '--'}</strong>
          </p>
          {adminMode === 'assign' ? (
            <>
              <Input
                id="sa-admin-recipient-name"
                name="sa-admin-recipient-name"
                label="Full Name"
                value={adminRecipientName}
                onChange={(event) => {
                  setAdminRecipientName(event.target.value)
                  setAdminError('')
                }}
                autoComplete="off"
                fullWidth
              />
              <Input
                id="sa-admin-recipient-email"
                name="sa-admin-recipient-email"
                type="email"
                label="Email"
                value={adminRecipientEmail}
                onChange={(event) => {
                  setAdminRecipientEmail(event.target.value)
                  setAdminError('')
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                fullWidth
              />
            </>
          ) : (
            <>
              <Accordion
                variant="outlined"
                className="super-admin-customers__replace-help"
              >
                {REPLACE_ADMIN_HELP_ITEMS.map((item) => (
                  <Accordion.Item
                    key={item.id}
                    id={item.id}
                    className="super-admin-customers__replace-help-item"
                  >
                    <Accordion.Header
                      itemId={item.id}
                      className="super-admin-customers__replace-help-header"
                    >
                      {item.title}
                    </Accordion.Header>
                    <Accordion.Content
                      itemId={item.id}
                      className="super-admin-customers__replace-help-content"
                    >
                      <p className="super-admin-customers__replace-help-detail">{item.detail}</p>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
              <Input
                id="sa-admin-user-id"
                label="Existing User ID"
                value={adminUserId}
                onChange={(event) => {
                  setAdminUserId(event.target.value)
                  setAdminError('')
                }}
                fullWidth
              />
            </>
          )}
          {adminMode === 'replace' ? (
            <>
              <Textarea
                id="sa-admin-reason"
                label="Reason"
                value={adminReason}
                onChange={(event) => {
                  setAdminReason(event.target.value)
                  setAdminError('')
                }}
                rows={3}
                fullWidth
              />
              <StepUpAuthForm
                passwordLabel="Current Super Admin Password"
                passwordHelperText="Enter your current Super Admin password to verify this replacement."
                onStepUpComplete={(token) => {
                  setAdminStepUpToken(token)
                  setAdminError('')
                }}
              />
            </>
          ) : null}
          {adminError ? (
            <p className="super-admin-customers__error" role="alert">
              {adminError}
            </p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeAdminDialog} disabled={adminMutationLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAdminMutation}
            loading={adminMutationLoading}
            disabled={adminMutationLoading || (adminMode === 'replace' && !adminStepUpToken)}
          >
            {adminMode === 'assign' ? 'Send Invitation' : 'Replace Admin'}
          </Button>
        </Dialog.Footer>
      </Dialog>

      <Dialog open={authLinkDialogOpen} onClose={closeAuthLinkDialog} size="md">
        <Dialog.Header>
          <h2 className="super-admin-customers__dialog-title">Auth Link (Dev Mode)</h2>
        </Dialog.Header>
        <Dialog.Body>
          <p className="super-admin-customers__dialog-subtitle">
            Email is in mock mode. Use this link to simulate the invitation auth flow:
          </p>
          <div className="super-admin-customers__auth-link-box">
            <code className="super-admin-customers__auth-link-code">
              {lastAuthLink}
            </code>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={closeAuthLinkDialog}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(lastAuthLink)
                addToast({
                  title: 'Copied',
                  description: 'Auth link copied to clipboard.',
                  variant: 'success',
                })
              } catch {
                addToast({
                  title: 'Copy failed',
                  description: 'Could not copy to clipboard. Select and copy manually.',
                  variant: 'warning',
                })
              }
            }}
            disabled={!lastAuthLink}
          >
            Copy Link
          </Button>
        </Dialog.Footer>
      </Dialog>

      {updateStatusResult.isLoading ? (
        <p className="super-admin-customers__muted">Updating customer status...</p>
      ) : null}
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
