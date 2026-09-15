import { createElement } from 'react'
import './PageShell.css'

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function PageShell({ as = 'section', className, children, ...props }) {
  return createElement(
    as,
    {
      ...props,
      className: joinClasses('page-shell', className),
    },
    children,
  )
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  titleAs = 'h1',
  titleId,
  className,
  children,
  ...props
}) {
  const HeadingTag = titleAs

  return (
    <header
      {...props}
      className={joinClasses('page-header', actions && 'page-header--with-actions', className)}
    >
      <div className="page-header__content">
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <HeadingTag className="page-header__title" id={titleId}>{title}</HeadingTag>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}

export function PageContent({ as = 'div', className, children, ...props }) {
  return createElement(
    as,
    {
      ...props,
      className: joinClasses('page-content', className),
    },
    children,
  )
}

export default PageShell
