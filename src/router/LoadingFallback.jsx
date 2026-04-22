import { Spinner } from '../components/Spinner'

export function LoadingFallback() {
  return (
    <div className="loading-fallback" role="status" aria-live="polite">
      <Spinner size="lg" />
      <p className="loading-fallback__text">Loading...</p>
    </div>
  )
}

export default LoadingFallback
