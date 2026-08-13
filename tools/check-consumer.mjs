#!/usr/bin/env node
/**
 * Consumer gate: can the package be TAKEN FROM A REGISTRY and used (`req-quality-consumer`)?
 * „The file exists" does not mean „it works": `ng add` once fell over with `check-package`
 * green. Hence the route — pack → publish → install BY NAME → `ng add` → SSR → browser.
 *
 *   1. `tarball`     — the archive holds the skin, every `exports` file, every factory,
 *   2. `rejestr`     — the publish worked and the registry serves THAT archive, locally,
 *   3. `instalacja`  — installing BY NAME pulls our version into the app's `node_modules`,
 *   4. `ng-add`      — the schematic from the INSTALLED package runs and adds the skin,
 *   5. `build`       — the app builds with SSR, its bundles hold the library and the tokens,
 *   6. `ssr`         — the built server renders the component ON THE SERVER,
 *   7. `e2e`         — the browser sees a button painted with a token from the skin.
 *
 * Points 6 and 7 are the promise, 1–5 mostly the DENOMINATOR ([`lesson-36`](../docs/lessons.md#lesson-36)).
 * `peerDependencies` are NOT installed from a registry, so a version-range drift passes
 * here — `req-project-dependencies` (B7) watches that.
 *
 * Usage: node tools/check-consumer.mjs [--zostaw] [--zapisz-wzorzec]
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
const PAKIET = '@pacit/components';
const FIXTURES = join(ROOT, 'tools/check-consumer.fixtures');
const BAZA = '_poprawny.json';
const PRACA = join(ROOT, 'tmp/check-consumer');
const ZOSTAW = process.argv.includes('--zostaw');
const WZORZEC = process.argv.includes('--zapisz-wzorzec');

/** The skin. The same constant as in `check-package` — the same file, other side. */
const SKORKA = 'themes/pct.css';

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
const MARKERY = ['data-pct-part', 'pct-button'];

/** The token the library paints the button's background with, measured on both sides. */
const TOKEN_TLA = '--pct-button-bg';

/** The initial `background-color` — what is left after an unresolved `var()`. */
const TLO_POCZATKOWE = 'rgba(0, 0, 0, 0)';

/**
 * A violation of one of the seven checks. It carries the identifier of the check AND of
 * the rule: a point is not one sentence, and a negative control comparing the point alone
 * lets through a case that fired on a neighbouring rule of that same point — measured in
 * A12 and confirmed in A11 ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
class BladKonsumenta extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const lista = (xs) => [...xs].sort().join(', ') || '(pusto)';

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a finished measurement. Throws `BladKonsumenta` on the first
 * violation; returns a summary sentence.
 *
 * Every rule reads the measurement DEFENSIVELY, even though the previous one „already
 * checked that". A dependency between rules is normal; writing it so that disarming the
 * previous one turns the gate into a `TypeError` is not — the negative control then loses
 * the ability to examine the rule it was meant to examine. The same defect came out in A3,
 * A4, A7, A8, A11 and A12, six times running.
 */
