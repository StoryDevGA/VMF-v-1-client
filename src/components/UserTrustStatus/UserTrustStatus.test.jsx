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
import { formatDateTime } from '../../utils/dateTime.js'

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
    const invitedAt = '2026-01-15T10:00:00Z'
    render(
      <UserTrustStatus
        trustStatus="UNTRUSTED"
        invitedAt={invitedAt}
        showDates
      />,
    )
    expect(screen.getByText(/Invited/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formatDateTime(invitedAt)))).toBeInTheDocument()
  })

  it('shows trusted date when showDates is true and TRUSTED', () => {
    const trustedAt = '2026-02-01T14:30:00Z'
    render(
      <UserTrustStatus
        trustStatus="TRUSTED"
        trustedAt={trustedAt}
        showDates
      />,
    )
    // "Trusted" appears in both the Status label and the date span
    const allTrusted = screen.getAllByText(/Trusted/)
    expect(allTrusted.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(new RegExp(formatDateTime(trustedAt)))).toBeInTheDocument()
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
