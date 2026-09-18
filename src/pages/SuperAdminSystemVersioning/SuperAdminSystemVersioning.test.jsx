import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import { formatRelativeDateTimeParts } from '../../utils/dateTime.js'
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

const getExpectedDateTimeParts = (value) => {
  return formatRelativeDateTimeParts(value)
}

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

  it('renders policy history activated/created timestamps using the shared relative format', () => {
    const activatedAt = '2026-03-05T14:30:00.000Z'
    const createdAt = '2026-03-01T10:15:00.000Z'
    const activatedParts = getExpectedDateTimeParts(activatedAt)
    const createdParts = getExpectedDateTimeParts(createdAt)

    useGetPolicyHistoryQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'p-1',
            version: 3,
            name: 'Policy v3',
            isActive: true,
            activatedAt,
            createdAt,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const timestampNodes = Array.from(document.querySelectorAll('.table-date-time'))
    expect(timestampNodes).toHaveLength(2)
    expect(document.querySelector(`.table-date-time[datetime="${activatedParts.iso}"]`)).not.toBeNull()
    expect(document.querySelector(`.table-date-time[datetime="${createdParts.iso}"]`)).not.toBeNull()
    expect(screen.getByText(activatedParts.dateLabel)).toBeInTheDocument()
    expect(screen.getByText(activatedParts.timeLabel)).toBeInTheDocument()
    expect(screen.getByText(createdParts.dateLabel)).toBeInTheDocument()
    expect(screen.getByText(createdParts.timeLabel)).toBeInTheDocument()
  })

  it('supports first/last pagination controls in policy history', async () => {
    const user = userEvent.setup()
    useGetPolicyHistoryQuery.mockImplementation(({ page = 1 }) => ({
      data: {
        data: [],
        meta: { page, totalPages: 5 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }))

    renderPage()

    const firstButton = screen.getByRole('button', { name: /^first$/i })
    const previousButton = screen.getByRole('button', { name: /^previous$/i })
    const nextButton = screen.getByRole('button', { name: /^next$/i })
    const lastButton = screen.getByRole('button', { name: /^last$/i })

    expect(firstButton).toBeDisabled()
    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()
    expect(lastButton).not.toBeDisabled()

    await user.click(lastButton)

    await waitFor(() => {
      expect(useGetPolicyHistoryQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 5, pageSize: 10 }),
      )
    })
    expect(screen.getByText(/page 5 of 5/i)).toBeInTheDocument()

    await user.click(firstButton)

    await waitFor(() => {
      expect(useGetPolicyHistoryQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
      )
    })
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument()
  })
})
