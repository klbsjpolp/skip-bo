import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      // Regression floors a few points below current coverage — ratchet against
      // erosion without breaking CI on normal fluctuation. Raise as it improves.
      thresholds: {
        statements: 72,
        branches: 50,
        functions: 85,
        lines: 72,
      },
    },
  },
});
