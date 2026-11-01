import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/storage-img': {
        target: 'https://yibbhuauimlfabtnacwb.supabase.co/storage/v1/object/public/productos',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage-img/, '')
      }
    }
  }
})
