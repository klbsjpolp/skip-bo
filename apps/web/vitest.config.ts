import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'virtual:pwa-register': path.resolve(__dirname, './src/testing/virtualPwaRegisterStub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/vitest.setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/ui/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}', 'src/testing/**', 'src/**/*.d.ts'],
      // Regression floors set a few points below current coverage. They ratchet
      // against silent erosion (deleted tests / untested new code) without
      // breaking CI on normal fluctuation. Raise them as coverage improves.
      thresholds: {
        statements: 63,
        branches: 53,
        functions: 63,
        lines: 63,
      },
    },
  },
});
