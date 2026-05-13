import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuperAdminFrameworkPackageEditor from '../SuperAdminFrameworkPackageEditor'
import SuperAdminFrameworkPackages from './SuperAdminFrameworkPackages'
import {
  renderRuntimeControlPage,
  setupRuntimeControlTestEnvironment,
} from '../../test/runtimeControlPageTestUtils.jsx'
import { __mutateRuntimeControlApiStateForTests } from '../../store/api/runtimeControlApi.js'

function renderPage() {
  return renderRuntimeControlPage({
    route: '/super-admin/runtime-control/framework-packages',
    routes: [
      {
        path: '/super-admin/runtime-control/framework-packages',
        element: <SuperAdminFrameworkPackages />,
      },
      {
        path: '/super-admin/runtime-control/framework-packages/new',
        element: <SuperAdminFrameworkPackageEditor />,
      },
      {
        path: '/super-admin/runtime-control/framework-packages/:packageId/edit',
        element: <SuperAdminFrameworkPackageEditor />,
      },
    ],
  })
}

function addFrameworkPackagePaginationFixtures() {
  __mutateRuntimeControlApiStateForTests((state) => ({
    ...state,
    frameworkPackages: [
      ...state.frameworkPackages,
      ...Array.from({ length: 15 }, (_, index) => ({
        ...state.frameworkPackages[0],
        id: `pkg-pagination-${index + 1}`,
        frameworkKey: 'VMF',
        version: `9.${index}.0`,
        packageKey: `pagination-package-${index + 1}`,
        packageName: `Pagination Package ${index + 1}`,
        description: 'Pagination coverage fixture.',
        status: 'DRAFT',
        isDefault: false,
        updatedAt: `2026-04-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      })),
    ],
  }))
}

describe('SuperAdminFrameworkPackages page', () => {
  beforeEach(() => {
    setupRuntimeControlTestEnvironment()
  })

  it('renders the catalogue-first page and navigates to the package editor', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: /framework packages/i })).toBeInTheDocument()
    expect(screen.getByText(/validated packages can be activated/i)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /framework packages/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByRole('heading', { name: /create framework package/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create framework package/i })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-editor-framework-name',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^framework identity$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^access$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^sections$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^runtime$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^validation$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^workflows$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^outputs$/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/default agent ids/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/required skill ids/i)).not.toBeInTheDocument()
  })

  it('creates a framework package from the editor and shows it in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.clear(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-editor-framework-name',
      }),
    )
    await user.type(
      screen.getByLabelText(/^framework name$/i, {
        selector: 'input#framework-package-editor-framework-name',
      }),
      'Value Management Framework',
    )
    await user.type(
      screen.getByLabelText(/^version$/i, {
        selector: 'input#framework-package-editor-version',
      }),
      '2.5.0',
    )
    await user.click(screen.getByRole('tab', { name: /^sections$/i }))
    await user.click(screen.getByRole('button', { name: /add section/i }))
    const runtimePathInput = screen.getByRole('combobox', { name: /runtime path/i })
    await user.click(runtimePathInput)
    await user.type(runtimePathInput, 'customer')
    await user.click(await screen.findByRole('option', {
      name: /framework_state\.sections\.customer_problem/i,
    }))
    await waitFor(() => {
      expect(screen.getByLabelText(/^section key$/i)).toHaveValue('customer_problem')
    })
    await user.click(screen.getByRole('button', { name: /save section/i }))
    await user.click(screen.getByRole('tab', { name: /^outputs$/i }))
    await user.click(screen.getByRole('checkbox', { name: /full report/i }))
    await user.click(screen.getByRole('checkbox', { name: /executive summary/i }))

    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    await waitFor(() => {
      expect(screen.getByText('2.5.0')).toBeInTheDocument()
      expect(screen.getAllByText('Value Management Framework').length).toBeGreaterThan(0)
    })
  })

  it('requires assigned customers for selected-customer package access', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /^create$/i }))
    await user.type(
      screen.getByLabelText(/^version$/i, {
        selector: 'input#framework-package-editor-version',
      }),
      '2.6.0',
    )
    await user.click(screen.getByRole('tab', { name: /^access$/i }))
    expect(
      screen.getByLabelText(/^customer access$/i, {
        selector: 'select#framework-package-editor-customer-access-mode',
      }),
    ).toBeDisabled()
    await user.selectOptions(
      screen.getByLabelText(/^visibility$/i, {
        selector: 'select#framework-package-editor-visibility',
      }),
      'CUSTOMER_VISIBLE',
    )
    expect(
      screen.getByLabelText(/^customer access$/i, {
        selector: 'select#framework-package-editor-customer-access-mode',
      }),
    ).not.toBeDisabled()
    await user.selectOptions(
      screen.getByLabelText(/^customer access$/i, {
        selector: 'select#framework-package-editor-customer-access-mode',
      }),
      'SELECTED_CUSTOMERS',
    )
    await user.click(screen.getByRole('button', { name: /create framework package/i }))

    expect(await screen.findByText(/assigned customers are required/i)).toBeInTheDocument()
  })

  it('supports search filters and pagination for the framework packages catalogue', async () => {
    const user = userEvent.setup()
    addFrameworkPackagePaginationFixtures()
    renderPage()

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^last$/i }))
    expect(await screen.findByText(/page 3 of 3/i)).toBeInTheDocument()

    await user.selectOptions(
      screen.getByLabelText(/^framework$/i, {
        selector: 'select#framework-package-framework-filter',
      }),
      'RLD',
    )

    await waitFor(() => {
      expect(screen.queryByText('2.3.1')).not.toBeInTheDocument()
      expect(screen.getByText('1.1.0')).toBeInTheDocument()
      expect(screen.getByText('1.2.0')).toBeInTheDocument()
    })

    await user.type(
      screen.getByLabelText(/^search$/i, {
        selector: 'input#framework-package-search',
      }),
      '1.2.0',
    )

    await waitFor(() => {
      expect(screen.getByText('1.2.0')).toBeInTheDocument()
      expect(screen.queryByText('1.1.0')).not.toBeInTheDocument()
    })
  })

  it('opens the edit flow from row actions and saves changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf 2.4.0/i),
      'Edit',
    )

    expect(await screen.findByRole('heading', { name: /framework package editor/i })).toBeInTheDocument()
    const editNameInput = await screen.findByLabelText(/^framework name$/i, {
      selector: 'input#framework-package-editor-framework-name',
    })
    await user.clear(editNameInput)
    await user.type(editNameInput, 'VMF Control Plane')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('VMF Control Plane')).toBeInTheDocument()
    })
  })

  it('activates a validated package and updates the default status in the catalogue', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(
      await screen.findByLabelText(/actions for vmf 2.3.0/i),
      'Activate',
    )

    await waitFor(() => {
      const activatedRow = screen.getByText('2.3.0').closest('tr')
      const previousDefaultRow = screen.getByText('2.3.1').closest('tr')
      expect(activatedRow).not.toBeNull()
      expect(previousDefaultRow).not.toBeNull()
      expect(within(activatedRow).getByText(/active/i)).toBeInTheDocument()
      expect(within(activatedRow).getByText(/default/i)).toBeInTheDocument()
      expect(within(previousDefaultRow).getByText(/validated/i)).toBeInTheDocument()
    })
  })
})
