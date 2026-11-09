/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }
import { serviceWorker } from './sw/vite-plugin-sw.ts'

// base './' → funciona en GitHub Pages (subcarpeta) y dentro de Capacitor
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
