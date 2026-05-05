import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValidationRegistryListView } from './ValidationRegistryListView.jsx'

const noop = vi.fn()

function renderList(overrides = {}) {
  return render(
    <ValidationRegistryListView
      search=""
      setSearch={noop}
      statusFilter=""
      setStatusFilter={noop}
      frameworkFilter=""
      setFrameworkFilter={noop}
      categoryFilter=""
      setCategoryFilter={noop}
      severityFilter=""
      setSeverityFilter={noop}
      setPage={noop}
      rows={[
        {
          id: 'validation-governance-completeness-with-a-very-long-key',
          key: 'governance-completeness-with-a-very-long-key',
          label: 'Governance Completeness With A Very Long Label',
          supportedFrameworkKeys: ['VMF'],
          category: 'GOVERNANCE',
          severity: 'ERROR',
          status: 'DRAFT',
          componentVersion: 2,
          versionStatus: 'DRAFT',
          isLocked: true,
          updatedAt: '2026-05-05T10:00:00.000Z',
        },
      ]}
      currentPage={1}
      totalPages={1}
      isListLoading={false}
      isListFetching={false}
      frameworks={[{ value: '', label: 'All frameworks' }, { value: 'VMF', label: 'VMF' }]}
      onBackClick={noop}
      onCreateClick={noop}
      onEditClick={noop}
      onCloneClick={noop}
      setValidationStatus={noop}
      isMutating={false}
      {...overrides}
    />,
  )
}

describe('ValidationRegistryListView', () => {
  it('uses tooltip-backed truncation for long validation and token values', () => {
    renderList()

    expect(screen.getByTitle('governance-completeness-with-a-very-long-key')).toBeInTheDocument()
    expect(screen.getByTitle('Governance Completeness With A Very Long Label')).toBeInTheDocument()
    expect(screen.getByTitle('GOVERNANCE')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })
})
