import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { vi } from 'vitest'
import { ToasterProvider } from '../components/Toaster'
import { baseApi } from '../store/api/baseApi.js'
import { __resetRuntimeControlApiStateForTests } from '../store/api/runtimeControlApi.js'

export function setupRuntimeControlTestEnvironment() {
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

export function renderRuntimeControlPage({ route, path, element }) {
  const store = createRuntimeControlTestStore()

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <ToasterProvider>
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        </ToasterProvider>
      </MemoryRouter>
    </Provider>,
  )
}
