/**
 * Help Page
 *
 * Public help center with onboarding guidance, troubleshooting paths,
 * and role-aware workflow support references.
 */

import { useLocation } from 'react-router-dom'
import { Link } from '../../components/Link'
import { renderSafeMarkdown, renderSafeInlineMarkdown } from '../../utils/safeMarkdown.jsx'
import { HELP_ARTICLES } from './helpArticles.js'
import { getHelpArticleHref, getHelpReturnHref } from './helpNavigation.js'
import contextIllustration from '../../../docs/help/assets/intelligence-hub-context.jpg'
import { Fieldset } from '../../components/Fieldset'
import './Help.css'

const HELP_ASSETS = Object.freeze({ '../assets/intelligence-hub-context.jpg': contextIllustration })

function Help() {
  const { search } = useLocation()
  const slug = new URLSearchParams(search).get('article')
  const article = HELP_ARTICLES.find(item => item.slug === slug)
  const returnHref = getHelpReturnHref(search)
  const renderInline = text => String(text).split(/(!?\[[^\]\n]+\]\([^) \n]+\))/g).map((token, index) => {
    const match = token.match(/^(!?)\[([^\]]+)\]\(([^)]+)\)$/)
    if (!match) return renderSafeInlineMarkdown(token)
    const [, image, label, target] = match
    if (image && Object.hasOwn(HELP_ASSETS, target)) return <img key={index} src={HELP_ASSETS[target]} alt={label} loading="lazy" className="help__illustration" />
    const related = !image && HELP_ARTICLES.find(item => target === item.slug + '.md')
    return related ? <Link key={index} to={getHelpArticleHref(search, related.slug)}>{label}</Link> : token
  })
  return (
    <section className="help container" aria-label="Help Center">
      <header className="help__header">
        <h1 className="help__title">Help Center</h1>
        <p className="help__subtitle">
          Find onboarding steps, workflow guidance, and support paths for using
          VMF effectively.
        </p>
      </header>

      <nav className="help__articles" aria-label="Intelligence Hub Help articles">
        {HELP_ARTICLES.map(item => <Link key={item.slug} to={getHelpArticleHref(search, item.slug)} aria-current={article?.slug === item.slug ? 'page' : undefined}>{item.title}</Link>)}
      </nav>
      {returnHref ? <Link className="help__return" to={returnHref}>Return to Intelligence Hub</Link> : null}
      {slug ? <section id="context-help" className="help__article" aria-label={article ? article.title + ' Help article' : 'Help article unavailable'}>
        {article ? renderSafeMarkdown(article.source, { headingOffset: 1, renderInline }) : <><h2>Help article unavailable</h2><p>This article is not in the current Help catalogue. Choose a listed topic or return to your workspace.</p><Link to={getHelpArticleHref(search)}>Open Help Center</Link></>}
      </section> : null}
      {!slug ? <div id="context-help" className="help__grid">
        <Fieldset variant="default" gap="lg" className="help__section">
          <Fieldset.Legend className="help__legend">
            <h2 className="help__section-title">Getting Started</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="help__content">
            <p className="help__text">
              Use this sequence for a reliable start each session:
            </p>
            <ol className="help__list">
              <li>Sign in with the correct account type (Customer or Super Admin).</li>
              <li>Open the Dashboard to establish workflow context.</li>
              <li>Select customer and tenant scope before entering admin modules.</li>
            </ol>
          </Fieldset.Content>
        </Fieldset>

        <Fieldset variant="default" gap="lg" className="help__section">
          <Fieldset.Legend className="help__legend">
            <h2 className="help__section-title">Core Workflows</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="help__content">
            <p className="help__text">
              Customer administrators can manage users, maintain tenants, and
              review system monitoring from the Dashboard workflow panel.
            </p>
            <p className="help__text">
              Super admins also have access to customer-level platform controls
              in the customer console.
            </p>
          </Fieldset.Content>
        </Fieldset>

        <Fieldset
          variant="default"
          gap="lg"
          className="help__section help__section--wide"
        >
          <Fieldset.Legend className="help__legend">
            <h2 className="help__section-title">Troubleshooting</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="help__content">
            <p className="help__text">
              If something is not working as expected, run this quick check:
            </p>
            <ul className="help__list">
              <li>Confirm your role has access to the target module.</li>
              <li>Confirm customer/tenant context has been selected.</li>
              <li>Review inline validation and support messages on the page.</li>
              <li>Retry after rate-limit lockouts complete.</li>
            </ul>
          </Fieldset.Content>
        </Fieldset>

        <Fieldset
          variant="default"
          gap="lg"
          className="help__section help__section--wide"
        >
          <Fieldset.Legend className="help__legend">
            <h2 className="help__section-title">Support Escalation</h2>
          </Fieldset.Legend>
          <Fieldset.Content className="help__content">
            <p className="help__text">
              Capture the page you are on, the workflow step, and the exact
              error message before escalating. This speeds up diagnosis and
              reduces repeat investigation cycles.
            </p>
            <p className="help__text">
              Include role, customer context, tenant context, and the time of
              the issue in your support request.
            </p>
          </Fieldset.Content>
        </Fieldset>
      </div> : null}
    </section>
  )
}

export default Help
