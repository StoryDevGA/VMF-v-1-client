import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditCustomerDialog } from './EditCustomerDialog.jsx'

const baseProps = {
  open: true,
  onClose: vi.fn(),
  form: {
    name: 'Acme',
    website: '',
    topology: 'SINGLE_TENANT',
    licenseLevelId: 'lic-inactive',
    maxTenants: '1',
    maxVmfsPerTenant: '1',
    billingCycle: 'MONTHLY',
    planCode: 'FREE',
    creditBalances: { websiteAnalysis: 3, documentImprovement: 1 },
  },
  setForm: vi.fn(),
  errors: {},
  licenseLevels: [
    { id: 'lic-inactive', name: 'Legacy Signal', isActive: false, homeExperience: 'SIGNAL' },
    { id: 'lic-core', name: 'Core', isActive: true, homeExperience: 'CORE' },
    { id: 'lic-retired', name: 'Retired Tier', isActive: false, homeExperience: 'CORE' },
  ],
  isLoadingLicenseLevels: false,
  licenseLevelsError: null,
  onSubmit: vi.fn(),
  isSubmitting: false,
  isFetchingDetails: false,
  detailsError: null,
  creditAdjustment: { productKey: 'WEBSITE', delta: '', reason: '' },
  setCreditAdjustment: vi.fn(),
  creditErrors: {},
  onAdjustCredit: vi.fn(),
  isAdjustingCredit: false,
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

describe('EditCustomerDialog licence and credit boundaries', () => {
  it('keeps an assigned inactive licence selectable and labels it clearly', () => {
    render(<EditCustomerDialog {...baseProps} />)

    expect(screen.getByRole('option', { name: 'Legacy Signal (inactive)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Clear licence' })).toBeInTheDocument()
  })

  it('does not offer inactive levels that are not the assigned one', () => {
    render(<EditCustomerDialog {...baseProps} />)

    expect(screen.queryByRole('option', { name: /Retired Tier/ })).not.toBeInTheDocument()
  })

  it('shows credit controls only for a Signal licence', () => {
    const { rerender } = render(<EditCustomerDialog {...baseProps} />)
    expect(screen.getByRole('group', { name: /signal credit balances/i })).toBeInTheDocument()

    rerender(
      <EditCustomerDialog
        {...baseProps}
        form={{ ...baseProps.form, licenseLevelId: 'lic-core' }}
      />,
    )

    expect(screen.queryByRole('group', { name: /signal credit balances/i })).not.toBeInTheDocument()
  })

  it('surfaces licence catalogue errors as an alert', () => {
    render(<EditCustomerDialog {...baseProps} licenseLevelsError={{ message: 'Catalogue unavailable.' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Catalogue unavailable.')
  })
})
