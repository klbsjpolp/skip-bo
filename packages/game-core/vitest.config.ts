import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      // Tests live in tests/, outside src/, so no in-src test globs to exclude.
      exclude: ['src/**/*.d.ts'],
      // The reducer is now tested here rather than through the web app, so these
      // floors reflect real coverage of this package by its own tests/ suite.
      // Set a few points below current coverage to ratchet against erosion
      // without breaking CI on normal fluctuation. Raise them as coverage improves.
      thresholds: {
        statements: 87,
        branches: 73,
        functions: 78,
        lines: 87,
      },
    },
  },
});
