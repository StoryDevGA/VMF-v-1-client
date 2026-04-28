import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToaster } from '../../components/Toaster'
import {
  useActivateFrameworkPackageMutation,
  useListFrameworkPackagesQuery,
  useListFrameworkRegistriesQuery,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  FRAMEWORK_PACKAGE_PAGE_SIZE,
} from './superAdminFrameworkPackages.constants.js'

export function useFrameworkPackageManagement() {
  const { addToast } = useToaster()
  const [searchParams] = useSearchParams()

  const initialSearch = String(searchParams.get('q') ?? '')
  const initialStatus = String(searchParams.get('status') ?? '')
  const initialFramework = String(searchParams.get('frameworkKey') ?? '')

  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [frameworkFilter, setFrameworkFilter] = useState(initialFramework)
  const [page, setPage] = useState(1)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListFrameworkPackagesQuery({
    page,
    pageSize: FRAMEWORK_PACKAGE_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    frameworkKey: frameworkFilter || undefined,
  })

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [activateFrameworkPackage] = useActivateFrameworkPackageMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const frameworkOptions = buildFrameworkRegistryOptions(registryResponse?.data ?? [])

  const activatePackage = useCallback(
    async (pkg) => {
      try {
        await activateFrameworkPackage({ packageId: pkg.id }).unwrap()
        addToast({
          title: 'Framework package activated',
          description: `${pkg.frameworkKey} ${pkg.version} is now the active default package.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to activate framework package',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [activateFrameworkPackage, addToast],
  )

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    frameworkFilter,
    setFrameworkFilter,
    page,
    setPage,
    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,
    frameworkOptions,
    activatePackage,
  }
}
