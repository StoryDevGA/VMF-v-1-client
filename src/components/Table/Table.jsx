/**
 * Table Component
 *
 * A professional, responsive table component for displaying tabular data
 *
 * Features:
 * - Responsive design: columns collapse into cards on mobile (<768px)
 * - Sortable columns with visual indicators
 * - Selectable rows with checkboxes
 * - Row actions (edit, delete, custom buttons)
 * - Multiple variants (default, striped, bordered)
 * - Compact and hoverable modes
 * - Hybrid API: JSX compound components OR props-based
 * - Full accessibility support (ARIA, keyboard navigation)
 *
 * @param {Object} props - Component props
 * @param {Array<{key: string, label: string, sortable?: boolean, width?: string, align?: string, render?: function}>} [props.columns] - Column definitions (props-based API)
 * @param {Array<Object>} [props.data] - Row data (props-based API)
 * @param {ReactNode} [props.children] - JSX content (JSX-based API)
 * @param {'default'|'striped'|'bordered'} [props.variant='default'] - Visual variant
 * @param {'default'|'compact'} [props.size='default'] - Table size
 * @param {boolean} [props.hoverable=false] - Enable hover effect on rows
 * @param {boolean} [props.selectable=false] - Enable row selection
 * @param {string} [props.sortColumn] - Controlled: current sort column
 * @param {'asc'|'desc'|null} [props.sortDirection] - Controlled: current sort direction
 * @param {string} [props.defaultSortColumn=null] - Uncontrolled: initial sort column
 * @param {'asc'|'desc'} [props.defaultSortDirection=null] - Uncontrolled: initial sort direction
 * @param {Function} [props.onSort] - Callback when sort changes: (column, direction) => void
 * @param {Set<string|number>} [props.selectedRows] - Controlled: selected row IDs
 * @param {Array<string|number>} [props.defaultSelectedRows=[]] - Uncontrolled: initial selected rows
 * @param {Function} [props.onSelectChange] - Callback when selection changes: (Set<id>) => void
 * @param {Array<{label: string, onClick: function, icon?: ReactNode, variant?: string}>} [props.actions] - Action buttons (props API only)
 * @param {Function} [props.onRowAction] - Callback when action clicked: (label, row) => void
 * @param {string} [props.emptyMessage='No data available'] - Message when data is empty
 * @param {ReactNode} [props.emptyComponent] - Custom empty state component
 * @param {boolean} [props.loading=false] - Show loading skeleton
 * @param {number} [props.loadingRows=5] - Number of skeleton rows
 * @param {string} [props.ariaLabel] - Accessible label for table
 * @param {string} [props.caption] - Table caption for screen readers
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Table component
 *
 * @example
 * // Props-based API
 * <Table
 *   columns={[{ key: 'name', label: 'Name', sortable: true }]}
 *   data={[{ id: 1, name: 'John' }]}
 *   selectable
 *   variant="striped"
 * />
 *
 * @example
 * // JSX-based API
 * <Table variant="striped" selectable>
 *   <Table.Head>
 *     <Table.Row>
 *       <Table.Header sortable sortKey="name">Name</Table.Header>
 *     </Table.Row>
 *   </Table.Head>
 *   <Table.Body>
 *     <Table.Row rowId={1}>
 *       <Table.Cell dataLabel="Name">John</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 */

import { useState, useCallback, useMemo, createContext, useContext, forwardRef, useImperativeHandle, Children } from 'react'
import { Tickbox } from '../Tickbox/Tickbox'
import { Button } from '../Button/Button'
import './Table.css'

// Context for sharing state between Table and sub-components
const TableContext = createContext(null)

