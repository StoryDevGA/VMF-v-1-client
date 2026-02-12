/**
 * Help Page Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Help from './Help'

describe('Help page', () => {
  it('renders the page heading', () => {
    render(<Help />)
    expect(
      screen.getByRole('heading', { name: /help center/i }),
    ).toBeInTheDocument()
  })

  it('renders core support sections', () => {
    render(<Help />)

    expect(
      screen.getByRole('heading', { name: /getting started/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /core workflows/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /troubleshooting/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /support escalation/i }),
    ).toBeInTheDocument()
  })
})