const sprawdzKonsumenta = (we) => {
  const fail = (kontrola, regula, opis) => {
    throw new BladKonsumenta(kontrola, regula, opis);
  };

  // ── 1. tarball ──────────────────────────────────────────────────────────────
  // What `npm pack` really packed. `check-package` walks the `dist` directory, and between
  // it and a consumer's `node_modules` stands a filter (`files`, `.npmignore`) —
  // plik obecny w `dist` i nieobecny w archiwum jest dla tamtej bramki niewidzialny,
  // a dla konsumenta fatalny.
  const tarball = we.tarball ?? {};
  const pliki = new Set(tarball.pliki ?? []);
  if (pliki.size === 0)
    fail(
      'tarball',
      'pusty',
      `\`npm pack ${DIST}\` listed no file at all — every later point would then always ` +
        `pass, having nothing to look for`,
    );

  if (!pliki.has(SKORKA))
    fail(
      'tarball',
      'brak-skorki',
      `the archive holds no \`${SKORKA}\`, though the file is in \`${DIST}\` — so ` +
        `\`npm pack\` filtered it out (the \`files\` field or \`.npmignore\`).\n` +
        `    The consumer gets components referring to tokens nobody ` +
        `declares (lesson-36), and \`check-package\` will not see it: it reads a directory`,
    );

  if (!pliki.has('LICENSE'))
    fail(
      'tarball',
      'brak-licencji',
      `the archive holds no \`LICENSE\` file, though it is in \`${DIST}\` — \`npm pack\` ` +
        `filtered it out.\n` +
        `    A \`"license"\` in the manifest with no file is formally an incomplete ` +
        `licence, and \`check-package\` will not see it: it reads a directory, not an archive`,
    );

  const manifest = tarball.manifest ?? {};
  const zExports = Object.values(manifest.exports ?? {})
    .map((cel) => (typeof cel === 'object' ? cel?.default : cel))
    .filter((p) => typeof p === 'string' && !p.includes('*'))
    .map((p) => p.replace(/^\.\//, ''));
  const brakZExports = zExports.filter((p) => !pliki.has(p));
  if (brakZExports.length)
    fail(
      'tarball',
      'brak-entrypointu',
      `the \`exports\` map promises files the archive does not hold: ` +
        `${lista(brakZExports)}.\n` +
        `    Importing such an entrypoint ends at the consumer's with ERR_MODULE_NOT_FOUND`,
    );

  const wskazaneKolekcje = [
    manifest.schematics,
    manifest['ng-update']?.migrations,
  ].filter((p) => typeof p === 'string');
  const brakKolekcji = wskazaneKolekcje
    .map((p) => p.replace(/^\.\//, ''))
    .filter((p) => !pliki.has(p));
  const brakFabryk = (tarball.fabryki ?? []).filter((p) => !pliki.has(p));
  if (brakKolekcji.length || brakFabryk.length)
    fail(
      'tarball',
      'brak-schematica',
      `the archive does not hold the files the manifest points at:\n` +
        (brakKolekcji.length
          ? `      collections: ${lista(brakKolekcji)}\n`
          : '') +
        (brakFabryk.length ? `      factories: ${lista(brakFabryk)}\n` : '') +
        `    \`ng add\`/\`ng update\` will fail at the consumer's with „Collection not found"`,
    );

  // ── 2. rejestr ──────────────────────────────────────────────────────────────
  // The publish and what the registry then serves. This point exists because of the
  // UPLINK: the Verdaccio configuration proxies npmjs, so a failed publish does NOT end in
  // an install error — it ends in somebody else's package of that name being fetched.
  // Today there is no `@pacit/components` on npmjs; from the first release (B2) there will
  // be, and a gate without this point would then examine a pre-release artifact and look
  // green.
  const rejestr = we.rejestr ?? {};
  if (!rejestr.opublikowany)
    fail(
      'rejestr',
      'publikacja',
      `\`npm publish\` to the local registry failed.\n` +
        `    ${rejestr.wyjscie ?? '(no output)'}`,
    );

  const metadane = rejestr.metadane;
  if (!metadane || !(metadane.wersje ?? []).includes(tarball.wersja))
    fail(
      'rejestr',
      'wersja',
      `rejestr nie serwuje wersji \`${tarball.wersja}\` — zna: ` +
        `${lista(metadane?.wersje ?? [])}`,
    );

  if (metadane?.integrity !== tarball.integrity)
    fail(
      'rejestr',
      'integralnosc',
      `the registry serves a DIFFERENT archive from the one we packed:\n` +
        `      packed:        ${tarball.integrity}\n` +
        `      from registry: ${metadane.integrity}\n` +
        `    Usual cause: the answer came from the npmjs uplink, not from the publish`,
    );

  if (!String(metadane?.tarball ?? '').startsWith(rejestr.url ?? '\0'))
    fail(
      'rejestr',
      'nie-lokalny',
      `the archive's address (\`${metadane?.tarball}\`) does not start with the local ` +
        `registry (\`${rejestr.url}\`) — we would be measuring somebody else's package`,
    );

  // ── 3. instalacja ───────────────────────────────────────────────────────────
  const instalacja = we.instalacja ?? {};
  const wpis = instalacja.wpis;
  if (!wpis)
    fail(
      'instalacja',
      'brak-wpisu',
      `after \`npm install ${PAKIET}\` there is no \`node_modules/${PAKIET}\` entry in ` +
        `the application's lock file — the install never happened`,
    );

  // `wpis?.` even though the rule above „already checked" that the entry exists. Disarming
  // that one gave a `TypeError` here instead of a message — the SEVENTH time for this
  // defect in this repository (A3, A4, A7, A8, A11, A12), this time in a gate written in
  // full awareness of the previous six and with a paragraph about it in the header. A
  // dependency between rules is normal; writing it so that disarming the previous one puts
  // out the next one's message is not.
  if (!String(wpis?.resolved ?? '').startsWith(rejestr.url ?? '\0'))
    fail(
      'instalacja',
      'spoza-rejestru',
      `the installed package came from outside the local registry:\n` +
        `      resolved: ${wpis?.resolved}\n` +
        `      rejestr: ${rejestr.url}`,
    );

  if (wpis?.integrity !== tarball.integrity)
    fail(
      'instalacja',
      'inna-integralnosc',
      `the installed archive is not the one we packed:\n` +
        `      packed:    ${tarball.integrity}\n` +
        `      zainstalowane: ${wpis?.integrity}`,
    );

  // The DENOMINATOR of module resolution. The application sits in the repository's `tmp/`
  // so that `@angular/*` is found by walking up the tree — and that same walk would one day
  // find `@pacit/components` there, had anyone installed it at the root. The whole gate
  // would then be measuring a package it did not publish.
  const rozwiazanie = instalacja.rozwiazanie;
  const wAplikacji = `${instalacja.katalog ?? '\0'}/node_modules/`;
  if (!rozwiazanie || !String(rozwiazanie).startsWith(wAplikacji))
    fail(
      'instalacja',
      'spoza-aplikacji',
      `the application resolves \`${PAKIET}/button\` to \`${rozwiazanie}\`, outside its ` +
        `own \`node_modules\` (\`${wAplikacji}\`) — we would be measuring a package other ` +
        `than the installed one`,
    );

  // ── 4. ng add ───────────────────────────────────────────────────────────────
  // The schematic from the INSTALLED package, run by the real Angular CLI.
  // `check-package` asks whether the factory file exists; this point asks whether it can
  // be loaded and does anything. The difference between those questions cost this library
  // a crash on the consumer's first command.
  const ngAdd = we.ngAdd ?? {};
  if (ngAdd.kod !== 0)
    fail(
      'ng-add',
      'schematic-padl',
      `the \`${PAKIET}:ng-add\` schematic exited with code ${ngAdd.kod}.\n` +
        `    ${(ngAdd.wyjscie ?? '(no output)').split('\n').slice(0, 6).join('\n    ')}`,
    );

  const przed = ngAdd.stylePrzed ?? [];
  const po = ngAdd.stylePo ?? [];
  if (po.length <= przed.length)
    fail(
      'ng-add',
      'bez-zmiany',
      `the schematic passed, but the \`styles\` list did not change (${przed.length} → ` +
        `${po.length}) — \`ng add\` ended with an instruction to be carried out by hand ` +
        `or with a silent no-op`,
    );

  if (!po.some((s) => String(s).includes(PAKIET)))
    fail(
      'ng-add',
      'brak-skorki-w-stylach',
      `po \`ng add\` w \`styles\` nie ma ani jednego wpisu z \`${PAKIET}\`: ` +
        `${lista(po)}.\n` +
        `    With no skin the components render with no appearance and nobody notices ` +
        `(lesson-36)`,
    );

  // ── 5. build ────────────────────────────────────────────────────────────────
  const build = we.build ?? {};
  if (build.kod !== 0)
    fail(
      'build',
      'build-padl',
      `the consumer application's build exited with code ${build.kod}.\n` +
        `    ${(build.wyjscie ?? '(no output)').split('\n').slice(-8).join('\n    ')}`,
    );

  if (!build.serwer)
    fail(
      'build',
      'brak-serwera',
      `the build's output holds no server bundle — the application built WITHOUT SSR, ` +
        `and the promise speaks of a build with SSR`,
    );

  const brakMarkerow = MARKERY.filter((m) => !(build.markery ?? {})[m]);
  if (brakMarkerow.length)
    fail(
      'build',
      'biblioteka-nieobecna',
      `the browser bundle holds no trace of the library: ${lista(brakMarkerow)}.\n` +
        `    This is the DENOMINATOR: an application that never pulled the library in ` +
        `passes every assertion about its behaviour, having nothing to notice`,
    );

  if (!(build.tokenyWCss > 0))
    fail(
      'build',
      'skorka-nieobecna',
      `arkusz aplikacji nie ma ani jednej deklaracji \`--pct-*\` ` +
        `(policzone: ${build.tokenyWCss}).\n` +
        `    The skin never reached the build — exactly the state of lesson-36, only ` +
        `u konsumenta`,
    );

  // ── 6. ssr ──────────────────────────────────────────────────────────────────
  const ssr = we.ssr ?? {};
  if (ssr.status !== 200)
    fail(
      'ssr',
      'status',
      `the application's server answered ${ssr.status ?? '(no answer)'} instead of 200.\n` +
        `    ${(ssr.tresc ?? '').slice(0, 300)}`,
    );

  if (ssr.kontekst !== 'ssr')
    fail(
      'ssr',
      'bez-renderu',
      `the answer carries \`ng-server-context="${ssr.kontekst}"\` and not \`"ssr"\` — the ` +
        `content came from a static file, so the server bundle rendered nothing and the ` +
        `point below would be examining the result of a prerender`,
    );

  if (!(ssr.markery ?? {})['pct-button'])
    fail(
      'ssr',
      'bez-komponentu',
      `the server's HTML holds no \`pct-button\` class — the component did not render on ` +
        `the server (did the library reach for \`document\`? did it fail to match?)`,
    );

  if ((ssr.czesci ?? []).length === 0)
    fail(
      'ssr',
      'bez-czesci',
      `the server's HTML holds not one \`data-pct-part\` — the public styling API ` +
        `(req-api-parts) never reached the consumer`,
    );

  // ── 7. e2e ──────────────────────────────────────────────────────────────────
  const e2e = we.e2e ?? {};
  if (!e2e.element)
    fail(
      'e2e',
      'brak-elementu',
      `the browser found no button in the tree — everything below would be vacuously ` +
        `true, with nothing to measure`,
    );

  if (!String(e2e.token ?? '').trim())
    fail(
      'e2e',
      'bez-skorki',
      `\`${TOKEN_TLA}\` computed on the button is empty — the skin never reached the ` +
        `browser. The button is then in the DOM with all its classes and parts and no ` +
        `appearance: the silent defect of lesson-36 in its final form`,
    );

  if (e2e.tlo === TLO_POCZATKOWE)
    fail(
      'e2e',
      'tlo-poczatkowe',
      `the button's background has the INITIAL value (\`${TLO_POCZATKOWE}\`) — the ` +
        `\`background: var(${TOKEN_TLA})\` declaration did not resolve and the browser ` +
        `quietly fell back to transparent`,
    );

  if (e2e.tlo !== e2e.tloTokenu)
    fail(
      'e2e',
      'tlo-nie-z-tokenu',
      `the button's background (\`${e2e.tlo}\`) is not the value of \`${TOKEN_TLA}\` ` +
        `(\`${e2e.tloTokenu}\`) — the skin is loaded and the component paints itself with ` +
        `something else, so overriding the token at the consumer's changes nothing`,
    );

  if ((e2e.bledy ?? []).length)
    fail(
      'e2e',
      'blad-konsoli',
      `the browser reported ${e2e.bledy.length} errors on the consumer's page:\n` +
        e2e.bledy.map((b) => `      ${String(b).slice(0, 200)}`).join('\n') +
        `\n    Hydration mismatches (NG05xx) land here: the page looks right and pays ` +
        `with a double render`,
    );

  return (
    `an archive of ${pliki.size} files (${tarball.wersja}) → registry → SSR app: ` +
    `${build.tokenyWCss} token declarations in the stylesheet, ` +
    `${(ssr.czesci ?? []).length} parts in the server's HTML, ` +
    `background ${e2e.tlo} from \`${TOKEN_TLA}\``
  );
};

// ── pomiar ────────────────────────────────────────────────────────────────────

const czytajJson = (sciezka) => {
  try {
    return JSON.parse(readFileSync(sciezka, 'utf8'));
  } catch {
    return null;
  }
};

/** A free port. This gate runs in CI beside other things, and 4873 is often taken. */
const wolnyPort = () =>
  new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const czekaj = (ms) => new Promise((res) => setTimeout(res, ms));

/** Waits until an address answers. Returns `false` rather than throwing — a point judges. */
const czekajNaHttp = async (url, sekundy = 60) => {
  for (let i = 0; i < sekundy * 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await czekaj(250);
  }
  return false;
};

/**
 * Runs a command capturing EVERYTHING — the exit code and both streams. A non-zero code is
 * DATA here, not an exception: points 4 and 5 are to pronounce on it and print the output,
 * and an `execFileSync` that throws would turn the gate into a stack trace at exactly the
 * place where it was to say what happened.
 */
const uruchom = (plik, args, opcje = {}) => {
  try {
    const out = execFileSync(plik, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opcje,
    });
    return { kod: 0, wyjscie: out ?? '' };
  } catch (e) {
    return {
      kod: e.status ?? 1,
      wyjscie: `${e.stdout ?? ''}${e.stderr ?? ''}` || String(e.message ?? e),
    };
  }
};

/** The factory files from a schematic collection — paths as they lie in the archive. */
const fabrykiSchematicow = (manifest) => {
  const out = [];
  for (const wskaznik of [
    manifest?.schematics,
    manifest?.['ng-update']?.migrations,
  ]) {
    if (typeof wskaznik !== 'string') continue;
    const kolekcja = czytajJson(join(ROOT, DIST, wskaznik));
    for (const def of Object.values(kolekcja?.schematics ?? {})) {
      const fabryka = String(def.factory ?? '').split('#')[0];
      if (!fabryka) continue;
      out.push(join(dirname(wskaznik), `${fabryka}.js`).replace(/^\.\//, ''));
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
const przygotujKatalog = () => {
  rmSync(PRACA, { recursive: true, force: true });
  mkdirSync(join(PRACA, 'app/src'), { recursive: true });
  mkdirSync(join(PRACA, 'registry'), { recursive: true });
  return { app: join(PRACA, 'app'), registry: join(PRACA, 'registry') };
};

/**
 * The consumer application. Written here rather than kept in the repository as a project,
 * because a project in the repository would be built by `nx affected` and typechecked —
 * that is, it would measure the SOURCES, while the whole point is that only the installed
 * package is visible here.
 *
 * The route goes through a router with `RenderMode.Server` rather than the default
 * prerender:
 * bez tego builder wypisuje gotowy `index.html`, serwer serwuje plik statyczny
 * (`ng-server-context="ssg"`) i bundle serwera nie renderuje ani razu. Zmierzone —
 * only with the router does the answer carry `ng-server-context="ssr"`.
 *
 * `security.allowedHosts` jest wymogiem Angulara 22 (ochrona przed SSRF): bez niego
 * the server answers 400 to its own `Host: localhost:<port>`. That is the application's
 * configuration, not the library's — but without it point 6 would be measuring a
 * framework error instead of the package.
 */
const napiszAplikacje = (app) => {
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      { name: 'pct-konsument', version: '0.0.0', private: true },
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
          konsument: {
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

  const plik = (nazwa, tresc) =>
    writeFileSync(join(app, 'src', nazwa), tresc.join('\n') + '\n');

  plik('index.html', [
    '<!doctype html>',
    '<html lang="pl">',
    '  <head><meta charset="utf-8" /><title>konsument</title></head>',
    '  <body><app-root></app-root></body>',
    '</html>',
  ]);

  plik('app.ts', [
    `import { Component } from '@angular/core';`,
    `import { RouterOutlet } from '@angular/router';`,
    `import { PctButton } from '${PAKIET}/button';`,
    ``,
    `@Component({`,
    `  selector: 'app-sonda',`,
    `  imports: [PctButton],`,
    `  template: \`<button pctButton id="sonda">Zapisz</button>\`,`,
    `})`,
    `export class Sonda {}`,
    ``,
    `@Component({`,
    `  selector: 'app-root',`,
    `  imports: [RouterOutlet],`,
    `  template: \`<router-outlet />\`,`,
    `})`,
    `export class App {}`,
  ]);

  plik('main.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  bootstrapApplication,`,
    `  provideClientHydration,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { App, Sonda } from './app';`,
    ``,
    `bootstrapApplication(App, {`,
    `  providers: [`,
    `    provideZonelessChangeDetection(),`,
    `    provideClientHydration(),`,
    `    provideRouter([{ path: '', component: Sonda }]),`,
    `  ],`,
    `}).catch((e) => console.error(e));`,
  ]);

  plik('main.server.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  BootstrapContext,`,
    `  bootstrapApplication,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';`,
    `import { App, Sonda } from './app';`,
    ``,
    `const bootstrap = (context: BootstrapContext) =>`,
    `  bootstrapApplication(`,
    `    App,`,
    `    {`,
    `      providers: [`,
    `        provideZonelessChangeDetection(),`,
    `        provideRouter([{ path: '', component: Sonda }]),`,
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

  plik('server.ts', [
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
const wstanRejestr = async (registry, port) => {
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
      env: { ...process.env, VERDACCIO_STORAGE_PATH: registry },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const wstal = await czekajNaHttp(`http://localhost:${port}/-/ping`, 30);
  return { proc, wstal, log: () => log };
};

/** The measurement in a browser. One pass, exactly as the promise says. */
const wPrzegladarce = async (url) => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const bledy = [];
    page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));
    page.on('pageerror', (e) => bledy.push(String(e)));
    await page.goto(url, { waitUntil: 'networkidle' });
    return {
      ...(await page.evaluate(
        ([tokenTla]) => {
          const el = document.querySelector('#sonda');
          if (!el) return { element: false };
          // The token's value is measured by the BROWSER, not parsed in Node: a token is
          // sometimes a chain of `var()`, and the comparison is to be between two values
          // computed by the same engine. The probe sits inside the button, so it
          // dziedziczy jego scope custom properties.
          const sonda = document.createElement('span');
          sonda.style.backgroundColor = `var(${tokenTla})`;
          el.appendChild(sonda);
          const tloTokenu = getComputedStyle(sonda).backgroundColor;
          sonda.remove();
          return {
            element: true,
            token: getComputedStyle(el).getPropertyValue(tokenTla).trim(),
            tlo: getComputedStyle(el).backgroundColor,
            tloTokenu,
            czesci: [...document.querySelectorAll('[data-pct-part]')].map((e) =>
              e.getAttribute('data-pct-part'),
            ),
          };
        },
        [TOKEN_TLA],
      )),
      bledy,
    };
  } finally {
    await browser.close();
  }
};

/** The consumer's route, run end to end. */
const zmierzRepozytorium = async () => {
  const dist = join(ROOT, DIST);
  const manifest = czytajJson(join(dist, 'package.json'));
  if (!manifest)
    throw new BladKonsumenta(
      'tarball',
      'pusty',
      `no built package in ${DIST} — this gate measures the artifact, not the sources.\n` +
        `    The target needs a \`dependsOn\` on the library's build`,
    );

  const { app, registry } = przygotujKatalog();
  const port = await wolnyPort();
  const portApp = await wolnyPort();
  const url = `http://localhost:${port}`;

  // An npm configuration per run. The registry demands a token even under `publish: $all`
  // (without one npm ends in ENEEDAUTH), and writing it into `~/.npmrc` would change the
  // machine's settings — that is what the `@nx/js:verdaccio` executor does, and why this
  // gate does not use it.
  const npmrc = join(PRACA, 'npmrc');
  writeFileSync(
    npmrc,
    `registry=${url}/\n//localhost:${port}/:_authToken=pct-check-consumer\n`,
  );
  const npmEnv = { ...process.env, npm_config_userconfig: npmrc };

  const rejestr = await wstanRejestr(registry, port);
  let serwerApp = null;

  try {
    if (!rejestr.wstal)
      throw new BladKonsumenta(
        'rejestr',
        'publikacja',
        `the local registry did not come up at ${url}:\n    ${rejestr.log().slice(0, 500)}`,
      );

    // 1. `npm pack` — what will really travel to the registry.
    const spakowane = uruchom(
      'npm',
      ['pack', dist, '--json', '--pack-destination', PRACA],
      { cwd: ROOT },
    );
    const opisPaczki = (() => {
      const i = spakowane.wyjscie.indexOf('[');
      try {
        return JSON.parse(spakowane.wyjscie.slice(i))[0];
      } catch {
        return null;
      }
    })();
    const tarball = {
      wersja: opisPaczki?.version ?? manifest.version,
      integrity: opisPaczki?.integrity ?? null,
      pliki: (opisPaczki?.files ?? []).map((f) => f.path),
      manifest,
      fabryki: fabrykiSchematicow(manifest),
    };
    const archiwum = join(PRACA, opisPaczki?.filename ?? 'brak.tgz');

    // 2. publikacja + odczyt metadanych z rejestru.
    const publikacja = existsSync(archiwum)
      ? uruchom('npm', ['publish', archiwum, '--registry', url], {
          cwd: PRACA,
          env: npmEnv,
        })
      : { kod: 1, wyjscie: `the archive ${archiwum} was not created` };

    const metadane = await (async () => {
      try {
        const r = await fetch(`${url}/${PAKIET.replace('/', '%2f')}`);
        const j = await r.json();
        const w = j?.versions?.[tarball.wersja];
        return {
          wersje: Object.keys(j?.versions ?? {}),
          integrity: w?.dist?.integrity ?? null,
          tarball: w?.dist?.tarball ?? null,
        };
      } catch {
        return null;
      }
    })();

    // 3. installing BY NAME into a fresh application.
    napiszAplikacje(app);
    const instalka = uruchom(
      'npm',
      [
        'install',
        `${PAKIET}@${tarball.wersja}`,
        '--registry',
        url,
        '--omit=peer',
        '--no-audit',
        '--no-fund',
      ],
      { cwd: app, env: npmEnv },
    );
    const lock = czytajJson(join(app, 'node_modules/.package-lock.json'));
    const rozwiazanie = (() => {
      try {
        return createRequire(join(app, 'src/app.ts')).resolve(
          `${PAKIET}/button`,
        );
      } catch {
        return null;
      }
    })();

    // 4. `ng add` — schematic z zainstalowanego pakietu, prawdziwym CLI.
    //    Called as `generate`, not `add`: `ng add` is an install PLUS this schematic, and
    //    the install is what point 3 measures — joined into one command they would give
    //    one message for two different failures.
    const cli = join(ROOT, 'node_modules/@angular/cli/bin/ng.js');
    const stylePrzed = czytajJson(join(app, 'angular.json'))?.projects
      ?.konsument?.architect?.build?.options?.styles;
    const ngAdd = uruchom(
      process.execPath,
      [cli, 'generate', `${PAKIET}:ng-add`, '--defaults'],
      { cwd: app },
    );
    const stylePo = czytajJson(join(app, 'angular.json'))?.projects?.konsument
      ?.architect?.build?.options?.styles;

    // 5. build z SSR.
    const build = uruchom(process.execPath, [cli, 'build', 'konsument'], {
      cwd: app,
      maxBuffer: 32 * 1024 * 1024,
    });
    const out = join(app, 'out');
    const bundle = existsSync(join(out, 'browser/main.js'))
      ? readFileSync(join(out, 'browser/main.js'), 'utf8')
      : '';
    const arkusz = existsSync(join(out, 'browser/styles.css'))
      ? readFileSync(join(out, 'browser/styles.css'), 'utf8')
      : '';

    // 6. serwer + HTTP.
    let ssr = { status: null, kontekst: null, czesci: [], markery: {} };
    if (existsSync(join(out, 'server/server.mjs'))) {
      serwerApp = spawn(process.execPath, [join(out, 'server/server.mjs')], {
        cwd: out,
        env: { ...process.env, PORT: String(portApp) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const adres = `http://localhost:${portApp}/`;
      if (await czekajNaHttp(adres, 60)) {
        const r = await fetch(adres);
        const html = await r.text();
        ssr = {
          status: r.status,
          kontekst: html.match(/ng-server-context="([^"]*)"/)?.[1] ?? null,
          czesci: [...html.matchAll(/data-pct-part="([^"]*)"/g)].map(
            (m) => m[1],
          ),
          markery: Object.fromEntries(
            MARKERY.map((m) => [m, html.includes(m)]),
          ),
          tresc: html.slice(0, 400),
        };
      }
    }

    // 7. one pass in a browser.
    const e2e =
      ssr.status === 200
        ? await wPrzegladarce(`http://localhost:${portApp}/`)
        : { element: false, bledy: [] };

    return {
      tarball,
      rejestr: {
        url,
        opublikowany: publikacja.kod === 0,
        wyjscie: publikacja.wyjscie,
        metadane,
      },
      instalacja: {
        katalog: app,
        wpis: lock?.packages?.[`node_modules/${PAKIET}`] ?? null,
        wyjscie: instalka.wyjscie,
        rozwiazanie,
      },
      ngAdd: {
        kod: ngAdd.kod,
        wyjscie: ngAdd.wyjscie,
        stylePrzed: stylePrzed ?? [],
        stylePo: stylePo ?? [],
      },
      build: {
        kod: build.kod,
        wyjscie: build.wyjscie,
        serwer: existsSync(join(out, 'server/server.mjs')),
        markery: Object.fromEntries(
          MARKERY.map((m) => [m, bundle.includes(m)]),
        ),
        tokenyWCss: [...arkusz.matchAll(/--pct-[a-z0-9-]+\s*:/g)].length,
      },
      ssr,
      e2e,
    };
  } finally {
    serwerApp?.kill('SIGTERM');
    rejestr.proc.kill('SIGTERM');
    if (!ZOSTAW) rmSync(PRACA, { recursive: true, force: true });
  }
};

// ── negative control ──────────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

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
const zlozFixture = (fx) => {
  const we = structuredClone(wczytajFixture(BAZA));

  const usunZListy = (lista, co) => lista.filter((x) => x !== co);

  if (fx.wyczyscPliki) we.tarball.pliki = [];
  if (fx.usunPlik) we.tarball.pliki = usunZListy(we.tarball.pliki, fx.usunPlik);
  if (fx.dodajExport)
    we.tarball.manifest.exports[fx.dodajExport.klucz] = fx.dodajExport.cel;
  if (fx.dodajFabryke)
    we.tarball.fabryki = [...we.tarball.fabryki, fx.dodajFabryke];
  if (fx.kolekcjaWManifescie !== undefined)
    we.tarball.manifest.schematics = fx.kolekcjaWManifescie;

  if (fx.opublikowany !== undefined) we.rejestr.opublikowany = fx.opublikowany;
  if (fx.wersjeWRejestrze) we.rejestr.metadane.wersje = fx.wersjeWRejestrze;
  if (fx.integrityWRejestrze)
    we.rejestr.metadane.integrity = fx.integrityWRejestrze;
  if (fx.tarballWRejestrze) we.rejestr.metadane.tarball = fx.tarballWRejestrze;

  if (fx.bezWpisu) we.instalacja.wpis = null;
  if (fx.resolvedInstalacji)
    we.instalacja.wpis.resolved = fx.resolvedInstalacji;
  if (fx.integrityInstalacji)
    we.instalacja.wpis.integrity = fx.integrityInstalacji;
  if (fx.rozwiazanie) we.instalacja.rozwiazanie = fx.rozwiazanie;

  if (fx.kodNgAdd !== undefined) we.ngAdd.kod = fx.kodNgAdd;
  if (fx.stylePo) we.ngAdd.stylePo = fx.stylePo;

  if (fx.kodBuilda !== undefined) we.build.kod = fx.kodBuilda;
  if (fx.bezSerwera) we.build.serwer = false;
  if (fx.markerBuilda) we.build.markery[fx.markerBuilda] = false;
  if (fx.tokenyWCss !== undefined) we.build.tokenyWCss = fx.tokenyWCss;

  if (fx.statusSsr !== undefined) we.ssr.status = fx.statusSsr;
  if (fx.kontekstSsr !== undefined) we.ssr.kontekst = fx.kontekstSsr;
  if (fx.markerSsr) we.ssr.markery[fx.markerSsr] = false;
  if (fx.bezCzesci) we.ssr.czesci = [];

  if (fx.bezElementu) we.e2e.element = false;
  if (fx.token !== undefined) we.e2e.token = fx.token;
  if (fx.tlo !== undefined) we.e2e.tlo = fx.tlo;
  if (fx.tloTokenu !== undefined) we.e2e.tloTokenu = fx.tloTokenu;
  if (fx.bledy) we.e2e.bledy = fx.bledy;

  return we;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

/**
 * `--zapisz-wzorzec` exists so that the reference input is an IMPRINT of a real
 * measurement rather than a sentence written by hand beside one: a written one drifts from
 * the measurement's shape at the first change, and the input stops passing for a reason
 * nobody was examining. Long command outputs are trimmed — in the fixtures they are quoted
 * only in error messages, and tens of kilobytes of build log in a versioned file would be
 * noise.
 */
if (WZORZEC) {
  const pomiar = await zmierzRepozytorium();
  pomiar.rejestr.wyjscie = '(npm publish output)';
  pomiar.instalacja.wyjscie = '(npm install output)';
  pomiar.ngAdd.wyjscie = '(ng generate output)';
  pomiar.build.wyjscie = '(ng build output)';
  pomiar.ssr.tresc = '(start of the HTML)';
  // The registry's port and the repository's path differ on every run and every machine.
  // The checks compare them WITHIN the measurement (the archive's address starts with the
  // registry's, the resolution lies inside the application's directory), so substituting
  // fixed values weakens nothing and takes noise and somebody's home path out of a
  // versioned file.
  const stale = JSON.stringify(pomiar)
    .split(pomiar.rejestr.url)
    .join('http://localhost:4873')
    .split(pomiar.instalacja.katalog)
    .join('/repozytorium/tmp/check-consumer/app');
  // The output goes through prettier, because `nx format:check` covers `tools/`. Without
  // that two gates would want different shapes of the same file, and every refresh of the
  // reference would leave the repository with red formatting. The same move as in
  // `check-docs`.
  const prettier = await import('prettier');
  const sciezka = join(FIXTURES, BAZA);
  writeFileSync(
    sciezka,
    await prettier.format(JSON.stringify(JSON.parse(stale), null, 2), {
      ...(await prettier.resolveConfig(sciezka)),
      filepath: sciezka,
    }),
  );
  console.log(
    `✓ Wrote ${BAZA} from the measurement. Run the gate once more — the negative ` +
      `control did not run in this pass.`,
  );
  process.exit(0);
}

try {
  opis = sprawdzKonsumenta(await zmierzRepozytorium());
} catch (blad) {
  if (!(blad instanceof BladKonsumenta)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-consumer.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were it defective itself, every case would fire because
// of it rather than its own defect, and every „rejected" would be false — this control
// would become the very thing it stands against.
try {
  sprawdzKonsumenta(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladKonsumenta)) throw blad;
  problems.push(
    `${BAZA}: the reference input does NOT pass (${blad.kontrola}/${blad.regula}) — ` +
      `every prepared case now fires because of it.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzKonsumenta(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — point ` +
        `${fx.punkt} (\`${fx.kontrola}\`), rule \`${fx.regula}\` stopped examining ` +
        `anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladKonsumenta)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: rule \`${blad.kontrola}/${blad.regula}\` fired, and ` +
          `\`${fx.kontrola}/${fx.regula}\` (point ${fx.punkt}) was meant to — the ` +
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
  `✓ Consumer: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own rules.`,
);
