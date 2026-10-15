import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Cloudflare quick tunnels use a new public hostname each time.
    // This local development server must accept those forwarded requests.
    allowedHosts: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
