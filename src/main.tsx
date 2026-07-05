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
