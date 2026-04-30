import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerSearchSelect from './CustomerSearchSelect.jsx'

const triggerSearchMock = vi.fn()
let customerSearchState = {
  data: {
    data: [
      {
        id: 'cust-acme',
        name: 'Acme Corp',
        status: 'ACTIVE',
      },
      {
        id: 'cust-beta',
        name: 'Beta Manufacturing',
        status: 'ACTIVE',
      },
    ],
  },
  isFetching: false,
}

vi.mock('../../store/api/customerApi.js', () => ({
  useLazyListCustomersQuery: () => [triggerSearchMock, customerSearchState],
}))

describe('CustomerSearchSelect', () => {
  beforeEach(() => {
    triggerSearchMock.mockClear()
    customerSearchState = {
      data: {
        data: [
          {
            id: 'cust-acme',
            name: 'Acme Corp',
            status: 'ACTIVE',
          },
          {
            id: 'cust-beta',
            name: 'Beta Manufacturing',
            status: 'ACTIVE',
          },
        ],
      },
      isFetching: false,
    }
  })

  it('selects customers from search results', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CustomerSearchSelect
        id="customer-picker"
        selectedIds={[]}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('combobox', { name: /assigned customers/i })
    await user.click(input)
    await user.type(input, 'acme')
    await user.click(screen.getByRole('option', { name: /acme corp/i }))

    expect(onChange).toHaveBeenCalledWith(['cust-acme'])
  })

  it('shows selected customers as removable chips', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CustomerSearchSelect
        id="customer-picker"
        selectedIds={['cust-acme']}
        onChange={onChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /remove acme corp/i }))

    expect(onChange).toHaveBeenCalledWith([])
  })
})
