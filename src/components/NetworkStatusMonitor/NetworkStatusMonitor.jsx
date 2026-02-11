/**
 * NetworkStatusMonitor Component (Phase 5.3)
 *
 * Headless global component mounted at the App root that listens for
 * browser `online` / `offline` events and shows toast notifications:
 *   - Warning toast when connectivity is lost
 *   - Success toast when connectivity is restored (only after a prior offline event)
 *
 * Renders `null` — no DOM output.
 */

import { useEffect, useRef } from 'react'
import { useToaster } from '../Toaster'
export function NetworkStatusMonitor() {
  const { addToast } = useToaster()
  const wasOffline = useRef(false)

  useEffect(() => {
    const handleOffline = () => {
      wasOffline.current = true
      addToast({
        title: 'You are offline',
        description: 'Requests may fail until your connection is restored.',
        variant: 'warning',
        duration: 6000,
      })
    }

    const handleOnline = () => {
      if (!wasOffline.current) return
      addToast({
        title: 'Back online',
        description: 'Connection restored.',
        variant: 'success',
      })
      wasOffline.current = false
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [addToast])

  return null
}

export default NetworkStatusMonitor
