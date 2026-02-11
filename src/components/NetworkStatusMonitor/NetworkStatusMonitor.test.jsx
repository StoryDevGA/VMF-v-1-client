import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { NetworkStatusMonitor } from './NetworkStatusMonitor'

const addToastMock = vi.fn()

vi.mock('../Toaster', () => ({
  useToaster: () => ({
    addToast: addToastMock,
  }),
}))

describe('NetworkStatusMonitor', () => {
  beforeEach(() => addToastMock.mockClear())

  it('renders no DOM output', () => {
    const { container } = render(<NetworkStatusMonitor />)
    expect(container.innerHTML).toBe('')
  })

  it('shows warning toast when going offline', () => {
    render(<NetworkStatusMonitor />)

    window.dispatchEvent(new Event('offline'))

    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'You are offline',
        variant: 'warning',
      }),
    )
  })

  it('shows recovery toast when back online after offline state', () => {
    render(<NetworkStatusMonitor />)

    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))

    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Back online',
        variant: 'success',
      }),
    )
  })

  it('does not show recovery toast if online fires without prior offline', () => {
    render(<NetworkStatusMonitor />)

    window.dispatchEvent(new Event('online'))

    expect(addToastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Back online' }),
    )
  })

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<NetworkStatusMonitor />)

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    removeSpy.mockRestore()
  })
})
