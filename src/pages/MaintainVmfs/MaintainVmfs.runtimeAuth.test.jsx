import { act } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToasterProvider } from '../../components/Toaster'
import { setCredentials } from '../../store/slices/authSlice.js'
import authReducer from '../../store/slices/authSlice.js'
import MaintainVmfs from './MaintainVmfs.jsx'
import { Provider } from 'react-redux'

vi.mock('../../hooks/useTenantContext.js', () => ({
  useTenantContext: vi.fn(),
}))

vi.mock('../../store/api/customerApi.js', () => ({
  useGetCustomerQuery: vi.fn(),
}))

vi.mock('../../store/api/vmfApi.js', () => ({
  useCreateVmfMutation: vi.fn(),
  useDeleteVmfMutation: vi.fn(),
  useListVmfsQuery: vi.fn(),
  useUpdateVmfMutation: vi.fn(),
}))

import { useTenantContext } from '../../hooks/useTenantContext.js'
import { useGetCustomerQuery } from '../../store/api/customerApi.js'
import {
  useCreateVmfMutation,
  useDeleteVmfMutation,
  useListVmfsQuery,
  useUpdateVmfMutation,
} from '../../store/api/vmfApi.js'

const createVmfMock = vi.fn()
const updateVmfMock = vi.fn()
const deleteVmfMock = vi.fn()
let listQueryResponse

function createStore({ canCreate = false, canUpdate = false } = {}) {
  const resolvedPermissions = {
    platform: { roleKeys: [], permissions: [] },
    customers: [],
    tenants: [
      {
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        roleKeys: ['USER'],
        permissions: [
          'VMF_VIEW',
          ...(canCreate ? ['VMF_CREATE'] : []),
          ...(canUpdate ? ['VMF_UPDATE'] : []),
        ],
      },
    ],
  }

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Standard User',
          isActive: true,
          memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
          tenantMemberships: [{ customerId: 'cust-1', tenantId: 'tenant-1', roles: ['USER'] }],
          vmfGrants: [],
          customerScopes: [
            {
              customerId: 'cust-1',
              featureEntitlements: ['VMF'],
              entitlementSource: 'LICENSE_LEVEL',
            },
          ],
        },
        customerScopes: [
          {
            customerId: 'cust-1',
            featureEntitlements: ['VMF'],
            entitlementSource: 'LICENSE_LEVEL',
          },
        ],
        resolvedPermissions,
        status: 'authenticated',
      },
    },
  })
}

describe('MaintainVmfs runtime-auth UAT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
      this.open = false
    })

    useTenantContext.mockReturnValue({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      resolvedTenantName: 'Orbit Core',
      supportsTenantManagement: true,
      selectableTenants: [],
      setTenantId: vi.fn(),
    })

    useGetCustomerQuery.mockReturnValue({
      data: {
        data: {
          governance: { maxVmfsPerTenant: 4 },
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    createVmfMock.mockReset()
    createVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { name: 'Northwind', frameworkVersion: '2.2' } }),
    })
    useCreateVmfMutation.mockReturnValue([createVmfMock, { isLoading: false }])

    updateVmfMock.mockReset()
    updateVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useUpdateVmfMutation.mockReturnValue([updateVmfMock, { isLoading: false }])

    deleteVmfMock.mockReset()
    deleteVmfMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })
    useDeleteVmfMutation.mockReturnValue([deleteVmfMock, { isLoading: false }])

    listQueryResponse = {
      data: {
        data: [],
        meta: { page: 1, totalPages: 1, total: 0 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }
    useListVmfsQuery.mockImplementation(() => listQueryResponse)
  })

  it('promotes a read-only VMF workspace to edit mode after session refresh when VMF_UPDATE is granted', async () => {
    const user = userEvent.setup()
    listQueryResponse = {
      data: {
        data: [
          {
            id: 'vmf-editable',
            name: 'Northwind',
            description: 'Launch planning workspace',
            status: 'ACTIVE',
            lifecycleStatus: 'DRAFT',
            frameworkVersion: '2.2',
            updatedAt: '2026-03-24T21:08:00.000Z',
          },
        ],
        meta: { page: 1, totalPages: 1, total: 1 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    }

    const store = createStore({ canCreate: false, canUpdate: false })

    render(
      <ToasterProvider>
        <Provider store={store}>
          <MemoryRouter initialEntries={['/app/workspaces/vmf']}>
            <Routes>
              <Route path="/app/workspaces/vmf" element={<MaintainVmfs />} />
              <Route path="/app/dashboard" element={<div>Dashboard Route</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      </ToasterProvider>,
    )

    expect(screen.getByText(/review vmf lifecycle/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /actions for northwind/i })).not.toBeInTheDocument()

    await act(async () => {
      store.dispatch(
        setCredentials({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Standard User',
            isActive: true,
            memberships: [{ customerId: 'cust-1', roles: ['USER'] }],
            tenantMemberships: [{ customerId: 'cust-1', tenantId: 'tenant-1', roles: ['USER'] }],
            vmfGrants: [],
            customerScopes: [
              {
                customerId: 'cust-1',
                featureEntitlements: ['VMF'],
                entitlementSource: 'LICENSE_LEVEL',
              },
            ],
          },
          customerScopes: [
            {
              customerId: 'cust-1',
              featureEntitlements: ['VMF'],
              entitlementSource: 'LICENSE_LEVEL',
            },
          ],
          resolvedPermissions: {
            platform: { roleKeys: [], permissions: [] },
            customers: [],
            tenants: [
              {
                customerId: 'cust-1',
                tenantId: 'tenant-1',
                roleKeys: ['USER'],
                permissions: ['VMF_VIEW', 'VMF_UPDATE'],
              },
            ],
          },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/manage vmf lifecycle/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /actions for northwind/i })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByRole('combobox', { name: /actions for northwind/i }), 'Edit')

    const dialog = screen.getByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(/name/i, { selector: 'input#vmf-edit-name' }),
      ' Updated',
    )
    await user.type(
      within(dialog).getByLabelText(/description/i, { selector: 'textarea#vmf-edit-description' }),
      ' - revised',
    )
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateVmfMock).toHaveBeenCalledWith({
        vmfId: 'vmf-editable',
        body: {
          name: 'Northwind Updated',
          description: 'Launch planning workspace - revised',
        },
      })
    })
  })
})
