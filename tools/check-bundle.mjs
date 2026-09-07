#!/usr/bin/env node
/**
 * Tree-shaking and size gate: what does a consumer really pay for importing one
 * entrypoint? "Secondary entrypoints force tree-shaking" is the SALES promise
 * (`req-project-tree-shaking`), and breaking it gives no red test.
 *
 *   1. `entrypoints`  — TWO reads of the entrypoint list agree and are not empty,
 *   2. `side-effects` — the packed manifest declares `sideEffects: false`,
 *   3. `snapshot`     — a snapshot exists, with a row for every entrypoint,
 *   4. `presence`     — DENOMINATOR: a probe brings its own entrypoint in, primary none,
 *   5. `linked`       — DENOMINATOR: the probe is built the way a consumer builds,
 *   6. `isolation`    — the entrypoints a probe pulls in match the snapshot,
 *   7. `markers`      — a second read of the same, over the bundle's text, BOTH ways,
 *   8. `external`     — a probe's external dependencies match the snapshot,
 *   9. `size`         — the bytes per entrypoint, EXACTLY as recorded, both ways,
 *  10. `differential` — a two-entrypoint probe is noticeably larger than either single one,
 *  11. `builder`      — the same measured by Angular's REAL builder,
 *  12. `shaken`       — DENOMINATOR: what ONE TAG of a multi-tag entrypoint really costs,
 *  13. `verbatim`     — the snapshot file is EXACTLY what the renderer writes.
 *
 * Points 6 and 8 are the promise itself (8 is where "no CDK Overlay with `button`" lives);
 * 4, 5, 7, 10, 11 and 12 watch the DENOMINATOR — without them "the `button` bundle holds
 * no `PctField`" is vacuously true exactly when the measurement stopped measuring. Point 13
 * watches the FILE: everything before it reads the snapshot through a map of its rows, so
 * the prose the same renderer writes around them was compared by nobody.
 *
 * The numbers are the ORDER, and point 5 earned its place by firing in the wrong one: with
 * `linked` last, a probe built the package's way failed the SIZE point first, and that
 * point's advice is `--write` — which would have written the wrong number down and called
 * it accepted. Everything that compares against the snapshot stands behind it now.
 *
 * Usage: node tools/check-bundle.mjs [--write]  (--write: rewrite the size snapshot)
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { freshInputsFor } from './fresh-inputs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const SNAPSHOT = `${PROJECT}/size.snapshot.md`;
const FIXTURES = join(ROOT, 'tools/check-bundle.fixtures');
const REFERENCE = '_reference.json';
const WRITE = process.argv.includes('--write');

// A size record is written from a build this run produced, never from one nx had lying
// around — the finding that made this a shared concern was eighteen bytes of cache in this
// very snapshot (**C29**).
freshInputsFor(WRITE, ['components:build']);

/**
 * The pair probe's slack, and the only tolerance left in this gate — point 9 compares the
 * sizes to the byte ([0023](../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).
 * Here it is a threshold on a DIFFERENCE OF TWO MEASUREMENTS rather than on a record: the
 * arithmetic `a + b − shared` leaves a remainder nothing measures, the entry file's glue,
 * and that remainder is not a drift anybody has to write down.
 */
const PAIR_SLACK = 0.05;

/**
 * The CDK overlay's CSS classes. The only string in this gate written by hand and the only
 * one about somebody else's package — because `@angular/cdk/overlay` is the library's most
 * expensive optional dependency and it is the one named in `req-project-tree-shaking`. The
 * string is no assumption here: the builder probe with ALL the entrypoints has to find it,
 * or point 10 fires on itself.
 */
const MARKER_OVERLAY = 'cdk-overlay';

/**
 * What must NOT survive into a probe: the calls of partial compilation and the dev-mode
 * residue a production build folds away. `ngDeclare*` present means the linker did not run
 * over that file; `setClassMetadata` / `setClassDebugInfo` mean it ran and the fold did not.
 * Both are searched as plain substrings, because in the bundle they are members of an
 * EXTERNAL namespace (`i0.ɵɵngDeclareComponent`) — a minifier renames locals, not those.
 */
const RESIDUE = ['ngDeclare', 'setClassMetadata', 'setClassDebugInfo'];

/** The primary entrypoint's name in the `exports` map — the package, not a subpath. */
const PRIMARY = '.';

/**
 * Entrypoints with no component or directive of their own — DECLARED here rather than
 * computed off the package, because computed, the exemption would cover every entrypoint
 * the day the linker stopped attaching `ɵcmp`, and the gate would go blind exactly when it
 * matters (`lesson-48`'s shape, one floor up). Each carries what its probe's TEXT may hold:
 *   `silent` — no marker at all. The primary re-exports providers from `./core` and must
 *              not carry the directive, and the text is the read that tells the two apart
 *              (`lesson-81`).
 *   `quotes` — other entrypoints' selectors, as data: a harness's `hostSelector` IS the
 *              component's selector, so the text of `./testing` names every component and
 *              holds none. The text read says nothing about such an entrypoint; the
 *              metafile read (points 6 and 8) is the one that holds it.
 * A plain entrypoint not declared here fires point 4 — which is the friction intended: the
 * package cannot grow a componentless entrypoint without a sentence here saying why.
 */
const PLAIN = { [PRIMARY]: 'silent', './testing': 'quotes' };

