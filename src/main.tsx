import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SpeakerProvider } from './lib/tts'
import { LangProvider } from './lib/i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <SpeakerProvider>
        <App />
      </SpeakerProvider>
    </LangProvider>
  </React.StrictMode>,
)

// Offline app-shell caching + installability — Aura's AI already runs fully on-device,
// this lets the shell itself load without a network connection too.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
