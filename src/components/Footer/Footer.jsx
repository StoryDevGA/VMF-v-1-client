/**
 * Footer Component
 *
 * A responsive footer component with sections for navigation and information.
 *
 * Features:
 * - Responsive layout (stacks on mobile, columns on desktop)
 * - Flexible sections support
 * - Copyright with dynamic year
 * - Theme-aware styling
 * - Accessible markup
 *
 * @example
 * <Footer
 *   sections={[
 *     {
 *       title: 'Product',
 *       links: [
 *         { label: 'Features', to: '/features' },
 *         { label: 'Pricing', to: '/pricing' }
 *       ]
 *     }
 *   ]}
 *   copyright="My Company"
 * />
 */

import { Link } from '../Link'
import { DateTime } from '../DateTime'
import './Footer.css'

export function Footer({
  sections = [],
  copyright,
  showYear = true,
  className = '',
  ...props
}) {
  const currentYear = new Date().getFullYear()
  const showCopyright = Boolean(copyright)

  return (
    <footer className={`footer ${className}`.trim()} {...props}>
      <div className="footer__container container">
        {sections.length > 0 && (
          <div className="footer__sections">
            {sections.map((section, index) => (
              <div key={index} className="footer__section">
                {section.title && (
                  <h3 className="footer__section-title">{section.title}</h3>
                )}
                {section.links && section.links.length > 0 && (
                  <ul className="footer__links" role="list">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex} className="footer__link-item">
                        <Link
                          to={link.to}
                          href={link.href}
                          className="footer__link"
                          variant="secondary"
                          underline="hover"
                          {...(link.external && { external: true })}
                          {...(link.openInNewTab && { openInNewTab: true })}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {section.content && (
                  <div className="footer__section-content">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="footer__bottom">
          <DateTime className="footer__datetime" />

          {showCopyright && (
            <p className="footer__copyright">
              {showYear && `© ${currentYear} `}
              {copyright}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer
