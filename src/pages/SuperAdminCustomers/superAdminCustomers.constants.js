export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export const TOPOLOGY_FILTER_OPTIONS = [
  { value: '', label: 'All topologies' },
  { value: 'SINGLE_TENANT', label: 'Single Tenant' },
  { value: 'MULTI_TENANT', label: 'Multi Tenant' },
]

export const USER_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export const USER_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'CUSTOMER_ADMIN', label: 'Customer Admin' },
  { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
  { value: 'USER', label: 'User' },
]

export const USER_CREATE_ROLE_OPTIONS = USER_ROLE_FILTER_OPTIONS.filter((option) => option.value)
export const USER_CREATE_MODE_OPTIONS = [
  { value: 'invite_new', label: 'Invite New User' },
  { value: 'assign_existing', label: 'Assign Existing User' },
]
export const DEFAULT_USER_CREATE_ROLES = ['USER']

export const BILLING_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
]

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/
export const ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE =
  'An active invitation for this email is already tied to another user and is not linked to this customer yet. Revoke that invitation or wait for expiry, then retry.'
export const ASSIGN_INVITATION_ALREADY_ACTIVE_FALLBACK_MESSAGE =
  'An active invitation for this email already exists. Review Invitation Management before retrying.'
export const REPLACE_ADMIN_HELP_ITEMS = [
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
export const REPLACE_ADMIN_STEP_UP_REQUIRED_MESSAGE =
  'Step-up verification is required. Verify using your current Super Admin password before replacing admin.'
export const REPLACE_ADMIN_STEP_UP_INVALID_MESSAGE =
  'Step-up verification has expired. Verify again using your current Super Admin password, then retry Replace Admin.'
export const REPLACE_ADMIN_STEP_UP_UNAVAILABLE_MESSAGE =
  'Step-up verification is temporarily unavailable. Wait a moment, then verify using your current Super Admin password and retry.'
export const INVITATION_ALREADY_ACTIVE_REASON_MESSAGE_MAP = {
  DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  ACTIVE_INVITATION_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  INVITATION_ALREADY_ACTIVE_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
  EMAIL_ACTIVE_FOR_DIFFERENT_USER: ASSIGN_INVITATION_ALREADY_ACTIVE_MESSAGE,
}
export const CANONICAL_ADMIN_TOOLTIP_TEXT =
  'Customer Admin identifies the governance owner user for the customer. Use Replace Customer Admin to transfer ownership.'
export const CANONICAL_ADMIN_USERS_HELP_TEXT =
  'Customer Admin identifies the governance owner user for the customer. Use Replace Customer Admin to transfer ownership when needed.'

export const INITIAL_FORM = {
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

export const VIEW_CUSTOMERS = 'customers'
export const VIEW_INVITATIONS = 'invitations'
