/**
 * Help Page Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Help from './Help'
import { MemoryRouter } from 'react-router-dom'
import { HELP_ARTICLES } from './helpArticles.js'
import { readFileSync } from 'node:fs'

const show = (search = '') => render(<MemoryRouter initialEntries={['/help' + search]}><Help /></MemoryRouter>)

describe('Help page', () => {
  it('renders the page heading', () => {
    show()
    expect(
      screen.getByRole('heading', { name: /help center/i }),
    ).toBeInTheDocument()
  })

  it('renders core support sections', () => {
    show()

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


describe('Intelligence Hub Help articles', () => {
  it.each(HELP_ARTICLES.map(article => [article.slug, article.source]))('serves exact canonical article %s', (slug, source) => {
    const disk = readFileSync(new URL('../../../docs/help/customer/' + slug + '.md', import.meta.url), 'utf8')
    expect(source).toBe(disk)
    show('?article=' + slug)
    expect(screen.getByRole('heading', { name: source.split('\n')[0].replace(/^# /, ''), level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Intelligence Hub Help articles' }).querySelector('[aria-current="page"]')).toHaveAttribute('href', expect.stringContaining('article=' + slug))
  })

  it.each(['../execution-workspace', 'https://evil.example/', 'javascript:alert(1)', '%2e%2e%2fintelligence-hub', '__proto__'])('rejects unknown or unsafe article %s', slug => {
    show('?article=' + encodeURIComponent(slug))
    expect(screen.getByRole('heading', { name: 'Help article unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Help Center' })).toHaveAttribute('href', '/help#context-help')
    expect(screen.queryByRole('link', { name: 'Return to Intelligence Hub' })).not.toBeInTheDocument()
  })

  it('keeps exact workflow context across related article links and fixed return', () => {
    show('?article=intelligence-hub-context&runtimeInstanceId=root-1&revisionId=revision-3&customerId=customer-1&tenantId=tenant-1&view=context&sourceId=s1&evidenceId=e1&findingId=f1&sourceSearch=proof&returnView=graph&helpReturnRoute=hub&helpReturnView=context')
    const returnLink = screen.getByRole('link', { name: 'Return to Intelligence Hub' })
    const url = new URL(returnLink.getAttribute('href'), 'http://localhost')
    expect(url.pathname).toBe('/app/intelligence')
    expect(Object.fromEntries(url.searchParams)).toEqual({ runtimeInstanceId:'root-1', revisionId:'revision-3', customerId:'customer-1', tenantId:'tenant-1', view:'context', sourceId:'s1', evidenceId:'e1', findingId:'f1', sourceSearch:'proof', returnView:'graph' })
    const related = screen.getByRole('link', { name: 'Inspect Sources' })
    const relatedUrl = new URL(related.getAttribute('href'), 'http://localhost')
    expect(relatedUrl.searchParams.get('article')).toBe('intelligence-hub-sources')
    expect(relatedUrl.searchParams.get('findingId')).toBe('f1')
    expect(relatedUrl.searchParams.get('helpReturnView')).toBe('context')
    expect(screen.getByRole('img', { name: /Synthetic Context brief/ })).toHaveAttribute('src', expect.stringContaining('intelligence-hub-context.jpg'))
  })

  it('escapes HTML and leaves unsafe links, traversal and unknown assets as text', () => {
    const original = HELP_ARTICLES[0].source
    HELP_ARTICLES[0].source = '# Safe article\n\n<script>unsafe()</script>\n\n[Attack](javascript:alert) [Traversal](../intelligence-hub-review.md) [Encoded](%69ntelligence-hub-review.md) ![Private](file:///secret) ![Prototype](__proto__)'
    try {
      const { container } = show('?article=intelligence-hub')
      expect(container.querySelector('script')).toBeNull()
      expect(screen.getByText(/<script>unsafe/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Attack' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Traversal' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Encoded' })).not.toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    } finally { HELP_ARTICLES[0].source = original }
  })
})
