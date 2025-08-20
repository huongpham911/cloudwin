import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevtools()],
  server: {
    port: 7000,
    host: '127.0.0.1',
    open: true,
    strictPort: true,
    cors: true
  },
  preview: {
    port: 7000,
    strictPort: true
  }
})
