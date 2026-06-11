import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmationDialog } from './ConfirmationDialog'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.open = false
  })
})

describe('ConfirmationDialog', () => {
  it('renders reusable confirmation copy and actions', () => {
    render(
      <ConfirmationDialog
        open
        title="Confirm Publish"
        eyebrow="Governed runtime action"
        message="Confirm Publish?"
        detail="Runtime: First Rendere"
        confirmLabel="Publish"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Confirm Publish' })).toBeInTheDocument()
    expect(screen.getByText('Governed runtime action')).toBeInTheDocument()
    expect(screen.getByText('Confirm Publish?')).toBeInTheDocument()
    expect(screen.getByText('Runtime: First Rendere')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('calls cancel and confirm handlers from the dialog buttons', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmationDialog
        open
        title="Confirm Lock Runtime"
        message="Confirm Lock Runtime?"
        confirmLabel="Lock Runtime"
        variant="warning"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Lock Runtime' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('locks controls while loading', () => {
    render(
      <ConfirmationDialog
        open
        title="Confirm Archive"
        message="Confirm Archive?"
        confirmLabel="Archive"
        variant="danger"
        loading
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument()
  })
})
