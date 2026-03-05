import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider } from '../../components/Toaster'
import SuperAdminLicenseLevels from './SuperAdminLicenseLevels'

vi.mock('../../store/api/licenseLevelApi.js', () => ({
  useListLicenseLevelsQuery: vi.fn(),
  useCreateLicenseLevelMutation: vi.fn(),
  useGetLicenseLevelQuery: vi.fn(),
  useUpdateLicenseLevelMutation: vi.fn(),
}))

import {
  useListLicenseLevelsQuery,
  useCreateLicenseLevelMutation,
  useGetLicenseLevelQuery,
  useUpdateLicenseLevelMutation,
} from '../../store/api/licenseLevelApi.js'

const createLicenseLevelMock = vi.fn()
const padTwoDigits = (value) => String(value).padStart(2, '0')

const getExpectedDateTimeParts = (value) => {
  const parsed = new Date(value)
  return {
    iso: parsed.toISOString(),
    dateLabel: `${parsed.getFullYear()}-${padTwoDigits(parsed.getMonth() + 1)}-${padTwoDigits(parsed.getDate())}`,
    timeLabel: `${padTwoDigits(parsed.getHours())}:${padTwoDigits(parsed.getMinutes())}`,
  }
}

function renderPage() {
  return render(
    <ToasterProvider>
      <SuperAdminLicenseLevels />
    </ToasterProvider>,
  )
}

describe('SuperAdminLicenseLevels page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useListLicenseLevelsQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } },
      isLoading: false,
      isFetching: false,
      error: null,
    })
    createLicenseLevelMock.mockReset()
    createLicenseLevelMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { _id: 'lic-1' } }),
    })
    useCreateLicenseLevelMutation.mockReturnValue([createLicenseLevelMock, { isLoading: false }])
    useGetLicenseLevelQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: null,
    })
    useUpdateLicenseLevelMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  })

  it('renders heading and create form fields', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: /licence levels/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByLabelText(/name/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/feature entitlements/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /create licence level/i })).toBeInTheDocument()
  })

  it('normalizes bracketed feature entitlement input before submit', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByLabelText(/^name/i, { selector: 'input#license-level-name' }),
      'Professional',
    )
    fireEvent.change(
      screen.getByLabelText(/feature entitlements/i, {
        selector: 'textarea#license-level-entitlements',
      }),
      { target: { value: '[FEATURE_A, "feature_b"]' } },
    )
    await user.click(screen.getByRole('button', { name: /create licence level/i }))

    await waitFor(() => {
      expect(createLicenseLevelMock).toHaveBeenCalledTimes(1)
    })

    expect(createLicenseLevelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Professional',
        featureEntitlements: ['FEATURE_A', 'FEATURE_B'],
      }),
    )
  })

  it('renders updated timestamp in catalogue rows using standardized two-line format', () => {
    const updatedAt = '2026-03-05T14:30:00.000Z'
    const parts = getExpectedDateTimeParts(updatedAt)

    useListLicenseLevelsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'lic-1',
            name: 'Enterprise',
            isActive: true,
            customerCount: 12,
            featureEntitlements: ['FEATURE_A'],
            updatedAt,
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    renderPage()

    const timestampNode = document.querySelector('.table-date-time')
    expect(timestampNode).not.toBeNull()
    expect(timestampNode).toHaveAttribute('datetime', parts.iso)
    expect(timestampNode.querySelector('.table-date-time__date')).toHaveTextContent(parts.dateLabel)
    expect(timestampNode.querySelector('.table-date-time__time')).toHaveTextContent(parts.timeLabel)
  })
})
