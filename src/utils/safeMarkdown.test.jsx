import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderSafeMarkdown } from './safeMarkdown.jsx'

describe('existing safe Markdown renderer', () => {
  it('preserves default Outcome heading/list/emphasis and escapes markup', () => {
    const { container } = render(<div>{renderSafeMarkdown('# Summary\n\n**Fact:** a *qualified* statement.\n\n- First\n- Second\n\n1) Decision\n\n<script>unsafe()</script>')}</div>)
    expect(screen.getByRole('heading', { name: 'Summary', level: 4 })).toBeInTheDocument()
    expect(container.querySelector('strong')).toHaveTextContent('Fact:')
    expect(container.querySelector('em')).toHaveTextContent('qualified')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument()
  })
  it('supports Help heading hierarchy without changing default rendering', () => {
    render(<div>{renderSafeMarkdown('# Article\n\n## Steps', { headingOffset: 1 })}</div>)
    expect(screen.getByRole('heading', { name: 'Article', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Steps', level: 3 })).toBeInTheDocument()
  })
})
