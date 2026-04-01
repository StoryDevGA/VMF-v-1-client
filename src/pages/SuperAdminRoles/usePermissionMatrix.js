import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  getRoleRows,
  useGetPermissionCatalogueQuery,
  useListRolesQuery,
  useUpdateRoleMutation,
} from '../../store/api/roleApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_GROUPS,
} from './permissionCatalogue.constants.js'

const ROLE_MATRIX_PAGE_SIZE = 100
const SYSTEM_ROLE_ORDER = ['USER', 'TENANT_ADMIN', 'CUSTOMER_ADMIN', 'SUPER_ADMIN']

const getRoleId = (role) => String(role?.id ?? role?._id ?? '').trim()

const getPermissionGroups = (response) => {
  if (Array.isArray(response?.data?.data)) return response.data.data
  if (Array.isArray(response?.data)) return response.data
  return []
}

const getPendingToggleKey = (roleId, permissionKey) => `${roleId}-${permissionKey}`

const getPermissionSortOrder = (permissionKey) => {
  const index = ALL_PERMISSION_KEYS.indexOf(permissionKey)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

const sortPermissionKeys = (permissionKeys) =>
  [...new Set(permissionKeys)].sort((left, right) => {
    const orderDelta = getPermissionSortOrder(left) - getPermissionSortOrder(right)
    if (orderDelta !== 0) return orderDelta
    return String(left).localeCompare(String(right))
  })

const sortRoles = (roles) =>
  [...roles].sort((left, right) => {
    const leftKey = String(left?.key ?? '').trim().toUpperCase()
    const rightKey = String(right?.key ?? '').trim().toUpperCase()
    const leftSystemIndex = SYSTEM_ROLE_ORDER.indexOf(leftKey)
    const rightSystemIndex = SYSTEM_ROLE_ORDER.indexOf(rightKey)

    if (leftSystemIndex !== -1 || rightSystemIndex !== -1) {
      if (leftSystemIndex === -1) return 1
      if (rightSystemIndex === -1) return -1
      return leftSystemIndex - rightSystemIndex
    }

    return String(left?.name ?? leftKey).localeCompare(String(right?.name ?? rightKey))
  })

const normalizeRoles = (roles) =>
  roles.map((role) => ({
    ...role,
    id: getRoleId(role),
    permissions: sortPermissionKeys(Array.isArray(role?.permissions) ? role.permissions : []),
  }))

export function usePermissionMatrix() {
  const { addToast } = useToaster()
  const [search, setSearch] = useState('')
  const [pendingToggles, setPendingToggles] = useState(() => new Set())

  const {
    data: listResponse,
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    error: listError,
  } = useListRolesQuery({
    page: 1,
    pageSize: ROLE_MATRIX_PAGE_SIZE,
  })

  const {
    data: catalogueResponse,
    error: catalogueError,
  } = useGetPermissionCatalogueQuery()

  const [updateRole] = useUpdateRoleMutation()

  const roles = useMemo(
    () => sortRoles(normalizeRoles(getRoleRows(listResponse))),
    [listResponse],
  )

  // Keep a ref to the latest roles so handleToggle always reads fresh permissions
  // even when React batches re-renders between rapid consecutive toggles.
  const rolesRef = useRef(roles)
  useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  const permissionGroups = useMemo(() => {
    const remotePermissionGroups = getPermissionGroups(catalogueResponse)
    if (remotePermissionGroups.length > 0) return remotePermissionGroups
    if (catalogueError) {
      // eslint-disable-next-line no-console
      console.warn('[usePermissionMatrix] Permission catalogue API failed — using FE fallback.', catalogueError)
    }
    return PERMISSION_GROUPS
  }, [catalogueResponse, catalogueError])

  const setPendingToggleState = useCallback((roleId, permissionKey, isPending) => {
    const pendingKey = getPendingToggleKey(roleId, permissionKey)

    setPendingToggles((current) => {
      const next = new Set(current)

      if (isPending) {
        next.add(pendingKey)
      } else {
        next.delete(pendingKey)
      }

      return next
    })
  }, [])

  const handleToggle = useCallback(
    async (roleId, permissionKey, newValue) => {
      // Read from ref for the latest permissions snapshot, preventing stale-closure
      // races when two different permissions on the same role are toggled in rapid succession.
      const role = rolesRef.current.find((candidate) => candidate.id === String(roleId))
      if (!role) return

      const currentPermissions = Array.isArray(role.permissions) ? role.permissions : []
      const alreadyHasPermission = currentPermissions.includes(permissionKey)

      if (alreadyHasPermission === newValue) return

      const nextPermissions = sortPermissionKeys(
        newValue
          ? [...currentPermissions, permissionKey]
          : currentPermissions.filter((permission) => permission !== permissionKey),
      )

      setPendingToggleState(roleId, permissionKey, true)

      try {
        await updateRole({
          roleId,
          permissions: nextPermissions,
        }).unwrap()
      } catch (error) {
        // RTK Query aborts in-flight mutations on unmount — do not toast for that.
        if (error?.status === 'FETCH_ERROR' && error?.error === 'Aborted') return
        const appError = normalizeError(error)
        addToast({
          title: 'Failed to update permissions',
          description: appError.message,
          variant: 'error',
        })
      } finally {
        setPendingToggleState(roleId, permissionKey, false)
      }
    },
    [addToast, setPendingToggleState, updateRole],
  )

  return {
    roles,
    permissionGroups,
    search,
    setSearch,
    handleToggle,
    pendingToggles,
    isLoading: isRolesLoading && roles.length === 0,
    isFetching: isRolesFetching,
    error: listError ? normalizeError(listError) : null,
  }
}

export default usePermissionMatrix
