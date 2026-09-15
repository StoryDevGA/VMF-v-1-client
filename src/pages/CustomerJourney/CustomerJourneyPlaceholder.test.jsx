import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CustomerJourneyPlaceholder from './CustomerJourneyPlaceholder'

describe('CustomerJourneyPlaceholder', () => {
  it('keeps the V1 credit request manual and card-free', () => {
    render(
      <MemoryRouter>
        <CustomerJourneyPlaceholder section="Credits" />
      </MemoryRouter>,
    )

    const requestLink = screen.getByRole('link', { name: 'Request more credit' })
    expect(requestLink).toHaveAttribute('href', expect.stringContaining('mailto:angus@storylineos.com'))
    expect(requestLink.getAttribute('href')).toContain('StorylineOS%20credit%20request')
    expect(requestLink.getAttribute('href')).toContain('Requested%20credit%20amount')
    expect(screen.getByText(/no card payment flow/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

