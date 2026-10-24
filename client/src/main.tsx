import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerPwa } from './app/pwa'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find root element')
}

registerPwa()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
