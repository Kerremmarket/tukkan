import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    proxy: {
      // Proxy API requests to local Flask backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // do not rewrite path; backend expects '/api'
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: [
      'localhost',
      '.railway.app',
      '.up.railway.app'
    ]
  }
})
