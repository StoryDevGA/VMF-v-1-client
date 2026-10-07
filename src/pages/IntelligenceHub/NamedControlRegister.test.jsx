import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import NamedControlRegister from './NamedControlRegister.jsx'
import { assuranceReviewFixture, assuranceReceiptFixture } from '../../test/assuranceReviewFixture.js'

const show = (props = {}) => render(<MemoryRouter><NamedControlRegister qualityHref="/app/intelligence/quality?runtimeInstanceId=workspace-1&revisionId=revision-2" onSelectView={vi.fn()} {...props} /></MemoryRouter>)
describe('approved human control register', () => {
  it.each([['CURRENT', 'Current receipt'], ['STALE', 'Stale receipt']])('shows only the recorded %s completion status', (currency, expected) => {
    show({ review: assuranceReviewFixture(assuranceReceiptFixture({ currency })) })
    const register = within(screen.getByRole('region', { name: 'Assurance control register' }))
    expect(register.getAllByRole('button')).toHaveLength(3)
    expect(register.getByRole('button', { name: /Review completion/ })).toHaveTextContent(expected)
    expect(register.getByRole('button', { name: /Exception disclosure/ })).toHaveTextContent('Unavailable')
    expect(register.getByRole('button', { name: /Publication authorisation/ })).toHaveTextContent('Unavailable')
    expect(register.queryByText('Evidence acceptance')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected assurance control' })).toHaveTextContent('Recorded review of the complete mandatory population')
  })
  it.each([[null, false, 'Unavailable'], [assuranceReviewFixture(null), false, 'No receipt'], [assuranceReviewFixture(), true, 'Loading…']])('never invents completion from an absent or loading receipt', (review, loading, expected) => {
    show({ review, loading })
    expect(within(screen.getByRole('region', { name: 'Assurance control register' })).getByRole('button', { name: /Review completion/ })).toHaveTextContent(expected)
    if (loading) expect(screen.getByRole('region', { name: 'Selected assurance control' })).not.toHaveTextContent('12345678-1234-4123-8123-123456789abc')
  })
  it('keeps exception transparency and package authorisation separate and read-only', async () => {
    const user = userEvent.setup(), select = vi.fn(); show({ onSelectView: select })
    await user.click(screen.getByRole('button', { name: /Exception disclosure/ }))
    const detail = screen.getByRole('region', { name: 'Selected assurance control' })
    expect(detail).toHaveTextContent('does not waive mandatory requirements')
    expect(detail).toHaveTextContent('no-known-exceptions decision requires a complete current basis')
    expect(screen.getByRole('link', { name: 'Inspect quality findings →' })).toHaveAttribute('href', '/app/intelligence/quality?runtimeInstanceId=workspace-1&revisionId=revision-2')
    await user.click(screen.getByRole('button', { name: /Publication authorisation/ }))
    expect(detail).toHaveTextContent('actual server action authority')
    expect(detail).toHaveTextContent('grant, refusal or withdrawal receipt and its decision history are unavailable')
    expect(select).not.toHaveBeenCalled()
    expect(within(detail).queryByRole('button')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Review completion/ }))
    await user.click(screen.getByRole('button', { name: 'Open Review →' }))
    expect(select).toHaveBeenCalledWith('Review')
  })
  it('reports the same three independent states without mutation controls', () => {
    show({ review: assuranceReviewFixture(), summary: true })
    const report = screen.getByRole('region', { name: 'Report human control register' })
    expect(report).toHaveTextContent('3 controls')
    expect(report).toHaveTextContent('Current receipt')
    expect(within(report).getAllByText('Unavailable')).toHaveLength(2)
    expect(within(report).queryByRole('button')).not.toBeInTheDocument()
    expect(report).toHaveTextContent('Machine checks and certification cannot create human approval')
  })
})
