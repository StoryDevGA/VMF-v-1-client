import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageContent, PageHeader, PageShell } from './PageShell'

describe('PageShell', () => {
  it('renders a page shell without creating a main landmark', () => {
    render(
      <PageShell aria-label="Admin page">
        <PageHeader title="Agents" subtitle="Manage runtime agents." />
      </PageShell>,
    )

    expect(screen.getByRole('region', { name: 'Admin page' })).toHaveClass('page-shell')
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Agents', level: 1 })).toHaveClass('page-header__title')
    expect(screen.getByText('Manage runtime agents.')).toHaveClass('page-header__subtitle')
  })

  it('supports embedded heading levels, actions, and content elements', () => {
    render(
      <PageShell>
        <PageHeader
          title="Customer Users"
          subtitle="Review customer users."
          titleAs="h2"
          actions={<button type="button">Create</button>}
        />
        <PageContent as="section" aria-label="Customer catalogue">Rows</PageContent>
      </PageShell>,
    )

    expect(screen.getByRole('heading', { name: 'Customer Users', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Customer catalogue' })).toHaveClass('page-content')
  })
})