/**
 * A violation of one of the twelve checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class BundleError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

const list = (items) => [...items].sort().join(', ') || '(empty)';

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `sources`    — the entrypoints from `ng-package.json` in the git index,
 *   `manifest`  — the packed `package.json` (the `exports` map, `sideEffects`),
 *   `snapshot`  — the file's contents, or `null`,
 *   `markers`   — `{ entrypoint: [selectors] }` from the built package,
 *   `plain`     — `{ entrypoint: boolean }`, whether it exports anything but components,
 *   `declaredPlain` — `{ entrypoint: 'silent' | 'quotes' }`, the entrypoints declared to
 *                  have no component of their own (`PLAIN` for the live run),
 *   `probes`     — `{ entrypoint: { bytes, pulled, external, inText, residue } }`,
 *   `pair`      — `{ entrypoints: [a, b], bytes }`,
 *   `builder`   — `[{ entrypoints, found, overlay }]` from a real build.
 *
 * Throws `BundleError` on the first violation; returns `{ description, snapshot }`, because the
 * rendered snapshot comes back from a checking run too — `--write` then has somewhere to
 * take it from without repeating the whole measurement.
 *
 * Every point reads the input DEFENSIVELY, even though the previous one "already checked
 * that". A dependency between points is normal; writing it so that disarming the previous
 * one turns the gate into a `TypeError` is not — the negative control then loses the
 * ability to examine the point it was meant to examine. The same defect has come out three
 * times running ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
const checkBundle = (input) => {
  const sources = input.sources ?? [];
  const fromArtifact = Object.keys(input.manifest?.exports ?? {}).filter(
    (k) => k === PRIMARY || /^\.\/[a-z0-9-]+$/.test(k),
  );

  /**
   * An error of a point that `--write` is the right answer to carries a ready snapshot
   * with it. Without that, the first run of the gate in a repository with no snapshot
   * would have no way of generating one — and `--write` would exist as a command whose
   * only use case does not work.
   */
  const writable = (check, description) =>
    Object.assign(new BundleError(check, description), {
      snapshot: renderSnapshot(sources, input.probes ?? {}, input.named ?? {}),
    });

  // 1. The entrypoint list from two reads. The same move as point 1 in `check-tokens` and
  //    point 2 in `check-parts`: one read has no way of noticing that it shrank. The
  //    sources catch an entrypoint that never reached the package (and a stale `dist`);
  //    the artifact catches a directory somebody took `ng-package.json` from, leaving the
  //    code.
  if (sources.length === 0)
    throw new BundleError(
      'entrypoints',
      `no entrypoint found in \`${PROJECT}/*/ng-package.json\` — every later point ` +
        `would then always pass, having nothing to measure`,
    );
  const missingFromArtifact = sources.filter((e) => !fromArtifact.includes(e));
  const missingFromSources = fromArtifact.filter((e) => !sources.includes(e));
  if (missingFromArtifact.length || missingFromSources.length)
    throw new BundleError(
      'entrypoints',
      `the two reads of the entrypoint list have drifted apart:\n` +
        (missingFromArtifact.length
          ? `      in the sources, not in \`${DIST}/package.json\`: ${list(missingFromArtifact)}\n`
          : '') +
        (missingFromSources.length
          ? `      in the artifact, not in the sources: ${list(missingFromSources)}\n`
          : '') +
        `    Usual cause: a stale \`dist\` (the target needs a ` +
        `\`dependsOn\` on the library build) or an entrypoint without \`ng-package.json\``,
    );

  // 2. `sideEffects: false`. The flag EVERYTHING else rests on: without it a bundler has
  //    to assume every module of the package does something on load, and stops dropping
  //    the unused ones. This gate's probes will NOT notice that — they import a whole
  //    namespace, so everything stays anyway — which is why the flag needs a point of its
  //    own.
  //
  //    Measured, not assumed: REMOVING the key from the source manifest does not fire this
  //    point, because ng-packagr then writes `false` itself — checked with a
  //    `--skip-nx-cache` run, so as not to take a cache hit for a result. The point fires
  //    on an explicit `true`, and on the day ng-packagr stops writing the value. It reads
  //    the artifact rather than the source for exactly that reason: the consumer gets that
  //    file, not the one lying in the repository.
  if (input.manifest?.sideEffects !== false)
    throw new BundleError(
      'side-effects',
      `\`${DIST}/package.json\` declares \`sideEffects: ${JSON.stringify(
        input.manifest?.sideEffects,
      )}\`, and tree-shaking rests on \`false\` — without it a bundler has to keep every ` +
        `module of the package "just in case", and this gate will not see that: its ` +
        `probes import a whole namespace`,
    );

  // 3. The snapshot: it exists and covers exactly the entrypoint list.
  if (input.snapshot === null || input.snapshot === undefined)
    throw writable(
      'snapshot',
      `no \`${SNAPSHOT}\` — run \`node tools/check-bundle.mjs --write\`.\n` +
        `    Without a snapshot, points 5, 7 and 8 have nothing to compare against, so the ` +
        `gate would only be watching that the measurement ran`,
    );
  const rows = snapshotRows(input.snapshot);
  const withoutRow = sources.filter((e) => !rows.has(e));
  const surplus = [...rows.keys()].filter((e) => !sources.includes(e));
  if (withoutRow.length || surplus.length)
    throw writable(
      'snapshot',
      `the snapshot does not cover the entrypoint list:\n` +
        (withoutRow.length
          ? `      no row in the snapshot: ${list(withoutRow)}\n`
          : '') +
        (surplus.length
          ? `      row with no entrypoint: ${list(surplus)}\n`
          : '') +
        `    A new entrypoint with no row has neither a budget nor a recorded isolation, ` +
        `so it is born outside this gate — \`node tools/check-bundle.mjs --write\``,
    );

  // 4. DENOMINATOR. Four things without which everything below is vacuously true.
  const probes = input.probes ?? {};
  const markers = input.markers ?? {};
  const plain = input.plain ?? {};
  const declaredPlain = input.declaredPlain ?? {};

  //    a) a probe brings its own entrypoint in. A probe the bundler threw the whole
  //       library out of passes every point about isolation — it holds NOTHING.
  for (const e of sources) {
    const s = probes[e];
    if (!s)
      throw new BundleError(
        'presence',
        `no measurement for entrypoint \`${e}\` — the probe did not build, or dropped ` +
          `off the list`,
      );
    // `s?.` despite the branch above that "already checked that": disarming that one
    // must not turn this into a `TypeError`. The same defect has come out three times —
    // three times BETWEEN points, here a fourth time and inside one ([`lesson-50`]).
    if (!(s?.pulled ?? []).includes(e))
      throw new BundleError(
        'presence',
        `the probe importing \`${e}\` brought not one byte of that entrypoint into the ` +
          `bundle — "it holds no \`PctField\`" is then vacuously true.\n` +
          `    Brought in: ${list(s?.pulled ?? [])}`,
      );
  }

  //    b) primary carries no component. This is LITERALLY the text of the promise
  //       ("`@pacit/components` exports only `providePctConfig`, the shared types and the
  //       version") and at the same time the only reason primary may lack a marker in
  //       point (c): it has no content of its own to be recognised by.
  //
  //       The read is the probe's TEXT and not the set of entrypoints it pulls, and the
  //       difference showed up the day `./core` grew its first directive (D2): primary
  //       re-exports `providePctConfig` FROM `./core`, so it pulls that entrypoint by
  //       construction, and a module-level read cannot tell the token it took from the
  //       directive it left behind. Measured on that day: the primary probe weighs 1003 B
  //       and holds no `pctOverlayPanel`, while the rule reading `pulled` called it a
  //       component in the primary bundle ([`lesson-81`](../docs/lessons.md#lesson-81)).
  const withComponents = (e) => (markers[e] ?? []).length > 0;
  /**
   * An entrypoint exporting components AND plain values — a token, a provider, a function.
   * Read from the built package (an export with no `ɵcmp`/`ɵdir` on it) rather than from a
   * list here, because the list would be a place to add `./core` to and forget the next one.
   */
  const isMixed = (e) => withComponents(e) && (plain[e] ?? false);
  const wPrimary = probes[PRIMARY]?.inText ?? [];
  if (wPrimary.length)
    throw new BundleError(
      'presence',
      `the primary entrypoint \`@pacit/components\` carries components: ${list(wPrimary)}.\n` +
        `    The promise reads "primary exports only \`providePctConfig\`, the shared ` +
        `types and the version" — every consumer then pays for a component they never ` +
        `imported`,
    );

  //    b') the other declared-plain entrypoints. A declaration is a claim the package has
  //       to keep: the entrypoint exists, its module exports no component or directive,
  //       and a `silent` one holds no marker in its text either. A `quotes` one holds
  //       everybody's, by construction, and its text is not read — its contents are the
  //       metafile's to report (points 6 and 8), which is exactly what the declaration
  //       says and the reason it has to be a declaration.
  for (const [e, text] of Object.entries(declaredPlain)) {
    if (!sources.includes(e))
      throw new BundleError(
        'presence',
        `\`${e}\` is declared plain and is not an entrypoint of the package — a stale ` +
          `declaration is an exemption waiting for something to hide under it`,
      );
    if (withComponents(e))
      throw new BundleError(
        'presence',
        `\`${e}\` is declared plain and exports a component or directive: ` +
          `${list(markers[e] ?? [])}.\n    Either the declaration is stale or the entrypoint ` +
          `grew a component it was promised never to hold`,
      );
    const inText = probes[e]?.inText ?? [];
    if (text === 'silent' && e !== PRIMARY && inText.length)
      throw new BundleError(
        'presence',
        `\`${e}\` is declared silent and its probe's text carries ${list(inText)}`,
      );
  }

  //    c) every entrypoint some probe has to prove ABSENT can be recognised. An
  //       entrypoint with no marker would always pass point 6 — there is nothing to look
  //       for. The declared-plain ones are exempt by (b) and (b') — they are held by the
  //       metafile, and the declaration is the sentence that says so — and an entrypoint
  //       every probe brings in (today `./core`) is nowhere proved absent.
  const absentSomewhere = sources.filter(
    (e) =>
      e !== PRIMARY &&
      sources.some((x) => !(probes[x]?.pulled ?? []).includes(e)),
  );
  const withoutMarker = absentSomewhere.filter(
    (e) => !withComponents(e) && !(e in declaredPlain),
  );
  if (withoutMarker.length)
    throw new BundleError(
      'presence',
      `entrypoints with no marker at all: ${list(withoutMarker)} — point 6 has nothing to ` +
        `look for in the bundle's text, so it pronounces them absent without being able ` +
        `to see presence.\n` +
        `    A marker is a component's or directive's selector from the BUILT package ` +
        `(\`ɵcmp.selectors\`) — an entrypoint exposing none needs a read other than a ` +
        `textual one`,
    );

  //    d) no two entrypoints share a marker — the text read tells entrypoints apart by
  //       their selectors, and a selector two of them export (a re-export, say) reads as
  //       both wherever either really is. A marker INSIDE another's used to be guarded
  //       here too, and is not a case any more: the read takes the literal, quotes
  //       included (`holds`), so `pct-select` stands apart from `pct-select-option` the way
  //       it stands apart from `data-pct-selected`. A guard on the names would have been a
  //       workaround for the read (plan 4.13).
  const allMarkers = Object.entries(markers).flatMap(([e, m]) =>
    m.map((marker) => ({ e, marker })),
  );
  for (const a of allMarkers)
    for (const b of allMarkers)
      if (a.e !== b.e && a.marker === b.marker)
        throw new BundleError(
          'presence',
          `marker \`${a.marker}\` is exported by \`${a.e}\` and by \`${b.e}\` — a ` +
            `textual read cannot tell the two apart`,
        );

  // 5. Did the probe measure what a consumer carries? Points 9 and 10 read a NUMBER, and a
  //    number is right-looking whatever produced it: with the linker plugin silently not
  //    applying, every entrypoint would jump by half and the budget would say "growth" —
  //    the truest-sounding diagnosis of a measurement that stopped measuring. So the
  //    probe's text is asked directly whether the two steps between the package and the
  //    consumer really happened, and the message names the step rather than the string:
  //    the two halves are two edits away from each other, so what fired decides what to fix.
  const REASON = {
    ngDeclare:
      'the Angular linker did not run over the FESM, so a template is being counted as ' +
      "the string it travels as — twice, the class metadata carrying the decorator's " +
      'argument as well',
    setClassMetadata:
      'the linker ran and the `ngDevMode` fold of a production build did not, so the ' +
      'decorator source ships in the measurement and in no application — the bigger half',
    setClassDebugInfo:
      'the linker ran and the `ngDevMode` fold of a production build did not, so the ' +
      'decorator source ships in the measurement and in no application — the bigger half',
  };
  for (const e of sources) {
    const residue = probes[e]?.residue ?? [];
    if (residue.length)
      throw new BundleError(
        'linked',
        `the probe of \`${e}\` still holds ${list(residue)} — so it measures the ` +
          `PACKAGE's bytes, not the consumer's:\n` +
          [...new Set(residue.map((name) => REASON[name]))]
            .map((why) => `      ${why}\n`)
            .join('') +
          `    The budget of point 9 is only as honest as this — so it is the probe to ` +
          `fix, never the snapshot`,
      );
  }

  // 6. ISOLATION: what a probe really pulled in. Read from the bundler's metafile, that
  //    is, from whom it assigned the output's bytes to — not from a list of imports in the
  //    source. A drift does not mean "an error": it means "the consumer started paying for
  //    something other than yesterday, and that is to be visible in review".
  for (const e of sources) {
    const measured = new Set((probes[e]?.pulled ?? []).filter((x) => x !== e));
    const recorded = new Set(rows.get(e)?.pulled ?? []);
    if (!equal(measured, recorded))
      throw writable(
        'isolation',
        `importing \`@pacit/components${e === PRIMARY ? '' : e.slice(1)}\` pulls in a ` +
          `different set of entrypoints than recorded:\n` +
          `      snapshot: ${list(recorded)}\n` +
          `      measured: ${list(measured)}\n` +
          `    If this is intended — \`node tools/check-bundle.mjs --write\`. If not, look ` +
          `for an import from another entrypoint in \`${PROJECT}${e === PRIMARY ? '/src' : e.slice(1)}\``,
      );
  }

  // 7. The same measurement, a second read: over the built bundle's TEXT. The metafile
  //    says whom the bundler assigned bytes to; the text says what really stands in those
  //    bytes. The comparison goes BOTH ways, because each catches something else: a marker
  //    with no metafile entry is content that arrived by a route the bundler does not
  //    report; an entry with no marker is an entrypoint counted though nothing of it left.
  //
  //    The second direction has one exemption, and it is computed rather than listed: a
  //    MIXED entrypoint — one exporting components AND plain values — can legitimately
  //    contribute bytes with no marker among them, because the bytes are the plain half.
  //    `./core` is the case that named it: every entrypoint pulls `providePctConfig` from
  //    it and none of them but `./select` takes its directive. An entrypoint of components
  //    alone has no such half, so for those the direction stands as it did.
  for (const e of sources) {
    // A `quotes` entrypoint's text names every component by construction, so read it and
    // every marker is "content with no metafile entry". Its contents are the metafile's
    // to report (point 6) — the declaration in `PLAIN` is the sentence that says so.
    if (declaredPlain[e] === 'quotes') continue;
    const inText = new Set(probes[e]?.inText ?? []);
    const pulled = new Set(probes[e]?.pulled ?? []);
    const unassigned = [...inText].filter((x) => !pulled.has(x));
    const unrecognised = [...pulled].filter(
      (x) => withComponents(x) && !inText.has(x) && !isMixed(x),
    );
    if (unassigned.length || unrecognised.length)
      throw new BundleError(
        'markers',
        `the two reads of probe \`${e}\`'s contents have drifted apart:\n` +
          (unassigned.length
            ? `      marker in the text, no metafile entry: ${list(unassigned)}\n`
            : '') +
          (unrecognised.length
            ? `      metafile entry, no marker in the text: ${list(unrecognised)}\n`
            : '') +
          `    A marker in the text with no metafile entry means content brought in by a ` +
          `route the bundler did not assign to a module. An entry with no marker — an ` +
          `entrypoint counted though nothing of it survived`,
      );
  }

  // 8. External dependencies per entrypoint. This is where the literal "the `button`
  //    bundle has no CDK Overlay" lives: the snapshot records `@angular/cdk/overlay` at
  //    `./select` and nowhere else, so a second entrypoint reaching for it is a line in the
  //    diff. The same mechanism will cover every future dependency, including one nobody
  //    has thought of — which is why the point compares a SET rather than looking for a
  //    name written in advance.
  for (const e of sources) {
    const measured = new Set(probes[e]?.external ?? []);
    const recorded = new Set(rows.get(e)?.external ?? []);
    if (!equal(measured, recorded))
      throw writable(
        'external',
        `importing \`@pacit/components${e === PRIMARY ? '' : e.slice(1)}\` drags in a ` +
          `different set of external dependencies than recorded:\n` +
          `      snapshot: ${list(recorded)}\n` +
          `      measured: ${list(measured)}`,
      );
  }

  // 9. The size, to the byte. The number is the raw size of the probe's PRODUCTION bundle,
  //    with Angular as an external dependency — so it measures THE LIBRARY'S CONTRIBUTION,
  //    not the weight of somebody else's framework. Were Angular part of the measurement,
  //    every patch of it would rewrite the whole snapshot and the number would stop saying
  //    anything about this library. Production, and not "minified", is point 5's doing:
  //    what the package holds and an application never ships is outside the number.
  //
  //    The ±5% band that used to stand here died of being measured
  //    ([0023](../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)): the
  //    same artifact and the same toolchain give the same bytes, twice over and with a
  //    hundred characters added to the probe's path and to the artifact's, so the only
  //    thing that moves this number is the code it is there to watch. And a band decides
  //    two things while being argued about one: when the gate fails, and — unargued — when
  //    the file is WRITTEN. A drift inside it was never recorded, so the first change to
  //    leave the band rewrote every row at once and a reader of that diff took months of
  //    everybody's drift for one commit's price
  //    ([`lesson-78`](../docs/lessons.md#lesson-78)).
  for (const e of sources) {
    const measuredBytes = probes[e]?.bytes;
    const recordedBytes = rows.get(e)?.bytes;
    if (typeof measuredBytes !== 'number' || typeof recordedBytes !== 'number')
      throw writable(
        'size',
        `no size for \`${e}\` (measured: ${measuredBytes ?? 'none'}, ` +
          `snapshot: ${recordedBytes ?? 'none'})`,
      );
    const delta = measuredBytes - recordedBytes;
    if (delta !== 0) {
      const sign = delta > 0 ? '+' : '−';
      throw writable(
        'size',
        `probe \`${e}\` weighs ${measuredBytes} B, the snapshot records ${recordedBytes} B ` +
          `(${sign}${Math.abs(delta)} B, ${sign}` +
          `${Math.abs((delta / recordedBytes) * 100).toFixed(1)}%).\n` +
          `    ${
            delta > 0
              ? 'A growth is acceptable — in a visible line of the diff, which is the whole point of the file'
              : 'A drop is news of the same kind: it is also what a measurement going quiet looks like (`lesson-45`, `lesson-48`)'
          } — \`node tools/check-bundle.mjs --write\``,
      );
    }
  }

  // 10. DIFFERENTIAL CONTROL. A two-entrypoint probe has to be noticeably larger than
  //    either single one — otherwise the measurement measures nothing. This point fires in
  //    exactly the scenario where every other one looks healthy: the bundler stopped
  //    pulling the library in (a wrong alias, too wide an `external` list), so every probe
  //    weighs the same and the difference disappears.
  //
  //    The threshold is not plucked from the air: the combined bundle holds both
  //    libraries, and only their shared core is counted twice. Hence `a + b - shared`,
  //    with a tolerance for the entry file's glue.
  const [first, second] = input.pair?.entrypoints ?? [];
  const pairBytes = input.pair?.bytes;
  if (!first || !second || typeof pairBytes !== 'number')
    throw new BundleError(
      'differential',
      `no two-entrypoint probe — the differential control has nothing to compare`,
    );
  const shared = new Set(
    (probes[first]?.pulled ?? []).filter(
      (x) => x !== first && (probes[second]?.pulled ?? []).includes(x),
    ),
  );
  const sharedBytes = [...shared].reduce(
    (n, x) => n + (probes[x]?.bytes ?? 0),
    0,
  );
  const expected =
    (probes[first]?.bytes ?? 0) + (probes[second]?.bytes ?? 0) - sharedBytes;
  if (pairBytes < expected * (1 - PAIR_SLACK))
    throw new BundleError(
      'differential',
      `the \`${first}\` + \`${second}\` probe weighs ${pairBytes} B, and the sum of the ` +
        `single ones without the shared core is ${expected} B ` +
        `(${probes[first]?.bytes} + ${probes[second]?.bytes} − ${sharedBytes}).\n` +
        `    Two entrypoints give a bundle no larger than one — that is not good news ` +
        `about tree-shaking but a sign the measurement stopped pulling the library in`,
    );

  // 11. A second read of the WHOLE gate: the same thing measured by the real
  //     `@angular/build: application`, that is, by what really assembles an application at
  //     the consumer's. The probes above go through their own esbuild — fast, but MY
  //     setting of a bundler, not his. The same move as "do not read `include`, run the
  //     compiler" and "do not read the sheet's text, run sass".
  //
  //     The third probe (all the entrypoints) is the denominator of the first two: it
  //     proves this read CAN see what it fails to find in them.
  const runs = input.builder ?? [];
  if (runs.length < 3)
    throw new BundleError(
      'builder',
      `${runs.length} probes went through Angular's real builder, and three are ` +
        `needed: two measured and one with all the entrypoints, proving the others can ` +
        `find anything at all`,
    );
  for (const p of runs) {
    // Both sides are the same KIND of read — the markers found in a built bundle's text —
    // so the point compares two bundlers and not two models of what a bundle should hold.
    // Taken from `pulled` it compared a text read against a module read, and the day an
    // entrypoint held both a directive and a provider the two stopped meaning the same
    // thing (point 7 above, `lesson-81`).
    // A `quotes` entrypoint's text would put every marker into the expectation; the
    // builder runs are made of component entrypoints and never hold one, and this filter
    // is what keeps that true if the runs ever change.
    const expected = new Set(
      (p.entrypoints ?? [])
        .filter((e) => declaredPlain[e] !== 'quotes')
        .flatMap((e) => probes[e]?.inText ?? []),
    );
    const found = new Set(p.found ?? []);
    if (!equal(found, expected))
      throw new BundleError(
        'builder',
        `a real build of an application importing ${list(p.entrypoints ?? [])} holds a ` +
          `different set of entrypoints than the esbuild probes imply:\n` +
          `      from the esbuild probes: ${list(expected)}\n` +
          `      in the real bundle:      ${list(found)}\n` +
          `    A drift means this gate's fast measurement stopped matching what the ` +
          `consumer gets — and it is the measurement to fix, not the real build`,
      );
    const expectedOverlay = [...expected].some((e) =>
      (probes[e]?.external ?? []).some((z) => z.includes('cdk/overlay')),
    );
    if ((p.overlay ?? false) !== expectedOverlay)
      throw new BundleError(
        'builder',
        `a real build of an application importing ${list(p.entrypoints ?? [])} ` +
          `${p.overlay ? 'HOLDS' : 'does NOT hold'} the CDK overlay (\`${MARKER_OVERLAY}\`), ` +
          `and by the esbuild probes it ${expectedOverlay ? 'should' : 'should not'}.\n` +
          `    CDK Overlay is this library's most expensive optional dependency — a ` +
          `consumer who never used \`pct-select\` has no business receiving it`,
      );
  }

  // 12. WHAT ONE TAG COSTS. Eleven entrypoints carry more than one component, and what a
  //     consumer importing ONE of them pays is the question everybody answers with "of
  //     course, ESM". Measured, the answer is "it depends, and the difference is 60% of
  //     the bundle": `./accordion` is 4162 B for one tag against 11333 for both,
  //     `./date` 22123 against 38901, `./field` 16059 against 24895 — while `./chips`,
  //     `./menu`, `./radio`, `./stepper`, `./tabs`, `./tree` and `./select` shed nothing
  //     at all, their two numbers standing 2 or 3 bytes apart.
  //
  //     Six of those seven are parent/child pairs: a chip injects its container, a tab
  //     injects the strip, so importing the child names the parent and the bundler is
  //     right to keep it. `./select` is the exception and the reason this point exists —
  //     `pct-select` and `pct-multi-select` are SIBLINGS with no reference between them
  //     (0034: one template, compiled twice), and a consumer of one still pays for the
  //     other. Why the bundler keeps it is not measured here and is written down as a
  //     finding rather than guessed at.
  //
  //     It is measured in BYTES and not by looking for the sibling's selector in the text,
  //     and that was a measurement too: `pct-select` stands in a bundle that imported
  //     `PctMultiSelect` alone, inside the shared base's own
  //     `get tag() { … 'pct-multi-select' : 'pct-select' }`, and `pct-tree-item` stands in
  //     a `PctTree`-only bundle as its content-projection selector. Two false positives in
  //     seven rows — a string equal to a selector is not a component.
  //
  //     What this point holds is the MEASUREMENT, not the answer: a probe that pulled
  //     nothing measured nothing, and one class cannot cost more than every class. The
  //     answer itself is a row of the snapshot, held by point 13 with every other row — so
  //     the day a bundler starts shedding the sibling, the gate is red and somebody reads
  //     why.
  const namedProbes = Object.entries(input.named ?? {});
  for (const [e, measurement] of namedProbes) {
    if (!measurement.bytes)
      throw new BundleError(
        'shaken',
        `the probe importing \`${measurement.export}\` from ` +
          `\`@pacit/components${e === PRIMARY ? '' : e.slice(1)}\` produced no bytes.\n` +
          `    A named import the bundler dropped entirely measures nothing, and the row ` +
          `it writes would read as "one tag costs nothing" — the most flattering possible ` +
          `reading of a probe that failed`,
      );
    if (measurement.bytes > measurement.all)
      throw new BundleError(
        'shaken',
        `importing \`${measurement.export}\` alone (${measurement.bytes} B) is LARGER ` +
          `than importing all ${measurement.tags} tags of \`${e}\` ` +
          `(${measurement.all} B).\n` +
          `    One class cannot cost more than every class, so the two probes are not ` +
          `measuring the same entrypoint — the usual cause is a class name that no longer ` +
          `stands in the package and an import the bundler resolved elsewhere`,
      );
  }

  // 13. The file IS the render. Points 3, 6, 8 and 9 read the snapshot through
  //     `snapshotRows`, that is, through a map keyed by entrypoint — and everything the
  //     renderer writes around those rows is compared by nobody. Rewrite a paragraph of
  //     the explanation and the file keeps yesterday's text until some byte happens to
  //     move with it: [0023](../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)
  //     rewrote two paragraphs here, and only a row moving at the same time carried them
  //     into the file. The first line of that text says "this file is generated", which is
  //     the sentence a reader trusts instead of checking.
  //
  //     It stands LAST, and for a reason of its own rather than point 5's. Every point
  //     before it names WHAT moved — a size, an entrypoint, a dependency — while this one
  //     can only say "the file is not the render"; and with 10, 11 or 12 red the
  //     MEASUREMENT is in doubt, so its rendering is not a record anybody should be told
  //     to write down.
  const rendered = renderSnapshot(sources, probes, input.named ?? {});
  if (input.snapshot !== rendered) {
    const have = String(input.snapshot ?? '').split('\n');
    const want = rendered.split('\n');
    const at = want.findIndex((w, i) => w !== have[i]);
    const line = at === -1 ? want.length : at;
    throw writable(
      'verbatim',
      `\`${SNAPSHOT}\` is not what the renderer writes, from line ${line + 1}:\n` +
        `      file:   ${have[line] ?? '(the file ends here)'}\n` +
        `      render: ${want[line] ?? '(the render ends here)'}\n` +
        `    The rows are compared one by one by the points above, so a difference here ` +
        `is usually the PROSE — a paragraph the renderer rewrote and nothing carried into ` +
        `the file, or a hand edit of a file that says it is generated. ` +
        `\`node tools/check-bundle.mjs --write\``,
    );
  }

  const total = sources.reduce((n, e) => n + (probes[e]?.bytes ?? 0), 0);
  return {
    description:
      `${sources.length} entrypoints, ${total} B in total, largest ` +
      `${sources.reduce((a, b) => ((probes[a]?.bytes ?? 0) >= (probes[b]?.bytes ?? 0) ? a : b))}; ` +
      `${runs.length} probes through the real builder`,
    snapshot: renderSnapshot(sources, probes, input.named ?? {}),
  };
};

