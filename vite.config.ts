import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Express API runs on 8787; proxy /api to it during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
