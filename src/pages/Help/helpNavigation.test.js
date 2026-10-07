import { describe, expect, it } from 'vitest'
import { HUB_HELP_ARTICLES, getHubHelpHref, getHelpArticleHref, getHelpReturnHref } from './helpNavigation.js'

describe('fixed scoped Help navigation', () => {
  it('preserves the scoped Quality inspection receipt through articles and return', () => {
    const search = new URLSearchParams({ runtimeInstanceId: 'root', revisionId: 'r3', findingId: 'f1', findingContext: 'root:r3:c1:t1', qualityInspectionContext: 'root:r3:c1:t1', qualityPopulation: 'Recorded dispositions', qualityType: 'Contradiction', qualityQuery: ' exact source ' })
    const help = getHubHelpHref({ view: 'Intelligence Quality', quality: true, search: '?' + search })
    const article = getHelpArticleHref(new URL(help, 'http://localhost').search, 'intelligence-hub-context')
    const back = new URL(getHelpReturnHref(new URL(article, 'http://localhost').search), 'http://localhost')
    for (const [key, value] of search) expect(back.searchParams.get(key)).toBe(value)
    expect(back.pathname).toBe('/app/intelligence/quality')
  })
  it.each(HUB_HELP_ARTICLES)('maps $view to canonical article and fixed return', article => {
    const quality = article.view === 'Intelligence Quality'
    const href = getHubHelpHref({ view: article.view, quality, search: '?runtimeInstanceId=root-1&revisionId=r3&customerId=c1&tenantId=t1&findingId=f1&sourceSearch=off-page&returnView=graph' })
    const url = new URL(href,'http://localhost')
    expect(url.searchParams.get('article')).toBe(article.slug)
    expect(url.hash).toBe('#context-help')
    const back = new URL(getHelpReturnHref(url.search),'http://localhost')
    expect(back.pathname).toBe(quality ? '/app/intelligence/quality' : '/app/intelligence')
    for (const key of ['runtimeInstanceId','revisionId','customerId','tenantId','findingId','sourceSearch','returnView']) expect(back.searchParams.get(key)).toBe(url.searchParams.get(key))
    expect(back.searchParams.has('article')).toBe(false)
  })
  it.each(['https://evil.example', '//evil.example', '/app/admin', 'javascript:alert(1)', 'constructor'])('rejects arbitrary return route %s', route => {
    expect(getHelpReturnHref('?runtimeInstanceId=root&revisionId=r3&helpReturnRoute=' + encodeURIComponent(route) + '&helpReturnView=context')).toBeNull()
  })
  it.each(['', '?helpReturnRoute=hub&helpReturnView=context', '?runtimeInstanceId=root&revisionId=r3&helpReturnRoute=hub&helpReturnView=unknown', '?runtimeInstanceId=root&revisionId=r3&helpReturnRoute=quality&helpReturnView=context'])('withholds unverified return shape %s', search => expect(getHelpReturnHref(search)).toBeNull())
  it('preserves workflow params while recovering from unknown article', () => {
    expect(getHelpArticleHref('?article=unknown&revisionId=r3&sourceId=s1&context=original','../secret')).toBe('/help?revisionId=r3&sourceId=s1&context=original#context-help')
  })
})
