/**
 * Role API Slice
 *
 * Super Admin role-catalogue management endpoints.
 */

import { baseApi } from './baseApi.js'

const listTag = { type: 'Role', id: 'LIST' }

const getRoleId = (role) => role?.id ?? role?._id

const normalizeBooleanFilter = (value) => {
  if (typeof value === 'boolean') return String(value)
  if (value === 'true' || value === 'false') return value
  return ''
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
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data
                .map((role) => getRoleId(role))
                .filter(Boolean)
                .map((id) => ({ type: 'Role', id })),
              listTag,
            ]
          : [listTag],
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
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi

