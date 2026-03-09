import { useCallback, useEffect, useState } from 'react'
import {
  useListLicenseLevelsQuery,
  useCreateLicenseLevelMutation,
  useGetLicenseLevelQuery,
  useUpdateLicenseLevelMutation,
} from '../../store/api/licenseLevelApi.js'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import { normalizeError } from '../../utils/errors.js'
import {
  INITIAL_FORM,
  formatEntitlements,
  parseEntitlements,
  validateForm,
  mapValidationErrors,
} from './superAdminLicenseLevels.constants.js'

export function useLicenseLevelManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_FORM)
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [selectedLicenseLevelId, setSelectedLicenseLevelId] = useState('')
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editBase, setEditBase] = useState(INITIAL_FORM)
  const [editErrors, setEditErrors] = useState({})

  const debouncedSearch = useDebounce(search, 300)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListLicenseLevelsQuery({
    page,
    pageSize: 20,
    q: debouncedSearch.trim(),
    isActive: statusFilter || undefined,
  })

  const {
    data: selectedResponse,
    isFetching: isFetchingSelected,
    error: selectedError,
  } = useGetLicenseLevelQuery(selectedLicenseLevelId, {
    skip: !selectedLicenseLevelId,
  })

  const [createLicenseLevel, createResult] = useCreateLicenseLevelMutation()
  const [updateLicenseLevel, updateResult] = useUpdateLicenseLevelMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page

  useEffect(() => {
    if (!selectedResponse?.data) return

    const details = selectedResponse.data
    const next = {
      name: details.name ?? '',
      description: details.description ?? '',
      entitlements: formatEntitlements(details.featureEntitlements),
      isActive: Boolean(details.isActive),
    }

    setEditForm(next)
    setEditBase(next)
  }, [selectedResponse])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createLicenseLevel(payload).unwrap()
        setCreateForm(INITIAL_FORM)
        setCreateErrors({})
        setCreateOpen(false)
        addToast({
          title: 'Licence level created',
          description: `${payload.name} is now available for customer governance.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        const fieldErrors = mapValidationErrors(appError)

        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }

        if (appError.status === 409) {
          setCreateErrors({ name: appError.message })
          return
        }

        addToast({
          title: 'Failed to create licence level',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createForm, createLicenseLevel, addToast],
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
    const id = row.id ?? row._id
    if (!id) return

    setSelectedLicenseLevelId(id)
    setEditErrors({})
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setSelectedLicenseLevelId('')
    setEditForm(INITIAL_FORM)
    setEditBase(INITIAL_FORM)
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(async () => {
    if (!selectedLicenseLevelId) return

    setEditErrors({})
    const { errors, payload } = validateForm(editForm)
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    const patch = {}
    if (payload.name !== editBase.name.trim()) patch.name = payload.name
    if ((payload.description ?? '') !== editBase.description.trim()) {
      patch.description = payload.description ?? ''
    }
    if (payload.isActive !== Boolean(editBase.isActive)) {
      patch.isActive = payload.isActive
    }

    const baseEntitlements = parseEntitlements(editBase.entitlements).join('|')
    const nextEntitlements = (payload.featureEntitlements ?? []).join('|')
    if (baseEntitlements !== nextEntitlements) {
      patch.featureEntitlements = payload.featureEntitlements ?? []
    }

    if (Object.keys(patch).length === 0) {
      setEditErrors({
        name: 'Make at least one change before saving.',
      })
      return
    }

    try {
      await updateLicenseLevel({
        licenseLevelId: selectedLicenseLevelId,
        ...patch,
      }).unwrap()

      addToast({
        title: 'Licence level updated',
        description: 'Changes were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (err) {
      const appError = normalizeError(err)
      const fieldErrors = mapValidationErrors(appError)

      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors)
        return
      }

      if (appError.status === 409) {
        setEditErrors({ name: appError.message })
        return
      }

      addToast({
        title: 'Failed to update licence level',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [
    closeEditDialog,
    editBase,
    editForm,
    selectedLicenseLevelId,
    updateLicenseLevel,
    addToast,
  ])

  const listAppError = listError ? normalizeError(listError) : null
  const selectedAppError = selectedError ? normalizeError(selectedError) : null

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,

    rows,
    currentPage,
    totalPages,
    isListLoading,
    isListFetching,
    listAppError,

    openEditDialog,

    createOpen,
    openCreateDialog,
    closeCreateDialog,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    handleCreateSubmit,
    createResult,

    editOpen,
    closeEditDialog,
    editForm,
    setEditForm,
    editErrors,
    handleEditSubmit,
    updateResult,
    isFetchingSelected,
    selectedAppError,
  }
}
