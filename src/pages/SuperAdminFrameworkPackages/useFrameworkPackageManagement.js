import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useActivateFrameworkPackageMutation,
  useCreateFrameworkPackageMutation,
  useListFrameworkPackagesQuery,
  useUpdateFrameworkPackageMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  FRAMEWORK_PACKAGE_PAGE_SIZE,
  INITIAL_FRAMEWORK_PACKAGE_FORM,
  mapFrameworkPackageToForm,
  validateFrameworkPackageForm,
} from './superAdminFrameworkPackages.constants.js'

const getFieldErrorMap = (appError) => {
  const field = String(appError?.details?.field ?? '').trim()
  return field ? { [field]: appError.message } : {}
}

export function useFrameworkPackageManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    ...INITIAL_FRAMEWORK_PACKAGE_FORM,
  })
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

  const [createFrameworkPackage] = useCreateFrameworkPackageMutation()
  const [updateFrameworkPackage] = useUpdateFrameworkPackageMutation()
  const [activateFrameworkPackage] = useActivateFrameworkPackageMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm({
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    })
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({
      ...INITIAL_FRAMEWORK_PACKAGE_FORM,
    })
    setCreateErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateFrameworkPackageForm(createForm)
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
        const fieldErrors = getFieldErrorMap(appError)

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
    [addToast, closeCreateDialog, createForm, createFrameworkPackage],
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
      const { errors, payload } = validateFrameworkPackageForm(editForm)
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
        const fieldErrors = getFieldErrorMap(appError)

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
    [addToast, closeEditDialog, editForm, editPackageId, updateFrameworkPackage],
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
