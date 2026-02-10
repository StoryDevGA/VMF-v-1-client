import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/index.js'
import './styles/index.css'
import App from './App.jsx'
import { ToasterProvider } from './components/Toaster'
import { AppInit } from './components/AppInit'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ToasterProvider>
        <AppInit>
          <App />
        </AppInit>
      </ToasterProvider>
    </Provider>
  </StrictMode>,
)
