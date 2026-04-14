import { useCallback, useState } from 'react'
import { useToaster } from '../../components/Toaster'
import {
  useListFrameworkRegistriesQuery,
  useListRuntimeSkillsQuery,
  useUpdateRuntimeSkillMutation,
} from '../../store/api/runtimeControlApi.js'
import { normalizeError } from '../../utils/errors.js'
import { buildFrameworkRegistryOptions } from '../SuperAdminFrameworkRegistry/superAdminFrameworkRegistry.constants.js'
import {
  RUNTIME_SKILL_PAGE_SIZE,
  RUNTIME_SKILL_STATUSES,
} from './superAdminSkills.constants.js'

export function useRuntimeSkillManagement() {
  const { addToast } = useToaster()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [page, setPage] = useState(1)

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

  const { data: registryResponse } = useListFrameworkRegistriesQuery({
    page: 1,
    pageSize: 100,
    q: '',
  })

  const [updateRuntimeSkill] = useUpdateRuntimeSkillMutation()

  const rows = listResponse?.data ?? []
  const meta = listResponse?.meta ?? {}
  const totalPages = Number(meta.totalPages) || 1
  const currentPage = Number(meta.page) || page
  const listAppError = listError ? normalizeError(listError) : null
  const registryRows = registryResponse?.data ?? []
  const frameworkOptions = buildFrameworkRegistryOptions(registryRows)

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
    frameworkOptions,
    setSkillStatus,
  }
}