export const Table = forwardRef(function Table({
  // Props-based API
  columns,
  data,

  // Visual variants
  variant = 'default',
  size = 'default',
  hoverable = false,

  // Features
  selectable = false,

  // Sorting (uncontrolled by default, controllable)
  sortColumn,
  sortDirection,
  defaultSortColumn = null,
  defaultSortDirection = null,
  onSort,

  // Selection (uncontrolled by default, controllable)
  selectedRows,
  defaultSelectedRows = [],
  onSelectChange,

  // Row actions (props-based API only)
  actions,
  onRowAction,

  // Empty/loading states
  emptyMessage = 'No data available',
  emptyComponent,
  loading = false,
  loadingRows = 5,

  // Accessibility
  ariaLabel,
  caption,

  // Standard props
  className = '',
  children,
  ...props
}, ref) {
  // Internal state (uncontrolled)
  const [sortCol, setSortCol] = useState(defaultSortColumn)
  const [sortDir, setSortDir] = useState(defaultSortDirection)
  const [selected, setSelected] = useState(new Set(defaultSelectedRows))

  // Use controlled props if provided, otherwise internal state
  const currentSortColumn = sortColumn ?? sortCol
  const currentSortDirection = sortDirection ?? sortDir
  const currentSelectedRows = selectedRows ?? selected

  // API detection
  const isPropsAPI = columns != null && data != null
  const isJSXAPI = children != null && !isPropsAPI

  // Handle sorting
  const handleSort = useCallback((columnKey) => {
    let newDirection

    if (currentSortColumn === columnKey) {
      // Same column: cycle through asc -> desc -> null
      if (currentSortDirection === 'asc') {
        newDirection = 'desc'
      } else if (currentSortDirection === 'desc') {
        newDirection = null
        if (!sortColumn) setSortCol(null)
      } else {
        newDirection = 'asc'
      }
    } else {
      // Different column: start with ascending
      newDirection = 'asc'
      if (!sortColumn) setSortCol(columnKey)
    }

    if (!sortDirection) setSortDir(newDirection)
    onSort?.(columnKey, newDirection)
  }, [currentSortColumn, currentSortDirection, onSort, sortColumn, sortDirection])

  // Handle row selection
  const handleSelectRow = useCallback((rowId) => {
    if (!selectedRows) {
      setSelected(prev => {
        const newSet = new Set(prev)
        if (newSet.has(rowId)) {
          newSet.delete(rowId)
        } else {
          newSet.add(rowId)
        }
        onSelectChange?.(newSet)
        return newSet
      })
    } else {
      const newSet = new Set(currentSelectedRows)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      onSelectChange?.(newSet)
    }
  }, [currentSelectedRows, selectedRows, onSelectChange])

  // Calculate selection state
  const totalRows = isPropsAPI ? data.length : 0 // For JSX API, we can't easily count
  const selectedCount = currentSelectedRows.size
  const isAllSelected = totalRows > 0 && selectedCount === totalRows
  const isIndeterminate = selectedCount > 0 && selectedCount < totalRows

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      if (!selectedRows) {
        setSelected(new Set())
        onSelectChange?.(new Set())
      } else {
        onSelectChange?.(new Set())
      }
    } else {
      const allIds = new Set(data.map((row, idx) => row.id ?? idx))
      if (!selectedRows) {
        setSelected(allIds)
        onSelectChange?.(allIds)
      } else {
        onSelectChange?.(allIds)
      }
    }
  }, [isAllSelected, data, selectedRows, onSelectChange])

  // Sort data (for props-based API only)
  const sortedData = useMemo(() => {
    if (!isPropsAPI || !currentSortColumn || !currentSortDirection) return data

    return [...data].sort((a, b) => {
      const aVal = a[currentSortColumn]
      const bVal = b[currentSortColumn]

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Compare values
      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else {
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }

      return currentSortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, currentSortColumn, currentSortDirection, isPropsAPI])

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    getSortState: () => ({ column: currentSortColumn, direction: currentSortDirection }),
    setSortState: (col, dir) => { setSortCol(col); setSortDir(dir) },
    getSelectedRows: () => Array.from(currentSelectedRows),
    setSelectedRows: (ids) => setSelected(new Set(ids)),
    clearSelection: () => setSelected(new Set()),
    selectAll: () => handleSelectAll()
  }), [currentSortColumn, currentSortDirection, currentSelectedRows, handleSelectAll])

  // Context value
  const contextValue = {
    sortColumn: currentSortColumn,
    sortDirection: currentSortDirection,
    handleSort,
    selectedRows: currentSelectedRows,
    handleSelectRow,
    handleSelectAll,
    isAllSelected,
    isIndeterminate,
    selectable,
    variant,
    hoverable
  }

  // Calculate colspan for empty state
  const calculateColSpan = () => {
    let count = columns.length
    if (selectable) count++
    if (actions) count++
    return count
  }

  // Render sort icon SVG
  const renderSortIcon = (isSorted, sortDir) => {
    if (isSorted) {
      return (
        <svg className="table__sort-icon table__sort-icon--active" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          {sortDir === 'asc' ? (
            <path d="M8 4l4 5H4z" fill="currentColor" />
          ) : (
            <path d="M8 12l-4-5h8z" fill="currentColor" />
          )}
        </svg>
      )
    }

    return (
      <svg className="table__sort-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2l3 4H5zM8 14l-3-4h6z" fill="currentColor" opacity="0.3" />
      </svg>
    )
  }

  // Render skeleton rows for loading state
  const renderSkeletonRows = (count) => {
    return Array.from({ length: count }, (_, idx) => (
      <tr key={`skeleton-${idx}`} className="table__row table__row--loading">
        {selectable && <td className="table__cell table__cell--checkbox"><div className="table__skeleton" /></td>}
        {columns.map(col => (
          <td key={col.key} className="table__cell" data-label={col.label}>
            <div className="table__skeleton" />
          </td>
        ))}
        {actions && <td className="table__cell table__cell--actions" data-label="Actions"><div className="table__skeleton" /></td>}
      </tr>
    ))
  }

  // Keyboard handler for sortable headers
  const handleHeaderKeyDown = (columnKey) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(columnKey)
    }
  }

  // Get row classes
  const getRowClasses = (rowId) => {
    const classes = ['table__row']
    if (currentSelectedRows.has(rowId)) classes.push('table__row--selected')
    return classes.join(' ')
  }

  // Get header classes
  const getHeaderClasses = (col) => {
    const classes = ['table__header']
    if (col.sortable) classes.push('table__header--sortable')
    if (currentSortColumn === col.key) {
      classes.push(`table__header--sorted-${currentSortDirection}`)
    }
    return classes.join(' ')
  }

  // Render props-based table
  const renderPropsBasedTable = () => {
    return (
      <table className={tableClasses} role="table" aria-label={ariaLabel} {...props}>
        {caption && <caption className="table__caption">{caption}</caption>}

        <thead className="table__head">
          <tr className="table__row">
            {selectable && (
              <th className="table__header table__header--checkbox">
                <Tickbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={getHeaderClasses(col)}
                style={{ width: col.width, textAlign: col.align }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                onKeyDown={col.sortable ? handleHeaderKeyDown(col.key) : undefined}
                role="columnheader"
                aria-sort={currentSortColumn === col.key ? (currentSortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                tabIndex={col.sortable ? 0 : undefined}
              >
                <span className="table__header-content">
                  {col.label}
                  {col.sortable && renderSortIcon(currentSortColumn === col.key, currentSortDirection)}
                </span>
              </th>
            ))}
            {actions && <th className="table__header">Actions</th>}
          </tr>
        </thead>

        <tbody className="table__body">
          {loading ? (
            renderSkeletonRows(loadingRows)
          ) : sortedData.length === 0 ? (
            <tr className="table__row table__row--empty">
              <td colSpan={calculateColSpan()} className="table__cell table__cell--empty">
                {emptyComponent || <p className="table__empty-message">{emptyMessage}</p>}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => {
              const rowId = row.id ?? index
              return (
                <tr
                  key={rowId}
                  className={getRowClasses(rowId)}
                  role="row"
                  aria-selected={selectable ? currentSelectedRows.has(rowId) : undefined}
                >
                  {selectable && (
                    <td className="table__cell table__cell--checkbox" data-label="">
                      <Tickbox
                        checked={currentSelectedRows.has(rowId)}
                        onChange={() => handleSelectRow(rowId)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="table__cell"
                      data-label={col.label}
                      style={{ textAlign: col.align }}
                      role="cell"
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="table__cell table__cell--actions" data-label="Actions">
                      <div className="table__actions">
                        {actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.variant || 'ghost'}
                            size="sm"
                            onClick={() => {
                              action.onClick(row)
                              onRowAction?.(action.label, row)
                            }}
                            leftIcon={action.icon}
                            aria-label={`${action.label} ${row.name || row.id || ''}`}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    )
  }

  // Render JSX-based table
  const renderJSXBasedTable = () => {
    return (
      <table className={tableClasses} role="table" aria-label={ariaLabel} {...props}>
        {caption && <caption className="table__caption">{caption}</caption>}
        {children}
      </table>
    )
  }

  // Build table classes
  const tableClasses = [
    'table',
    `table--${variant}`,
    `table--${size}`,
    hoverable && 'table--hoverable',
    className
  ].filter(Boolean).join(' ')

  // Render based on API type
  if (!isPropsAPI && !isJSXAPI) {
    console.warn('Table: Must provide either columns+data or children')
    return null
  }

  return (
    <TableContext.Provider value={contextValue}>
      {isPropsAPI ? renderPropsBasedTable() : renderJSXBasedTable()}
    </TableContext.Provider>
  )
})

Table.displayName = 'Table'

// Table.Head - Container for header row
Table.Head = function TableHead({ children, className = '', ...props }) {
  return (
    <thead className={`table__head ${className}`} {...props}>
      {children}
    </thead>
  )
}

Table.Head.displayName = 'Table.Head'

// Table.Body - Container for data rows
Table.Body = function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`table__body ${className}`} {...props}>
      {children}
    </tbody>
  )
}

Table.Body.displayName = 'Table.Body'

// Table.Row - Table row with selection support
Table.Row = function TableRow({ children, rowId, selected, className = '', ...props }) {
  const context = useContext(TableContext)
  if (!context) {
    throw new Error('Table.Row must be used within Table')
  }

  const { selectedRows, selectable } = context
  const isSelected = selected ?? (rowId ? selectedRows.has(rowId) : false)

  const rowClasses = [
    'table__row',
    isSelected && 'table__row--selected',
    className
  ].filter(Boolean).join(' ')

  return (
    <tr
      className={rowClasses}
      role="row"
      aria-selected={selectable ? isSelected : undefined}
      {...props}
    >
      {children}
    </tr>
  )
}

Table.Row.displayName = 'Table.Row'

// Table.Header - Sortable header cell
Table.Header = function TableHeader({
  children,
  sortable = false,
  sortKey,
  width,
  align = 'left',
  className = '',
  ...props
}) {
  const context = useContext(TableContext)
  if (!context) {
    throw new Error('Table.Header must be used within Table')
  }

  const { sortColumn, sortDirection, handleSort } = context
  const isSorted = sortKey && sortColumn === sortKey

  const headerClasses = [
    'table__header',
    sortable && 'table__header--sortable',
    isSorted && `table__header--sorted-${sortDirection}`,
    className
  ].filter(Boolean).join(' ')

  const handleClick = () => {
    if (sortable && sortKey) {
      handleSort(sortKey)
    }
  }

  const handleKeyDown = (e) => {
    if (sortable && sortKey && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleSort(sortKey)
    }
  }

  // Render sort icon
  const renderIcon = () => {
    if (!sortable) return null

    if (isSorted) {
      return (
        <svg className="table__sort-icon table__sort-icon--active" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          {sortDirection === 'asc' ? (
            <path d="M8 4l4 5H4z" fill="currentColor" />
          ) : (
            <path d="M8 12l-4-5h8z" fill="currentColor" />
          )}
        </svg>
      )
    }

    return (
      <svg className="table__sort-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2l3 4H5zM8 14l-3-4h6z" fill="currentColor" opacity="0.3" />
      </svg>
    )
  }

  return (
    <th
      className={headerClasses}
      style={{ width, textAlign: align }}
      onClick={sortable ? handleClick : undefined}
      onKeyDown={sortable ? handleKeyDown : undefined}
      role="columnheader"
      aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
      tabIndex={sortable ? 0 : undefined}
      {...props}
    >
      <span className="table__header-content">
        {children}
        {renderIcon()}
      </span>
    </th>
  )
}

Table.Header.displayName = 'Table.Header'

// Table.Cell - Table cell with data-label for mobile responsiveness
Table.Cell = function TableCell({
  children,
  dataLabel,
  align = 'left',
  className = '',
  ...props
}) {
  return (
    <td
      className={`table__cell ${className}`}
      data-label={dataLabel}
      style={{ textAlign: align }}
      role="cell"
      {...props}
    >
      {children}
    </td>
  )
}

Table.Cell.displayName = 'Table.Cell'

// Table.SelectAllHeader - Helper for select-all checkbox
Table.SelectAllHeader = function TableSelectAllHeader() {
  const context = useContext(TableContext)
  if (!context) {
    throw new Error('Table.SelectAllHeader must be used within Table')
  }

  const { isAllSelected, isIndeterminate, handleSelectAll } = context

  return (
    <th className="table__header table__header--checkbox">
      <Tickbox
        checked={isAllSelected}
        indeterminate={isIndeterminate}
        onChange={handleSelectAll}
        aria-label="Select all rows"
      />
    </th>
  )
}

Table.SelectAllHeader.displayName = 'Table.SelectAllHeader'

// Table.CheckboxCell - Helper for row selection checkbox
Table.CheckboxCell = function TableCheckboxCell({ rowId }) {
  const context = useContext(TableContext)
  if (!context) {
    throw new Error('Table.CheckboxCell must be used within Table')
  }

  const { selectedRows, handleSelectRow } = context

  return (
    <td className="table__cell table__cell--checkbox" data-label="">
      <Tickbox
        checked={selectedRows.has(rowId)}
        onChange={() => handleSelectRow(rowId)}
        aria-label={`Select row ${rowId}`}
      />
    </td>
  )
}

Table.CheckboxCell.displayName = 'Table.CheckboxCell'

export default Table
