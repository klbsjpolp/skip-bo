import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      // Tests live in tests/, outside src/, so no in-src test globs to exclude.
      exclude: ['src/**/*.d.ts'],
    },
  },
});
