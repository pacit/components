/// <reference types='vitest' />
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vite';

/**
 * Vitest configuration USED BY THE MUTATION RUN ALONE (`nx run components:mutation`).
 *
 * Why a separate file when the library already has a `test` target: that one goes through
 * `@nx/angular:unit-test`, that is the `@angular/build` builder, which compiles the specs with
 * esbuild into virtual files and hands Vitest the result. Stryker needs something else — a
 * CONFIGURATION FILE it can pass to its own runner (`@stryker-mutator/vitest-runner`) — and the
 * Angular builder has no such file and cannot have one, because it assembles the configuration
 * in memory.
 *
 * The name is deliberately not `vitest.config.mts`: `@nx/vite/plugin` and `@nx/vitest` infer
 * targets from EXACTLY those names (`vite.config.*`, `vitest.config.*`), so a canonically named
 * file would give the library a second test target, running in CI beside `test` and measuring
 * the same thing twice.
 *
 * The price is one and written down plainly: this is a SECOND way of running the same specs, so
 * it can drift from the first. The `check-mutation.mjs` gate watches that (point 3): the set of
 * files the mutation run REALLY ran has to match the set of the library's specs from the git
 * index — the same denominator the `test` target walks. Otherwise a file added to the library
 * and unseen here would be a test whose mutants nobody kills.
 */
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/components-mutation',
  plugins: [angular({ jit: false }), nxViteTsPaths()],
  test: {
    name: 'components-mutation',
    /**
     * `forks`, for a DIRECT run of this file — and it is written down because of what it
     * cannot do. `@analogjs/vite-plugin-angular` defaults the pool to `vmThreads`
     * (`angular-vitest-plugin.js`: `pool: userConfig.test?.pool ?? 'vmThreads'`), and in a VM
     * inside a worker thread an assignment to `process.env.TZ` never reaches the clock: vitest
     * hands its workers a SHARED env, so the write lands in the parent's store and the tz cache
     * of the thread doing the reading is never invalidated. A plain `worker_threads` worker
     * does honour it — measured, so the pool and not the thread is the cause. Under `forks`
     * every spec file gets a process of its own and the zone moves, which is what the `test`
     * target gets from vitest's own default.
     *
     * What it cannot do is govern the MUTATION run: `@stryker-mutator/vitest-runner` passes
     * `pool: 'threads'` to `createVitest` itself (`vitest-test-runner.js`, beside
     * `maxThreads: 1`), and a caller's option outranks a config file. So the mutation run is in
     * `threads` whatever stands here, and the two cases that need a zone of their own stand
     * down there and say so (`date/src/day.spec.ts`).
     */
    pool: 'forks',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    setupFiles: ['./mutation.setup.ts'],
    reporters: ['default'],
  },
}));
