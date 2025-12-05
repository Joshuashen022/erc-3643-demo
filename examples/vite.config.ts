import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  },
  resolve: {
    alias: {
      '@document': path.resolve(__dirname, '../document'),
      '@src': path.resolve(__dirname, './src'),
    }
  },
  assetsInclude: ['**/*.md']
})

