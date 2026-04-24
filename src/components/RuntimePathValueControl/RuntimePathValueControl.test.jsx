import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import RuntimePathValueControl from './RuntimePathValueControl.jsx'

function ControlledRuntimePathValueControl({ runtimePath, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)

  return (
    <RuntimePathValueControl
      id="runtime-path-value"
      runtimePath={runtimePath}
      value={value}
      onChange={setValue}
    />
  )
}

describe('RuntimePathValueControl', () => {
  it('renders governed select options when allowedValues are present', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RuntimePathValueControl
        id="runtime-path-value"
        runtimePath={{
          pathKey: 'framework_state.lifecycle.stage',
          dataType: 'STRING',
          uiControl: 'SELECT',
          allowedValues: ['DRAFT', 'SUBMITTED', 'APPROVED'],
          allowedValueLabels: {
            DRAFT: 'Draft',
            SUBMITTED: 'Submitted',
            APPROVED: 'Approved',
          },
        }}
        value=""
        onChange={onChange}
      />,
    )

    const select = screen.getByRole('combobox')
    expect(screen.getByText('Draft (DRAFT)')).toBeInTheDocument()
    expect(screen.getByText('Submitted (SUBMITTED)')).toBeInTheDocument()
    expect(screen.getByText('Approved (APPROVED)')).toBeInTheDocument()

    await user.selectOptions(select, 'SUBMITTED')
    expect(onChange).toHaveBeenCalledWith('SUBMITTED')
  })

  it('falls back to disabled select with helper when uiControl=SELECT but no options exist', () => {
    render(
      <RuntimePathValueControl
        id="runtime-path-value"
        runtimePath={{
          pathKey: 'framework_state.lifecycle.stage',
          dataType: 'ENUM',
          uiControl: 'SELECT',
          allowedValues: [],
        }}
        value=""
      />,
    )

    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
    expect(
      screen.getByText('No governed options are configured for this runtime path yet.'),
    ).toBeInTheDocument()
  })

  it('renders checkbox control for boolean paths', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RuntimePathValueControl
        id="runtime-path-value"
        runtimePath={{
          pathKey: 'framework_state.lifecycle.locked',
          dataType: 'BOOLEAN',
        }}
        value="false"
        onChange={onChange}
      />,
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(onChange).toHaveBeenCalledWith('true')
  })

  it('renders number input for numeric paths', async () => {
    const user = userEvent.setup()

    render(
      <ControlledRuntimePathValueControl
        runtimePath={{
          pathKey: 'framework_state.priority',
          dataType: 'NUMBER',
        }}
        initialValue="10"
      />,
    )

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '25')

    expect(input).toHaveValue(25)
  })

  it('renders textarea control when runtime path requests TEXTAREA', async () => {
    const user = userEvent.setup()

    render(
      <ControlledRuntimePathValueControl
        runtimePath={{
          pathKey: 'framework_state.policy.last_block_reason',
          dataType: 'STRING',
          uiControl: 'TEXTAREA',
        }}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Blocked by governance')

    expect(textarea).toHaveValue('Blocked by governance')
  })

  it('shows validation feedback for malformed JSON values', () => {
    render(
      <ControlledRuntimePathValueControl
        runtimePath={{
          pathKey: 'framework_state.payload',
          dataType: 'OBJECT',
          uiControl: 'JSON',
        }}
      />,
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '{invalid' } })

    expect(screen.getByText('Provide valid JSON.')).toBeInTheDocument()
  })

  it('requires JSON arrays for ARRAY runtime paths', () => {
    render(
      <RuntimePathValueControl
        id="runtime-path-value"
        runtimePath={{
          pathKey: 'framework_state.steps',
          dataType: 'ARRAY',
          uiControl: 'JSON',
        }}
        value='{"step":"draft"}'
      />,
    )

    expect(screen.getByText('Provide a JSON array.')).toBeInTheDocument()
  })

  it('falls back to a text input for plain string paths', async () => {
    const user = userEvent.setup()

    render(
      <ControlledRuntimePathValueControl
        runtimePath={{
          pathKey: 'framework_state.policy.last_result',
          dataType: 'STRING',
        }}
      />,
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'PASS')

    expect(input).toHaveValue('PASS')
  })
})
