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
})
