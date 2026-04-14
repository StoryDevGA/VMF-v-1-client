import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { vi } from 'vitest'
import { ToasterProvider } from '../components/Toaster'
import { baseApi } from '../store/api/baseApi.js'
import { __resetRuntimeControlApiStateForTests } from '../store/api/runtimeControlApi.js'

export function setupRuntimeControlTestEnvironment() {
  vi.restoreAllMocks()
  globalThis.__RUNTIME_CONTROL_API_MOCK__ = true
  __resetRuntimeControlApiStateForTests()
  HTMLDialogElement.prototype.showModal = vi.fn(function showModalMock() {
    this.open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function closeMock() {
    this.open = false
  })
}

export function createRuntimeControlTestStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })
}

export function renderRuntimeControlPage({ route, path, element, routes, initialEntries }) {
  const store = createRuntimeControlTestStore()
  const resolvedRoutes = routes ?? [{ path, element }]
  const resolvedEntries = initialEntries ?? [route]

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={resolvedEntries}>
        <ToasterProvider>
          <Routes>
            {resolvedRoutes.map((routeConfig) => (
              <Route
                key={routeConfig.path}
                path={routeConfig.path}
                element={routeConfig.element}
              />
            ))}
          </Routes>
        </ToasterProvider>
      </MemoryRouter>
    </Provider>,
  )
}
