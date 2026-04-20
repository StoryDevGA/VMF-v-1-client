import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RuntimePathSelectChips from './RuntimePathSelectChips.jsx'

vi.mock('../../store/api/runtimeControlApi.js', () => ({
  useListRuntimePathsQuery: () => ({
    isFetching: false,
    data: {
      data: [
        { id: 'path-a', pathKey: 'vmf.metadata', label: 'VMF Metadata' },
        { id: 'path-b', pathKey: 'runtime.validationResult', label: 'Validation Result' },
      ],
    },
  }),
}))

describe('RuntimePathSelectChips', () => {
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
})
