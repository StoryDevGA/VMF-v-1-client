import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RegistryListView } from './RegistryListView'

describe('RegistryListView', () => {
  it('renders the shared registry shell and paginates through the supplied setter', async () => {
    const setPage = vi.fn()

    render(
      <RegistryListView
        block="test-registry"
        legend="Test registry catalogue"
        actions={<button type="button">Create</button>}
        filters={<label htmlFor="search">Search<input id="search" /></label>}
        tableNote="Server-derived registry data."
        table={{
          columns: [{ key: 'name', label: 'Name' }],
          data: [{ id: 'one', name: 'One' }],
          emptyMessage: 'No rows found.',
          ariaLabel: 'Test registry',
        }}
        pagination={{ currentPage: 1, totalPages: 2, setPage, ariaLabel: 'Test pagination' }}
      />,
    )

    expect(screen.getByText('Test registry catalogue')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Test registry' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Test pagination' })).toBeInTheDocument()

    screen.getByRole('button', { name: 'Next' }).click()
    expect(setPage).toHaveBeenCalledWith(expect.any(Function))
  })

  it('fails closed to loading and alert states supplied by the caller', () => {
    render(
      <RegistryListView
        block="test-registry"
        legend="Test registry catalogue"
        error={{ message: 'Unable to load registry.' }}
        status={{ isLoading: false, isFetching: true, refreshMessage: 'Refreshing registry...' }}
        table={{
          columns: [{ key: 'name', label: 'Name' }],
          data: [],
          emptyMessage: 'No rows found.',
          ariaLabel: 'Test registry',
        }}
        pagination={{ currentPage: 1, totalPages: 1, setPage: vi.fn() }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load registry.')
    expect(screen.getByText('Refreshing registry...')).toBeInTheDocument()
  })
})
