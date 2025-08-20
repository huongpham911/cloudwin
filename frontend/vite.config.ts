import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Skip TypeScript checking during build for faster development
    rollupOptions: {
      onwarn(warning, warn) {
        // Skip TypeScript warnings during build
        if (warning.code === 'TYPESCRIPT_ERROR') return;
        warn(warning);
      }
    }
  },
  server: {
    host: '127.0.0.1', // Secure local connections only
    port: 5173,
    // Remove proxy - using separate api.wincloud.app domain
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000',
    //     changeOrigin: true,
    //   },
    // },
  },
  define: {
    // Environment variables for different domains
    __API_BASE_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://api.wincloud.app'
        : 'http://localhost:5000'
    ),
  },
})
