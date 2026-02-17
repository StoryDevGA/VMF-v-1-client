/**
 * SuperAdminCustomers Page Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ToasterProvider } from '../../components/Toaster'
import { baseApi } from '../../store/api/baseApi.js'
import authReducer from '../../store/slices/authSlice.js'
import tenantContextReducer from '../../store/slices/tenantContextSlice.js'
import SuperAdminCustomers from './SuperAdminCustomers'

function createTestStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      tenantContext: tenantContextReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState,
  })
}

function renderCustomersPage(store) {
  return render(
    <Provider store={store}>
      <ToasterProvider>
        <MemoryRouter initialEntries={['/super-admin/customers']}>
          <SuperAdminCustomers />
        </MemoryRouter>
      </ToasterProvider>
    </Provider>,
  )
}

describe('SuperAdminCustomers page', () => {
  it('renders heading and required form fields', () => {
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          name: 'Super Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderCustomersPage(store)

    expect(
      screen.getByRole('heading', { name: /customer invitations/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send invitation/i }),
    ).toBeInTheDocument()
  })

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          name: 'Super Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderCustomersPage(store)
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/company name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
  })

  it('shows an error for invalid email format', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          name: 'Super Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderCustomersPage(store)

    await user.type(screen.getByLabelText(/full name/i), 'Alex Harper')
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp')
    await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('records latest request and shows success toast on submit', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          name: 'Jordan Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderCustomersPage(store)

    await user.type(screen.getByLabelText(/full name/i), 'Alex Harper')
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp')
    await user.type(
      screen.getByLabelText(/email address/i),
      'alex.harper@acme.example',
    )
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(
      screen.getByRole('heading', { name: /latest request/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Alex Harper')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('alex.harper@acme.example')).toBeInTheDocument()
    expect(screen.getByText('Jordan Admin')).toBeInTheDocument()
    expect(
      screen.getByText(/invitation request recorded/i),
    ).toBeInTheDocument()
  })

  it('clears form input values with clear action', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      auth: {
        user: {
          id: 'sa-1',
          name: 'Super Admin',
          memberships: [{ customerId: null, roles: ['SUPER_ADMIN'] }],
        },
        status: 'authenticated',
      },
    })

    renderCustomersPage(store)

    const fullName = screen.getByLabelText(/full name/i)
    const companyName = screen.getByLabelText(/company name/i)
    const email = screen.getByLabelText(/email address/i)

    await user.type(fullName, 'Alex Harper')
    await user.type(companyName, 'Acme Corp')
    await user.type(email, 'alex.harper@acme.example')
    await user.click(screen.getByRole('button', { name: /clear form/i }))

    expect(fullName).toHaveValue('')
    expect(companyName).toHaveValue('')
    expect(email).toHaveValue('')
  })
})
