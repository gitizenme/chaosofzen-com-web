/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig rather than a bare defineConfig: it lets Vitest import .astro
// components, which src/components/Shorts.test.ts renders through
// astro/container. The existing src/**/*.test.ts and scripts/**/*.test.ts
// suites are unaffected -- they import only .ts.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
