#!/usr/bin/env node
/**
 * Cost gate: what does a component page's preview cost to render, and did it move
 * (`req-quality-benchmark`)? `nx run docs:bench` renders every card's preview in jsdom; this
 * gate holds its report against `apps/docs/bench.snapshot.md`, the way `check-bundle` holds bytes.
 *
 *  1. REPORT: a dated report, the machine named, every scene carrying five whole readings,
 *  2. DENOMINATOR: the scenes are exactly the previews of the demo registry, both ways,
 *  3. SNAPSHOT: the record has a row for every scene, and no other,
 *  4. EXACT: the four counts equal the record, with no band — a count does not wobble (0023),
 *  5. CLOCK: a scene's clock reading is dated, attributed, parsed, and compared by nobody,
 *  6. VERBATIM: the file is exactly what the renderer writes, prose included (`lesson-79`).
 *
 * The order is `check-bundle`'s: what compares against the record stands behind the points
 * that prove the measurement measured, because point 4's advice is `--write` and a wrong
 * number written down is worse than a red run. Control: `check-bench.fixtures/`.
 *
 * Usage: node tools/check-bench.mjs [--write]  (--write: re-run the cost run, rewrite the record)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { freshInputsFor } from './fresh-inputs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REPORT = 'tmp/bench/report.json';
const SNAPSHOT = 'apps/docs/bench.snapshot.md';
const REGISTRY = 'apps/docs/src/app/demos/index.ts';
const BENCH = 'apps/docs/bench/previews.bench.ts';
const FIXTURES = join(ROOT, 'tools/check-bench.fixtures');
const REFERENCE = '_reference.json';

/** The readings that are counts, in the column order of the record, with their floors. */
const COUNTS = [
  ['elements', 1],
  ['depth', 1],
  ['listeners', 0],
  ['renders', 1],
];
const CLOCK = 'micros';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The report is what the cost run wrote, so a write re-runs it rather than trusting a
// cached one (**C29**).
freshInputsFor(WRITE, ['docs:bench']);

class BenchError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * The previews the site shows, read from the demo registry's own text — the second reading
 * of the denominator, independent of the run: the run iterates the same map at runtime, and
 * a report that lost a scene would otherwise be compared with itself.
 */
const readRegistry = (text) => {
  const block = text.match(/export const DEMOS[^{]*\{([\s\S]*?)\n\};/);
  if (!block) return [];
  return [
    ...block[1].matchAll(/^\s+([a-z]+): \(\) => import\('\.\/\1\.demo'\)/gm),
  ].map((m) => m[1]);
};

const readInput = () => ({
  report: existsSync(join(ROOT, REPORT)) ? JSON.parse(read(REPORT)) : null,
  registry: readRegistry(read(REGISTRY)),
  snapshot: existsSync(join(ROOT, SNAPSHOT)) ? read(SNAPSHOT) : null,
});

// ── the record ────────────────────────────────────────────────────────────────

const MEASURED =
  /^Measured (\d{4}-\d{2}-\d{2}) on (.+) \((\d+) cores\), node (v[\d.]+), (jsdom [\d.]+)\.$/m;

/**
 * The two fenced blocks of the record and its dated line, or what is missing. The prose
 * around them is point 6's business and is not read here.
 */
const parseSnapshot = (text) => {
  const blocks = [...text.matchAll(/^```\n([\s\S]*?)\n```$/gm)].map(
    (m) => m[1],
  );
  const rows = (block) =>
    (block ?? '')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(' '));
  const measured = text.match(MEASURED);
  return {
    counts: rows(blocks[0]),
    clock: rows(blocks[1]),
    measured: measured
      ? {
          measured: measured[1],
          machine: {
            cpu: measured[2],
            cores: Number(measured[3]),
            node: measured[4],
            dom: measured[5],
          },
        }
      : null,
  };
};

const render = (scenes, clock) => {
  const ids = Object.keys(scenes).sort();
  const counts = ids
    .map((id) => `${id} ${COUNTS.map(([k]) => scenes[id][k]).join(' ')}`)
    .join('\n');
  const readings = ids.map((id) => `${id} ${clock.micros[id]}`).join('\n');
  const { cpu, cores, node, dom } = clock.machine;
  return [
    '# Cost snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-bench.mjs --write`. The `check-bench` gate rejects a drift.',
    '',
    "What a component page's preview costs to render — measured on the demo the page shows",
    '(`src/app/demos/<id>.demo.ts`), in jsdom, by `bench/previews.bench.ts`. Four readings',
    'are counts, and the gate holds them exactly and in both directions: a wrapper added, a',
    'listener leaked or a second render pass is a change of what a consumer pays, and it is',
    'to be visible in review — the rule the size record follows',
    '([0023](../../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).',
    '',
    'Columns: the scene · elements in the document, the host excluded · depth, the longest',
    'path from the host downwards · listeners registered and not taken back once the scene',
    'is stable, on elements, the document and the window alike · renders before the scene',
    'held still.',
    '',
    '```',
    counts,
    '```',
    '',
    '## The clock',
    '',
    `Measured ${clock.measured} on ${cpu} (${cores} cores), node ${node}, ${dom}.`,
    '',
    'Microseconds from creation to stable, the median of fifteen rounds after three warm-ups.',
    'A clock wobbles with the machine and the load, so this section is published, dated and',
    'compared by nobody: the gate requires a reading for every scene and holds none of the',
    'values — a tolerance is for a measurement that wobbles, and a band on a record is a',
    'record that ages (0023). Rewritten with every `--write`, so the numbers are of the same',
    "day as the counts beside them. jsdom lays nothing out, so this is the library's own",
    "work — templates, signals, listeners — and not a browser's.",
    '',
    '```',
    readings,
    '```',
    '',
  ].join('\n');
};