const equal = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The same choice of format as in `libs/components/parts.snapshot.md` and
 * `libs/tokens/tokens.snapshot.md`, and for the same reason: a markdown table run through
 * prettier pads its columns to the longest cell, so one long name rewrites the WHOLE file
 * and the diff stops showing what really changed.
 */
const renderSnapshot = (sources, probes, named = {}) =>
  [
    '# Entrypoint size and isolation snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-bundle.mjs --write`. The `check-bundle` gate rejects a drift.',
    '',
    '"Components are imported through secondary entrypoints, which forces tree-shaking"',
    'is a sales promise ([`req-project-tree-shaking`](../../docs/requirements/project.md#req-project-tree-shaking))',
    '— the one somebody picks this library for. Breaking it gives not one red test: an',
    'import from a neighbouring entrypoint compiles, passes the tests and adds tens of',
    'kilobytes for the consumer, who will learn about them from their own bundle report,',
    'if they have one.',
    '',
    'This file is the list a change is measured against, and it is written down to the',
    'byte. A drift does not mean "an error" — it means "the consumer started paying for',
    'something other than yesterday, and that is to be visible in review". So every byte',
    'lands here, in both directions, and it lands in the diff of the change that moved it:',
    '`node tools/check-bundle.mjs --write`. There is no tolerance, because a tolerance',
    'decides two things and is argued about one — when the gate fails, and when this file',
    'is written ([0023](../../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).',
    '',
    'Columns: entrypoint · size in bytes · other entrypoints brought in · external',
    'dependencies. The size is the raw size of a **production** bundle of an application',
    'that imports **only** this one entrypoint: Angular external, so it measures the',
    "contribution of **this library** and not the weight of somebody else's framework —",
    'and built the way a consumer builds, with the Angular linker run over the package and',
    '`ngDevMode` folded away. That is what the number is: **what an application carries**,',
    'not what the tarball weighs. The package holds more — a template travels in it as text',
    'and the class metadata carries the decorator a second time, and both are compiled away',
    'before an application ships them.',
    '',
    '```',
    ...sources.map((e) =>
      [
        e,
        probes[e]?.bytes ?? 0,
        [...(probes[e]?.pulled ?? [])]
          .filter((x) => x !== e)
          .sort()
          .join(',') || '-',
        [...(probes[e]?.external ?? [])].sort().join(',') || '-',
      ].join(' '),
    ),
    '```',
    '',
    'And the second reading, for the entrypoints that carry more than one tag. The rows',
    'are: entrypoint · the class a probe imported BY NAME · how many tags the entrypoint',
    'has · the bytes of that one class · the bytes of a probe importing EVERY tag of it.',
    'It answers the question everybody answers with "of course, ESM": whether importing one',
    'tag of an entrypoint sheds the rest of it. The two numbers side by side are the whole',
    'reading — where they are equal, nothing was shed and the entrypoint is the unit a',
    'consumer pays in; where they differ, that difference is what the other tags cost.',
    '',
    'It is measured in bytes and NOT by looking for the other tags in the text, and that',
    'is a measurement rather than a preference: searched for, `pct-select` is in a bundle',
    "that imported `PctMultiSelect` alone — inside the shared base's own",
    "`get tag() { return this.multiple ? 'pct-multi-select' : 'pct-select' }` — and",
    '`pct-tree-item` is in one that imported `PctTree` alone, as its content-projection',
    'selector. Two false positives in seven rows, both of them a string that equals a',
    'selector without being a component.',
    '',
    'WHY a row sheds or does not, measured one doctored declaration at a time and true of',
    'every row below (plan 4.42). Two things keep a tag nobody imported:',
    '',
    '1. **It declares `providers`.** Angular compiles them into',
    '   `features: [ɵɵProvidersFeature([…])]` — a call to an EXTERNAL function, standing in',
    '   the static `ɵcmp` initialiser of the class itself. A bundler cannot know that call is',
    '   pure, so the statement that defines the class has a side effect and the class stays,',
    '   with its template and its stylesheet. `sideEffects: false` on the package does not',
    '   reach inside a module that something else in it is imported from.',
    '2. **Something reaches it.** The child injects the parent CLASS as its token —',
    '   `inject(PctStepper)`, `inject(PctRadioGroup)` — which is a reference like any other.',
    '   Where the channel is a token declared beside the class instead (`PCT_ACCORDION`,',
    '   `PCT_TABS`), there is no reference and this half does not apply.',
    '',
    'The reading is DIRECTIONAL, because the probe imports the first export name: `PctSelect`',
    'is shed or not shed by a bundle that asked for `PctMultiSelect`, and the other direction',
    'can differ — an entrypoint whose group declares providers pins the group when a consumer',
    'imports only the child.',
    '',
    '`./select` used to be the row neither half explained, and the answer was the first half',
    "after all: the orphan-slot report stood in each tag's `providers`, so a consumer who",
    'imported one carried the other, 24458 B for a `console.warn` their production build',
    'cannot print. The report now reads the content query that finds it instead of an',
    'injector — the query IS the claim — and no component in this package declares',
    '`providers` for a message any more (plan 4.43,',
    '[`lesson-176`](../../docs/lessons.md#lesson-176)). The row below is what that repair is',
    'worth, and it is the largest single number this file has ever moved.',
    '',
    '```',
    ...Object.keys(named)
      .sort()
      .map((e) =>
        [e, named[e].export, named[e].tags, named[e].bytes, named[e].all].join(
          ' ',
        ),
      ),
    '```',
    '',
  ].join('\n');

