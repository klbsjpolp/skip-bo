import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react-swc";
import path from 'path'
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const base = isProd ? '/skip-bo/' : '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          // any additional static assets you want copied as-is:
          'favicon.svg',
          'game-image.svg',
        ],
        manifest: {
          name: 'Skip-Bo',
          short_name: 'Skip-Bo',
          description: 'Play Skip-Bo offline',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          lang: 'fr',
          // Important for GitHub Pages deployment path
          start_url: base,
          scope: base,
          icons: [
            // Replace these with real generated PNGs in /public
            { src: 'manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', "purpose": "any" },
            { src: 'manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', "purpose": "maskable" },
            { src: 'manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', "purpose": "any" },
            { src: 'manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', "purpose": "maskable" },
          ],
        },
        workbox: {
          // Precache all build assets and HTML; good default for SPAs
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallback: base + 'index.html',
          // Optional: add runtime caching rules if you load remote data/assets
          runtimeCaching: [
            // Example: cache same-origin images at runtime
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        // Enable in dev if you want to test quickly (optional):
        // devOptions: { enabled: true },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})