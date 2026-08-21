import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Tests run against the packages' TypeScript *source*, not their `dist/` build, so
 * `npm test` never needs a build step. Only the NestJS API consumes the built output.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@rgi/types': fileURLToPath(new URL('../types/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
  },
});
