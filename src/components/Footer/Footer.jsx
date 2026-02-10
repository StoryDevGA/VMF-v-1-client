/**
 * Footer Component
 *
 * A minimal responsive footer with current date/time and copyright.
 */

import { useEffect, useState } from 'react'
import { DateTime } from '../DateTime'
import './Footer.css'

export function Footer({
  className = '',
  ...props
}) {
  const currentYear = new Date().getFullYear()
  const [versionLabel, setVersionLabel] = useState('Version unavailable')

  function formatBuiltAtLocal(isoString) {
    if (typeof isoString !== 'string') return null
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return null

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
    return `${yyyy}-${mm}-${dd} ${hh}:${min} ${tz}`
  }

  useEffect(() => {
    let isMounted = true

    async function loadVersion() {
      if (typeof fetch !== 'function') return

      try {
        const response = await fetch('/version.json', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const baseVersion = typeof data?.version === 'string' ? data.version : null
        const builtAt = formatBuiltAtLocal(data?.builtAt)
        const environment = typeof data?.environment === 'string' ? data.environment : null
        const versionTag = baseVersion ? `v${baseVersion}` : null

        if (isMounted && versionTag) {
          const buildTag = builtAt ? ` • ${builtAt}` : ''
          const envTag = environment ? ` • ${environment.toUpperCase()}` : ''
          setVersionLabel(`${versionTag}${buildTag}${envTag}`)
        }
      } catch {
        if (isMounted) {
          setVersionLabel('Version unavailable')
        }
      }
    }

    loadVersion()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <footer className={`footer ${className}`.trim()} {...props}>
      <div className="footer__container container">
        <div className="footer__bottom">
          <div className="footer__meta">
            <DateTime
              className="footer__datetime"
              dateFormat="MMM d, yyyy"
              timeFormat="hh:mm a"
            />
            <p className="footer__version">{versionLabel}</p>
          </div>
          <p className="footer__copyright">
            © {currentYear} StoryLineOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
