import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const isProd = mode === 'production';
  const base = isProd ? '/skip-bo/' : '/';
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN;
  const sentryOrg = env.SENTRY_ORG;
  const sentryProject = env.SENTRY_PROJECT;
  const plugins = [react(), tailwindcss()];

  if (sentryAuthToken && sentryOrg && sentryProject) {
    plugins.push(
      sentryVitePlugin({
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
      }),
    );
  }

  return {
    base,
    envDir: path.resolve(__dirname, '../..'),
    build: {
      sourcemap: 'hidden',
      // The vendor chunk below is intentionally large but changes rarely, so it
      // stays cached (and SW-precached) across app deploys. Raise the warning
      // limit so it doesn't flag on every build.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Separate third-party code from app code so a routine app deploy only
          // busts the small entry chunk, leaving the big dependency chunks cached
          // (and SW-precached). React and Sentry are split out further: they
          // change on their own cadence and download in parallel.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@sentry')) return 'sentry';
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
            return 'vendor';
          },
        },
      },
    },
    plugins: [
      ...plugins,
      VitePWA({
        registerType: 'prompt',
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
            { src: 'manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
