/**
 * Role API Slice
 *
 * Super Admin role-catalogue management endpoints.
 */

import { baseApi } from './baseApi.js'

const listTag = { type: 'Role', id: 'LIST' }
const permissionCatalogueTag = { type: 'Role', id: 'PERMISSION_CATALOGUE' }

const getRoleId = (role) => role?.id ?? role?._id

const normalizeBooleanFilter = (value) => {
  if (typeof value === 'boolean') return String(value)
  if (value === 'true' || value === 'false') return value
  return ''
}

export const getRoleRows = (result) => {
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.data?.data)) return result.data.data
  return []
}

export const getCachedListRoleArgs = (state) => {
  const queries = state?.[baseApi.reducerPath]?.queries ?? {}

  return Object.values(queries)
    .filter((queryState) => queryState?.endpointName === 'listRoles')
    .map((queryState) => queryState.originalArgs)
    .filter((args) => args !== undefined)
}

export const applyOptimisticRolePermissionsUpdate = (result, roleId, permissions) => {
  const role = getRoleRows(result).find(
    (candidate) => String(getRoleId(candidate) ?? '') === String(roleId ?? ''),
  )

  if (role) {
    role.permissions = [...permissions]
  }
}

export const roleApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRoles: build.query({
      query: ({
        q = '',
        scope = '',
        isSystem,
        isActive,
        page = 1,
        pageSize = 20,
      } = {}) => {
        const normalizedSystemFilter = normalizeBooleanFilter(isSystem)
        const normalizedActiveFilter = normalizeBooleanFilter(isActive)

        return {
          url: '/super-admin/roles',
          params: {
            page,
            pageSize,
            ...(q ? { q } : {}),
            ...(scope ? { scope } : {}),
            ...(normalizedSystemFilter ? { isSystem: normalizedSystemFilter } : {}),
            ...(normalizedActiveFilter ? { isActive: normalizedActiveFilter } : {}),
          },
        }
      },
      providesTags: (result) => [
        ...getRoleRows(result)
          .map((role) => getRoleId(role))
          .filter(Boolean)
          .map((id) => ({ type: 'Role', id })),
        listTag,
      ],
    }),

    getPermissionCatalogue: build.query({
      query: () => '/super-admin/roles/permissions/catalogue',
      keepUnusedDataFor: 3600,
      providesTags: [permissionCatalogueTag],
    }),

    createRole: build.mutation({
      query: (body) => ({
        url: '/super-admin/roles',
        method: 'POST',
        body,
      }),
      invalidatesTags: [listTag],
    }),

    getRole: build.query({
      query: (roleId) => `/super-admin/roles/${roleId}`,
      providesTags: (_result, _error, roleId) => [{ type: 'Role', id: roleId }],
    }),

    updateRole: build.mutation({
      query: ({ roleId, ...body }) => ({
        url: `/super-admin/roles/${roleId}`,
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ roleId, ...body }, { dispatch, getState, queryFulfilled }) {
        if (!Object.prototype.hasOwnProperty.call(body, 'permissions')) return

        const nextPermissions = Array.isArray(body.permissions) ? [...body.permissions] : []
        const patchResults = getCachedListRoleArgs(getState()).map((args) =>
          dispatch(
            roleApi.util.updateQueryData('listRoles', args, (draft) => {
              applyOptimisticRolePermissionsUpdate(draft, roleId, nextPermissions)
            }),
          ),
        )

        try {
          await queryFulfilled
        } catch {
          patchResults.forEach((patchResult) => patchResult.undo())
        }
      },
      invalidatesTags: (_result, _error, { roleId }) => [
        listTag,
        { type: 'Role', id: roleId },
      ],
    }),

    deleteRole: build.mutation({
      query: ({ roleId }) => ({
        url: `/super-admin/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        listTag,
        { type: 'Role', id: roleId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListRolesQuery,
  useLazyListRolesQuery,
  useGetPermissionCatalogueQuery,
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi
