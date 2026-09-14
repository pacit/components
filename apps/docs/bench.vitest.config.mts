/// <reference types='vitest' />
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { join } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Vitest configuration USED BY THE COST RUN ALONE (`nx run docs:bench`,
 * `req-quality-benchmark`): the scenes under `bench/` render every component page's preview
 * in jsdom and write what it cost to `tmp/bench/report.json`, which `tools/check-bench.mjs`
 * holds against `bench.snapshot.md`.
 *
 * A file of its own, under a name of its own, for the reason the library's mutation config
 * gives: `@nx/vite/plugin` infers targets from EXACTLY `vite.config.*` and `vitest.config.*`,
 * so a canonically named file would give the site a `vite:test` target, running in CI beside
 * everything else and measuring nothing the site has specs for. The site has no unit specs —
 * its pages are held by the e2e suite — and this file is not the beginning of them: it runs
 * one kind of file, `*.bench.ts`, and nothing under `src/`.
 */
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/docs-bench',
  plugins: [
    angular({ jit: false, tsconfig: join(__dirname, 'tsconfig.bench.json') }),
    nxViteTsPaths(),
  ],
  test: {
    name: 'docs-bench',
    watch: false,
    globals: false,
    environment: 'jsdom',
    include: ['bench/**/*.bench.ts'],
    setupFiles: ['bench/setup.ts'],
    reporters: ['default'],
    // One file at a time, deliberately: the clock is one of the readings, and two scenes
    // timed side by side would each be reading the other's work.
    fileParallelism: false,
  },
}));