/**
 * The data rows as a map `entrypoint → { bytes, pulled, external }`.
 *
 * A missing file (`null`) is an empty map here, not a failure, even though point 3 catches
 * that case separately and earlier — see the comment at `checkBundle`. The row filter
 * lets the slash in `./select` through deliberately: in `check-parts` exactly that
 * character fell out of the character class, both lists came out empty, the empties proved
 * equal and the gate rejected a change with a correct diagnosis of a problem that was not
 * there
 * ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
const snapshotRows = (content) => {
  const out = new Map();
  // The FIRST code block and not the whole file: the second one carries a row per
  // multi-tag entrypoint (point 12), and its rows begin with an entrypoint too. Read
  // whole, `./accordion PctAccordion 2 4162 11333` parses as an entrypoint that pulls in
  // "2" — measured, and it is the same shape as `lesson-50` one line down: two readings
  // of one file, and the narrower one has to say where it stops.
  const block = String(content ?? '').split('```')[1] ?? '';
  for (const w of block.split('\n')) {
    if (!/^\.(\/[a-z0-9-]+)?\s/.test(w)) continue;
    const [e, bytes, pulled, external] = w.trim().split(/\s+/);
    out.set(e, {
      bytes: Number(bytes),
      pulled: pulled === '-' ? [] : (pulled ?? '').split(','),
      external: external === '-' ? [] : (external ?? '').split(','),
    });
  }
  return out;
};

// ── measurement ────────────────────────────────────────────────────────────────────

const readJson = (path) =>
  existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;

/**
 * Entrypoints from the SOURCES, from the git index — the same reason as in `check-styles`,
 * `check-tokens`, `check-parts` and `check-typecheck`: the index is an independent record
 * of what the repository really carries, not of what happens to lie on disk.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS: a git pathspec is not a shell
 * glob, and without `:(glob)` a star crosses `/`, so a pattern with a star can return ZERO
 * files rather than an error ([`lesson-48`](../docs/lessons.md#lesson-48)).
 */
