/**
 * App Component
 *
 * Root application component with router
 */

import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { NetworkStatusMonitor } from './components/NetworkStatusMonitor'

function App() {
  return (
    <>
      <NetworkStatusMonitor />
      <RouterProvider router={router} />
    </>
  )
}

export default App
