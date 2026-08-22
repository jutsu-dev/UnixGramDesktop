import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import SettingsApp from './SettingsApp'

const settingsMode = new URLSearchParams(window.location.search).has('desktop-settings')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {settingsMode ? <SettingsApp /> : <App />}
  </StrictMode>,
)
