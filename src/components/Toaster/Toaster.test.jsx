/**
 * Toaster Component Tests
 *
 * Covers:
 * - Rendering within provider
 * - Adding toasts via hook
 * - Auto dismiss timing
 * - Manual dismissal
 * - Max toast cap
 * - Hook usage guard
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToasterProvider, useToaster } from './Toaster'

function TestHarness({ duration = 1000 }) {
  const { addToast } = useToaster()

  return (
    <button
      type="button"
      onClick={() => addToast({ title: 'Saved', description: 'Profile updated', variant: 'success', duration })}
    >
      Add Toast
    </button>
  )
}

function renderWithToaster(ui, props) {
  return render(<ToasterProvider {...props}>{ui}</ToasterProvider>)
}

describe('Toaster', () => {
  it('renders and adds a toast on action', async () => {
    const user = userEvent.setup()
    renderWithToaster(<TestHarness />)

    await user.click(screen.getByRole('button', { name: 'Add Toast' }))

    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Profile updated')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('auto dismisses after duration', async () => {
    vi.useFakeTimers()
    try {
      renderWithToaster(<TestHarness duration={500} />)

      fireEvent.click(screen.getByRole('button', { name: 'Add Toast' }))
      expect(screen.getByText('Saved')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })
      expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows manual dismissal', async () => {
    const user = userEvent.setup()
    renderWithToaster(<TestHarness />)

    await user.click(screen.getByRole('button', { name: 'Add Toast' }))
    const closeButton = screen.getByRole('button', { name: /dismiss notification/i })

    await user.click(closeButton)
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('caps toasts at max limit', async () => {
    const user = userEvent.setup()
    renderWithToaster(<TestHarness />, { max: 2 })

    const add = screen.getByRole('button', { name: 'Add Toast' })
    await user.click(add)
    await user.click(add)
    await user.click(add)

    const titles = screen.getAllByText('Saved')
    expect(titles).toHaveLength(2)
  })

  it('throws if hook used outside provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestHarness />)).toThrow(/ToasterProvider/)
    errorSpy.mockRestore()
  })
})