const sourceEntrypoints = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((p) =>
      /^libs\/components\/([a-z0-9-]+\/)?ng-package\.json$/.test(p),
    )
    .map((p) => {
      const directory = p.slice(
        `${PROJECT}/`.length,
        -'ng-package.json'.length,
      );
      return directory === '' ? PRIMARY : `./${directory.slice(0, -1)}`;
    })
    .sort();

/**
 * Every entrypoint's FESM file, from the artifact's `exports` map — by the same route the
 * consumer will take. An entry missing from the map is unreachable for them, however
 * surely the file lies in the package.
 */
const entrypointFiles = (manifest) => {
  const out = new Map();
  for (const [input, target] of Object.entries(manifest?.exports ?? {})) {
    const file = typeof target === 'object' ? target?.default : target;
    if (typeof file === 'string' && file.endsWith('.mjs')) out.set(input, file);
  }
  return out;
};

/**
 * Markers: the selectors of components and directives from the BUILT package, read after
 * linking (`ɵcmp.selectors`) — the same machinery as in `check-parts` and for the
 * same reason: the package is partially compiled, so a definition appears only on access,
 * exactly as at the consumer's.
 *
 * Why a selector and not any string unique to the entrypoint: strings from the FESM survive
 * minification but do NOT survive linking — measured, not assumed. `button[pctButton]`
 * stands in the FESM as one string and in a real bundle as `[["button","pctButton",""]]`,
 * so a marker taken from the FESM's text would be unfindable in point 10 and "there is no
 * `PctButton` here" would come out green always. A selector survives both steps, because
 * in both it is DATA rather than a name.
 *
 * Of a selector's tokens only those with the `pct` prefix are kept — `button` in
 * `button[pctButton]` is an HTML tag name and would match anything.
 *
 * And a marker is read the way it stands: as a STRING LITERAL, quotes included (`holds`).
 * A plain substring read found `pct-select` inside `"data-pct-selected"`, a state attribute
 * of the calendar, and reported the select in every bundle holding a calendar — the name
 * was changed by hand, twice, and the second time the token beside it kept the word (plan
 * 4.13). The ambiguity was the read's, not the name's.
 */
