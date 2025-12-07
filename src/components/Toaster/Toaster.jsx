/**
 * Toaster Component
 *
 * Provides contextual toast notifications with theme-aware styling and accessible live region.
 *
 * Usage:
 * <ToasterProvider>
 *   <App />
 * </ToasterProvider>
 *
 * const { addToast } = useToaster()
 * addToast({ title: 'Saved', description: 'Profile updated', variant: 'success' })
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './Toaster.css'

const ToasterContext = createContext(null)

const variants = ['info', 'success', 'warning', 'error']

export function ToasterProvider({
  children,
  position = 'top-right',
  duration = 4000,
  max = 4
}) {
  const allowedPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const resolvedPosition = allowedPositions.includes(position) ? position : 'top-right'
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    ({ title, description = '', variant = 'info', duration: toastDuration }) => {
      const normalizedVariant = variants.includes(variant) ? variant : 'info'
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => {
        const next = [...prev, { id, title, description, variant: normalizedVariant }]
        if (next.length > max) {
          const overflow = next.length - max
          const removed = next.slice(0, overflow)
          removed.forEach((toast) => {
            const timer = timersRef.current.get(toast.id)
            if (timer) {
              window.clearTimeout(timer)
              timersRef.current.delete(toast.id)
            }
          })
          return next.slice(overflow)
        }
        return next
      })

      const timeout = window.setTimeout(
        () => removeToast(id),
        toastDuration ?? duration
      )
      timersRef.current.set(id, timeout)

      return id
    },
    [duration, max, removeToast]
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const value = useMemo(() => ({ addToast, removeToast, position: resolvedPosition }), [addToast, removeToast, resolvedPosition])

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <div
        className={['toaster', `toaster--${resolvedPosition}`].join(' ')}
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className={['toast', `toast--${toast.variant}`].join(' ')}>
            <div className="toast__body">
              <div className="toast__title">{toast.title}</div>
              {toast.description ? (
                <div className="toast__description">{toast.description}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  )
}

export function useToaster() {
  const context = useContext(ToasterContext)
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider')
  }
  return context
}

export default ToasterProvider
