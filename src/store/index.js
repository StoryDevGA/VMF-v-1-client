/**
 * Redux Store
 *
 * Single source of truth for all client-side state.
 * Uses Redux Toolkit's `configureStore` which includes:
 * - Redux DevTools integration (dev only)
 * - Thunk middleware by default
 * - RTK Query cache middleware
 *
 * @module store
 */

import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi.js'
import authReducer from './slices/authSlice.js'

export const store = configureStore({
  reducer: {
    // RTK Query cache reducer
    [baseApi.reducerPath]: baseApi.reducer,

    // Feature slices
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
})

/**
 * @typedef {ReturnType<typeof store.getState>} RootState
 * @typedef {typeof store.dispatch} AppDispatch
 */