// ── the checks ────────────────────────────────────────────────────────────────

const whole = (v) => Number.isInteger(v);

/**
 * Points 1 and 2 — the measurement measured. Returned rather than thrown through: `--write`
 * needs exactly these two to hold before it writes anything down.
 */
const checkRun = ({ report, registry }) => {
  // 1. The report.
  if (!report)
    throw new BenchError(
      'report',
      `\`${REPORT}\` is not there — run \`nx run docs:bench\` (or this gate with \`--write\`); ` +
        `a record compared with nothing is a record that passes`,
    );
  if (!DATE.test(report.measured ?? ''))
    throw new BenchError(
      'report',
      `the report carries no \`measured\` date — a clock nobody dated is not a reading`,
    );
  const m = report.machine ?? {};
  if (!m.cpu || !whole(m.cores) || !m.node || !m.dom)
    throw new BenchError(
      'report',
      `the report names no machine (\`cpu\`, \`cores\`, \`node\`, \`dom\`) — a clock read on nothing`,
    );
  const scenes = report.scenes ?? {};
  const ids = Object.keys(scenes);
  if (ids.length === 0)
    throw new BenchError(
      'report',
      `the report holds no scene — the run measured nothing and points 3 to 6 would compare nothing`,
    );
  for (const id of ids) {
    const s = scenes[id];
    for (const [key, floor] of [...COUNTS, [CLOCK, 1]]) {
      if (!whole(s?.[key]))
        throw new BenchError(
          'report',
          `scene \`${id}\`: \`${key}\` is ${JSON.stringify(s?.[key])}, not a whole number`,
        );
      if (s[key] < floor)
        throw new BenchError(
          'report',
          `scene \`${id}\`: \`${key}\` is ${s[key]}, below ${floor} — ` +
            (key === 'renders'
              ? 'a scene that never rendered is not a measurement'
              : key === 'elements'
                ? 'a scene that put nothing in the document is not a measurement'
                : 'a reading below its floor is a run that miscounted'),
        );
    }
  }
  // 2. The denominator.
  if (registry.length === 0)
    throw new BenchError(
      'denominator',
      `no preview found in \`${REGISTRY}\` — the run has nothing to be held to`,
    );
  for (const id of registry)
    if (!(id in scenes))
      throw new BenchError(
        'denominator',
        `the registry shows the \`${id}\` preview and the run has no scene for it — ` +
          `a preview the run skipped is a cost nobody measured`,
      );
  for (const id of ids)
    if (!registry.includes(id))
      throw new BenchError(
        'denominator',
        `the run measured \`${id}\`, which \`${REGISTRY}\` does not show — the record would carry a scene no page renders`,
      );
  return scenes;
};

