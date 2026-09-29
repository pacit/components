/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/sandbox',
  /**
   * Vite resolves the `paths` of `tsconfig.base.json` (`@pacit/components/*`) itself, reading
   * them from the nearest `tsconfig.json` of each importing file. Every such file here extends
   * the base, except the one in `libs/components/schematics/`: that program has no paths, and
   * nothing in it imports an alias. Not with `nxViteTsPaths`: deprecated in Nx 23, gone in
   * Nx 24, and it applied the base to every importer. Not with `vite-tsconfig-paths` either, the
   * plugin that deprecation points to: Vite 8 warns about it in every `resolveConfig`, which
   * `@nx/vite/plugin` and `@nx/vitest` call whenever they infer this project's targets anew,
   * and every vitest run calls again, so one warning would only have replaced the other.
   * The option is marked experimental; `vite` is pinned to an exact version, so a change to it
   * arrives only with a bump somebody makes on purpose.
   */
  resolve: { tsconfigPaths: true },
  plugins: [angular()],
  test: {
    name: 'sandbox',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/sandbox',
      provider: 'v8' as const,
    },
  },
}));
