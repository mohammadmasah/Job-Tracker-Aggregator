import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/chatbot': { target: 'http://backend:8000', changeOrigin: true },
      '/analyse-cv': { target: 'http://backend:8000', changeOrigin: true },
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
