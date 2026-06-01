import { describe, expect, it, vi } from 'vitest'
import {
  isDynamicImportFailure,
  registerDynamicImportRecovery,
} from './dynamicImportRecovery.js'

describe('dynamicImportRecovery', () => {
  const createTarget = () => {
    const listeners = new Map()

    return {
      addEventListener: vi.fn((type, handler) => {
        listeners.set(type, handler)
      }),
      dispatch(type, event) {
        listeners.get(type)?.(event)
      },
      removeEventListener: vi.fn((type, handler) => {
        if (listeners.get(type) === handler) listeners.delete(type)
      }),
    }
  }

  const createStorage = () => {
    const values = new Map()

    return {
      getItem: vi.fn((key) => values.get(key) || null),
      setItem: vi.fn((key, value) => {
        values.set(key, value)
      }),
    }
  }

  it('detects dynamic import chunk load failures', () => {
    expect(isDynamicImportFailure(new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'))).toBe(true)
    expect(isDynamicImportFailure(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isDynamicImportFailure(new Error('Ordinary network error'))).toBe(false)
  })

  it('reloads once when Vite reports a stale preload chunk', () => {
    const location = { reload: vi.fn() }
    const storage = createStorage()
    const target = createTarget()
    const preventDefault = vi.fn()

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('vite:preloadError', { preventDefault })

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(storage.setItem).toHaveBeenCalledWith('storylineos:dynamic-import-reload-attempted', 'true')
    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload repeatedly in the same browser target', () => {
    const location = { reload: vi.fn() }
    const storage = createStorage()
    const target = createTarget()

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('unhandledrejection', {
      reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
    })
    target.dispatch('unhandledrejection', {
      reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
    })

    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  it('does not suppress repeated Vite preload errors when recovery is already spent', () => {
    const location = { reload: vi.fn() }
    const storage = createStorage()
    const target = createTarget()
    const firstPreventDefault = vi.fn()
    const secondPreventDefault = vi.fn()

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('vite:preloadError', { preventDefault: firstPreventDefault })
    target.dispatch('vite:preloadError', { preventDefault: secondPreventDefault })

    expect(location.reload).toHaveBeenCalledTimes(1)
    expect(firstPreventDefault).toHaveBeenCalledTimes(1)
    expect(secondPreventDefault).not.toHaveBeenCalled()
  })

  it('still reloads when storage reads are blocked', () => {
    const location = { reload: vi.fn() }
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
      setItem: vi.fn(),
    }
    const target = createTarget()

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('unhandledrejection', {
      reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
    })

    expect(storage.getItem).toHaveBeenCalledTimes(1)
    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  it('still reloads when storage writes are blocked', () => {
    const location = { reload: vi.fn() }
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
    }
    const target = createTarget()

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('unhandledrejection', {
      reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
    })

    expect(storage.setItem).toHaveBeenCalledWith('storylineos:dynamic-import-reload-attempted', 'true')
    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when the tab session already attempted recovery', () => {
    const location = { reload: vi.fn() }
    const storage = createStorage()
    const target = createTarget()
    storage.setItem('storylineos:dynamic-import-reload-attempted', 'true')

    registerDynamicImportRecovery({
      location,
      storage,
      target,
    })

    target.dispatch('unhandledrejection', {
      reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
    })

    expect(location.reload).not.toHaveBeenCalled()
  })

  it('ignores ordinary unhandled promise rejections', () => {
    const location = { reload: vi.fn() }
    const target = createTarget()

    registerDynamicImportRecovery({
      location,
      storage: createStorage(),
      target,
    })

    target.dispatch('unhandledrejection', {
      reason: new Error('Something else failed'),
    })

    expect(location.reload).not.toHaveBeenCalled()
  })

  it('is a no-op outside a browser runtime', () => {
    vi.stubGlobal('window', undefined)

    try {
      const cleanup = registerDynamicImportRecovery()

      expect(cleanup).toEqual(expect.any(Function))
      expect(() => cleanup()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('does not throw during default registration when session storage access is blocked', () => {
    const delegatedTarget = createTarget()
    const location = { reload: vi.fn() }
    const browserWindow = {
      addEventListener: delegatedTarget.addEventListener,
      dispatch: delegatedTarget.dispatch,
      location,
      removeEventListener: delegatedTarget.removeEventListener,
    }

    Object.defineProperty(browserWindow, 'sessionStorage', {
      get() {
        throw new Error('storage blocked')
      },
    })

    vi.stubGlobal('window', browserWindow)

    try {
      const cleanup = registerDynamicImportRecovery()

      browserWindow.dispatch('unhandledrejection', {
        reason: new TypeError('Failed to fetch dynamically imported module: /assets/Login.js'),
      })

      expect(location.reload).toHaveBeenCalledTimes(1)
      expect(() => cleanup()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
