import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Spinner } from '../Spinner'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import { selectAuthStatus } from '../../store/slices/authSlice.js'
import { CUSTOMER_EXPERIENCE, resolveCustomerExperience } from '../../utils/customerExperience.js'

export function CustomerTierRoute({ requiredTier, requiredEntitlement, children, unauthorizedRedirect = '/app/dashboard' }) {
  const authStatus = useSelector(selectAuthStatus)
  const location = useLocation()
  const { customerId } = useTenantContext()
  const { getCustomerScope, hasFeatureEntitlement } = useAuthorization()
  const scope = customerId ? getCustomerScope(customerId) : null
  const experience = resolveCustomerExperience(scope)

  if (authStatus === 'idle' || authStatus === 'loading' || !customerId) {
    return (
      <div className="protected-route__loading" role="status">
        <Spinner size="lg" />
        <p className="protected-route__loading-text">Resolving workspace access…</p>
      </div>
    )
  }

  const hasRequiredEntitlement = !requiredEntitlement || hasFeatureEntitlement(
    customerId,
    requiredEntitlement,
    { fallbackWhenScopeMissing: false },
  )

  if (experience === CUSTOMER_EXPERIENCE.UNKNOWN || experience !== requiredTier || !hasRequiredEntitlement) {
    return <Navigate to={unauthorizedRedirect} state={{ from: location }} replace />
  }

  return children ?? <Outlet />
}

export default CustomerTierRoute
