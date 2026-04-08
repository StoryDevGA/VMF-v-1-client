import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useCreateRuntimeSkillMutation,
  useListRuntimeSkillsQuery,
  useUpdateRuntimeSkillMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import {
  INITIAL_RUNTIME_SKILL_FORM,
  mapRuntimeSkillToForm,
  RUNTIME_SKILL_PAGE_SIZE,
  RUNTIME_SKILL_STATUSES,
  validateRuntimeSkillForm,
} from './superAdminSkills.constants.js'

const getFieldErrorMap = (appError) => {
  const field = String(appError?.details?.field ?? '').trim()
  return field ? { [field]: appError.message } : {}
}

export function useRuntimeSkillManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    ...INITIAL_RUNTIME_SKILL_FORM,
  })
  const [createErrors, setCreateErrors] = useState({})

  const [editOpen, setEditOpen] = useState(false)
  const [editSkillId, setEditSkillId] = useState('')
  const [editForm, setEditForm] = useState({
    ...INITIAL_RUNTIME_SKILL_FORM,
  })
  const [editErrors, setEditErrors] = useState({})

  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
  } = useListRuntimeSkillsQuery({
    page,
    pageSize: RUNTIME_SKILL_PAGE_SIZE,
    q: search.trim(),
    status: statusFilter || undefined,
    frameworkKey: frameworkFilter || undefined,
  })

  const [createRuntimeSkill] = useCreateRuntimeSkillMutation()
  const [updateRuntimeSkill] = useUpdateRuntimeSkillMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null

  const openCreateDialog = useCallback(() => {
    setCreateErrors({})
    setCreateForm({
      ...INITIAL_RUNTIME_SKILL_FORM,
    })
    setCreateOpen(true)
  }, [])

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({
      ...INITIAL_RUNTIME_SKILL_FORM,
    })
    setCreateErrors({})
  }, [])

  const handleCreateSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setCreateErrors({})

      const { errors, payload } = validateRuntimeSkillForm(createForm)
      if (Object.keys(errors).length > 0) {
        setCreateErrors(errors)
        return
      }

      try {
        await createRuntimeSkill(payload).unwrap()
        closeCreateDialog()
        setPage(1)
        addToast({
          title: 'Skill created',
          description: `${payload.name} is now available in the Runtime Control catalogue.`,
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
          title: 'Failed to create skill',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeCreateDialog, createForm, createRuntimeSkill],
  )

  const openEditDialog = useCallback((skill) => {
    setEditSkillId(skill.id)
    setEditErrors({})
    setEditForm(mapRuntimeSkillToForm(skill))
    setEditOpen(true)
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditOpen(false)
    setEditSkillId('')
    setEditForm({
      ...INITIAL_RUNTIME_SKILL_FORM,
    })
    setEditErrors({})
  }, [])

  const handleEditSubmit = useCallback(
    async () => {
      if (!editSkillId) return

      setEditErrors({})
      const { errors, payload } = validateRuntimeSkillForm(editForm)
      if (Object.keys(errors).length > 0) {
        setEditErrors(errors)
        return
      }

      try {
        await updateRuntimeSkill({
          skillId: editSkillId,
          ...payload,
        }).unwrap()

        addToast({
          title: 'Skill updated',
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
          title: 'Failed to update skill',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, closeEditDialog, editForm, editSkillId, updateRuntimeSkill],
  )

  const setSkillStatus = useCallback(
    async (skill, nextStatus) => {
      if (!skill?.id || skill.status === nextStatus) {
        return
      }

      try {
        await updateRuntimeSkill({
          skillId: skill.id,
          status: nextStatus,
        }).unwrap()

        addToast({
          title:
            nextStatus === RUNTIME_SKILL_STATUSES.ACTIVE
              ? 'Skill activated'
              : 'Skill set inactive',
          description: `${skill.name} is now ${nextStatus.toLowerCase()}.`,
          variant: 'success',
        })
      } catch (err) {
        const appError = normalizeError(err)
        addToast({
          title: 'Failed to update skill status',
          description: appError.message,
          variant: 'error',
        })
      }
    },
    [addToast, updateRuntimeSkill],
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
    setSkillStatus,
  }
}
