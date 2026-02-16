/**
 * NotFound Page
 *
 * 404 error page shown when user navigates to an invalid route.
 * Displays the attempted URL and provides navigation back to home.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { MdSearchOff } from 'react-icons/md'
import { Button } from '../../components/Button'
import './NotFound.css'

function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <section className="not-found container" aria-label="Page Not Found">
      <div className="not-found__content">
        <div className="not-found__icon-wrapper">
          <MdSearchOff className="not-found__icon" aria-hidden="true" />
        </div>
        <h1 className="not-found__heading">404</h1>
        <p className="not-found__message">Page not found</p>
        <code className="not-found__path">{location.pathname}</code>
        <div className="not-found__action">
          <Button variant="primary" size="md" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </section>
  )
}

export default NotFound
