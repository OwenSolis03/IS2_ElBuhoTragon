// frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: true, // Esto permite ver la página desde un celular/red
      // `npm run dev:api-real` (modo api-real): /api/* se reenvía al sitio publicado,
      // para trabajar el diseño sin levantar el backend. Ojo: lo que guardes
      // (reseñas, cambios del admin) se escribe en producción.
      proxy: env.VITE_PROXY_TARGET
        ? { '/api': { target: env.VITE_PROXY_TARGET, changeOrigin: true, secure: true } }
        : undefined,
    },
  }
})
