/**
 * Sidebar Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MdDashboard, MdInsights } from 'react-icons/md'
import { Sidebar } from './Sidebar'

function mockMatchMedia(matches = false) {
  const listeners = new Set()

  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn((eventName, listener) => {
      if (eventName === 'change') listeners.add(listener)
    }),
    removeEventListener: vi.fn((eventName, listener) => {
      if (eventName === 'change') listeners.delete(listener)
    }),
    addListener: vi.fn((listener) => listeners.add(listener)),
    removeListener: vi.fn((listener) => listeners.delete(listener)),
    dispatchEvent: vi.fn(),
  }))
}

function renderSidebar(ui, initialEntries = ['/']) {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {ui}
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockMatchMedia(false)
})

describe('Sidebar Component', () => {
  it('renders with default classes and compound sections', () => {
    const { container } = renderSidebar(
      <Sidebar ariaLabel="Primary sidebar">
        <Sidebar.Header>
          <Sidebar.Brand>StoryLineOS</Sidebar.Brand>
        </Sidebar.Header>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard" icon={<MdDashboard />}>
            Dashboard
          </Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <Sidebar.Toggler />
        </Sidebar.Footer>
      </Sidebar>,
    )

    const root = container.firstChild
    const panel = container.querySelector('.sidebar__panel')

    expect(root).toHaveClass('sidebar')
    expect(root).toHaveClass('sidebar--light')
    expect(root).toHaveClass('sidebar--placement-start')
    expect(root).toHaveClass('sidebar--visible')
    expect(panel).toHaveAttribute('aria-label', 'Primary sidebar')
    expect(screen.getByText('StoryLineOS')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
  })

  it('applies placement, color scheme, unfoldable, and custom class modifiers', () => {
    const { container } = renderSidebar(
      <Sidebar
        colorScheme="dark"
        placement="end"
        unfoldable
        className="custom-sidebar"
      >
        <Sidebar.Nav>
          <Sidebar.Item to="/insights">Insights</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>,
    )

    const root = container.firstChild

    expect(root).toHaveClass('sidebar--dark')
    expect(root).toHaveClass('sidebar--placement-end')
    expect(root).toHaveClass('sidebar--unfoldable')
    expect(root).toHaveClass('custom-sidebar')
  })

  it('toggles narrow mode and calls onNarrowChange from Sidebar.Toggler', async () => {
    const user = userEvent.setup()
    const handleNarrowChange = vi.fn()
    const { container } = renderSidebar(
      <Sidebar defaultNarrow={false} onNarrowChange={handleNarrowChange}>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard">Dashboard</Sidebar.Item>
        </Sidebar.Nav>
        <Sidebar.Footer>
          <Sidebar.Toggler />
        </Sidebar.Footer>
      </Sidebar>,
    )

    const root = container.firstChild
    const toggler = screen.getByRole('button', { name: /collapse sidebar/i })

    expect(root).not.toHaveClass('sidebar--narrow')

    await user.click(toggler)

    expect(root).toHaveClass('sidebar--narrow')
    expect(handleNarrowChange).toHaveBeenCalledWith(true)
  })

  it('closes on backdrop click in mobile overlay mode', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    const { container } = renderSidebar(
      <Sidebar defaultVisible={true}>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard">Dashboard</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>,
    )

    const root = container.firstChild
    const backdrop = container.querySelector('.sidebar__backdrop')

    expect(root).toHaveClass('sidebar--visible')

    await user.click(backdrop)

    expect(root).toHaveClass('sidebar--hidden')
  })

  it('closes on Escape when open', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    const { container } = renderSidebar(
      <Sidebar defaultVisible={true}>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard">Dashboard</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>,
    )

    const root = container.firstChild

    expect(root).toHaveClass('sidebar--visible')

    await user.keyboard('{Escape}')

    expect(root).toHaveClass('sidebar--hidden')
  })

  it('renders internal, external, and action items', async () => {
    const user = userEvent.setup()
    const handleAction = vi.fn()

    renderSidebar(
      <Sidebar>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard" icon={<MdDashboard />}>
            Dashboard
          </Sidebar.Item>
          <Sidebar.Item href="https://example.com" openInNewTab>
            External Docs
          </Sidebar.Item>
          <Sidebar.Item onClick={handleAction}>Run Action</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>,
    )

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /external docs/i })).toHaveAttribute(
      'target',
      '_blank',
    )

    await user.click(screen.getByRole('button', { name: /run action/i }))

    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('marks active links and auto-expands a group containing the current route', () => {
    renderSidebar(
      <Sidebar>
        <Sidebar.Nav>
          <Sidebar.Group label="Analytics" icon={<MdInsights />}>
            <Sidebar.Item to="/reports">Reports</Sidebar.Item>
            <Sidebar.Item to="/insights/overview">Overview</Sidebar.Item>
          </Sidebar.Group>
        </Sidebar.Nav>
      </Sidebar>,
      ['/insights/overview'],
    )

    const groupToggle = screen.getByRole('button', { name: /analytics/i })
    const activeLink = screen.getByRole('link', { name: /overview/i })

    expect(groupToggle).toHaveAttribute('aria-expanded', 'true')
    expect(activeLink.className).toMatch(/sidebar__item--active/)
  })

  it('closes the mobile sidebar when a nav item is selected', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    const { container } = renderSidebar(
      <Sidebar defaultVisible={true}>
        <Sidebar.Nav>
          <Sidebar.Item to="/dashboard">Dashboard</Sidebar.Item>
        </Sidebar.Nav>
      </Sidebar>,
    )

    const root = container.firstChild

    await user.click(screen.getByRole('link', { name: /dashboard/i }))

    expect(root).toHaveClass('sidebar--hidden')
  })

  it('throws when Sidebar.Toggler is rendered outside Sidebar', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      expect(() => renderSidebar(<Sidebar.Toggler />)).toThrow(
        'Sidebar.Toggler must be used within Sidebar',
      )
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
