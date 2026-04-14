import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useActivateFrameworkPackageMutation,
  useCreateFrameworkPackageMutation,
  useListFrameworkRegistriesQuery,
  useListFrameworkPackagesQuery,
  useUpdateFrameworkPackageMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { getRuntimeControlFieldErrorMap } from '../../utils/runtimeControlFormErrors.js'
import {
  buildFrameworkRegistryAllowedKeys,
  buildFrameworkRegistryNameLookup,
  buildFrameworkRegistryOptions,
} from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  FRAMEWORK_PACKAGE_PAGE_SIZE,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
  mapFrameworkPackageToForm,
  validateFrameworkPackageForm,
} from './superAdminFrameworkPackages.constants.js'

const buildDefaultFrameworkPackageForm = (registryRows) => {
  const [firstRegistry] = registryRows

  if (!firstRegistry) {
    return {
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
      frameworkKey: '',
      frameworkName: '',
    }
  }

  return {
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    frameworkKey: String(firstRegistry.frameworkKey ?? '').trim(),
    frameworkName: String(firstRegistry.name ?? '').trim(),
  }
}

export function useFrameworkPackageManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(buildDefaultFrameworkPackageForm([]))
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editPackageId, setEditPackageId] = useState('')
  const [editForm, setEditForm] = useState({
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
  })
  const [editErrors, setEditErrors] = useState({})

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

  const [createFrameworkPackage] = useCreateFrameworkPackageMutation()
  const [updateFrameworkPackage] = useUpdateFrameworkPackageMutation()
  const [activateFrameworkPackage] = useActivateFrameworkPackageMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const registryRows = registryResponse?.data ?? []
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows)
  const frameworkNameLookup = buildFrameworkRegistryNameLookup(registryRows)
  const supportedFrameworkKeys = buildFrameworkRegistryAllowedKeys(registryRows)

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm(buildDefaultFrameworkPackageForm(registryRows))
    setCreateOpen(true)
  }, [registryRows])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm(buildDefaultFrameworkPackageForm(registryRows))
    setCreateErrors({})
  }, [registryRows])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateFrameworkPackageForm(
        createForm,
        rows,
        '',
        supportedFrameworkKeys,
      )
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createFrameworkPackage(payload).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Framework package created',
          description: `${payload.frameworkKey} ${payload.version} is now available in the catalogue.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'frameworkKey',
          'frameworkName',
          'key',
          'name',
          'version',
          'description',
          'status',
          'compatibleWorkflowKeys',
        ])

        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to create framework package',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeCreateDialog, createForm, createFrameworkPackage, rows, supportedFrameworkKeys],
  )

  const openEditDialog = useCallback((pkg) => {
    setEditPackageId(pkg.id)
    setEditErrors({})
    setEditForm(mapFrameworkPackageToForm(pkg))
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditPackageId('')
    setEditForm({
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    })
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(
    async () => {
      if (!editPackageId) return

      setEditErrors({})
      const { errors, payload } = validateFrameworkPackageForm(
        editForm,
        rows,
        editPackageId,
        supportedFrameworkKeys,
      )
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      try {
        await updateFrameworkPackage({
          packageId: editPackageId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Framework package updated',
          description: 'Changes were saved successfully.',
          variant: 'success',
        })
        closeEditDialog()
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = getRuntimeControlFieldErrorMap(appError, [
          'frameworkKey',
          'frameworkName',
          'key',
          'name',
          'version',
          'description',
          'status',
          'compatibleWorkflowKeys',
        ])

        if (Object.keys(fieldErrors).length > 0) {
          setEditErrors(fieldErrors)
          return
        }

        addToast({
          title: 'Failed to update framework package',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeEditDialog, editForm, editPackageId, rows, supportedFrameworkKeys, updateFrameworkPackage],
  )

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
    frameworkNameLookup,
    createOpen,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    openCreateDialog,
    closeCreateDialog,
    handleCreateSubmit,
    editOpen,
    editForm,
    setEditForm,
    editErrors,
    openEditDialog,
    closeEditDialog,
    handleEditSubmit,
    activatePackage,
  }
}
