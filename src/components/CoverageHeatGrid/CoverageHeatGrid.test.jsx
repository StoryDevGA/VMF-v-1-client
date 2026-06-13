import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoverageHeatGrid } from './CoverageHeatGrid.jsx'

const rows = [
  {
    areaLabel: 'Company',
    progressValue: 67,
    progressText: '2 accepted of 3 evidence objects',
    stateMeta: {
      className: 'strong',
      label: 'Strong',
      description: 'Strong accepted evidence coverage',
    },
  },
  {
    areaLabel: 'Products',
    progressValue: 50,
    progressText: '1 accepted of 2 evidence objects',
    stateMeta: {
      className: 'adequate',
      label: 'Adequate',
      description: 'Adequate accepted evidence coverage',
    },
  },
  {
    areaLabel: 'Services',
    progressValue: 0,
    progressText: '0 accepted of 1 evidence object',
    stateMeta: {
      className: 'weak',
      label: 'Weak',
      description: 'Weak accepted evidence coverage',
    },
  },
]

describe('CoverageHeatGrid', () => {
  it('renders coverage rows with visible counts, state labels, and accessible status text', () => {
    render(<CoverageHeatGrid ariaLabel="Accepted coverage heat grid" rows={rows} />)

    const grid = screen.getByRole('region', { name: 'Accepted coverage heat grid' })
    expect(within(grid).getByText('Company')).toBeInTheDocument()
    expect(within(grid).getByText('2 accepted of 3 evidence objects')).toBeInTheDocument()
    expect(within(grid).getByText('67%')).toBeInTheDocument()
    expect(within(grid).getByLabelText(
      'Company coverage status: Strong accepted evidence coverage. 2 accepted of 3 evidence objects',
    )).toBeInTheDocument()

    expect(within(grid).getByLabelText(
      'Products coverage status: Adequate accepted evidence coverage. 1 accepted of 2 evidence objects',
    )).toBeInTheDocument()
    expect(within(grid).getByText('Weak')).toBeInTheDocument()
  })

  it('renders a legend so heat intensity is not color-only', () => {
    render(<CoverageHeatGrid ariaLabel="Evidence domain coverage grid" rows={rows} />)

    const legend = screen.getByRole('list', { name: 'Evidence domain coverage grid legend' })
    expect(within(legend).getByText('High')).toBeInTheDocument()
    expect(within(legend).getByText('Medium')).toBeInTheDocument()
    expect(within(legend).getByText('Low')).toBeInTheDocument()
    expect(within(legend).getByText('None')).toBeInTheDocument()
  })

  it('maps tile intensity to coverage value rather than state label', () => {
    const mixedRows = [
      { areaLabel: 'High value', progressValue: 88, stateMeta: { className: 'missing', label: 'Missing' } },
      { areaLabel: 'Medium value', progressValue: 52, stateMeta: { className: 'strong', label: 'Strong' } },
      { areaLabel: 'Low value', progressValue: 24, stateMeta: { className: 'adequate', label: 'Adequate' } },
      { areaLabel: 'No value', progressValue: 0, stateMeta: { className: 'strong', label: 'Strong' } },
    ]

    const { container } = render(<CoverageHeatGrid ariaLabel="Mixed coverage grid" rows={mixedRows} />)
    const tiles = container.querySelectorAll('.coverage-heat-grid__tile')

    expect(tiles[0]).toHaveClass('coverage-heat-grid__tile--intensity-high')
    expect(tiles[1]).toHaveClass('coverage-heat-grid__tile--intensity-medium')
    expect(tiles[2]).toHaveClass('coverage-heat-grid__tile--intensity-low')
    expect(tiles[3]).toHaveClass('coverage-heat-grid__tile--intensity-empty')
  })

  it('renders an honest empty state when no rows are projected', () => {
    render(
      <CoverageHeatGrid
        ariaLabel="Accepted coverage heat grid"
        rows={[]}
        emptyMessage="Coverage rows are unavailable."
      />,
    )

    const grid = screen.getByRole('region', { name: 'Accepted coverage heat grid' })
    expect(within(grid).getByText('Coverage rows are unavailable.')).toBeInTheDocument()
    expect(within(grid).queryByRole('list')).not.toBeInTheDocument()
  })
})
