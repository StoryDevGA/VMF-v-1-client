import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import { normalizeError } from '../../utils/errors.js'
import { INITIAL_FORM } from './superAdminCustomers.constants.js'
import {
  getCustomerId,
  validateForm,
  createFormFromCustomer,
} from './superAdminCustomers.utils.js'

export function useCustomerManagement() {
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

  const debouncedSearch = useDebounce(search, 300)

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

  useEffect(() => {
    if (!customerDetailsResponse?.data) return
    setEditForm(createFormFromCustomer(customerDetailsResponse.data))
  }, [customerDetailsResponse])

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const licenseLevels = licenseLevelsResponse?.data ?? []

  const listAppError = listError ? normalizeError(listError) : null
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

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    topologyFilter,
    setTopologyFilter,
    page,
    setPage,
    createOpen,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    editOpen,
    editForm,
    setEditForm,
    editErrors,
    rows,
    totalPages,
    currentPage,
    licenseLevels,
    isListLoading,
    isListFetching,
    isLoadingLicenseLevels,
    isFetchingCustomerDetails,
    listAppError,
    customerDetailsAppError,
    createResult,
    updateResult,
    updateStatusResult,
    handleCreate,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    handleUpdate,
    handleUpdateStatus,
  }
}
