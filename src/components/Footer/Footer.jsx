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

import { DateTime } from '../DateTime'
import './Footer.css'

export function Footer({ className = '', ...props }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`footer ${className}`.trim()} {...props}>
      <div className="footer__container container">
        <div className="footer__bottom">
          <DateTime className="footer__datetime" />
          <p className="footer__copyright">
            © {currentYear} StoryLineOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
