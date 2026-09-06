#!/usr/bin/env node
/**
 * Consumer gate: can the package be TAKEN FROM A REGISTRY and used (`req-quality-consumer`)?
 * "The file exists" does not mean "it works": `ng add` once fell over with `check-package`
 * green. Hence the route — pack → publish → install BY NAME → `ng add` → SSR → browser.
 *
 *   1. `tarball`     — the archive holds the skin, every `exports` file, every factory,
 *   2. `registry`     — the publish worked and the registry serves THAT archive, locally,
 *   3. `install`  — installing BY NAME pulls our version into the app's `node_modules`,
 *   4. `ng-add`      — the schematic from the INSTALLED package runs and adds the skin,
 *   5. `build`       — the app builds with SSR, its bundles hold the library and the tokens,
 *   6. `ssr`         — the built server renders the component ON THE SERVER,
 *   7. `e2e`         — the browser sees a button painted with a token from the skin.
 *
 * Points 6 and 7 are the promise, 1–5 mostly the DENOMINATOR ([`lesson-36`](../docs/lessons.md#lesson-36)).
 * `peerDependencies` are NOT installed from a registry, so a version-range drift passes
 * here — `req-project-dependencies` (B7) watches that.
 *
 * Usage: node tools/check-consumer.mjs [--keep] [--write-reference]
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = 'dist/libs/components';
const PACKAGE = '@pacit/components';
const FIXTURES = join(ROOT, 'tools/check-consumer.fixtures');
const REFERENCE = '_reference.json';
const WORKDIR = join(ROOT, 'tmp/check-consumer');
const KEEP = process.argv.includes('--keep');
const WRITE_REFERENCE = process.argv.includes('--write-reference');

/** The skin. The same constant as in `check-package` — the same file, other side. */
const SKIN = 'themes/pct.css';

/**
 * Traces of the library in the application's bundle and in the rendered HTML.
 *
 * Measured, not assumed: a selector the application writes itself (`pctButton` in
 * `<button pctButton>`) CANNOT be a marker. An attribute directive that stopped matching
 * is no error in Angular — the attribute stays a static attribute of the element. Counted
 * in the bundle of the same application, once with `imports: [PctButton]` and once
 * without: `pctButton` 2 → **1**, `pct-button` 33 → 0, `data-pct-part` 2 → 0. A marker
 * taken from the selector would therefore be non-zero exactly when the library is not in
 * the bundle at all. It has to come from THE LIBRARY'S CODE: `pct-button` is a class from
 * the `host` block, and `data-pct-part` is the public styling API (`req-api-parts`). The
 * application writes neither.
 */
const MARKERS = ['data-pct-part', 'pct-button'];

/** The token the library paints the button's background with, measured on both sides. */
const BACKGROUND_TOKEN = '--pct-button-bg';

/** The initial `background-color` — what is left after an unresolved `var()`. */
const INITIAL_BACKGROUND = 'rgba(0, 0, 0, 0)';

/**
 * A violation of one of the seven checks. It carries the identifier of the check AND of
 * the rule: a point is not one sentence, and a negative control comparing the point alone
 * lets through a case that fired on a neighbouring rule of that same point — measured in
 * ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
class ConsumerError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (xs) => [...xs].sort().join(', ') || '(empty)';

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a finished measurement. Throws `ConsumerError` on the first
 * violation; returns a summary sentence.
 *
 * Every rule reads the measurement DEFENSIVELY, even though the previous one "already
 * checked that". A dependency between rules is normal; writing it so that disarming the
 * previous one turns the gate into a `TypeError` is not — the negative control then loses
 * the ability to examine the rule it was meant to examine. The same defect has come out six
 * times running.
 */
