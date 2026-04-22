import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { Logo } from '../components/Logo'
import { selectCurrentUser } from '../store/slices/authSlice.js'
import { isSuperAdmin as checkIsSuperAdmin } from '../utils/authorization.js'
import { LoadingFallback } from './LoadingFallback.jsx'

export function RootLayout() {
  return (
    <div className="root-layout">
      <Header logo={<Logo size="large" />} />
      <main className="root-layout__main">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export function CustomerAppGuard({ superAdminElement = null }) {
  const user = useSelector(selectCurrentUser)
  // Super Admins entering `/app/*` are intentionally short-circuited back to the
  // Super Admin workspace instead of rendering the customer dashboard shell.
  if (checkIsSuperAdmin(user)) {
    return superAdminElement
  }
  return <Outlet />
}