const collectMarkers = async (dist, files) => {
  await import('@angular/compiler');
  const markersOf = {};
  const plainOf = {};
  const componentsOf = {};
  for (const [input, file] of files) {
    const module = await import(
      pathToFileURL(join(dist, file.replace(/^\.\//, ''))).href
    );
    const markers = new Set();
    const components = [];
    let plain = false;
    for (const [name, value] of Object.entries(module)) {
      const def =
        typeof value === 'function'
          ? (value['ɵcmp'] ?? value['ɵdir'])
          : undefined;
      // The COMPONENTS by their export name, which is what an import names. Components and
      // not directives, because the question underneath is about TAGS: `pct-select` and
      // `pct-multi-select` are two tags over one template (0034), and what point 13 asks is
      // what a consumer of one of them pays for the other.
      if (typeof value === 'function' && value['ɵcmp'])
        components.push({
          name,
          markers: (value['ɵcmp'].selectors ?? [])
            .flat()
            .filter((t) => typeof t === 'string' && /^pct[-A-Z]/.test(t))
            .sort(),
        });
      // Anything that is not a component or a directive: a token, a provider factory, a
      // function. Types do not count — they are gone by the time this module is imported,
      // which is the point of reading the artifact rather than the sources.
      if (!def) plain = true;
      for (const token of (def?.selectors ?? []).flat())
        if (typeof token === 'string' && /^pct[-A-Z]/.test(token))
          markers.add(token);
    }
    markersOf[input] = [...markers].sort();
    plainOf[input] = plain;
    componentsOf[input] = components.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  return { markers: markersOf, plain: plainOf, components: componentsOf };
};

/**
 * Whether a bundle's text holds a marker: the token as a string literal, either quote,
 * because that is the form a selector takes in a linked bundle — `[["pct-select"]]`,
 * `[["button","pctButton",""]]` — and the one form nothing else takes. `"data-pct-selected"`
 * and `"pct-select-option"` both contain `pct-select` and neither is it. What this read
 * gives up is nothing: a marker is data in the bundle, and data is quoted.
 */
const holds = (text, marker) =>
  new RegExp(`(["'])${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`).test(
    text,
  );

/** The entrypoints whose markers a bundle's text holds. */
const presentIn = (text, markers) =>
  Object.entries(markers)
    .filter(([, m]) => m.some((x) => holds(text, x)))
    .map(([e]) => e)
    .sort();

/**
 * The directory in which the probes see the package UNDER ITS OWN NAME, through
 * `node_modules`. Not through a bundler `alias` and not through tsconfig `paths` — both of
 * those bypass the `exports` map, the part of the manifest that decides at the consumer's
 * what is reachable at all. A probe with an alias would be green even with no `exports`.
 */
const prepareProbeDirectory = (dist) => {
  const directory = mkdtempSync(join(tmpdir(), 'pct-check-bundle-'));
  mkdirSync(join(directory, 'node_modules/@pacit'), { recursive: true });
  symlinkSync(dist, join(directory, 'node_modules/@pacit/components'));
  return directory;
};

/** The specifier a consumer writes for an entrypoint: `@pacit/components/select`. */
const specifierOf = (e) =>
  e === PRIMARY ? '@pacit/components' : `@pacit/components${e.slice(1)}`;

/**
 * The step between the package and the consumer: Angular's LINKER, as an esbuild plugin.
 *
 * A published FESM is compiled PARTIALLY — a template travels in it as the string it still
 * is, and `ɵɵngDeclareClassMetadata` carries the whole decorator argument a second time,
 * template and styles included. A consumer's builder runs this linker over it before
 * bundling, turning the declarations into instructions. A probe that skips the step
 * measures the PACKAGE's bytes, and the two differ in BOTH directions — measured:
 * `./field` -1850 B, `./checkbox` +823 B, the template compiling into more than it was
 * written as. So this is not a discount for prose ([`lesson-67`](../docs/lessons.md#lesson-67));
 * it is a different quantity, and the promise on the snapshot names the consumer's.
 *
 * The result is cached per file: with a dozen probes over the same handful of FESMs the
 * linker would otherwise run the same transform a dozen times. The cache is why the plugin
 * takes the PACKAGE rather than every `.mjs` it is handed — the probes' entry file has a
 * fixed name by design (its own path would otherwise land in the measured bytes), so it is
 * a different program at the same address on every probe, and a cache keyed by path serves
 * the first probe's imports to all the rest. Written down because it happened: point 4
 * caught it on the first run, reporting a `./button` probe that had brought in the primary
 * entrypoint and no button.
 */
const angularLinker = async (dist) => {
  const { transformAsync } = await import('@babel/core');
  const plugin = (await import('@angular/compiler-cli/linker/babel')).default;
  const cache = new Map();
  return {
    name: 'angular-linker',
    setup(build) {
      build.onLoad({ filter: /\.mjs$/ }, async ({ path }) => {
        if (!path.startsWith(dist)) return null;
        if (!cache.has(path)) {
          const source = readFileSync(path, 'utf8');
          const out = await transformAsync(source, {
            filename: path,
            babelrc: false,
            configFile: false,
            compact: false,
            sourceMaps: false,
            plugins: [plugin],
          });
          cache.set(path, out.code);
        }
        return { contents: cache.get(path), loader: 'js' };
      });
    },
  };
};

/**
 * One probe: an application importing the given entrypoints and NOTHING else.
 *
 * The `globalThis` at the end is there for a reason: with the imported namespace unused, a
 * bundler is free to throw everything out and the probe would be empty — and an empty probe
 * passes every point about isolation, holding nothing. Importing the namespace therefore
 * keeps the MAXIMUM of what the entrypoint exposes: the measured size is its upper bound,
 * and isolation is examined in the worst case.
 *
 * Angular is an EXTERNAL dependency: we measure this library's contribution, not the
 * framework's weight. `@pacit/components/*` cannot be external — there would then be no
 * way to see that `button` pulled `field` in, and the whole measured thing would vanish.
 *
 * `ngDevMode: false` is the second half of the same declaration `minify: true` already
 * makes — this is a PRODUCTION build. It is not a detail: unfolded, the linker's output
 * keeps `setClassMetadata` with the whole decorator source, and the compiler's `debugName`
 * for every signal. Measured, `./button` 7932 → 4481 B, `./field` 37444 → 22316 B. The
 * two steps only work together: neither alone moves the number by a fifth of that, because
 * partial compilation emits the metadata UNGUARDED and it is the linker that wraps it in
 * the guard this define then folds. What does NOT fold is `isDevMode()` — a call to an
 * external module, so C2's and C10's reports stay in the measurement, as they stay in a
 * consumer's bundle.
 */
const probe = async (
  esbuild,
  linker,
  directory,
  markers,
  byFile,
  entrypoints,
  // The export names to import BY NAME instead of taking the namespace, or null for the
  // namespace. One entrypoint only — the question it serves is about what is inside one.
  only = null,
) => {
  // The input file's name is FIXED, because the bundle's size is the measured quantity
  // here: a name with a counter or a timestamp can end up in the output and the budget
  // starts measuring the length of a path. The probes run in turn and the file is removed
  // after each.
  const input = join(directory, 'probe.mjs');
  // `only` names ONE export instead of taking the namespace, and that is the whole
  // difference between "what an entrypoint costs" and "what one of its tags costs".
  // A namespace import is a reference to every export at once, so it forbids by
  // construction the shaking point 13 asks about.
  writeFileSync(
    input,
    only
      ? `import { ${only.join(', ')} } from '${specifierOf(entrypoints[0])}';\n` +
          `globalThis.__pctProbe = [${only.join(', ')}];\n`
      : entrypoints
          .map((e, i) => `import * as m${i} from '${specifierOf(e)}';`)
          .join('\n') +
          `\nglobalThis.__pctProbe = [${entrypoints.map((_, i) => `m${i}`).join(',')}];\n`,
  );
  const result = await esbuild.build({
    entryPoints: [input],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    metafile: true,
    plugins: [linker],
    define: { ngDevMode: 'false' },
    external: ['@angular/*', 'rxjs', 'rxjs/*', 'tslib'],
  });
  rmSync(input, { force: true });

  const text = result.outputFiles[0].text;
  const output = Object.values(result.metafile.outputs)[0];
  const pulled = Object.entries(output.inputs)
    .filter(([, v]) => v.bytesInOutput > 0)
    .map(([k]) => byFile.get(k.split('/').pop()))
    .filter(Boolean);

  return {
    bytes: text.length,
    pulled: [...new Set(pulled)].sort(),
    external: [
      ...new Set(output.imports.filter((i) => i.external).map((i) => i.path)),
    ].sort(),
    inText: presentIn(text, markers),
    residue: RESIDUE.filter((name) => text.includes(name)),
  };
};

/**
 * A real Angular application build. The workspace is created in the repository's `tmp/`
 * rather than in the system's temporary directory, and not out of convenience: module
 * resolution is to walk up the tree to the repository's `node_modules`, so `@angular/*` is
 * found by itself and a local `node_modules/@pacit/components` adds only the package under
 * measurement. `tmp/` is in `.gitignore`, so the probe's files do not become a defect for
 * `check-typecheck` (point 1: a TypeScript file outside any project) — one gate's fixture
 * must not be another's defect.
 */
const builderProbe = (dist, markers, entrypoints) => {
  const directory = join(ROOT, 'tmp/check-bundle');
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(join(directory, 'src'), { recursive: true });
  mkdirSync(join(directory, 'node_modules/@pacit'), { recursive: true });
  symlinkSync(dist, join(directory, 'node_modules/@pacit/components'));

  writeFileSync(
    join(directory, 'angular.json'),
    JSON.stringify({
      version: 1,
      projects: {
        probe: {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: {
                outputPath: 'out',
                index: false,
                browser: 'src/main.ts',
                tsConfig: 'tsconfig.json',
                optimization: true,
                outputHashing: 'none',
              },
            },
          },
        },
      },
    }),
  );
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'preserve',
        moduleResolution: 'bundler',
        skipLibCheck: true,
        strict: true,
      },
      files: ['src/main.ts'],
    }),
  );
  // A namespace, not named classes: every entrypoint's export list is different, and a
  // component's `imports:` takes directives alone. `Reflect.set` keeps the whole thing
  // exactly as `globalThis` does in the esbuild probe and for the same reason — the call
  // is a side effect, so there is no way to drop it.
  writeFileSync(
    join(directory, 'src/main.ts'),
    [
      ...entrypoints.map(
        (e, i) => `import * as m${i} from '${specifierOf(e)}';`,
      ),
      `import { bootstrapApplication } from '@angular/platform-browser';`,
      `import { Component } from '@angular/core';`,
      ``,
      `Reflect.set(globalThis, '__pctProbe', [${entrypoints
        .map((_, i) => `m${i}`)
        .join(',')}]);`,
      ``,
      `@Component({ selector: 'app-root', template: '' })`,
      `export class App {}`,
      ``,
      `bootstrapApplication(App);`,
    ].join('\n'),
  );

  execFileSync(
    'node',
    [join(ROOT, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'probe'],
    { cwd: directory, stdio: 'pipe' },
  );
  const bundle = readFileSync(join(directory, 'out/browser/main.js'), 'utf8');
  rmSync(directory, { recursive: true, force: true });

  return {
    entrypoints,
    found: presentIn(bundle, markers),
    overlay: bundle.includes(MARKER_OVERLAY),
  };
};