const checkConsumer = (input) => {
  const fail = (check, rule, description) => {
    throw new ConsumerError(check, rule, description);
  };

  // ── 1. tarball ──────────────────────────────────────────────────────────────
  // What `npm pack` really packed. `check-package` walks the `dist` directory, and between
  // it and a consumer's `node_modules` stands a filter (`files`, `.npmignore`) — a file
  // present in `dist` and absent from the archive is invisible to that gate and fatal for
  // the consumer.
  const tarball = input.tarball ?? {};
  const files = new Set(tarball.files ?? []);
  if (files.size === 0)
    fail(
      'tarball',
      'empty',
      `\`npm pack ${DIST}\` listed no file at all — every later point would then always ` +
        `pass, having nothing to look for`,
    );

  if (!files.has(SKIN))
    fail(
      'tarball',
      'theme-missing',
      `the archive holds no \`${SKIN}\`, though the file is in \`${DIST}\` — so ` +
        `\`npm pack\` filtered it out (the \`files\` field or \`.npmignore\`).\n` +
        `    The consumer gets components referring to tokens nobody ` +
        `declares (lesson-36), and \`check-package\` will not see it: it reads a directory`,
    );

  if (!files.has('LICENSE'))
    fail(
      'tarball',
      'licence-missing',
      `the archive holds no \`LICENSE\` file, though it is in \`${DIST}\` — \`npm pack\` ` +
        `filtered it out.\n` +
        `    A \`"license"\` in the manifest with no file is formally an incomplete ` +
        `licence, and \`check-package\` will not see it: it reads a directory, not an archive`,
    );

  const manifest = tarball.manifest ?? {};
  const fromExports = Object.values(manifest.exports ?? {})
    .map((target) => (typeof target === 'object' ? target?.default : target))
    .filter((p) => typeof p === 'string' && !p.includes('*'))
    .map((p) => p.replace(/^\.\//, ''));
  const missingFromExports = fromExports.filter((p) => !files.has(p));
  if (missingFromExports.length)
    fail(
      'tarball',
      'entrypoint-missing',
      `the \`exports\` map promises files the archive does not hold: ` +
        `${list(missingFromExports)}.\n` +
        `    Importing such an entrypoint ends at the consumer's with ERR_MODULE_NOT_FOUND`,
    );

  const namedCollections = [
    manifest.schematics,
    manifest['ng-update']?.migrations,
  ].filter((p) => typeof p === 'string');
  const missingCollections = namedCollections
    .map((p) => p.replace(/^\.\//, ''))
    .filter((p) => !files.has(p));
  const missingFactories = (tarball.factories ?? []).filter(
    (p) => !files.has(p),
  );
  if (missingCollections.length || missingFactories.length)
    fail(
      'tarball',
      'schematic-missing',
      `the archive does not hold the files the manifest points at:\n` +
        (missingCollections.length
          ? `      collections: ${list(missingCollections)}\n`
          : '') +
        (missingFactories.length
          ? `      factories: ${list(missingFactories)}\n`
          : '') +
        `    \`ng add\`/\`ng update\` will fail at the consumer's with "Collection not found"`,
    );

  // ── 2. registry ──────────────────────────────────────────────────────────────
  // The publish and what the registry then serves. This point exists because of the
  // UPLINK: the Verdaccio configuration proxies npmjs, so a failed publish does NOT end in
  // an install error — it ends in somebody else's package of that name being fetched.
  // Today there is no `@pacit/components` on npmjs; from the first release (B2) there will
  // be, and a gate without this point would then examine a pre-release artifact and look
  // green.
  const registry = input.registry ?? {};
  if (!registry.published)
    fail(
      'registry',
      'publish',
      `\`npm publish\` to the local registry failed.\n` +
        `    ${registry.output ?? '(no output)'}`,
    );

  const metadata = registry.metadata;
  if (!metadata || !(metadata.versions ?? []).includes(tarball.version))
    fail(
      'registry',
      'version',
      `the registry does not serve version \`${tarball.version}\` — it knows: ` +
        `${list(metadata?.versions ?? [])}`,
    );

  if (metadata?.integrity !== tarball.integrity)
    fail(
      'registry',
      'integrity',
      `the registry serves a DIFFERENT archive from the one we packed:\n` +
        `      packed:        ${tarball.integrity}\n` +
        `      from registry: ${metadata.integrity}\n` +
        `    Usual cause: the answer came from the npmjs uplink, not from the publish`,
    );

  if (!String(metadata?.tarball ?? '').startsWith(registry.url ?? '\0'))
    fail(
      'registry',
      'not-local',
      `the archive's address (\`${metadata?.tarball}\`) does not start with the local ` +
        `registry (\`${registry.url}\`) — we would be measuring somebody else's package`,
    );

  // ── 3. install ───────────────────────────────────────────────────────────
  const install = input.install ?? {};
  const entry = install.entry;
  if (!entry)
    fail(
      'install',
      'entry-missing',
      `after \`npm install ${PACKAGE}\` there is no \`node_modules/${PACKAGE}\` entry in ` +
        `the application's lock file — the install never happened`,
    );

  // `entry?.` even though the rule above "already checked" that the entry exists. Disarming
  // that one gave a `TypeError` here instead of a message — the SEVENTH time for this
  // defect in this repository, this time in a gate written in
  // full awareness of the previous six and with a paragraph about it in the header. A
  // dependency between rules is normal; writing it so that disarming the previous one puts
  // out the next one's message is not.
  if (!String(entry?.resolved ?? '').startsWith(registry.url ?? '\0'))
    fail(
      'install',
      'outside-the-registry',
      `the installed package came from outside the local registry:\n` +
        `      resolved: ${entry?.resolved}\n` +
        `      registry: ${registry.url}`,
    );

  if (entry?.integrity !== tarball.integrity)
    fail(
      'install',
      'integrity-differs',
      `the installed archive is not the one we packed:\n` +
        `      packed:    ${tarball.integrity}\n` +
        `      installed:  ${entry?.integrity}`,
    );

  // The DENOMINATOR of module resolution. The application sits in the repository's `tmp/`
  // so that `@angular/*` is found by walking up the tree — and that same walk would one day
  // find `@pacit/components` there, had anyone installed it at the root. The whole gate
  // would then be measuring a package it did not publish.
  const resolution = install.resolution;
  const inTheApp = `${install.directory ?? '\0'}/node_modules/`;
  if (!resolution || !String(resolution).startsWith(inTheApp))
    fail(
      'install',
      'outside-the-app',
      `the application resolves \`${PACKAGE}/button\` to \`${resolution}\`, outside its ` +
        `own \`node_modules\` (\`${inTheApp}\`) — we would be measuring a package other ` +
        `than the installed one`,
    );

  // ── 4. ng add ───────────────────────────────────────────────────────────────
  // The schematic from the INSTALLED package, run by the real Angular CLI.
  // `check-package` asks whether the factory file exists; this point asks whether it can
  // be loaded and does anything. The difference between those questions cost this library
  // a crash on the consumer's first command.
  const ngAdd = input.ngAdd ?? {};
  if (ngAdd.code !== 0)
    fail(
      'ng-add',
      'schematic-failed',
      `the \`${PACKAGE}:ng-add\` schematic exited with code ${ngAdd.code}.\n` +
        `    ${(ngAdd.output ?? '(no output)').split('\n').slice(0, 6).join('\n    ')}`,
    );

  const before = ngAdd.stylesBefore ?? [];
  const after = ngAdd.stylesAfter ?? [];
  if (after.length <= before.length)
    fail(
      'ng-add',
      'no-change',
      `the schematic passed, but the \`styles\` list did not change (${before.length} → ` +
        `${after.length}) — \`ng add\` ended with an instruction to be carried out by hand ` +
        `or with a silent no-op`,
    );

  if (!after.some((s) => String(s).includes(PACKAGE)))
    fail(
      'ng-add',
      'theme-missing-from-styles',
      `after \`ng add\` there is no entry from \`${PACKAGE}\` in \`styles\`: ` +
        `${list(after)}.\n` +
        `    With no skin the components render with no appearance and nobody notices ` +
        `(lesson-36)`,
    );

  // ── 5. build ────────────────────────────────────────────────────────────────
  const build = input.build ?? {};
  if (build.code !== 0)
    fail(
      'build',
      'build-failed',
      `the consumer application's build exited with code ${build.code}.\n` +
        `    ${(build.output ?? '(no output)').split('\n').slice(-8).join('\n    ')}`,
    );

  if (!build.server)
    fail(
      'build',
      'server-missing',
      `the build's output holds no server bundle — the application built WITHOUT SSR, ` +
        `and the promise speaks of a build with SSR`,
    );

  const missingMarkers = MARKERS.filter((m) => !(build.markers ?? {})[m]);
  if (missingMarkers.length)
    fail(
      'build',
      'library-absent',
      `the browser bundle holds no trace of the library: ${list(missingMarkers)}.\n` +
        `    This is the DENOMINATOR: an application that never pulled the library in ` +
        `passes every assertion about its behaviour, having nothing to notice`,
    );

  if (!(build.tokensInCss > 0))
    fail(
      'build',
      'theme-absent',
      `the application's stylesheet has not one \`--pct-*\` declaration ` +
        `(counted: ${build.tokensInCss}).\n` +
        `    The skin never reached the build — exactly the state of lesson-36, only ` +
        `at the consumer`,
    );

  // ── 6. ssr ──────────────────────────────────────────────────────────────────
  const ssr = input.ssr ?? {};
  if (ssr.status !== 200)
    fail(
      'ssr',
      'status',
      `the application's server answered ${ssr.status ?? '(no answer)'} instead of 200.\n` +
        `    ${(ssr.content ?? '').slice(0, 300)}`,
    );

  if (ssr.context !== 'ssr')
    fail(
      'ssr',
      'no-render',
      `the answer carries \`ng-server-context="${ssr.context}"\` and not \`"ssr"\` — the ` +
        `content came from a static file, so the server bundle rendered nothing and the ` +
        `point below would be examining the result of a prerender`,
    );

  if (!(ssr.markers ?? {})['pct-button'])
    fail(
      'ssr',
      'no-component',
      `the server's HTML holds no \`pct-button\` class — the component did not render on ` +
        `the server (did the library reach for \`document\`? did it fail to match?)`,
    );

  if ((ssr.parts ?? []).length === 0)
    fail(
      'ssr',
      'no-parts',
      `the server's HTML holds not one \`data-pct-part\` — the public styling API ` +
        `(req-api-parts) never reached the consumer`,
    );

  // ── 7. e2e ──────────────────────────────────────────────────────────────────
  const e2e = input.e2e ?? {};
  if (!e2e.element)
    fail(
      'e2e',
      'element-missing',
      `the browser found no button in the tree — everything below would be vacuously ` +
        `true, with nothing to measure`,
    );

  if (!String(e2e.token ?? '').trim())
    fail(
      'e2e',
      'no-theme',
      `\`${BACKGROUND_TOKEN}\` computed on the button is empty — the skin never reached the ` +
        `browser. The button is then in the DOM with all its classes and parts and no ` +
        `appearance: the silent defect of lesson-36 in its final form`,
    );

  if (e2e.background === INITIAL_BACKGROUND)
    fail(
      'e2e',
      'background-initial',
      `the button's background has the INITIAL value (\`${INITIAL_BACKGROUND}\`) — the ` +
        `\`background: var(${BACKGROUND_TOKEN})\` declaration did not resolve and the browser ` +
        `quietly fell back to transparent`,
    );

  if (e2e.background !== e2e.tokenBackground)
    fail(
      'e2e',
      'background-not-from-token',
      `the button's background (\`${e2e.background}\`) is not the value of \`${BACKGROUND_TOKEN}\` ` +
        `(\`${e2e.tokenBackground}\`) — the skin is loaded and the component paints itself with ` +
        `something else, so overriding the token at the consumer's changes nothing`,
    );

  if ((e2e.errors ?? []).length)
    fail(
      'e2e',
      'console-error',
      `the browser reported ${e2e.errors.length} errors on the consumer's page:\n` +
        e2e.errors.map((b) => `      ${String(b).slice(0, 200)}`).join('\n') +
        `\n    Hydration mismatches (NG05xx) land here: the page looks right and pays ` +
        `with a double render`,
    );

  return (
    `an archive of ${files.size} files (${tarball.version}) → registry → SSR app: ` +
    `${build.tokensInCss} token declarations in the stylesheet, ` +
    `${(ssr.parts ?? []).length} parts in the server's HTML, ` +
    `background ${e2e.background} from \`${BACKGROUND_TOKEN}\``
  );
};

// ── measurement ────────────────────────────────────────────────────────────────────

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

/** A free port. This gate runs in CI beside other things, and 4873 is often taken. */
const freePort = () =>
  new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Waits until an address answers. Returns `false` rather than throwing — a point judges. */
const waitForHttp = async (url, seconds = 60) => {
  for (let i = 0; i < seconds * 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
};

/**
 * Runs a command capturing EVERYTHING — the exit code and both streams. A non-zero code is
 * DATA here, not an exception: points 4 and 5 are to pronounce on it and print the output,
 * and an `execFileSync` that throws would turn the gate into a stack trace at exactly the
 * place where it was to say what happened.
 */
const run = (file, args, options = {}) => {
  try {
    const out = execFileSync(file, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    return { code: 0, output: out ?? '' };
  } catch (e) {
    return {
      code: e.status ?? 1,
      output: `${e.stdout ?? ''}${e.stderr ?? ''}` || String(e.message ?? e),
    };
  }
};

/** The factory files from a schematic collection — paths as they lie in the archive. */
const schematicFactories = (manifest) => {
  const out = [];
  for (const pointer of [
    manifest?.schematics,
    manifest?.['ng-update']?.migrations,
  ]) {
    if (typeof pointer !== 'string') continue;
    const collection = readJson(join(ROOT, DIST, pointer));
    for (const def of Object.values(collection?.schematics ?? {})) {
      const factory = String(def.factory ?? '').split('#')[0];
      if (!factory) continue;
      out.push(join(dirname(pointer), `${factory}.js`).replace(/^\.\//, ''));
    }
  }
  return out;
};

/**
 * The working directory: the consumer application and the registry's storage. It sits in
 * the repository's `tmp/` rather than in the system's temporary directory, and not out of
 * convenience — module resolution is to walk up the tree to the repository's
 * `node_modules`, so `@angular/*` is found by itself and ONLY the measured package comes
 * from the registry. The same choice as in `check-bundle`. `tmp/` is in `.gitignore`, so
 * the probe's files do not become a defect for `check-typecheck`.
 */
const prepareDirectory = () => {
  rmSync(WORKDIR, { recursive: true, force: true });
  mkdirSync(join(WORKDIR, 'app/src'), { recursive: true });
  mkdirSync(join(WORKDIR, 'registry'), { recursive: true });
  return { app: join(WORKDIR, 'app'), registry: join(WORKDIR, 'registry') };
};

/**
 * The consumer application. Written here rather than kept in the repository as a project,
 * because a project in the repository would be built by `nx affected` and typechecked —
 * that is, it would measure the SOURCES, while the whole point is that only the installed
 * package is visible here.
 *
 * The route goes through a router with `RenderMode.Server` rather than the default
 * prerender: without it the builder writes a finished `index.html`, the server serves a
 * static file (`ng-server-context="ssg"`) and the server bundle never renders. Measured —
 * only with the router does the answer carry `ng-server-context="ssr"`.
 *
 * `security.allowedHosts` is an Angular 22 requirement (protection against SSRF): without
 * it
 * the server answers 400 to its own `Host: localhost:<port>`. That is the application's
 * configuration, not the library's — but without it point 6 would be measuring a
 * framework error instead of the package.
 */
const writeApp = (app) => {
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      { name: 'pct-consumer', version: '0.0.0', private: true },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    join(app, 'angular.json'),
    JSON.stringify(
      {
        version: 1,
        projects: {
          consumer: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: {
                  outputPath: 'out',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  server: 'src/main.server.ts',
                  ssr: { entry: 'src/server.ts' },
                  outputMode: 'server',
                  tsConfig: 'tsconfig.json',
                  optimization: true,
                  outputHashing: 'none',
                  security: { allowedHosts: ['localhost'] },
                  // Empty ON PURPOSE: `ng add` fills the list and point 4 measures the difference.
                  styles: [],
                },
              },
            },
          },
        },
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    join(app, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          skipLibCheck: true,
          strict: true,
          types: ['node'],
        },
        files: ['src/main.ts', 'src/main.server.ts', 'src/server.ts'],
      },
      null,
      2,
    ) + '\n',
  );

  const file = (name, content) =>
    writeFileSync(join(app, 'src', name), content.join('\n') + '\n');

  file('index.html', [
    '<!doctype html>',
    '<html lang="pl">',
    '  <head><meta charset="utf-8" /><title>consumer</title></head>',
    '  <body><app-root></app-root></body>',
    '</html>',
  ]);

  file('app.ts', [
    `import { Component } from '@angular/core';`,
    `import { RouterOutlet } from '@angular/router';`,
    `import { PctButton } from '${PACKAGE}/button';`,
    ``,
    `@Component({`,
    `  selector: 'app-probe',`,
    `  imports: [PctButton],`,
    `  template: \`<button pctButton id="probe">Save</button>\`,`,
    `})`,
    `export class Probe {}`,
    ``,
    `@Component({`,
    `  selector: 'app-root',`,
    `  imports: [RouterOutlet],`,
    `  template: \`<router-outlet />\`,`,
    `})`,
    `export class App {}`,
  ]);

  file('main.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  bootstrapApplication,`,
    `  provideClientHydration,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { App, Probe } from './app';`,
    ``,
    `bootstrapApplication(App, {`,
    `  providers: [`,
    `    provideZonelessChangeDetection(),`,
    `    provideClientHydration(),`,
    `    provideRouter([{ path: '', component: Probe }]),`,
    `  ],`,
    `}).catch((e) => console.error(e));`,
  ]);

  file('main.server.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  BootstrapContext,`,
    `  bootstrapApplication,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';`,
    `import { App, Probe } from './app';`,
    ``,
    `const bootstrap = (context: BootstrapContext) =>`,
    `  bootstrapApplication(`,
    `    App,`,
    `    {`,
    `      providers: [`,
    `        provideZonelessChangeDetection(),`,
    `        provideRouter([{ path: '', component: Probe }]),`,
    `        provideServerRendering(`,
    `          withRoutes([{ path: '**', renderMode: RenderMode.Server }]),`,
    `        ),`,
    `      ],`,
    `    },`,
    `    context,`,
    `  );`,
    ``,
    `export default bootstrap;`,
  ]);

  file('server.ts', [
    `import {`,
    `  AngularNodeAppEngine,`,
    `  createNodeRequestHandler,`,
    `  isMainModule,`,
    `  writeResponseToNodeResponse,`,
    `} from '@angular/ssr/node';`,
    `import express from 'express';`,
    `import { dirname, resolve } from 'node:path';`,
    `import { fileURLToPath } from 'node:url';`,
    ``,
    `const serverDistFolder = dirname(fileURLToPath(import.meta.url));`,
    `const browserDistFolder = resolve(serverDistFolder, '../browser');`,
    ``,
    `const app = express();`,
    `const angularApp = new AngularNodeAppEngine();`,
    ``,
    `app.use(express.static(browserDistFolder, { index: false, redirect: false }));`,
    `app.use('/**', (req, res, next) => {`,
    `  angularApp`,
    `    .handle(req)`,
    `    .then((r) => (r ? writeResponseToNodeResponse(r, res) : next()))`,
    `    .catch(next);`,
    `});`,
    ``,
    `if (isMainModule(import.meta.url)) {`,
    `  app.listen(Number(process.env['PORT'] ?? 4000));`,
    `}`,
    ``,
    `export const reqHandler = createNodeRequestHandler(app);`,
  ]);
};

/** A running Verdaccio with storage that is fresh for every run. */
const startRegistry = async (storage, port) => {
  const proc = spawn(
    process.execPath,
    [
      join(ROOT, 'node_modules/verdaccio/bin/verdaccio'),
      '--config',
      join(ROOT, '.verdaccio/config.yml'),
      '--listen',
      String(port),
    ],
    {
      cwd: ROOT,
      // The storage is per run, not the one from the configuration: publishing the same
      // version into persistent storage ends in a conflict the second time, so the gate
      // would fire on ITSELF. The configuration stays the real one — the variable
      // overrides a single path in it rather than forking the file it was to watch.
      env: { ...process.env, VERDACCIO_STORAGE_PATH: storage },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const started = await waitForHttp(`http://localhost:${port}/-/ping`, 30);
  return { proc, started, log: () => log };
};

/** The measurement in a browser. One pass, exactly as the promise says. */
const inBrowser = async (url) => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'networkidle' });
    return {
      ...(await page.evaluate(
        ([backgroundToken]) => {
          const el = document.querySelector('#probe');
          if (!el) return { element: false };
          // The token's value is measured by the BROWSER, not parsed in Node: a token is
          // sometimes a chain of `var()`, and the comparison is to be between two values
          // computed by the same engine. The probe sits inside the button, so it
          // inherits its scope of custom properties.
          const probe = document.createElement('span');
          probe.style.backgroundColor = `var(${backgroundToken})`;
          el.appendChild(probe);
          const tokenBackground = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return {
            element: true,
            token: getComputedStyle(el)
              .getPropertyValue(backgroundToken)
              .trim(),
            background: getComputedStyle(el).backgroundColor,
            tokenBackground,
            parts: [...document.querySelectorAll('[data-pct-part]')].map((e) =>
              e.getAttribute('data-pct-part'),
            ),
          };
        },
        [BACKGROUND_TOKEN],
      )),
      errors,
    };
  } finally {
    await browser.close();
  }
};

