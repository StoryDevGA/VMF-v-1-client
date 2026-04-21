import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RuntimePathSelectChips from './RuntimePathSelectChips.jsx'

const { useListRuntimePathsQuery } = vi.hoisted(() => ({
  useListRuntimePathsQuery: vi.fn(() => ({
    isFetching: false,
    data: {
      data: [
        { id: 'path-a', pathKey: 'vmf.metadata', label: 'VMF Metadata' },
        { id: 'path-b', pathKey: 'runtime.validationResult', label: 'Validation Result' },
      ],
    },
  })),
}))

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useListRuntimePathsQuery,
}))

describe('RuntimePathSelectChips', () => {
  beforeEach(() => {
    useListRuntimePathsQuery.mockClear()
  })

  it('renders and allows selecting runtime paths', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RuntimePathSelectChips
        id="paths"
        selectedKeys={[]}
        onChange={onChange}
        placeholder="Select governed read path"
      />,
    )

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'vmf.metadata')

    expect(onChange).toHaveBeenCalledWith(['vmf.metadata'])
  })

  it('filters out protected runtime paths when selecting WRITE targets', async () => {
    const onChange = vi.fn()

    render(
      <RuntimePathSelectChips
        id="paths"
        operation="WRITE"
        selectedKeys={[]}
        onChange={onChange}
      />,
    )

    expect(useListRuntimePathsQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'WRITE',
        isProtected: 'false',
        status: 'ACTIVE',
      }),
      expect.any(Object),
    )
  })
})
