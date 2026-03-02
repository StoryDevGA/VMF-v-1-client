/**
 * License Level API Slice
 *
 * Super Admin governance endpoints for license-level lifecycle.
 */

import { baseApi } from './baseApi.js'

const listTag = { type: 'LicenseLevel', id: 'LIST' }

const getLicenseLevelId = (licenseLevel) => licenseLevel?.id ?? licenseLevel?._id

const normalizeIsActiveFilter = (isActive) => {
  if (typeof isActive === 'boolean') return String(isActive)
  if (isActive === 'true' || isActive === 'false') return isActive
  return ''
}

export const licenseLevelApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listLicenseLevels: build.query({
      query: ({ q = '', isActive, page = 1, pageSize = 20 } = {}) => {
        const normalizedIsActive = normalizeIsActiveFilter(isActive)

        return {
          url: '/super-admin/licence-levels',
          params: {
            page,
            pageSize,
            ...(q ? { q } : {}),
            ...(normalizedIsActive ? { isActive: normalizedIsActive } : {}),
          },
        }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data
                .map((licenseLevel) => getLicenseLevelId(licenseLevel))
                .filter(Boolean)
                .map((id) => ({ type: 'LicenseLevel', id })),
              listTag,
            ]
          : [listTag],
    }),

    createLicenseLevel: build.mutation({
      query: (body) => ({
        url: '/super-admin/licence-levels',
        method: 'POST',
        body,
      }),
      invalidatesTags: [listTag],
    }),

    getLicenseLevel: build.query({
      query: (licenseLevelId) => `/super-admin/licence-levels/${licenseLevelId}`,
      providesTags: (_result, _error, licenseLevelId) => [
        { type: 'LicenseLevel', id: licenseLevelId },
      ],
    }),

    updateLicenseLevel: build.mutation({
      query: ({ licenseLevelId, ...body }) => ({
        url: `/super-admin/licence-levels/${licenseLevelId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { licenseLevelId }) => [
        listTag,
        { type: 'LicenseLevel', id: licenseLevelId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useListLicenseLevelsQuery,
  useLazyListLicenseLevelsQuery,
  useCreateLicenseLevelMutation,
  useGetLicenseLevelQuery,
  useUpdateLicenseLevelMutation,
} = licenseLevelApi