/** The consumer's route, run end to end. */
const measureRepository = async () => {
  const dist = join(ROOT, DIST);
  const manifest = readJson(join(dist, 'package.json'));
  if (!manifest)
    throw new ConsumerError(
      'tarball',
      'empty',
      `no built package in ${DIST} — this gate measures the artifact, not the sources.\n` +
        `    The target needs a \`dependsOn\` on the library's build`,
    );

  const { app, registry: registryDir } = prepareDirectory();
  const port = await freePort();
  const portApp = await freePort();
  const url = `http://localhost:${port}`;

  // An npm configuration per run. The registry demands a token even under `publish: $all`
  // (without one npm ends in ENEEDAUTH), and writing it into `~/.npmrc` would change the
  // machine's settings — that is what the `@nx/js:verdaccio` executor does, and why this
  // gate does not use it.
  const npmrc = join(WORKDIR, 'npmrc');
  writeFileSync(
    npmrc,
    `registry=${url}/\n//localhost:${port}/:_authToken=pct-check-consumer\n`,
  );
  const npmEnv = { ...process.env, npm_config_userconfig: npmrc };

  const registryProc = await startRegistry(registryDir, port);
  let appServer = null;

  try {
    if (!registryProc.started)
      throw new ConsumerError(
        'registry',
        'publish',
        `the local registry did not come up at ${url}:\n    ${registryProc.log().slice(0, 500)}`,
      );

    // 1. `npm pack` — what will really travel to the registry.
    const packed = run(
      'npm',
      ['pack', dist, '--json', '--pack-destination', WORKDIR],
      { cwd: ROOT },
    );
    const packDescription = (() => {
      const i = packed.output.indexOf('[');
      try {
        return JSON.parse(packed.output.slice(i))[0];
      } catch {
        return null;
      }
    })();
    const tarball = {
      version: packDescription?.version ?? manifest.version,
      integrity: packDescription?.integrity ?? null,
      files: (packDescription?.files ?? []).map((f) => f.path),
      manifest,
      factories: schematicFactories(manifest),
    };
    const archive = join(WORKDIR, packDescription?.filename ?? 'missing.tgz');

    // 2. publish + read the metadata from the registry.
    const publication = existsSync(archive)
      ? run('npm', ['publish', archive, '--registry', url], {
          cwd: WORKDIR,
          env: npmEnv,
        })
      : { code: 1, output: `the archive ${archive} was not created` };

    const metadata = await (async () => {
      try {
        const r = await fetch(`${url}/${PACKAGE.replace('/', '%2f')}`);
        const j = await r.json();
        const w = j?.versions?.[tarball.version];
        return {
          versions: Object.keys(j?.versions ?? {}),
          integrity: w?.dist?.integrity ?? null,
          tarball: w?.dist?.tarball ?? null,
        };
      } catch {
        return null;
      }
    })();

    // 3. installing BY NAME into a fresh application.
    writeApp(app);
    const installer = run(
      'npm',
      [
        'install',
        `${PACKAGE}@${tarball.version}`,
        '--registry',
        url,
        '--omit=peer',
        '--no-audit',
        '--no-fund',
      ],
      { cwd: app, env: npmEnv },
    );
    const lock = readJson(join(app, 'node_modules/.package-lock.json'));
    const resolution = (() => {
      try {
        return createRequire(join(app, 'src/app.ts')).resolve(
          `${PACKAGE}/button`,
        );
      } catch {
        return null;
      }
    })();

    // 4. `ng add` — the schematic from the installed package, through the real CLI.
    //    Called as `generate`, not `add`: `ng add` is an install PLUS this schematic, and
    //    the install is what point 3 measures — joined into one command they would give
    //    one message for two different failures.
    const cli = join(ROOT, 'node_modules/@angular/cli/bin/ng.js');
    const stylesBefore = readJson(join(app, 'angular.json'))?.projects?.consumer
      ?.architect?.build?.options?.styles;
    const ngAdd = run(
      process.execPath,
      [cli, 'generate', `${PACKAGE}:ng-add`, '--defaults'],
      { cwd: app },
    );
    const stylesAfter = readJson(join(app, 'angular.json'))?.projects?.consumer
      ?.architect?.build?.options?.styles;

    // 5. build with SSR.
    const build = run(process.execPath, [cli, 'build', 'consumer'], {
      cwd: app,
      maxBuffer: 32 * 1024 * 1024,
    });
    const out = join(app, 'out');
    const bundle = existsSync(join(out, 'browser/main.js'))
      ? readFileSync(join(out, 'browser/main.js'), 'utf8')
      : '';
    const sheet = existsSync(join(out, 'browser/styles.css'))
      ? readFileSync(join(out, 'browser/styles.css'), 'utf8')
      : '';

    // 6. server + HTTP.
    let ssr = { status: null, context: null, parts: [], markers: {} };
    if (existsSync(join(out, 'server/server.mjs'))) {
      appServer = spawn(process.execPath, [join(out, 'server/server.mjs')], {
        cwd: out,
        env: { ...process.env, PORT: String(portApp) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const address = `http://localhost:${portApp}/`;
      if (await waitForHttp(address, 60)) {
        const r = await fetch(address);
        const html = await r.text();
        ssr = {
          status: r.status,
          context: html.match(/ng-server-context="([^"]*)"/)?.[1] ?? null,
          parts: [...html.matchAll(/data-pct-part="([^"]*)"/g)].map(
            (m) => m[1],
          ),
          markers: Object.fromEntries(
            MARKERS.map((m) => [m, html.includes(m)]),
          ),
          content: html.slice(0, 400),
        };
      }
    }

    // 7. one pass in a browser.
    const e2e =
      ssr.status === 200
        ? await inBrowser(`http://localhost:${portApp}/`)
        : { element: false, errors: [] };

    return {
      tarball,
      registry: {
        url,
        published: publication.code === 0,
        output: publication.output,
        metadata,
      },
      install: {
        directory: app,
        entry: lock?.packages?.[`node_modules/${PACKAGE}`] ?? null,
        output: installer.output,
        resolution,
      },
      ngAdd: {
        code: ngAdd.code,
        output: ngAdd.output,
        stylesBefore: stylesBefore ?? [],
        stylesAfter: stylesAfter ?? [],
      },
      build: {
        code: build.code,
        output: build.output,
        server: existsSync(join(out, 'server/server.mjs')),
        markers: Object.fromEntries(
          MARKERS.map((m) => [m, bundle.includes(m)]),
        ),
        tokensInCss: [...sheet.matchAll(/--pct-[a-z0-9-]+\s*:/g)].length,
      },
      ssr,
      e2e,
    };
  } finally {
    appServer?.kill('SIGTERM');
    registryProc.proc.kill('SIGTERM');
    if (!KEEP) rmSync(WORKDIR, { recursive: true, force: true });
  }
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 *
 * The measurement arrives as DATA rather than from a real run: starting a registry, an
 * install, a build and a browser for each of twenty-odd cases would cost quarter hours. The
 * same choice as in `check-bundle` and `check-parts`, and the same price, written down: the
 * fixtures do NOT exercise the measuring code — they exercise the arrangement of checks.
 * The measuring code is exercised on every run against the real repository.
 */
const buildFixture = (fx) => {
  const we = structuredClone(readFixture(REFERENCE));

  const dropFromList = (list, co) => list.filter((x) => x !== co);

  if (fx.clearFiles) we.tarball.files = [];
  if (fx.dropFile)
    we.tarball.files = dropFromList(we.tarball.files, fx.dropFile);
  if (fx.addExport)
    we.tarball.manifest.exports[fx.addExport.key] = fx.addExport.target;
  if (fx.addFactory)
    we.tarball.factories = [...we.tarball.factories, fx.addFactory];
  if (fx.collectionInManifest !== undefined)
    we.tarball.manifest.schematics = fx.collectionInManifest;

  if (fx.published !== undefined) we.registry.published = fx.published;
  if (fx.registryVersions) we.registry.metadata.versions = fx.registryVersions;
  if (fx.registryIntegrity)
    we.registry.metadata.integrity = fx.registryIntegrity;
  if (fx.registryTarball) we.registry.metadata.tarball = fx.registryTarball;

  if (fx.withoutEntry) we.install.entry = null;
  if (fx.installResolved) we.install.entry.resolved = fx.installResolved;
  if (fx.installIntegrity) we.install.entry.integrity = fx.installIntegrity;
  if (fx.resolution) we.install.resolution = fx.resolution;

  if (fx.ngAddCode !== undefined) we.ngAdd.code = fx.ngAddCode;
  if (fx.stylesAfter) we.ngAdd.stylesAfter = fx.stylesAfter;

  if (fx.buildCode !== undefined) we.build.code = fx.buildCode;
  if (fx.withoutServer) we.build.server = false;
  if (fx.buildMarker) we.build.markers[fx.buildMarker] = false;
  if (fx.tokensInCss !== undefined) we.build.tokensInCss = fx.tokensInCss;

  if (fx.ssrStatus !== undefined) we.ssr.status = fx.ssrStatus;
  if (fx.ssrContext !== undefined) we.ssr.context = fx.ssrContext;
  if (fx.ssrMarker) we.ssr.markers[fx.ssrMarker] = false;
  if (fx.withoutParts) we.ssr.parts = [];

  if (fx.withoutElement) we.e2e.element = false;
  if (fx.token !== undefined) we.e2e.token = fx.token;
  if (fx.background !== undefined) we.e2e.background = fx.background;
  if (fx.tokenBackground !== undefined)
    we.e2e.tokenBackground = fx.tokenBackground;
  if (fx.errors) we.e2e.errors = fx.errors;

  return we;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

/**
 * `--write-reference` exists so that the reference input is an IMPRINT of a real
 * measurement rather than a sentence written by hand beside one: a written one drifts from
 * the measurement's shape at the first change, and the input stops passing for a reason
 * nobody was examining. Long command outputs are trimmed — in the fixtures they are quoted
 * only in error messages, and tens of kilobytes of build log in a versioned file would be
 * noise.
 */
if (WRITE_REFERENCE) {
  const measurement = await measureRepository();
  measurement.registry.output = '(npm publish output)';
  measurement.install.output = '(npm install output)';
  measurement.ngAdd.output = '(ng generate output)';
  measurement.build.output = '(ng build output)';
  measurement.ssr.content = '(start of the HTML)';
  // The registry's port and the repository's path differ on every run and every machine.
  // The checks compare them WITHIN the measurement (the archive's address starts with the
  // registry's, the resolution lies inside the application's directory), so substituting
  // fixed values weakens nothing and takes noise and somebody's home path out of a
  // versioned file.
  const fixed = JSON.stringify(measurement)
    .split(measurement.registry.url)
    .join('http://localhost:4873')
    .split(measurement.install.directory)
    .join('/repository/tmp/check-consumer/app');
  // The output goes through prettier, because `nx format:check` covers `tools/`. Without
  // that two gates would want different shapes of the same file, and every refresh of the
  // reference would leave the repository with red formatting. The same move as in
  // `check-docs`.
  const prettier = await import('prettier');
  const path = join(FIXTURES, REFERENCE);
  writeFileSync(
    path,
    await prettier.format(JSON.stringify(JSON.parse(fixed), null, 2), {
      ...(await prettier.resolveConfig(path)),
      filepath: path,
    }),
  );
  console.log(
    `✓ Wrote ${REFERENCE} from the measurement. Run the gate once more — the negative ` +
      `control did not run in this pass.`,
  );
  process.exit(0);
}

try {
  description = checkConsumer(await measureRepository());
} catch (error) {
  if (!(error instanceof ConsumerError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-consumer.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were it defective itself, every case would fire because
// of it rather than its own defect, and every "rejected" would be false — this control
// would become the very thing it stands against.
try {
  checkConsumer(buildFixture({}));
} catch (error) {
  if (!(error instanceof ConsumerError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkConsumer(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — point ` +
        `${fx.point} (\`${fx.check}\`), rule \`${fx.rule}\` stopped examining ` +
        `anything`,
    );
  } catch (error) {
    if (!(error instanceof ConsumerError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: rule \`${error.check}/${error.rule}\` fired, and ` +
          `\`${fx.check}/${fx.rule}\` (point ${fx.point}) was meant to — the ` +
          `fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Consumer gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Consumer: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
