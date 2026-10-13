import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StructureNavigationGuard } from './StructureNavigationGuard.jsx'
import { beforeAll, afterAll } from 'vitest'

// jsdom's AbortSignal is not accepted by Node 24's native Request.
const NativeRequest = globalThis.Request
beforeAll(() => { globalThis.Request = class extends NativeRequest { constructor(input, init) { super(input, { ...init, signal: undefined }) } } })
afterAll(() => { globalThis.Request = NativeRequest })

describe('Section Context route protection', () => {
  it('retains a draft on view navigation and guards browser Back to another section', async () => {
    const draftRef = { current: { dirty: true, discard: vi.fn() } }
    const router = createMemoryRouter([{ path: '/structure', element: <StructureNavigationGuard draftRef={draftRef} /> }], {
      initialEntries: ['/structure?section=b&revisionId=r', '/structure?section=a&revisionId=r&sectionView=context'], initialIndex: 1,
    })
    render(<RouterProvider router={router} />)
    await act(async () => router.navigate('/structure?sectionView=understanding&revisionId=r&section=a', { replace: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(draftRef.current.discard).not.toHaveBeenCalled()
    await act(async () => router.navigate(-1))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.search).toContain('section=a')
  })
  it('blocks real route navigation until discard, and protects document unload', async () => {
    const draftRef = { current: { dirty: true } }
    draftRef.current.discard = vi.fn(() => { draftRef.current.dirty = false })
    const router = createMemoryRouter([
      { path: '/structure', element: <><StructureNavigationGuard draftRef={draftRef} /><Link to="/hub">Hub</Link></> },
      { path: '/hub', element: <p>Hub destination</p> },
    ], { initialEntries: ['/structure'] })
    render(<RouterProvider router={router} />)
    const unload = new Event('beforeunload', { cancelable: true }); fireEvent(window, unload)
    expect(unload.defaultPrevented).toBe(true)
    await userEvent.click(screen.getByRole('link', { name: 'Hub' }))
    expect(router.state.location.pathname).toBe('/structure')
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(draftRef.current.discard).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('link', { name: 'Hub' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))
    await screen.findByText('Hub destination')
    expect(draftRef.current.discard).toHaveBeenCalledTimes(1)
  })
})