/** Points 3 to 6 — the record against the measurement. */
const checkRecord = (scenes, snapshot) => {
  // 3. The snapshot.
  if (snapshot === null)
    throw new BenchError(
      'snapshot',
      `\`${SNAPSHOT}\` is not there — run \`node tools/check-bench.mjs --write\`; ` +
        `until then every count is a change nobody can see`,
    );
  const record = parseSnapshot(snapshot);
  const recorded = new Map(record.counts.map(([id, ...rest]) => [id, rest]));
  for (const id of Object.keys(scenes))
    if (!recorded.has(id))
      throw new BenchError(
        'snapshot',
        `\`${SNAPSHOT}\` has no row for \`${id}\` — a scene with no record is a cost with no history`,
      );
  for (const id of recorded.keys())
    if (!(id in scenes))
      throw new BenchError(
        'snapshot',
        `\`${SNAPSHOT}\` has a row for \`${id}\`, which the run did not measure — a record of a scene that is gone`,
      );
  // 4. Exact.
  for (const id of Object.keys(scenes).sort()) {
    const row = recorded.get(id);
    COUNTS.forEach(([key], i) => {
      const was = Number(row[i]);
      const is = scenes[id][key];
      if (was !== is)
        throw new BenchError(
          'exact',
          `\`${id}\`: ${key} ${was} → ${is} (${is > was ? '+' : ''}${is - was}) — ` +
            `${is > was ? 'the preview got dearer' : 'the preview got cheaper'}; ` +
            `if that is the change, write it down: \`node tools/check-bench.mjs --write\``,
        );
    });
  }
  // 5. The clock.
  if (!record.measured)
    throw new BenchError(
      'clock',
      `\`${SNAPSHOT}\` has no dated "Measured … on …" line — a clock nobody dated is not a reading`,
    );
  const clock = new Map(record.clock.map(([id, ...rest]) => [id, rest]));
  for (const id of Object.keys(scenes)) {
    const row = clock.get(id);
    if (!row)
      throw new BenchError(
        'clock',
        `\`${SNAPSHOT}\` has no clock reading for \`${id}\` — every scene is timed, or the date above means nothing`,
      );
    if (row.length !== 1 || !/^\d+$/.test(row[0]) || Number(row[0]) < 1)
      throw new BenchError(
        'clock',
        `\`${SNAPSHOT}\`: the clock reading for \`${id}\` is ${JSON.stringify(row.join(' '))}, not a positive whole number of microseconds`,
      );
  }
  // 6. Verbatim.
  const want = render(scenes, {
    ...record.measured,
    micros: Object.fromEntries([...clock].map(([id, [n]]) => [id, Number(n)])),
  });
  if (want !== snapshot) {
    const a = snapshot.split('\n');
    const b = want.split('\n');
    const at = b.findIndex((line, i) => a[i] !== line);
    throw new BenchError(
      'verbatim',
      `\`${SNAPSHOT}\` is not what the renderer writes — first difference at line ${at + 1}: ` +
        `${JSON.stringify(b[at] ?? '')} — run \`node tools/check-bench.mjs --write\``,
    );
  }
  return record;
};

const checkBench = (input) => checkRecord(checkRun(input), input.snapshot);

// ── the live run ──────────────────────────────────────────────────────────────

const problems = [];
let live = null;
try {
  const input = readInput();
  if (WRITE) {
    const scenes = checkRun(input);
    const { measured, machine } = input.report;
    const micros = Object.fromEntries(
      Object.entries(scenes).map(([id, s]) => [id, s[CLOCK]]),
    );
    writeFileSync(
      join(ROOT, SNAPSHOT),
      render(scenes, { measured, machine, micros }),
    );
    input.snapshot = read(SNAPSHOT);
  }
  checkBench(input);
  live = input;
} catch (error) {
  if (!(error instanceof BenchError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect: `report: null` loses the report and `reportWithout` a field of it; `scenes`
 * patches a scene (`null` drops it, an unknown id adds it); `registry` adds or drops
 * previews; `snapshot: null` loses the record,
 * and `snapshot.replace` rewrites it by a pattern that has to match — a needle that finds
 * nothing is a case that broke nothing, and the run says so.
 */
const buildFixture = (fixtureLive, fx) => {
  const w = structuredClone(fixtureLive);
  if (fx.report === null) w.report = null;
  for (const key of [].concat(fx.reportWithout ?? [])) delete w.report[key];
  for (const [id, patch] of Object.entries(fx.scenes ?? {})) {
    if (patch === null) delete w.report.scenes[id];
    else w.report.scenes[id] = { ...(w.report.scenes[id] ?? {}), ...patch };
  }
  if (fx.registry) {
    w.registry = w.registry.filter(
      (id) => !(fx.registry.drop ?? []).includes(id),
    );
    w.registry.push(...(fx.registry.add ?? []));
  }
  if (fx.snapshot === null) w.snapshot = null;
  for (const { pattern, flags, with: replacement } of fx.snapshot?.replace ??
    []) {
    const re = new RegExp(pattern, flags ?? '');
    if (!re.test(w.snapshot))
      throw new Error(
        `${fx.check}: the pattern ${JSON.stringify(pattern)} matches nothing in \`${SNAPSHOT}\` — the case breaks nothing`,
      );
    w.snapshot = w.snapshot.replace(re, replacement);
  }
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-bench.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

if (live) {
  // The live input MUST pass (it did, above) — every case is built on it.
  for (const name of cases) {
    const fx = readFixture(name);
    try {
      checkBench(buildFixture(live, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof BenchError)) throw error;
      if (error.check !== fx.check)
        problems.push(
          `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
            `was meant to — the fixture proves something other than what it declares`,
        );
    }
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Cost gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const scenes = Object.values(live.report.scenes);
const sum = (key) => scenes.reduce((n, s) => n + s[key], 0);
console.log(
  `✓ Cost gate: ${scenes.length} scenes — ${sum('elements')} elements, ${sum('listeners')} listeners, ` +
    `${scenes.filter((s) => s.renders > 1).length} settling in more than one render; ` +
    `${WRITE ? `${SNAPSHOT} written` : `${SNAPSHOT} is the record`} (the clock of ` +
    `${live.report.measured}, ${BENCH}). Negative control: the live input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
