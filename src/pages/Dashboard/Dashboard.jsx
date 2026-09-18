import { Spinner } from '../../components/Spinner'
import { Status } from '../../components/Status'
import { useAuthorization } from '../../hooks/useAuthorization.js'
import { useTenantContext } from '../../hooks/useTenantContext.js'
import {
  CUSTOMER_EXPERIENCE,
  resolveCustomerExperience,
} from '../../utils/customerExperience.js'
import { CoreHome } from './CoreHome.jsx'
import { SignalHome } from './SignalHome.jsx'
import { useGetCustomerCreditsQuery } from '../../store/api/customerApi.js'
import './Dashboard.css'

const EXPERIENCE_COPY = {
  [CUSTOMER_EXPERIENCE.SIGNAL]: {
    title: 'Signal Home',
    eyebrow: 'Signal StoryLineOS',
    description: 'Choose a focused Signal product: analyse a website or improve a document-backed outcome.',
  },
  [CUSTOMER_EXPERIENCE.CORE]: {
    title: 'Customer Workspace',
    eyebrow: 'Customer Home',
    description: 'Pick up where you left off or open a workspace.',
  },
}

function AccessResolutionState() {
  return (
    <div className="customer-home customer-home--state">
      <section className="customer-home__state" role="status">
        <Status variant="warning" size="lg" showIcon>Workspace access needs confirmation</Status>
        <h1 id="customer-home-access-title">We could not confirm this customer workspace</h1>
        <p>Select an accessible customer again or sign in again before opening customer work.</p>
      </section>
    </div>
  )
}

export function Dashboard() {
  const { customerId, tenantId, isResolvingSelectedTenantContext } = useTenantContext()
  const { getCustomerScope, hasCustomerPermission, hasTenantPermission, hasFeatureEntitlement, isCustomerScopeReady, user } = useAuthorization()
  const scope = customerId ? getCustomerScope(customerId) : null
  const experience = resolveCustomerExperience(scope)
  const {
    data: creditsResponse,
    isLoading: isLoadingCredits,
    isFetching: isFetchingCredits,
    error: creditsError,
  } = useGetCustomerCreditsQuery(customerId, {
    skip: !customerId || experience !== CUSTOMER_EXPERIENCE.SIGNAL,
  })
  const hasVmfViewPermission = Boolean(
    customerId && (
      hasCustomerPermission(customerId, 'VMF_VIEW')
      || (tenantId && hasTenantPermission(customerId, tenantId, 'VMF_VIEW'))
    ),
  )
  const copy = EXPERIENCE_COPY[experience]
  const firstName = String(user?.name ?? '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Welcome back, ${firstName}.` : null

  if (isResolvingSelectedTenantContext || !customerId || isCustomerScopeReady === false) {
    return (
      <div className="customer-home customer-home--state">
        <section className="customer-home__state" role="status">
          <Spinner size="lg" />
          <h1 id="customer-home-loading-title">Resolving workspace access…</h1>
        </section>
      </div>
    )
  }

  if (!copy) return <AccessResolutionState />

  return (
    <div className="customer-home">
      <div className="customer-home__container">
        {experience === CUSTOMER_EXPERIENCE.SIGNAL ? (
          <SignalHome
            copy={copy}
            hasWebsiteEntitlement={hasFeatureEntitlement(customerId, 'WEBSITE', { fallbackWhenScopeMissing: false })}
            hasDocumentsEntitlement={hasFeatureEntitlement(customerId, 'DOCUMENTS', { fallbackWhenScopeMissing: false })}
            creditBalances={creditsResponse?.data?.balances}
            isLoadingCredits={isLoadingCredits || isFetchingCredits}
            creditsError={Boolean(creditsError)}
          />
        ) : (
          <CoreHome
            copy={copy}
            customerId={customerId}
            tenantId={tenantId}
            hasVmfViewPermission={hasVmfViewPermission}
            greeting={greeting}
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard
