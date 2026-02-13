import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Base path for GitHub Pages (will be /productivity/)
  base: '/productivity/',

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,

    // Multi-page app configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eisenhower: resolve(__dirname, 'eisenhower.html'),
        moscow: resolve(__dirname, 'moscow.html'),
        calendar: resolve(__dirname, 'todo-calendar.html'),
        journal: resolve(__dirname, 'journal.html'),
      }
    }
  },

  // Server configuration for development
  server: {
    port: 8181,
    open: true,
    cors: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'sqlocal']
  },

  // Required headers for SQLite WASM (OPFS)
  preview: {
    port: 8181,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
