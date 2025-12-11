/**
 * Logo Component
 *
 * StoryLineOS brand logo component
 *
 * @example
 * <Logo />
 * <Logo size="large" />
 */

import storylineLogo from '../../assets/images/logos/storylineOS-Logo.png'
import './Logo.css'

export function Logo({
  size = 'medium',
  alt = 'StoryLineOS Logo',
  className = '',
  ...props
}) {
  const logoClasses = ['logo', `logo--${size}`, className].filter(Boolean).join(' ')

  return (
    <div className={logoClasses} {...props}>
      <img
        src={storylineLogo}
        alt={alt}
        className="logo__image"
      />
    </div>
  )
}

export default Logo
