import { getHubViewKey, HUB_VIEWS } from '../IntelligenceHub/intelligenceHubModel.js'

export const HUB_HELP_ARTICLES = Object.freeze([
  { slug: 'intelligence-hub', title: 'Intelligence Hub', view: 'Overview' },
  { slug: 'intelligence-hub-context', title: 'Context', view: 'Context' },
  { slug: 'intelligence-hub-sources', title: 'Sources', view: 'Sources' },
  { slug: 'intelligence-hub-review', title: 'Review', view: 'Review' },
  { slug: 'intelligence-quality', title: 'Intelligence Quality', view: 'Intelligence Quality' },
  { slug: 'intelligence-hub-evidence-readiness', title: 'Evidence readiness', view: 'Evidence readiness' },
  { slug: 'intelligence-hub-readiness-publish', title: 'Readiness & publish', view: 'Readiness & publish' },
  { slug: 'intelligence-hub-after-lock', title: 'After lock', view: 'After lock' },
  { slug: 'intelligence-hub-coverage', title: 'Coverage', view: 'Coverage' },
  { slug: 'intelligence-hub-graph', title: 'Intelligence Graph', view: 'Intelligence Graph' },
])

export const getHubHelpHref = ({ view, search, quality = false }) => {
  const params = new URLSearchParams(search)
  params.set('article', HUB_HELP_ARTICLES.find(article => article.view === view)?.slug || 'intelligence-hub')
  params.set('helpReturnRoute', quality ? 'quality' : 'hub')
  params.set('helpReturnView', quality ? 'intelligence-quality' : getHubViewKey(view))
  return '/help?' + params.toString() + '#context-help'
}

export const getHelpArticleHref = (search, slug) => {
  const params = new URLSearchParams(search)
  if (HUB_HELP_ARTICLES.some(article => article.slug === slug)) params.set('article', slug)
  else params.delete('article')
  return '/help' + (params.size ? '?' + params.toString() : '') + '#context-help'
}

export const getHelpReturnHref = (search) => {
  const params = new URLSearchParams(search)
  const route = params.get('helpReturnRoute')
  const view = params.get('helpReturnView')
  const scoped = ['runtimeInstanceId', 'revisionId'].every(key => {
    const value = params.get(key)
    return value && value.trim() === value && value.length <= 256
  })
  if (!scoped || !['hub', 'quality'].includes(route)) return null
  if (route === 'hub' && !HUB_VIEWS.some(label => getHubViewKey(label) === view)) return null
  if (route === 'quality' && view !== 'intelligence-quality') return null
  ;['article', 'helpReturnRoute', 'helpReturnView'].forEach(key => params.delete(key))
  if (route === 'hub') params.set('view', view)
  return (route === 'quality' ? '/app/intelligence/quality?' : '/app/intelligence?') + params.toString()
}
