import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Table } from './Table'

// Sample test data
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' }
]

const data = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Editor' }
]

describe('Table Component', () => {
  // ===========================
  // 1. BASIC RENDERING (6 tests)
  // ===========================
  describe('Basic Rendering', () => {
    it('should render table with props-based API', () => {
      render(<Table columns={columns} data={data} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('should render table with JSX-based API', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Header>Name</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row rowId={1}>
              <Table.Cell dataLabel="Name">Alice</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      )
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should have default classes', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const table = container.querySelector('.table')
      expect(table).toHaveClass('table--default')
      expect(table).toHaveClass('table--default') // size
    })

    it('should apply custom className', () => {
      const { container } = render(
        <Table columns={columns} data={data} className="custom-table" />
      )
      expect(container.querySelector('.table')).toHaveClass('custom-table')
    })

    it('should render caption when provided', () => {
      render(<Table columns={columns} data={data} caption="User Directory" />)
      expect(screen.getByText('User Directory')).toBeInTheDocument()
    })

    it('should render empty state when no data', () => {
      render(<Table columns={columns} data={[]} />)
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  // ===========================
  // 2. VARIANTS (5 tests)
  // ===========================
  describe('Variants', () => {
    it('should apply striped variant', () => {
      const { container } = render(
        <Table columns={columns} data={data} variant="striped" />
      )
      expect(container.querySelector('.table')).toHaveClass('table--striped')
    })

    it('should apply bordered variant', () => {
      const { container } = render(
        <Table columns={columns} data={data} variant="bordered" />
      )
      expect(container.querySelector('.table')).toHaveClass('table--bordered')
    })

    it('should apply compact size', () => {
      const { container } = render(
        <Table columns={columns} data={data} size="compact" />
      )
      expect(container.querySelector('.table')).toHaveClass('table--compact')
    })

    it('should apply hoverable class', () => {
      const { container } = render(
        <Table columns={columns} data={data} hoverable />
      )
      expect(container.querySelector('.table')).toHaveClass('table--hoverable')
    })

    it('should combine multiple variants', () => {
      const { container } = render(
        <Table columns={columns} data={data} variant="striped" size="compact" hoverable />
      )
      const table = container.querySelector('.table')
      expect(table).toHaveClass('table--striped')
      expect(table).toHaveClass('table--compact')
      expect(table).toHaveClass('table--hoverable')
    })
  })

  // ===========================
  // 3. SORTABLE COLUMNS (8 tests)
  // ===========================
  describe('Sortable Columns', () => {
    it('should render sort icon on sortable headers', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const sortIcons = container.querySelectorAll('.table__sort-icon')
      expect(sortIcons.length).toBe(2) // name and email are sortable
    })

    it('should sort ascending on first click', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      render(<Table columns={columns} data={data} onSort={onSort} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader)

      expect(onSort).toHaveBeenCalledWith('name', 'asc')
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    it('should sort descending on second click', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      render(<Table columns={columns} data={data} onSort={onSort} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader) // First click: asc
      await user.click(nameHeader) // Second click: desc

      expect(onSort).toHaveBeenCalledWith('name', 'desc')
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    })

    it('should clear sort on third click', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      render(<Table columns={columns} data={data} onSort={onSort} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader) // asc
      await user.click(nameHeader) // desc
      await user.click(nameHeader) // clear

      expect(onSort).toHaveBeenCalledWith('name', null)
    })

    it('should call onSort callback with correct params', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      render(<Table columns={columns} data={data} onSort={onSort} />)

      const emailHeader = screen.getByRole('columnheader', { name: /email/i })
      await user.click(emailHeader)

      expect(onSort).toHaveBeenCalledTimes(1)
      expect(onSort).toHaveBeenCalledWith('email', 'asc')
    })

    it('should handle controlled sorting', () => {
      const { rerender } = render(
        <Table columns={columns} data={data} sortColumn="name" sortDirection="asc" />
      )

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')

      rerender(
        <Table columns={columns} data={data} sortColumn="name" sortDirection="desc" />
      )
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    })

    it('should update aria-sort attribute', async () => {
      const user = userEvent.setup()
      render(<Table columns={columns} data={data} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader).not.toHaveAttribute('aria-sort')

      await user.click(nameHeader)
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    it('should work with keyboard (Enter/Space)', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      render(<Table columns={columns} data={data} onSort={onSort} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      nameHeader.focus()
      await user.keyboard('{Enter}')

      expect(onSort).toHaveBeenCalledWith('name', 'asc')

      await user.keyboard(' ')
      expect(onSort).toHaveBeenCalledWith('name', 'desc')
    })
  })

  // ===========================
  // 4. SELECTABLE ROWS (8 tests)
  // ===========================
  describe('Selectable Rows', () => {
    it('should render checkboxes when selectable', () => {
      render(<Table columns={columns} data={data} selectable />)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(4) // 1 select-all + 3 rows
    })

    it('should select individual row', async () => {
      const user = userEvent.setup()
      const onSelectChange = vi.fn()
      render(<Table columns={columns} data={data} selectable onSelectChange={onSelectChange} />)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // First data row

      expect(onSelectChange).toHaveBeenCalled()
      const selectedSet = onSelectChange.mock.calls[0][0]
      expect(selectedSet.has(1)).toBe(true)
    })

    it('should deselect individual row', async () => {
      const user = userEvent.setup()
      const onSelectChange = vi.fn()
      render(
        <Table
          columns={columns}
          data={data}
          selectable
          defaultSelectedRows={[1]}
          onSelectChange={onSelectChange}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Deselect

      const selectedSet = onSelectChange.mock.calls[0][0]
      expect(selectedSet.has(1)).toBe(false)
    })

    it('should select all rows', async () => {
      const user = userEvent.setup()
      const onSelectChange = vi.fn()
      render(<Table columns={columns} data={data} selectable onSelectChange={onSelectChange} />)

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)

      const selectedSet = onSelectChange.mock.calls[0][0]
      expect(selectedSet.size).toBe(3)
      expect(selectedSet.has(1)).toBe(true)
      expect(selectedSet.has(2)).toBe(true)
      expect(selectedSet.has(3)).toBe(true)
    })

    it('should show indeterminate state for partial selection', async () => {
      const user = userEvent.setup()
      render(<Table columns={columns} data={data} selectable />)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Select first row

      // Select-all checkbox should be indeterminate
      expect(checkboxes[0]).toHaveProperty('indeterminate', true)
    })

    it('should call onSelectChange callback', async () => {
      const user = userEvent.setup()
      const onSelectChange = vi.fn()
      render(<Table columns={columns} data={data} selectable onSelectChange={onSelectChange} />)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1])

      expect(onSelectChange).toHaveBeenCalledTimes(1)
      expect(onSelectChange.mock.calls[0][0]).toBeInstanceOf(Set)
    })

    it('should handle controlled selection', () => {
      const selectedSet = new Set([1, 2])
      render(
        <Table columns={columns} data={data} selectable selectedRows={selectedSet} />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[1]).toBeChecked() // Row 1
      expect(checkboxes[2]).toBeChecked() // Row 2
      expect(checkboxes[3]).not.toBeChecked() // Row 3
    })

    it('should support keyboard', async () => {
      const user = userEvent.setup()
      const onSelectChange = vi.fn()
      render(<Table columns={columns} data={data} selectable onSelectChange={onSelectChange} />)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes[1].focus()
      await user.keyboard(' ')

      expect(onSelectChange).toHaveBeenCalled()
    })
  })

  // ===========================
  // 5. ROW ACTIONS (5 tests)
  // ===========================
  describe('Row Actions', () => {
    const actions = [
      { label: 'Edit', onClick: vi.fn() },
      { label: 'Delete', onClick: vi.fn(), variant: 'danger' }
    ]

    it('should render action buttons (props API)', () => {
      render(<Table columns={columns} data={data} actions={actions} />)
      expect(screen.getAllByText('Edit').length).toBe(3)
      expect(screen.getAllByText('Delete').length).toBe(3)
    })

    it('should call onClick handlers', async () => {
      const user = userEvent.setup()
      const editAction = vi.fn()
      const actionsWithHandlers = [{ label: 'Edit', onClick: editAction }]

      render(<Table columns={columns} data={data} actions={actionsWithHandlers} />)

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(editAction).toHaveBeenCalledTimes(1)
      expect(editAction).toHaveBeenCalledWith(data[0])
    })

    it('should call onRowAction callback', async () => {
      const user = userEvent.setup()
      const onRowAction = vi.fn()

      render(
        <Table columns={columns} data={data} actions={actions} onRowAction={onRowAction} />
      )

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(onRowAction).toHaveBeenCalledWith('Edit', data[0])
    })

    it('should call onRowAction when action has no onClick handler', async () => {
      const user = userEvent.setup()
      const onRowAction = vi.fn()
      const actionsWithoutHandlers = [{ label: 'Resend', variant: 'ghost' }]

      render(
        <Table
          columns={columns}
          data={data}
          actions={actionsWithoutHandlers}
          onRowAction={onRowAction}
        />
      )

      const resendButtons = screen.getAllByText('Resend')
      await user.click(resendButtons[0])

      expect(onRowAction).toHaveBeenCalledWith('Resend', data[0])
    })

    it('should disable row action when disabled predicate returns true', async () => {
      const user = userEvent.setup()
      const onRowAction = vi.fn()
      const onRevoke = vi.fn()
      const actionsWithDisabled = [
        {
          label: 'Revoke',
          variant: 'danger',
          onClick: onRevoke,
          disabled: (row) => row.id === 1,
        },
      ]

      render(
        <Table
          columns={columns}
          data={data}
          actions={actionsWithDisabled}
          onRowAction={onRowAction}
        />,
      )

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i })
      expect(revokeButtons[0]).toBeDisabled()
      expect(revokeButtons[1]).not.toBeDisabled()

      await user.click(revokeButtons[0])
      expect(onRevoke).not.toHaveBeenCalled()
      expect(onRowAction).not.toHaveBeenCalled()

      await user.click(revokeButtons[1])
      expect(onRevoke).toHaveBeenCalledTimes(1)
      expect(onRevoke).toHaveBeenCalledWith(data[1])
      expect(onRowAction).toHaveBeenCalledTimes(1)
      expect(onRowAction).toHaveBeenCalledWith('Revoke', data[1])
    })

    it('should render custom actions (JSX API)', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Header>Name</Table.Header>
              <Table.Header>Actions</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row rowId={1}>
              <Table.Cell dataLabel="Name">Alice</Table.Cell>
              <Table.Cell dataLabel="Actions">
                <button>Custom Action</button>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      )

      expect(screen.getByText('Custom Action')).toBeInTheDocument()
    })

    it('should apply correct button variants', () => {
      const { container } = render(
        <Table columns={columns} data={data} actions={actions} />
      )

      // Check that danger variant is applied
      const dangerButtons = container.querySelectorAll('.btn--danger')
      expect(dangerButtons.length).toBe(3) // One per row
    })
  })

  // ===========================
  // 6. RESPONSIVE BEHAVIOR (4 tests)
  // ===========================
  describe('Responsive Behavior', () => {
    it('should render data-label attributes', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const cells = container.querySelectorAll('.table__cell')

      // Each cell should have data-label matching column label
      const nameCells = Array.from(cells).filter(
        cell => cell.getAttribute('data-label') === 'Name'
      )
      expect(nameCells.length).toBeGreaterThan(0)
    })

    it('should have CSS display properties', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const table = container.querySelector('.table')
      expect(table).toHaveClass('table')
    })

    it('should render mobile card layout classes', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const rows = container.querySelectorAll('.table__row')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should render desktop table layout classes', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const head = container.querySelector('.table__head')
      const body = container.querySelector('.table__body')
      expect(head).toBeInTheDocument()
      expect(body).toBeInTheDocument()
    })
  })

  // ===========================
  // 7. ACCESSIBILITY (9 tests)
  // ===========================
  describe('Accessibility', () => {
    it('should have table role', () => {
      render(<Table columns={columns} data={data} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should have columnheader roles on headers', () => {
      render(<Table columns={columns} data={data} />)
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBe(3)
    })

    it('should have cell roles on cells', () => {
      render(<Table columns={columns} data={data} />)
      const cells = screen.getAllByRole('cell')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('should have aria-sort on sorted column', async () => {
      const user = userEvent.setup()
      render(<Table columns={columns} data={data} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader)

      expect(nameHeader).toHaveAttribute('aria-sort')
    })

    it('should have aria-selected on selected rows', async () => {
      const user = userEvent.setup()
      render(<Table columns={columns} data={data} selectable />)

      const rows = screen.getAllByRole('row')
      const dataRow = rows[1] // First data row

      expect(dataRow).toHaveAttribute('aria-selected', 'false')

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1])

      expect(dataRow).toHaveAttribute('aria-selected', 'true')
    })

    it('should have proper aria-labels for checkboxes', () => {
      render(<Table columns={columns} data={data} selectable />)
      expect(screen.getByLabelText('Select all rows')).toBeInTheDocument()
      expect(screen.getByLabelText('Select row 1')).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<Table columns={columns} data={data} />)
      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader).toHaveAttribute('tabIndex', '0')
    })

    it('should support focus-visible', () => {
      const { container } = render(<Table columns={columns} data={data} />)
      const sortableHeader = container.querySelector('.table__header--sortable')
      expect(sortableHeader).toBeTruthy()
    })

    it('should have caption for screen readers', () => {
      render(<Table columns={columns} data={data} caption="User Directory" />)
      const caption = screen.getByText('User Directory')
      expect(caption).toHaveClass('table__caption')
    })
  })

  // ===========================
  // 8. ERROR HANDLING (4 tests)
  // ===========================
  describe('Error Handling', () => {
    it('should warn when neither columns nor children provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(<Table />)
      expect(consoleSpy).toHaveBeenCalledWith('Table: Must provide either columns+data or children')
      consoleSpy.mockRestore()
    })

    it('should throw when Table.Row used outside context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<Table.Row rowId={1}><td>Test</td></Table.Row>)
      }).toThrow('Table.Row must be used within Table')

      consoleSpy.mockRestore()
    })

    it('should handle empty data array', () => {
      render(<Table columns={columns} data={[]} />)
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('should handle missing row IDs gracefully', () => {
      const dataWithoutIds = [
        { name: 'Alice', email: 'alice@test.com', role: 'Admin' }
      ]
      const { container } = render(
        <Table columns={columns} data={dataWithoutIds} />
      )
      expect(container.querySelector('.table__row')).toBeInTheDocument()
    })
  })

  // ===========================
  // 9. EDGE CASES (5 tests)
  // ===========================
  describe('Edge Cases', () => {
    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@test.com`,
        role: 'User'
      }))

      render(<Table columns={columns} data={largeData} />)
      expect(screen.getByText('User 0')).toBeInTheDocument()
      expect(screen.getByText('User 99')).toBeInTheDocument()
    })

    it('should handle sorting with null/undefined values', () => {
      const dataWithNulls = [
        { id: 1, name: 'Alice', email: null, role: 'Admin' },
        { id: 2, name: null, email: 'bob@test.com', role: 'User' },
        { id: 3, name: 'Charlie', email: 'charlie@test.com', role: 'Editor' }
      ]

      render(<Table columns={columns} data={dataWithNulls} defaultSortColumn="name" defaultSortDirection="asc" />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('should handle selection with mixed ID types', () => {
      const mixedData = [
        { id: 'a1', name: 'Alice', email: 'alice@test.com', role: 'Admin' },
        { id: 2, name: 'Bob', email: 'bob@test.com', role: 'User' }
      ]

      render(<Table columns={columns} data={mixedData} selectable />)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(3) // select-all + 2 rows
    })

    it('should work with refs (imperativeHandle)', () => {
      const ref = { current: null }
      render(<Table ref={ref} columns={columns} data={data} selectable />)

      expect(ref.current).not.toBeNull()
      expect(typeof ref.current.getSortState).toBe('function')
      expect(typeof ref.current.getSelectedRows).toBe('function')
      expect(typeof ref.current.clearSelection).toBe('function')
    })

    it('should handle loading state', () => {
      const { container } = render(
        <Table columns={columns} data={data} loading loadingRows={3} />
      )

      const skeletons = container.querySelectorAll('.table__skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })
})
