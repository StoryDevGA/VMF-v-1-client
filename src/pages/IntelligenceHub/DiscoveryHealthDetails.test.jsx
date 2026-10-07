import { render, screen } from '@testing-library/react'
import { it, expect } from 'vitest'
import DiscoveryHealthDetails from './DiscoveryHealthDetails.jsx'
import { discoveryHealthFixture } from '../../test/discoveryHealthFixture.js'
const model = freshness => ({ ...discoveryHealthFixture({ state: 'READY', freshness }).discoveryHealth, readAt: '2026-10-06T12:30:00.000Z' })
it.each(['STALE', 'UNKNOWN', 'NOT_MARKED_STALE'])('qualifies recorded READY under %s instead of claiming approval', freshness => {
  render(<DiscoveryHealthDetails model={model(freshness)} />)
  expect(screen.getByRole('region', { name: 'Recorded Discovery Health assessment' })).toHaveTextContent('Recorded Ready')
  expect(screen.getByText(/Assessment input basis is unavailable/)).toBeInTheDocument()
  expect(screen.getByText('Evidence Review Pending')).toBeInTheDocument()
  if (freshness === 'STALE') expect(screen.getByText(/this assessment is stale/)).toBeInTheDocument()
})
it('withholds stored state and reasons while the scoped read refreshes', () => {
  render(<DiscoveryHealthDetails model={model('STALE')} loading />)
  expect(screen.queryByText('Recorded Ready')).not.toBeInTheDocument()
  expect(screen.queryByText('Evidence Review Pending')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Loading')
})
it('explains failed reads without displaying retained state or an approval', () => {
  render(<DiscoveryHealthDetails model={null} />)
  expect(screen.getByRole('status')).toHaveTextContent('unavailable. Refresh this view to retry.')
})
