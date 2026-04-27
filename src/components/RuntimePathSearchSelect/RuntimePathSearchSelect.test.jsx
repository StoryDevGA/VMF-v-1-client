import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RuntimePathSearchSelect from './RuntimePathSearchSelect.jsx'

const triggerSearch = vi.fn().mockResolvedValue({})

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useLazyListRuntimePathsQuery: () => ([
    triggerSearch,
    {
      isFetching: false,
      data: {
        data: {
          data: [
            {
              id: 'path-vmf-metadata',
              pathKey: 'vmf.metadata',
              label: 'VMF Metadata',
              allowedOperations: ['READ', 'WRITE'],
            },
            {
              id: 'path-vmf-validation-status',
              pathKey: 'vmf.validation.status',
              label: 'VMF Validation Status',
              allowedOperations: ['READ'],
            },
            {
              id: 'path-framework-state-stage',
              pathKey: 'framework_state.lifecycle.stage',
              label: 'Lifecycle Stage',
              allowedOperations: ['BIND'],
            },
          ],
          meta: {},
        },
      },
    },
  ]),
}))

describe('RuntimePathSearchSelect', () => {
  beforeEach(() => {
    triggerSearch.mockClear()
  })

  it('renders an ARIA combobox and listbox options', async () => {
    const user = userEvent.setup()
    render(
      <RuntimePathSearchSelect
        id="allowed-read"
        label="Allowed Read Paths"
        frameworkKeys={['VMF']}
        operation="READ"
        selectedKeys={[]}
        onChange={vi.fn()}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /allowed read paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    expect(screen.getByRole('listbox', { name: /allowed read paths results/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /vmf\.metadata/i })).toBeInTheDocument()
  })

  it('closes the dropdown on blur', async () => {
    const user = userEvent.setup()
    render(
      <RuntimePathSearchSelect
        id="allowed-read"
        label="Allowed Read Paths"
        frameworkKeys={['VMF']}
        operation="READ"
        selectedKeys={[]}
        onChange={vi.fn()}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /allowed read paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.blur(combo)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('calls onChange when selecting an option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RuntimePathSearchSelect
        id="allowed-read"
        label="Allowed Read Paths"
        frameworkKeys={['VMF']}
        operation="READ"
        selectedKeys={[]}
        onChange={onChange}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /allowed read paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    await user.click(screen.getByRole('option', { name: /vmf\.metadata/i }))
    expect(onChange).toHaveBeenCalledWith(['vmf.metadata'])
  })

  it('supports keyboard navigation and selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RuntimePathSearchSelect
        id="allowed-read"
        label="Allowed Read Paths"
        frameworkKeys={['VMF']}
        operation="READ"
        selectedKeys={[]}
        onChange={onChange}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /allowed read paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(['vmf.metadata'])
  })

  it('debounces search requests', async () => {
    const user = userEvent.setup()
    render(
      <RuntimePathSearchSelect
        id="allowed-read"
        label="Allowed Read Paths"
        frameworkKeys={['VMF']}
        operation="READ"
        selectedKeys={[]}
        onChange={vi.fn()}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /allowed read paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(triggerSearch).not.toHaveBeenCalled()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 310))
    })

    expect(triggerSearch).toHaveBeenCalledTimes(1)
    expect(triggerSearch).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'vmf' }))
  })

  it('supports protected-only queries without an operation filter', async () => {
    const user = userEvent.setup()
    render(
      <RuntimePathSearchSelect
        id="forbidden-write"
        label="Forbidden Write Paths"
        frameworkKeys={['VMF']}
        operation={null}
        isProtectedOnly
        selectedKeys={[]}
        onChange={vi.fn()}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /forbidden write paths/i })
    await user.click(combo)
    await user.type(combo, 'vmf')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320))
    })

    const lastCall = triggerSearch.mock.calls.at(-1)?.[0] ?? {}

    expect(lastCall).toEqual(expect.objectContaining({
      q: 'vmf',
      isProtected: 'true',
    }))
    expect(lastCall.operation).toBeUndefined()
  })

  it('supports single selection by replacing the existing selected path', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RuntimePathSearchSelect
        id="target-path"
        label="Target Path"
        frameworkKeys={['VMF']}
        operation="READ"
        selectionMode="single"
        selectedKeys={['vmf.previous']}
        onChange={onChange}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /target path/i })
    await user.click(combo)
    await user.type(combo, 'metadata')
    await user.click(screen.getByRole('option', { name: /vmf\.metadata/i }))

    expect(onChange).toHaveBeenCalledWith(['vmf.metadata'])
  })

  it('can filter results by path prefix and multiple allowed operations', async () => {
    const user = userEvent.setup()
    render(
      <RuntimePathSearchSelect
        id="condition-path"
        label="Path"
        frameworkKeys={['VMF']}
        operation={null}
        allowedOperations={['READ', 'BIND']}
        pathPrefix="framework_state."
        selectedKeys={[]}
        onChange={vi.fn()}
      />,
    )

    const combo = screen.getByRole('combobox', { name: /^path$/i })
    await user.click(combo)
    await user.type(combo, 'stage')

    expect(screen.getByRole('option', { name: /framework_state\.lifecycle\.stage/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /vmf\.metadata/i })).not.toBeInTheDocument()
  })
})
