import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// En desarrollo, las llamadas a /api/... se reenvían al Apache local
// (http://localhost/api/index.php/...). Así el navegador ve un solo origen:
// la cookie de sesión funciona sin CORS y sin configuraciones extra.
// Si tu backend está en otro lado: VITE_PROXY_API=http://otro-host npm run dev
const destinoApi = process.env.VITE_PROXY_API || 'http://localhost'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: destinoApi,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api(\/index\.php)?/, '/api/index.php'),
      },
    },
  },
})
