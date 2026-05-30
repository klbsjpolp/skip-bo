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
    },
  },
});
