// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy optionnel pour éviter les problèmes CORS en dev
    proxy: {
      '/admin': {
        target:      'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  define: {
    // VITE_API_URL peut être surchargé dans .env
  },
});