const DYNAMIC_IMPORT_RELOAD_KEY = 'storylineos:dynamic-import-reload-attempted'

const dynamicImportReloadAttemptedTargets = new WeakSet()
let fallbackDynamicImportReloadAttempted = false

export const isDynamicImportFailure = (reason) => {
  const message = String(reason?.message || reason || '')

  return /failed to fetch dynamically imported module/i.test(message)
    || /error loading dynamically imported module/i.test(message)
    || /importing a module script failed/i.test(message)
}

const getBrowserWindow = () => (typeof window === 'undefined' ? null : window)

const getBrowserProperty = (browserWindow, propertyName) => {
  try {
    return browserWindow?.[propertyName]
  } catch {
    return undefined
  }
}

const getStoredReloadAttempt = (storage) => {
  try {
    return storage?.getItem?.(DYNAMIC_IMPORT_RELOAD_KEY) === 'true'
  } catch {
    return false
  }
}

const storeReloadAttempt = (storage) => {
  try {
    storage?.setItem?.(DYNAMIC_IMPORT_RELOAD_KEY, 'true')
  } catch {
    // Storage may be unavailable in private browsing, strict privacy modes, or embedded contexts.
  }
}

const hasInMemoryReloadAttempt = (target) => (
  target && typeof target === 'object'
    ? dynamicImportReloadAttemptedTargets.has(target)
    : fallbackDynamicImportReloadAttempted
)

const storeInMemoryReloadAttempt = (target) => {
  if (target && typeof target === 'object') {
    dynamicImportReloadAttemptedTargets.add(target)
    return
  }

  fallbackDynamicImportReloadAttempted = true
}

const reloadOnceForDynamicImportFailure = ({ location, storage, target }) => {
  if (hasInMemoryReloadAttempt(target) || getStoredReloadAttempt(storage)) {
    return false
  }

  storeInMemoryReloadAttempt(target)
  storeReloadAttempt(storage)
  location?.reload?.()
  return true
}

export const registerDynamicImportRecovery = (options = {}) => {
  const browserWindow = getBrowserWindow()
  const target = options.target ?? browserWindow
  const location = options.location ?? getBrowserProperty(browserWindow, 'location')
  const storage = options.storage ?? getBrowserProperty(browserWindow, 'sessionStorage')

  if (!target?.addEventListener || !target?.removeEventListener) {
    return () => {}
  }

  const recover = () => reloadOnceForDynamicImportFailure({
    location,
    storage,
    target,
  })

  const handlePreloadError = (event) => {
    if (recover()) {
      event.preventDefault?.()
    }
  }

  const handleUnhandledRejection = (event) => {
    if (!isDynamicImportFailure(event.reason)) return
    recover()
  }

  target.addEventListener?.('vite:preloadError', handlePreloadError)
  target.addEventListener?.('unhandledrejection', handleUnhandledRejection)

  return () => {
    target.removeEventListener?.('vite:preloadError', handlePreloadError)
    target.removeEventListener?.('unhandledrejection', handleUnhandledRejection)
  }
}
