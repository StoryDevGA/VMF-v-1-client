import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TABLE_PAGE_SIZE } from '../../components/Table/tableConstants.js'
import { useToaster } from '../../components/Toaster'
import { useDebounce } from '../../hooks/useDebounce.js'
import {
  useListCustomersQuery,
  useCreateCustomerMutation,
  useGetCustomerQuery,
  useUpdateCustomerMutation,
  useUpdateCustomerStatusMutation,
  useAdjustCustomerCreditMutation,
} from '../../store/api/customerApi.js'
import { useListLicenseLevelsQuery } from '../../store/api/licenseLevelApi.js'
import { normalizeError } from '../../utils/errors.js'
import { INITIAL_FORM } from './superAdminCustomers.constants.js'
import {
  getCustomerId,
  parseWholeNumber,
  validateForm,
  createFormFromCustomer,
  mapCustomerValidationErrors,
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
  const [creditAdjustment, setCreditAdjustment] = useState({ productKey: 'WEBSITE', delta: '', reason: '' })
  const [creditErrors, setCreditErrors] = useState({})
  const editHydratedCustomerIdRef = useRef('')

  const debouncedSearch = useDebounce(search, 300)

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListCustomersQuery({
    page,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    q: debouncedSearch.trim(),
    status: statusFilter,
    topology: topologyFilter,
  })

  const {
    data: licenseLevelsResponse,
    isLoading: isLoadingLicenseLevels,
    error: licenseLevelsError,
  } = useListLicenseLevelsQuery({
    page: 1,
    pageSize: 100,
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
  const [adjustCustomerCredit, adjustCreditResult] = useAdjustCustomerCreditMutation()

  useEffect(() => {
    if (!editCustomerId) {
      editHydratedCustomerIdRef.current = ''
      return
    }
    if (!customerDetailsResponse?.data) return
    const responseCustomerId = getCustomerId(customerDetailsResponse.data)
    if (responseCustomerId && String(responseCustomerId) !== String(editCustomerId)) return

    const nextForm = createFormFromCustomer(customerDetailsResponse.data)
    if (editHydratedCustomerIdRef.current !== editCustomerId) {
      // Query data is the external source of truth when a customer dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditForm(nextForm)
      editHydratedCustomerIdRef.current = editCustomerId
      return
    }

    // Credit adjustments invalidate/refetch customer details. Preserve any
    // unsaved edits and refresh only the server-owned balance readback.
    setEditForm((current) => ({ ...current, creditBalances: nextForm.creditBalances }))
  }, [customerDetailsResponse, editCustomerId])

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const editLicenseLevels = useMemo(() => licenseLevelsResponse?.data ?? [], [licenseLevelsResponse])
  const licenseLevels = useMemo(
    () => editLicenseLevels.filter((level) => level.isActive !== false),
    [editLicenseLevels],
  )

  const listAppError = listError ? normalizeError(listError) : null
  const customerDetailsAppError = customerDetailsError
    ? normalizeError(customerDetailsError)
    : null
  const licenseLevelsAppError = licenseLevelsError ? normalizeError(licenseLevelsError) : null

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const selectedLicenseLevel = licenseLevels.find(
        (level) => String(level.id ?? level._id) === String(createForm.licenseLevelId),
      )
      const { errors, payload } = validateForm(createForm, {
        includeStartingCredits: true,
        selectedLicenseLevel,
      })
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
        const fieldErrors = mapCustomerValidationErrors(appError.details)
        if (Object.keys(fieldErrors).length > 0) {
          setCreateErrors(fieldErrors)
          return
        }
        addToast({
          title: 'Failed to create customer',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [createCustomer, createForm, addToast, licenseLevels],
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
    setCreditAdjustment({ productKey: 'WEBSITE', delta: '', reason: '' })
    setCreditErrors({})
  }, [])

  const handleAdjustCredit = useCallback(async () => {
    if (!editCustomerId) return
    const delta = parseWholeNumber(creditAdjustment.delta)
    const errors = {}
    if (!Number.isInteger(delta) || delta === 0) errors.delta = 'Enter a non-zero whole number.'
    if (!creditAdjustment.reason.trim()) errors.reason = 'Reason is required.'
    if (Object.keys(errors).length > 0) {
      setCreditErrors(errors)
      return
    }
    setCreditErrors({})
    try {
      await adjustCustomerCredit({
        customerId: editCustomerId,
        productKey: creditAdjustment.productKey,
        delta,
        reason: creditAdjustment.reason.trim(),
      }).unwrap()
      setCreditAdjustment((current) => ({ ...current, delta: '', reason: '' }))
      addToast({
        title: 'Credit balance adjusted',
        description: 'The balance and audit record were updated.',
        variant: 'success',
      })
    } catch (err) {
      const appError = normalizeError(err)
      setCreditErrors({ form: appError.message })
    }
  }, [addToast, adjustCustomerCredit, creditAdjustment, editCustomerId])

  const handleUpdate = useCallback(async () => {
    if (!editCustomerId) return
    setEditErrors({})

    const { errors, payload } = validateForm(editForm, {
      includeTopology: false,
      requireLicenseLevel: false,
    })
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
      const fieldErrors = mapCustomerValidationErrors(appError.details)
      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors)
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
    creditAdjustment,
    setCreditAdjustment,
    creditErrors,
    rows,
    totalPages,
    currentPage,
    licenseLevels,
    editLicenseLevels,
    isListLoading,
    isListFetching,
    isLoadingLicenseLevels,
    licenseLevelsAppError,
    isFetchingCustomerDetails,
    listAppError,
    customerDetailsAppError,
    createResult,
    updateResult,
    updateStatusResult,
    adjustCreditResult,
    handleCreate,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    handleUpdate,
    handleAdjustCredit,
    handleUpdateStatus,
  }
}
