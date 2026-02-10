/**
 * UserTrustStatus Tests
 *
 * Covers:
 * - Renders correct variant and label for each trust state
 * - Shows dates when showDates is true
 * - Handles missing/null props gracefully
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserTrustStatus } from './UserTrustStatus'

describe('UserTrustStatus', () => {
  it('renders UNTRUSTED state with warning variant', () => {
    render(<UserTrustStatus trustStatus="UNTRUSTED" />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('Untrusted')
    expect(status.className).toContain('status--warning')
  })

  it('renders TRUSTED state with success variant', () => {
    render(<UserTrustStatus trustStatus="TRUSTED" />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('Trusted')
    expect(status.className).toContain('status--success')
  })

  it('renders REVOKED state with error variant', () => {
    render(<UserTrustStatus trustStatus="REVOKED" />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent('Revoked')
    expect(status.className).toContain('status--error')
  })

  it('shows invitation date when showDates is true and UNTRUSTED', () => {
    render(
      <UserTrustStatus
        trustStatus="UNTRUSTED"
        invitedAt="2026-01-15T10:00:00Z"
        showDates
      />,
    )
    expect(screen.getByText(/Invited/)).toBeInTheDocument()
    expect(screen.getByText(/Jan/)).toBeInTheDocument()
  })

  it('shows trusted date when showDates is true and TRUSTED', () => {
    render(
      <UserTrustStatus
        trustStatus="TRUSTED"
        trustedAt="2026-02-01T14:30:00Z"
        showDates
      />,
    )
    // "Trusted" appears in both the Status label and the date span
    const allTrusted = screen.getAllByText(/Trusted/)
    expect(allTrusted.length).toBeGreaterThanOrEqual(2)
  })

  it('does not show dates when showDates is false', () => {
    render(
      <UserTrustStatus
        trustStatus="UNTRUSTED"
        invitedAt="2026-01-15T10:00:00Z"
        showDates={false}
      />,
    )
    expect(screen.queryByText(/Invited/)).not.toBeInTheDocument()
  })

  it('defaults to UNTRUSTED config for unknown trust status', () => {
    render(<UserTrustStatus trustStatus="UNKNOWN_VALUE" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Untrusted')
  })

  it('applies custom className', () => {
    const { container } = render(
      <UserTrustStatus trustStatus="TRUSTED" className="my-custom" />,
    )
    expect(container.firstChild.className).toContain('my-custom')
  })

  it('renders with sm size', () => {
    render(<UserTrustStatus trustStatus="TRUSTED" size="sm" />)
    const status = screen.getByRole('status')
    expect(status.className).toContain('status--sm')
  })
})
