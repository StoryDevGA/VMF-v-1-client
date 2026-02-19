import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminSystemVersioning from './SuperAdminSystemVersioning'

vi.mock('../../store/api/systemVersioningApi.js', () => ({
  useGetActivePolicyQuery: vi.fn(),
  useGetPolicyHistoryQuery: vi.fn(),
  useCreatePolicyMutation: vi.fn(),
  useUpdatePolicyMetadataMutation: vi.fn(),
}))

vi.mock('../../components/StepUpAuthForm', () => ({
  StepUpAuthForm: () => <div>StepUpAuthForm</div>,
}))

import {
  useGetActivePolicyQuery,
  useGetPolicyHistoryQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMetadataMutation,
} from '../../store/api/systemVersioningApi.js'

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminSystemVersioning />
    </ToasterProvider>,
  )
}

describe('SuperAdminSystemVersioning page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useGetActivePolicyQuery.mockReturnValue({
      data: { data: { id: 'p-1', name: 'Policy', version: 1 } },
      isLoading: false,
      error: null,
    })

    useGetPolicyHistoryQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    useCreatePolicyMutation.mockReturnValue([vi.fn(), { isLoading: false }])
    useUpdatePolicyMetadataMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and key sections', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /system versioning policy/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /active policy/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /policy history/i }),
    ).toBeInTheDocument()
  })
})
