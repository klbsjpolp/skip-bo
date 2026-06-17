import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      // Tests live in tests/, outside src/, so no in-src test globs to exclude.
      exclude: ['src/**/*.d.ts'],
      // Floors are deliberately low: the reducer/validators are exercised mostly
      // by the web state tests (apps/web/src/state/__tests__), and that
      // cross-package coverage is not attributed here. These just ratchet against
      // erosion of this package's own tests/ suite.
      thresholds: {
        statements: 28,
        branches: 12,
        functions: 48,
        lines: 27,
      },
    },
  },
});
