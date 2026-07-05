import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Aura is local-only: every AI feature runs on-device via WebLLM, no backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
  },
})
