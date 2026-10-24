import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // Installable PWA: precache the built app shell only. Prompt mode so the new
    // SW waits and we show the reload toast (src/app/pwa.ts) instead of auto-activating.
    VitePWA({
      registerType: 'prompt',
      // We register the SW ourselves (src/app/pwa.ts) to show the update toast.
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BLACKSTORE',
        short_name: 'BLACKSTORE',
        lang: 'uz',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell only. Never runtime-cache /api:
        // money/stock/sales data must not be served stale.
        navigateFallbackDenylist: [/^\/api/],
        // The main JS bundle is >2 MiB; raise the cap so the shell precaches.
        // ponytail: 3 MiB cap, code-split the bundle if it keeps growing.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
