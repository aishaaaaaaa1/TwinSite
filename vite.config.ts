import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import nasaDemHandler from './api/nasadem/[granule].ts'

const require = createRequire(import.meta.url)
const cesiumPlugin = require('vite-plugin-cesium') as {
  default: () => Plugin
}

const nasaDemDevProxy: Plugin = {
  name: 'nasadem-dev-proxy',
  configureServer(server) {
    server.middlewares.use('/api/nasadem', (request, response, next) => {
      void nasaDemHandler(request, response).catch(next)
    })
  },
}

export default defineConfig({
  plugins: [cesiumPlugin.default(), react(), tailwindcss(), nasaDemDevProxy],
  resolve: { alias: { '@': '/src' } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
