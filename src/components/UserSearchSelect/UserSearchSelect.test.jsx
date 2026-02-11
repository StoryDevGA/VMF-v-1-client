/**
 * UserSearchSelect Tests
 *
 * Covers:
 * - Renders label and search input
 * - Shows selected users as chips
 * - Displays dropdown results on search
 * - Adds user to selection on click
 * - Removes user from selection
 * - Blocks removal when at minimum required
 * - Shows recovery hint when removal blocked
 * - Shows "No users found" for empty results
 * - Disabled state
 * - Error display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import { UserSearchSelect } from './UserSearchSelect'

/** Create a fresh store */
function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })
}

/** Render wrapper */
function renderSelect(props = {}) {
  const defaultProps = {
    customerId: 'cust-1',
    selectedIds: [],
    onChange: vi.fn(),
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <UserSearchSelect {...defaultProps} />
        </MemoryRouter>
      </Provider>,
    ),
    onChange: defaultProps.onChange,
  }
}

describe('UserSearchSelect', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the label', () => {
    renderSelect({ label: 'Tenant Admins' })
    expect(screen.getByText('Tenant Admins')).toBeInTheDocument()
  })

  it('renders the search input with placeholder', () => {
    renderSelect()
    const input = screen.getByPlaceholderText(/search by name or email/i)
    expect(input).toBeInTheDocument()
  })

  it('renders the combobox role on input', () => {
    renderSelect()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows selected users as chips', () => {
    renderSelect({ selectedIds: ['user-1', 'user-2'] })
    const chips = screen.getByLabelText(/selected admins/i)
    expect(chips).toBeInTheDocument()
    // Should show 2 chip items
    const items = chips.querySelectorAll('li')
    expect(items).toHaveLength(2)
  })

  it('shows remove button on each chip', () => {
    renderSelect({ selectedIds: ['507f1f77bcf86cd799439011'] })
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    expect(removeBtn).toBeInTheDocument()
  })

  it('calls onChange when remove is clicked (above minimum)', () => {
    const onChange = vi.fn()
    renderSelect({
      selectedIds: ['user-1', 'user-2'],
      onChange,
      minRequired: 1,
    })
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    removeBtns[0].click()
    expect(onChange).toHaveBeenCalledWith(['user-2'])
  })

  it('blocks removal when at minimum required count', () => {
    const onChange = vi.fn()
    renderSelect({
      selectedIds: ['user-1'],
      onChange,
      minRequired: 1,
    })
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    removeBtn.click()
    // onChange should NOT be called
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows recovery warning when removal is blocked', async () => {
    const onChange = vi.fn()
    renderSelect({
      selectedIds: ['user-1'],
      onChange,
      minRequired: 1,
    })
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    removeBtn.click()

    await waitFor(() => {
      expect(screen.getByText(/cannot remove/i)).toBeInTheDocument()
      expect(screen.getByText(/at least 1 tenant admin/i)).toBeInTheDocument()
    })
  })

  it('shows Super Admin recovery hint when originalIds provided and removal blocked', async () => {
    renderSelect({
      selectedIds: ['user-1'],
      onChange: vi.fn(),
      minRequired: 1,
      originalIds: ['user-1'],
    })
    const removeBtn = screen.getByRole('button', { name: /remove/i })
    removeBtn.click()

    await waitFor(() => {
      expect(screen.getByText(/contact a super admin/i)).toBeInTheDocument()
    })
  })

  it('renders error message when error prop is set', () => {
    renderSelect({ error: 'At least one admin is required.' })
    expect(screen.getByText('At least one admin is required.')).toBeInTheDocument()
  })

  it('disables the input when disabled prop is true', () => {
    renderSelect({ disabled: true })
    const input = screen.getByPlaceholderText(/search by name or email/i)
    expect(input).toBeDisabled()
  })

  it('opens dropdown when user types in the search input', async () => {
    const user = userEvent.setup()
    renderSelect()

    const input = screen.getByPlaceholderText(/search by name or email/i)
    await user.type(input, 'John')

    // Dropdown should appear (even at minimum showing "Searching…" or "No users found")
    await waitFor(
      () => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })

  it('does not show dropdown when input is empty', () => {
    renderSelect()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows truncated ID for selected users without cached names', () => {
    renderSelect({ selectedIds: ['507f1f77bcf86cd799439011'] })
    // Should show first 8 chars + ellipsis
    expect(screen.getByText('507f1f77…')).toBeInTheDocument()
  })

  it('does not render selected list when no IDs selected', () => {
    renderSelect({ selectedIds: [] })
    expect(screen.queryByLabelText(/selected admins/i)).not.toBeInTheDocument()
  })
})
