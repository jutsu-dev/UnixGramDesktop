import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import SettingsApp from './app/SettingsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
)