/**
 * The full measurement of the repository. The pair for the differential control and the
 * builder probes are CHOSEN from the measurement rather than written down: the lightest and
 * the heaviest component entrypoint. A hard-coded list would drift at the first new
 * component — and it is the gate that would stop seeing, not CI that would fire.
 */
const measureRepository = async () => {
  const dist = join(ROOT, DIST);
  const manifest = readJson(join(dist, 'package.json'));
  if (!manifest)
    throw new BundleError(
      'entrypoints',
      `no built package in ${DIST} — this gate measures the artifact, not the sources.\n` +
        `    The target needs a \`dependsOn\` on the library's build`,
    );

  const files = entrypointFiles(manifest);
  // FESM file name → entrypoint. The bundler's metafile speaks of files; everything above
  // speaks of entrypoints, because they are the public contract.
  const byFile = new Map(
    [...files].map(([e, file]) => [file.split('/').pop(), e]),
  );

  const { markers, plain, components } = await collectMarkers(dist, files);
  const esbuild = await import('esbuild');
  const linker = await angularLinker(dist);
  const directory = prepareProbeDirectory(dist);
  const sources = sourceEntrypoints();

  try {
    const probes = {};
    for (const e of files.keys())
      probes[e] = await probe(esbuild, linker, directory, markers, byFile, [e]);

    /**
     * What ONE TAG of a multi-tag entrypoint costs. The entrypoints measured here are
     * DISCOVERED — every one carrying more than one component — rather than named, so the
     * day a second tag joins another entrypoint the measurement follows by itself; a
     * hard-coded `./select` would be a gate that stopped seeing at the first new pair.
     *
     * The class taken is the first by export name, and which one it is does not matter:
     * the question is symmetric, and measured it answers the same either way.
     */
    const named = {};
    for (const [e, list] of Object.entries(components)) {
      if (list.length < 2 || !files.has(e)) continue;
      const one = await probe(
        esbuild,
        linker,
        directory,
        markers,
        byFile,
        [e],
        [list[0].name],
      );
      const all = await probe(
        esbuild,
        linker,
        directory,
        markers,
        byFile,
        [e],
        list.map((c) => c.name),
      );
      named[e] = {
        export: list[0].name,
        tags: list.length,
        bytes: one.bytes,
        all: all.bytes,
      };
    }

    /**
     * The two halves of the differential control have to be entrypoints a consumer imports
     * SEPARATELY, so anything another entrypoint drags in is out of the running: a pair
     * made of `./select` and something `./select` already pulls weighs what `./select`
     * weighs alone, and point 10 would fire on the arithmetic rather than on a bundler
     * that stopped pulling the library in.
     *
     * The first reading here was **every** other probe — a kernel — and `./core` was the
     * only entrypoint in the library that answered to it. D6 added `./icon`, which two
     * entrypoints pull and four do not, and the pair became `./icon` + `./select` with a
     * "shared core" of nothing: 26037 B measured against 27888 B expected, on a
     * measurement working exactly as intended. Shared by ALL was never the property that
     * mattered — shared by THESE TWO is, and `some` is what says so.
     */
    const others = [...files.keys()].filter((e) => e !== PRIMARY);
    const isPulledByAnother = (e) =>
      others.some((x) => x !== e && (probes[x]?.pulled ?? []).includes(e));
    const componentEntrypoints = others
      .filter((e) => (markers[e] ?? []).length > 0 && !isPulledByAnother(e))
      .sort((a, b) => probes[a].bytes - probes[b].bytes);
    const pair = [
      componentEntrypoints.at(0),
      componentEntrypoints.at(-1),
    ].filter(Boolean);
    const pairMeasurement =
      pair.length === 2
        ? await probe(esbuild, linker, directory, markers, byFile, pair)
        : null;

    return {
      sources,
      manifest,
      snapshot: existsSync(join(ROOT, SNAPSHOT))
        ? readFileSync(join(ROOT, SNAPSHOT), 'utf8')
        : null,
      markers,
      plain,
      components,
      named,
      declaredPlain: PLAIN,
      probes,
      pair: pairMeasurement
        ? { entrypoints: pair, bytes: pairMeasurement.bytes }
        : null,
      builder:
        pair.length === 2
          ? [
              builderProbe(dist, markers, [pair[0]]),
              builderProbe(dist, markers, pair),
              builderProbe(dist, markers, componentEntrypoints),
            ]
          : [],
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 *
 * The measurement arrives as DATA rather than from real bundling: building a dozen-odd
 * probes for each case would cost minutes per run, and a real Angular build — quarter
 * hours. The same choice as in `check-zoneless` and `check-parts` and for the same reason.
 * The price is plain: the fixtures do NOT exercise the bundling code — they exercise the
 * whole arrangement of checks. Bundling is exercised instead on every run against the real
 * repository.
 *
 * The reference input's snapshot is RENDERED from its own measurement rather than written
 * beside it: a written one would drift from the renderer at the first change to the file's
 * format, and the reference input would stop passing for a reason nobody was examining.
 */
const buildFixture = (fx) => {
  const reference = structuredClone(readFixture(REFERENCE));
  const input = {
    sources: [...reference.sources],
    manifest: structuredClone(reference.manifest),
    markers: structuredClone(reference.markers),
    plain: structuredClone(reference.plain),
    declaredPlain: structuredClone(reference.declaredPlain ?? {}),
    probes: structuredClone(reference.probes),
    named: structuredClone(reference.named ?? {}),
    pair: structuredClone(reference.pair),
    builder: structuredClone(reference.builder),
  };

  if (fx.clearSources) input.sources = [];
  if (fx.dropFromSources)
    input.sources = input.sources.filter((e) => e !== fx.dropFromSources);
  if (fx.dropFromExports) delete input.manifest.exports[fx.dropFromExports];
  if (fx.sideEffects !== undefined) input.manifest.sideEffects = fx.sideEffects;
  if (fx.dropProbe) delete input.probes[fx.dropProbe];
  if (fx.namedProbe)
    input.named[fx.namedProbe.ep] = {
      ...input.named[fx.namedProbe.ep],
      ...fx.namedProbe.is,
    };
  if (fx.probeWithoutItsOwn)
    input.probes[fx.probeWithoutItsOwn].pulled = input.probes[
      fx.probeWithoutItsOwn
    ].pulled.filter((e) => e !== fx.probeWithoutItsOwn);
  if (fx.dropMarkers) input.markers[fx.dropMarkers] = [];
  if (fx.undeclare) delete input.declaredPlain[fx.undeclare];
  if (fx.declare) input.declaredPlain[fx.declare.ep] = fx.declare.text;
  if (fx.addMarker) input.markers[fx.addMarker.ep] = fx.addMarker.markers;
  if (fx.addPulled)
    input.probes[fx.addPulled.ep].pulled = [
      ...input.probes[fx.addPulled.ep].pulled,
      fx.addPulled.what,
    ].sort();
  // The read itself, over a prepared TEXT: `inText` is computed by the same `presentIn`
  // the probes use, so a case here holds the read and not only the comparison behind it.
  if (fx.probeText)
    input.probes[fx.probeText.ep].inText = presentIn(
      fx.probeText.text,
      input.markers,
    );
  if (fx.addInText)
    input.probes[fx.addInText.ep].inText = [
      ...input.probes[fx.addInText.ep].inText,
      fx.addInText.what,
    ].sort();
  if (fx.dropFromText)
    input.probes[fx.dropFromText.ep].inText = input.probes[
      fx.dropFromText.ep
    ].inText.filter((e) => e !== fx.dropFromText.what);
  if (fx.addExternal)
    input.probes[fx.addExternal.ep].external = [
      ...input.probes[fx.addExternal.ep].external,
      fx.addExternal.what,
    ].sort();
  if (fx.size) input.probes[fx.size.ep].bytes = fx.size.bytes;
  if (fx.residue) input.probes[fx.residue.ep].residue = fx.residue.found;
  if (fx.pairBytes !== undefined) input.pair.bytes = fx.pairBytes;
  if (fx.builderFound)
    input.builder[fx.builderFound.i].found = fx.builderFound.found;
  if (fx.builderOverlay)
    input.builder[fx.builderOverlay.i].overlay = fx.builderOverlay.overlay;
  if (fx.dropBuilder) input.builder = input.builder.slice(0, -1);

  // The snapshot is rendered from the REFERENCE measurement and broken separately
  // afterwards — so the cases aiming at points 5, 7 and 8 break the MEASUREMENT rather
  // than the record, that is, exactly the side of the comparison at issue.
  // The snapshot is rendered from the reference's probes and from the CASE's named
  // measurement, and the asymmetry is the point of each: points 5–9 compare a measurement
  // against a record, so their cases break the measurement and leave the record standing;
  // point 12 compares a measurement against ITSELF, so a record disagreeing with it would
  // take its two cases away to `verbatim` and the rule would never be shown to fire alone.
  let snapshot = renderSnapshot(
    reference.sources,
    reference.probes,
    input.named ?? {},
  );
  if (fx.dropSnapshot) snapshot = null;
  else if (fx.snapshotWithoutRow)
    snapshot = snapshot
      .split('\n')
      .filter((w) => !w.startsWith(`${fx.snapshotWithoutRow} `))
      .join('\n');
  else if (fx.snapshotWithAlienRow)
    snapshot = snapshot.replace(
      '```\n',
      `\`\`\`\n${fx.snapshotWithAlienRow} 100 - @angular/core\n`,
    );
  // The prose is edited rather than written out: a case carrying its own copy of the
  // header would drift from the renderer at the first change to it, and would then fire
  // on that drift instead of on the sentence it names. A `from` matching nothing leaves
  // the snapshot equal to the render, and the case reports itself as one that PASSED.
  else if (fx.snapshotWithEditedProse)
    snapshot = snapshot.replace(
      fx.snapshotWithEditedProse.from,
      fx.snapshotWithEditedProse.to,
    );
  input.snapshot = snapshot;
  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  const result = checkBundle(await measureRepository());
  description = result.description;
} catch (error) {
  if (!(error instanceof BundleError)) throw error;
  // `--write` exists so that a snapshot drift can be accepted with one command. The other
  // points stay errors under it too: rewriting the snapshot is no answer to an entrypoint
  // that started pulling its neighbour in.
  if (
    WRITE &&
    ['snapshot', 'isolation', 'external', 'size', 'verbatim'].includes(
      error.check,
    ) &&
    error.snapshot
  ) {
    writeFileSync(join(ROOT, SNAPSHOT), error.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-bundle.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were it defective itself, every case would fire because
// of it rather than its own defect, and every "rejected" would be false — this control
// would become the very thing it stands against.
try {
  checkBundle(buildFixture({}));
} catch (error) {
  if (!(error instanceof BundleError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkBundle(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof BundleError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Tree-shaking gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Bundle: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
