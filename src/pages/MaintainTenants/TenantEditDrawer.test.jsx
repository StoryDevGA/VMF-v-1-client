/**
 * TenantEditDrawer Tests
 *
 * Covers:
 * - Renders heading and fields when tenant is provided
 * - Shows status badge
 * - Shows default badge for default tenants
 * - Pre-fills name and website from tenant prop
 * - Validates empty name on save
 * - Renders tenant admin list
 * - Calls onClose when Cancel is clicked
 * - Returns null when tenant is null
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import TenantEditDrawer from './TenantEditDrawer'

// Mock HTMLDialogElement methods (JSDOM does not support <dialog>)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

/** Sample tenant shapes */
const sampleTenant = {
  _id: 'tenant-1',
  name: 'Acme Tenant',
  website: 'https://acme.com',
  status: 'ENABLED',
  isDefault: false,
  tenantAdminUserIds: ['507f1f77bcf86cd799439011'],
}

const defaultTenant = {
  _id: 'tenant-2',
  name: 'Default Tenant',
  website: 'https://default.com',
  status: 'ENABLED',
  isDefault: true,
  tenantAdminUserIds: [],
}

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
function renderDrawer(props = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    tenant: sampleTenant,
    ...props,
  }
  const store = createTestStore()

  return {
    ...render(
      <Provider store={store}>
        <ToasterProvider>
          <MemoryRouter>
            <TenantEditDrawer {...defaultProps} />
          </MemoryRouter>
        </ToasterProvider>
      </Provider>,
    ),
    onClose: defaultProps.onClose,
  }
}

describe('TenantEditDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the Edit Tenant heading', () => {
    renderDrawer()
    expect(
      screen.getByRole('heading', { name: /edit tenant/i }),
    ).toBeInTheDocument()
  })

  it('renders nothing when tenant is null', () => {
    const { container } = renderDrawer({ tenant: null })
    // Dialog should not render its body content
    expect(
      screen.queryByRole('heading', { name: /edit tenant/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the tenant status badge', () => {
    renderDrawer()
    expect(screen.getByText('ENABLED')).toBeInTheDocument()
  })

  it('shows Default badge for default tenants', () => {
    renderDrawer({ tenant: defaultTenant })
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('pre-fills name input from tenant prop', () => {
    renderDrawer()
    const nameInput = screen.getByLabelText(/tenant name/i)
    expect(nameInput).toHaveValue('Acme Tenant')
  })

  it('pre-fills website input from tenant prop', () => {
    renderDrawer()
    const websiteInput = screen.getByLabelText(/website url/i)
    expect(websiteInput).toHaveValue('https://acme.com')
  })

  it('shows existing tenant admin user IDs', () => {
    renderDrawer()
    expect(screen.getByText('507f1f77bcf86cd799439011')).toBeInTheDocument()
  })

  it('shows validation error when name is cleared and Save is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()

    const nameInput = screen.getByLabelText(/tenant name/i)
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/name must not be empty/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('validates admin user ID format before adding', async () => {
    const user = userEvent.setup()
    renderDrawer()

    await user.type(screen.getByLabelText(/user id/i), 'bad-id')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid user id/i)).toBeInTheDocument()
    })
  })

  it('renders Save Changes and Cancel buttons', () => {
    renderDrawer()
    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /cancel/i }),
    ).toBeInTheDocument()
  })
})
