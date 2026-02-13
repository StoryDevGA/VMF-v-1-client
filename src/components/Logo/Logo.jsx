/**
 * Logo Component
 *
 * StoryLineOS brand logo component
 *
 * @example
 * <Logo />
 * <Logo size="large" />
 */

import { useEffect, useState } from 'react'
import storylineLogo from '../../assets/images/logos/storylineOS-Logo.png'
import storylineLogoBlack from '../../assets/images/logos/StoryLineOS - Black.png'
import './Logo.css'

export function Logo({
  size = 'medium',
  alt = 'StoryLineOS Logo',
  className = '',
  mode,
  ...props
}) {
  const logoClasses = ['logo', `logo--${size}`, className].filter(Boolean).join(' ')

  // Track brand mode (lite vs default) to swap logo asset
  const getDocumentMode = () => {
    return typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-mode') || ''
      : ''
  }

  const [brandMode, setBrandMode] = useState(() => mode || getDocumentMode())

  useEffect(() => {
    if (mode) return

    const updateMode = () => {
      const currentMode = getDocumentMode()
      setBrandMode((prevMode) => (prevMode === currentMode ? prevMode : currentMode))
    }

    const observer = new MutationObserver(() => updateMode())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] })

    const handleStorage = (event) => {
      if (event.key === 'selected-brand-mode') {
        updateMode()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      observer.disconnect()
      window.removeEventListener('storage', handleStorage)
    }
  }, [mode])

  const isLiteMode = (mode || brandMode) === 'lite'
  const logoSrc = isLiteMode ? storylineLogoBlack : storylineLogo

  return (
    <div className={logoClasses} {...props}>
      <img
        src={logoSrc}
        alt={alt}
        className="logo__image"
      />
    </div>
  )
}

export default Logo
