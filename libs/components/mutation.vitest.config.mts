import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';
import type { RunnerTask, RunnerTestCase } from 'vitest';
import type { Reporter, Vitest } from 'vitest/node';

/**
 * A spec file Vitest failed is one failed test here, whatever failed it: an import that
 * threw, a `describe` body that threw, a hook of the file or of a suite in it.
 *
 * `@stryker-mutator/vitest-runner` (9.6.1, and 10.0.0 has the same `run()`) builds a
 * mutant's verdict from the file's TEST tasks, and a file that fails before it holds any has
 * none — Vitest keeps the error on the file's own result. So a static mutant that stops a
 * module from loading came back `Survived` after zero tests, where a plain run shows a red
 * file ([`lesson-252`](../../docs/lessons.md#lesson-252), stryker-js#6150). The upstream fix
 * (stryker-js#6217) reads such a file as an ERROR, and an errored mutant counts against the
 * score here: a different wrong answer. A failed test is the right one, and with it both
 * versions agree.
 *
 * It reads `vitest.state` because that is what the runner reads once `start()` returns, and
 * adds a test only where the runner reads no failure in the file — one is all a verdict needs,
 * and a second would name this test in `killedBy` beside the one that failed.
 * The test carries the errors of the file and of every failed suite in it, because a suite's
 * hook leaves its error on the suite. It is shaped as a top-level test is (no `suite`, the next
 * `<file id>_<index>`), so the runner names it `<spec>#the file failed outside its tests` in
 * `killedBy`. `check-mutation` holds this configuration to it ([`lesson-253`](../../docs/lessons.md#lesson-253)).
 */
export class FailedFileFails implements Reporter {
  private vitest: Vitest | undefined;

  onInit(vitest: Vitest): void {
    this.vitest = vitest;
  }

  onTestRunEnd(): void {
    for (const file of this.vitest?.state.getFiles() ?? []) {
      if (file.result?.state !== 'fail' || failedIn(file.tasks)) continue;
      const name = 'the file failed outside its tests';
      file.tasks.push({
        type: 'test',
        id: `${file.id}_${file.tasks.length}`,
        name,
        fullName: `${file.name} > ${name}`,
        fullTestName: name,
        mode: 'run',
        meta: {},
        file,
        timeout: 0,
        annotations: [],
        artifacts: [],
        result: {
          state: 'fail',
          errors: [...(file.result.errors ?? []), ...suiteErrors(file.tasks)],
        },
      } as unknown as RunnerTestCase);
    }
  }
}

/**
 * Whether the runner already reads a failure in these tasks, as its `convertTestToTestResult`
 * does: a test with a result that is not a pass, or one skipped — by its mode or its state —
 * under a suite that failed, which it reads as failed with the suite's error. A test with no
 * result it drops, so that is no failure.
 */
function failedIn(
  tasks: readonly RunnerTask[],
  underFailedSuite = false,
): boolean {
  return tasks.some((task) => {
    if (task.type === 'suite')
      return failedIn(
        task.tasks,
        underFailedSuite || task.result?.state === 'fail',
      );
    if (task.type !== 'test' || !task.result) return false;
    const skipped =
      task.mode === 'skip' ||
      task.result.state === 'skip' ||
      task.result.state === 'todo';
    return skipped ? underFailedSuite : task.result.state !== 'pass';
  });
}

function suiteErrors(tasks: readonly RunnerTask[]): unknown[] {
  return tasks.flatMap((task) =>
    task.type === 'suite'
      ? [
          ...(task.result?.state === 'fail' ? (task.result.errors ?? []) : []),
          ...suiteErrors(task.tasks),
        ]
      : [],
  );
}

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
 * files the mutation run REALLY ran has to hold every spec of the library from the git index
 * or excuse it by name — the same denominator the `test` target walks, and an excuse for each
 * spec the related filter cannot reach. Otherwise a file added to the library and unseen here
 * would be a test whose mutants nobody kills.
 */
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/components-mutation',
  // Paths resolved by Vite itself, for the reason `apps/sandbox/vite.config.mts` gives.
  resolve: { tsconfigPaths: true },
  plugins: [angular({ jit: false })],
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
    reporters: ['default', new FailedFileFails()],
  },
}));
