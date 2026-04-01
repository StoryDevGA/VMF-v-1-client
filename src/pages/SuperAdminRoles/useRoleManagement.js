import { useCallback, useEffect, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
} from '../../store/api/roleApi.js'
import {
  getRoleInUseConflictMessage,
  isRoleInUseConflictError,
  normalizeError,
} from '../../utils/errors.js'
import {
  INITIAL_ROLE_FORM,
  mapRoleValidationErrors,
  validateRoleForm,
} from './superAdminRoles.constants.js'

const getRoleId = (role) => String(role?.id ?? role?._id ?? '').trim()

const getRoleDetails = (response) => response?.data?.data ?? response?.data ?? null

export function useRoleManagement() {
  const { addToast } = useToaster()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(INITIAL_ROLE_FORM)
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedRoleIsSystem, setSelectedRoleIsSystem] = useState(false)
  const [editForm, setEditForm] = useState(INITIAL_ROLE_FORM)
  const [editBase, setEditBase] = useState(INITIAL_ROLE_FORM)
  const [editErrors, setEditErrors] = useState({})

  const {
    data: selectedResponse,
    isFetching: isFetchingSelected,
    error: selectedError,
  } = useGetRoleQuery(selectedRoleId, {
    skip: !selectedRoleId,
  })

  const [createRole, createResult] = useCreateRoleMutation()
  const [updateRole, updateResult] = useUpdateRoleMutation()
  const [deleteRole, deleteResult] = useDeleteRoleMutation()

  useEffect(() => {
    const details = getRoleDetails(selectedResponse)
    if (!details) return

    const next = {
      key: String(details.key ?? '').trim().toUpperCase(),
      name: String(details.name ?? ''),
      description: String(details.description ?? ''),
      scope: String(details.scope ?? 'CUSTOMER').trim().toUpperCase(),
      isActive: Boolean(details.isActive),
    }

    setSelectedRoleIsSystem(Boolean(details.isSystem))
    setEditForm(next)
    setEditBase(next)
  }, [selectedResponse])

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm(INITIAL_ROLE_FORM)
    setCreateErrors({})
  }, [])

  const openEditDialog = useCallback((row) => {
    const roleId = getRoleId(row)
    if (!roleId) return
    setSelectedRoleId(roleId)
    setSelectedRoleIsSystem(Boolean(row?.isSystem))
    setEditErrors({})
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setSelectedRoleId('')
    setSelectedRoleIsSystem(false)
    setEditForm(INITIAL_ROLE_FORM)
    setEditBase(INITIAL_ROLE_FORM)
    setEditErrors({})
  }, [])

  const handleCreateSubmit = useCallback(async (event) => {
    event.preventDefault()
    setCreateErrors({})

    const { errors, payload } = validateRoleForm(createForm, { mode: 'create' })
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors)
      return
    }

    try {
      await createRole(payload).unwrap()
      addToast({
        title: 'Role created',
        description: `${payload.name} is now available in the role catalogue.`,
        variant: 'success',
      })
      closeCreateDialog()
    } catch (error) {
      const appError = normalizeError(error)
      const fieldErrors = mapRoleValidationErrors(appError)

      if (Object.keys(fieldErrors).length > 0) {
        setCreateErrors(fieldErrors)
        return
      }

      if (appError.status === 409) {
        setCreateErrors({
          key: appError.message,
        })
        return
      }

      addToast({
        title: 'Failed to create role',
        description: appError.message,
        variant: 'error',
      })
    }
  }, [addToast, closeCreateDialog, createForm, createRole])

  const handleEditSubmit = useCallback(async () => {
    if (!selectedRoleId) return

    if (selectedRoleIsSystem) {
      setEditErrors({
        form: 'System roles are protected and cannot be modified.',
      })
      return
    }

    setEditErrors({})
    const { errors, payload } = validateRoleForm(editForm, { mode: 'update' })
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    const patch = {}
    if (payload.name !== editBase.name.trim()) patch.name = payload.name
    if ((payload.description ?? '') !== editBase.description.trim()) {
      patch.description = payload.description ?? ''
    }
    if (payload.scope !== editBase.scope) patch.scope = payload.scope
    if (payload.isActive !== Boolean(editBase.isActive)) {
      patch.isActive = payload.isActive
    }

    if (Object.keys(patch).length === 0) {
      setEditErrors({
        form: 'Make at least one change before saving.',
      })
      return
    }

    try {
      await updateRole({
        roleId: selectedRoleId,
        ...patch,
      }).unwrap()

      addToast({
        title: 'Role updated',
        description: 'Role changes were saved successfully.',
        variant: 'success',
      })
      closeEditDialog()
    } catch (error) {
      const appError = normalizeError(error)
      const fieldErrors = mapRoleValidationErrors(appError)

      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors)
        return
      }

      setEditErrors({
        form: appError.message,
      })
    }
  }, [
    addToast,
    closeEditDialog,
    editBase,
    editForm,
    selectedRoleId,
    selectedRoleIsSystem,
    updateRole,
  ])

  const handleDeleteRole = useCallback(
    async (row) => {
      const roleId = getRoleId(row)
      if (!roleId) return

      try {
        await deleteRole({ roleId }).unwrap()
        addToast({
          title: 'Role deleted',
          description: `${row?.name ?? row?.key ?? 'Role'} was removed from the catalogue.`,
          variant: 'success',
        })
      } catch (error) {
        const appError = normalizeError(error)
        const description = isRoleInUseConflictError(appError)
          ? getRoleInUseConflictMessage(appError)
          : appError.message

        addToast({
          title: 'Failed to delete role',
          description,
          variant: isRoleInUseConflictError(appError) ? 'warning' : 'error',
        })
      }
    },
    [addToast, deleteRole],
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState(null)

  const openDeleteConfirm = useCallback(
    (row) => {
      if (Boolean(row?.isSystem)) {
        addToast({
          title: 'Protected role',
          description: 'System roles are protected and cannot be deleted.',
          variant: 'warning',
        })
        return
      }
      setRoleToDelete(row)
      setDeleteConfirmOpen(true)
    },
    [addToast],
  )

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false)
    setRoleToDelete(null)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!roleToDelete) return
    await handleDeleteRole(roleToDelete)
    closeDeleteConfirm()
  }, [closeDeleteConfirm, handleDeleteRole, roleToDelete])

  const selectedAppError = selectedError ? normalizeError(selectedError) : null

  return {
    openCreateDialog,
    createOpen,
    closeCreateDialog,
    createForm,
    setCreateForm,
    createErrors,
    setCreateErrors,
    handleCreateSubmit,
    createResult,

    openEditDialog,
    editOpen,
    closeEditDialog,
    editForm,
    setEditForm,
    editErrors,
    handleEditSubmit,
    updateResult,
    isFetchingSelected,
    selectedAppError,
    selectedRoleIsSystem,

    openDeleteConfirm,
    deleteConfirmOpen,
    closeDeleteConfirm,
    confirmDelete,
    roleToDelete,
    deleteResult,
  }
}

