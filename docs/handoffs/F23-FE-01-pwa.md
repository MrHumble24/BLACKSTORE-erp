# F23-FE-01 — Make BLACKSTORE an installable PWA (frontend)

Worktree: main tree (frontend-only, no parallel client task). Work in `client/`.

Follow the rules in CLAUDE.md and `docs/rules/frontend.md`.

## Feature

Turn the existing React + Vite client into a Progressive Web App: installable to a
phone/tablet home screen and able to load its app shell offline. Shop staff run this
on phones/tablets, so install + instant reload matters; fresh business data does not
have to work offline.

Not in the PRD — explicit owner request (2026-10-24). No new PRD items.

## Do

Use **`vite-plugin-pwa`** (install latest, it supports Vite 8). Do NOT hand-write a
service worker — let the plugin/Workbox generate and precache the hashed build assets.

1. **Install**: `npm i -D vite-plugin-pwa` in `client/`.

2. **`client/vite.config.ts`** — add the plugin to the existing `plugins` array
   (keep tailwind/react/babel as they are):
   ```ts
   VitePWA({
     registerType: 'autoUpdate',
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
       // Precache the app shell only. Do NOT runtime-cache the API:
       // money/stock/sales data must never be served stale.
       navigateFallbackDenylist: [/^\/api/],
     },
   })
   ```

3. **Icons** — generate `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` into
   `client/public/` from the existing `client/public/favicon.svg` (use `sharp` or
   `@vite-pwa/assets-generator`, whichever is less setup; it's a one-off, you may run
   it by hand and commit the PNGs — don't add a runtime dep for it). Maskable icon
   needs safe padding (icon art inside the centre ~80%).

4. **`client/index.html`** — add `<meta name="theme-color" content="#f5f5f7" />` in
   `<head>`. The plugin injects the manifest link itself.

5. **Update prompt** — register the SW and show the existing sonner toast when a new
   version is ready. Put the registration in a small module under
   `client/src/app/` (e.g. `app/pwa.ts`) and call it from `main.tsx`, or use
   `virtual:pwa-register`’s `registerSW({ onNeedRefresh })`. On `onNeedRefresh`, show
   a sonner `toast` with an action button that calls `updateSW()` to reload. Reuse the
   app's `toast` from `sonner` (see `src/shared/lib/useCreateOrUpdate.ts` for the import).
   Every string goes through i18n (`uz.json`, `ru.json`, `en.json`, identical keys) —
   e.g. `pwa.updateAvailable`, `pwa.reload`.

6. **Types** — add `vite-plugin-pwa/client` to the client tsconfig `types` (or a
   `/// <reference types="vite-plugin-pwa/client" />`) so `virtual:pwa-register` resolves.

## Don't

- Don't cache any `/api` response or auth token in the service worker.
- Don't add offline fallbacks for data pages; offline = app shell + "you're offline" is fine, no custom offline page needed.
- Don't add workbox runtime caching rules beyond the shell. YAGNI.

## Done when

- `npm run build` passes (oxlint --deny-warnings, tsc, vite build) and emits `sw.js` + `manifest.webmanifest`.
- `npm run preview` serves an installable app (Chrome devtools → Application → Manifest shows icons, no errors; Lighthouse PWA installable check passes).
- Deploying a new build shows the update toast; clicking it reloads into the new version.
- All three locales have the new keys; `npm run check:i18n` passes.
