#!/usr/bin/env node
/**
 * Prose gate: is a fact stated once stated once, and did the volume move
 * (`req-project-concise`)? The budget is 0017's; this holds it, and holds the record in
 * `docs/prose.snapshot.md` the way `check-bundle` holds bytes.
 *
 *  1. MEASURED: every gate has a header with numbered points, every count is whole,
 *  2. DENOMINATOR: the units are the tracked scripts and the plan's own boxes, both ways,
 *  3. BUDGET: 12 lines + 1 per point, 12 closed / 20 open — past it only with a reason,
 *  4. SNAPSHOT: the record has a row for every unit, and no other,
 *  5. EXACT: lines and words equal the record, both ways and with no band (0023),
 *  6. VERBATIM: the file is exactly what the renderer writes, prose included (`lesson-79`).
 *
 * Points 1 to 3 stand before the record because `--write` needs them: a header the walk
 * never found, or one past its budget, must not be written down as the accepted state
 * (`lesson-49`). Register: `prose.policy.json`. Control: `check-prose.fixtures/`.
 *
 * Usage: node tools/check-prose.mjs [--write] [--report]  (--report: the tables and the overlap)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REPORT = process.argv.includes('--report');
const SNAPSHOT = 'docs/prose.snapshot.md';
const PLAN = 'docs/plan.md';
const LESSONS = 'docs/lessons.md';
const POLICY = 'tools/prose.policy.json';
const FIXTURES = join(ROOT, 'tools/check-prose.fixtures');
const REFERENCE = '_reference.json';

/** 0017's numbers, and the only copy of them that runs. */
const HEADER_BASE = 12;
const CLOSED = 12;
const OPEN = 20;
const CLOSED_MARKS = 'x-';
const OPEN_MARKS = ' ~';

/** A position opens with a checkbox and a dotted number, at any indent. */
const POSITION = /^\s*- \[(.)\] \*\*(\d+(?:\.\d+)*)\b/;
/** The second reading of the same denominator: a checkbox item, numbered or not. */
const BOX = /^\s*- \[.\] /;
/** A numbered point of a header — what the budget is counted from. */
const POINT = /^\s*\*\s+\d+\./;

class ProseError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const whole = (v) => Number.isInteger(v) && v >= 0;
const budgetOf = (u) =>
  u.kind === 'header' ? HEADER_BASE + u.points : u.closed ? CLOSED : OPEN;
const label = (u) => (u.kind === 'header' ? u.unit : `position ${u.unit}`);

// ── the measurement ───────────────────────────────────────────────────────────

/** Leading comment block of a script, shebang excluded. */
const headerOf = (lines) => {
  let i = lines[0]?.startsWith('#!') ? 1 : 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const start = i;
  if (!lines[i]?.trimStart().startsWith('/*')) return [];
  while (i < lines.length && !lines[i].includes('*/')) i++;
  return lines.slice(start, i + 1);
};

/** Body of a section: from its heading down to the next one, blank tail dropped. */
const bodyOf = (lines, from, isNext) => {
  let end = from + 1;
  while (end < lines.length && !isNext(lines[end])) end++;
  while (end > from && lines[end - 1].trim() === '') end--;
  return lines.slice(from, end);
};

const readHeaders = () =>
  readdirSync(join(ROOT, 'tools'))
    .filter((f) => f.endsWith('.mjs'))
    .sort()
    .map((file) => {
      const head = headerOf(read(`tools/${file}`).split('\n'));
      const points = head.filter((l) => POINT.test(l)).length;
      return {
        kind: 'header',
        unit: file,
        points,
        lines: head.length,
        words: words(head.join(' ')),
      };
    });

const readPositions = (text) => {
  const all = text.split('\n');
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const m = all[i].match(POSITION);
    if (!m) continue;
    // A position's body is its own line and what hangs under it — the next position, or
    // anything that starts back at column 0, is somebody else's. Without the second half the
    // last position in the file swallows the paragraph that closes it.
    const body = bodyOf(all, i, (l) => POSITION.test(l) || /^\S/.test(l));
    out.push({
      kind: 'position',
      unit: m[2],
      mark: m[1],
      closed: CLOSED_MARKS.includes(m[1]),
      lines: body.length,
      words: words(body.join(' ')),
      body,
    });
  }
  return out;
};

const readInput = () => {
  const plan = read(PLAN);
  return {
    headers: readHeaders(),
    positions: readPositions(plan),
    // The two independent readings of the same denominators: what git carries, and what
    // the plan puts a checkbox in front of. A script nobody tracks and a position the
    // parser walked past are both invisible to the walk that produced the units.
    tracked: execFileSync('git', ['ls-files', ':(glob)tools/*.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace(/^tools\//, '')),
    boxes: plan.split('\n').filter((l) => BOX.test(l)).length,
    policy: JSON.parse(read(POLICY)),
    snapshot: existsSync(join(ROOT, SNAPSHOT)) ? read(SNAPSHOT) : null,
  };
};

// ── the record ────────────────────────────────────────────────────────────────

const rows = (block) =>
  (block ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(' '));

const parseSnapshot = (text) => {
  const blocks = [...text.matchAll(/^```\n([\s\S]*?)\n```$/gm)].map(
    (m) => m[1],
  );
  return { headers: rows(blocks[0]), positions: rows(blocks[1]) };
};

const render = (headers, positions) =>
  [
    '# Prose volume snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-prose.mjs --write`. The `check-prose` gate rejects a drift.',
    '',
    '"Prose answers “why isn’t this obvious?”, and whatever can be pointed at is pointed',
    'at" is a criterion ([`req-project-concise`](requirements/project.md#req-project-concise)),',
    'and a criterion with no number is settled again by whoever happens to be editing. The',
    "numbers are [0017](decisions/0017-one-home-per-fact.md)'s: a gate header gets 12 lines plus",
    'one per numbered point, a task position 12 closed and 20 open. This file is what they came',
    'out at, written down to the line.',
    '',
    'A drift does not mean "an error" — it means "a paragraph arrived or left, and that is to be',
    'visible in review". So both layers land here in both directions, in the diff of the change',
    'that moved them: `node tools/check-prose.mjs --write`. There is no tolerance, for the reason',
    'the size record has none — a tolerance is for a measurement that wobbles, and a line count',
    'does not ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).',
    '',
    '**Words are the second reading**, and they are here because a line is elastic: a header that',
    'meets its budget by running three sentences onto one line has moved nothing a reader can',
    'feel, and the word column says so. What is measured either way is **volume, not weight** —',
    'whether a paragraph carries anything is review’s judgment, and the limit is written into',
    'the requirement rather than passed over in silence.',
    '',
    'Columns: script · numbered points · lines · words. The budget is not a column: it is 12 plus',
    'the points, and a number copied here would be a second home for a number 0017 already holds.',
    '',
    '```',
    headers
      .map((h) => `${h.unit} ${h.points} ${h.lines} ${h.words}`)
      .join('\n'),
    '```',
    '',
    '## Task positions',
    '',
    'Columns: position · state · lines · words, in the order `docs/plan.md` carries them. A',
    'closed position is the record of finished work and gets 12 lines; an open one is a working',
    'spec, may think out loud, and gets 20.',
    '',
    'A position past its budget carries a reason in',
    '[`tools/prose.policy.json`](../tools/prose.policy.json), and the entry holds the exact line',
    'count — an excuse that stretched with the text would absorb the next paragraph unread.',
    '',
    '`docs/plan.md` is temporary: it goes when its last gap closes, and this layer goes with it.',
    'That is a rewrite of this file and not a silence — the gate fails on a walk that finds no',
    'position, because a denominator that empties quietly is the defect it exists to catch.',
    '',
    '```',
    positions
      .map(
        (p) =>
          `${p.unit} ${p.closed ? 'closed' : 'open'} ${p.lines} ${p.words}`,
      )
      .join('\n'),
    '```',
    '',
  ].join('\n');

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * Points 1 to 3 — the measurement measured, and the budget it is held to. Returned rather
 * than thrown through: `--write` needs exactly these three before it writes anything down.
 */
const checkMeasured = ({ headers, positions, tracked, boxes, policy }) => {
  // 1. Measured.
  for (const u of [...headers, ...positions]) {
    if (!whole(u.lines) || !whole(u.words))
      throw new ProseError(
        'measured',
        `${label(u)}: ${u.lines} lines and ${u.words} words — a count that is not a whole number is not a measurement`,
      );
    if (u.lines > 0 && u.words === 0)
      throw new ProseError(
        'measured',
        `${label(u)}: ${u.lines} lines carrying no word — the walk found a block and read nothing in it`,
      );
  }
  for (const h of headers.filter((h) => h.unit.startsWith('check-'))) {
    if (h.lines === 0)
      throw new ProseError(
        'measured',
        `\`tools/${h.unit}\` opens with no comment block — a header the walk cannot find is a budget that binds nothing`,
      );
    if (h.points === 0)
      throw new ProseError(
        'measured',
        `\`tools/${h.unit}\` has a header and no numbered point — the budget is counted from the points, so a gate without them gets the smallest one by accident`,
      );
  }
  for (const p of positions)
    if (!CLOSED_MARKS.includes(p.mark) && !OPEN_MARKS.includes(p.mark))
      throw new ProseError(
        'measured',
        `position ${p.unit} carries the mark \`[${p.mark}]\`, which is none of \`[${CLOSED_MARKS}${OPEN_MARKS}]\` — the budget cannot be picked for it`,
      );
  // 2. Denominator.
  if (headers.length === 0)
    throw new ProseError(
      'denominator',
      `the walk over \`tools/\` found no script — a budget with nothing under it passes forever`,
    );
  if (positions.length === 0)
    throw new ProseError(
      'denominator',
      `\`${PLAN}\` yielded no position — the layer emptied without the record saying so`,
    );
  const walked = new Set(headers.map((h) => h.unit));
  for (const file of tracked)
    if (!walked.has(file))
      throw new ProseError(
        'denominator',
        `git carries \`tools/${file}\` and the walk has no unit for it — a script the measurement skipped`,
      );
  for (const h of headers)
    if (!tracked.includes(h.unit))
      throw new ProseError(
        'denominator',
        `the walk measured \`tools/${h.unit}\`, which git does not carry — the record would hold a row for a file nobody has`,
      );
  if (boxes !== positions.length)
    throw new ProseError(
      'denominator',
      `\`${PLAN}\` puts a checkbox in front of ${boxes} items and the parser read ${positions.length} — ` +
        `a position whose number does not match \`${POSITION.source}\` is one the budget never sees`,
    );
  // 3. Budget.
  const units = [...headers, ...positions];
  const excused = new Map(
    (policy.oversize ?? []).map((e) => [`${e.kind}:${e.unit}`, e]),
  );
  for (const u of units) {
    const budget = budgetOf(u);
    const entry = excused.get(`${u.kind}:${u.unit}`);
    if (u.lines <= budget) {
      if (entry)
        throw new ProseError(
          'budget',
          `\`${POLICY}\` excuses ${label(u)} and it is ${u.lines} lines against ${budget} — a spent excuse reads as a rule`,
        );
      continue;
    }
    if (!entry)
      throw new ProseError(
        'budget',
        `${label(u)}: ${u.lines} lines against ${budget} — cut ${u.lines - budget}, or say in \`${POLICY}\` why it stands`,
      );
    if (entry.lines !== u.lines)
      throw new ProseError(
        'budget',
        `\`${POLICY}\` has ${label(u)} at ${entry.lines} lines and it is ${u.lines} — an excuse that stretches with the text absorbs the next paragraph unread`,
      );
    if (words(entry.reason ?? '') < 8)
      throw new ProseError(
        'budget',
        `\`${POLICY}\` excuses ${label(u)} with ${JSON.stringify(entry.reason ?? null)} — a register entry carries the reason or it is a list`,
      );
  }
  for (const e of policy.oversize ?? [])
    if (!units.some((u) => u.kind === e.kind && u.unit === e.unit))
      throw new ProseError(
        'budget',
        `\`${POLICY}\` excuses ${e.kind} \`${e.unit}\`, which is not a unit — a reason for nothing`,
      );
  return units;
};

/** Points 4 to 6 — the record against the measurement. */
const checkRecord = ({ headers, positions }, snapshot) => {
  // 4. Snapshot.
  if (snapshot === null)
    throw new ProseError(
      'snapshot',
      `\`${SNAPSHOT}\` is not there — run \`node tools/check-prose.mjs --write\`; until then every paragraph is a change nobody can see`,
    );
  const record = parseSnapshot(snapshot);
  const layers = [
    ['header', headers, record.headers],
    ['position', positions, record.positions],
  ];
  for (const [kind, units, recorded] of layers) {
    const have = new Map(recorded.map(([id, ...rest]) => [id, rest]));
    for (const u of units)
      if (!have.has(u.unit))
        throw new ProseError(
          'snapshot',
          `\`${SNAPSHOT}\` has no row for ${label(u)} — a unit with no record is prose with no history`,
        );
    for (const id of have.keys())
      if (!units.some((u) => u.unit === id))
        throw new ProseError(
          'snapshot',
          `\`${SNAPSHOT}\` has a ${kind} row for \`${id}\`, which the walk did not measure — a record of prose that is gone`,
        );
    if (recorded.length !== units.length)
      throw new ProseError(
        'snapshot',
        `\`${SNAPSHOT}\` carries ${recorded.length} ${kind} rows for ${units.length} units — a row written twice counts once in a map`,
      );
  }
  // 5. Exact.
  for (const [kind, units, recorded] of layers) {
    const have = new Map(recorded.map(([id, ...rest]) => [id, rest]));
    for (const u of units) {
      const [state, lineCount, wordCount] = have.get(u.unit);
      const was =
        kind === 'header'
          ? Number(state)
          : state === 'closed'
            ? 'closed'
            : 'open';
      const is = kind === 'header' ? u.points : u.closed ? 'closed' : 'open';
      if (was !== is)
        throw new ProseError(
          'exact',
          `${label(u)}: ${kind === 'header' ? 'numbered points' : 'state'} ${was} → ${is} — ` +
            `the budget moved with it; write it down: \`node tools/check-prose.mjs --write\``,
        );
      for (const [what, then, now] of [
        ['lines', Number(lineCount), u.lines],
        ['words', Number(wordCount), u.words],
      ])
        if (then !== now)
          throw new ProseError(
            'exact',
            `${label(u)}: ${what} ${then} → ${now} (${now > then ? '+' : ''}${now - then}) — ` +
              `${now > then ? 'prose arrived' : 'prose left'}; if that is the change, write it down: ` +
              `\`node tools/check-prose.mjs --write\``,
          );
    }
  }
  // 6. Verbatim.
  const want = render(headers, positions);
  if (want !== snapshot) {
    const a = snapshot.split('\n');
    const b = want.split('\n');
    const at = b.findIndex((line, i) => a[i] !== line);
    throw new ProseError(
      'verbatim',
      `\`${SNAPSHOT}\` is not what the renderer writes — first difference at line ${at + 1}: ` +
        `${JSON.stringify(b[at] ?? '')} — run \`node tools/check-prose.mjs --write\``,
    );
  }
  return record;
};

const checkProse = (input) => {
  checkMeasured(input);
  return checkRecord(input, input.snapshot);
};

// ── the live run ──────────────────────────────────────────────────────────────

const problems = [];
let live = null;
try {
  const input = readInput();
  if (WRITE) {
    checkMeasured(input);
    writeFileSync(join(ROOT, SNAPSHOT), render(input.headers, input.positions));
    input.snapshot = read(SNAPSHOT);
  }
  checkProse(input);
  live = input;
} catch (error) {
  if (!(error instanceof ProseError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect: `headers` and `positions` patch a unit (`null` drops it, an unknown id adds
 * one) and `clear` empties a whole layer, `tracked` and `boxes` rewrite the two independent
 * readings, `policy` adds or drops a register entry, `snapshot: null` loses the record and
 * `snapshot.replace` rewrites it by a pattern that has to match — a needle that finds
 * nothing is a case that broke nothing.
 */
const buildFixture = (fixtureLive, fx) => {
  const w = structuredClone({ ...fixtureLive, snapshot: fixtureLive.snapshot });
  for (const layer of fx.clear ?? []) w[layer] = [];
  for (const [layer, key] of [
    ['headers', 'unit'],
    ['positions', 'unit'],
  ])
    for (const [id, patch] of Object.entries(fx[layer] ?? {})) {
      const at = w[layer].findIndex((u) => u[key] === id);
      if (patch === null) {
        if (at < 0)
          throw new Error(
            `${fx.check}: there is no ${layer} unit \`${id}\` to drop`,
          );
        w[layer].splice(at, 1);
      } else if (at < 0)
        w[layer].push({
          kind: layer === 'headers' ? 'header' : 'position',
          unit: id,
          points: 0,
          mark: 'x',
          closed: true,
          lines: 1,
          words: 1,
          body: [],
          ...patch,
        });
      else w[layer][at] = { ...w[layer][at], ...patch };
    }
  if (fx.tracked) {
    w.tracked = w.tracked.filter((f) => !(fx.tracked.drop ?? []).includes(f));
    w.tracked.push(...(fx.tracked.add ?? []));
  }
  if (fx.boxes !== undefined) w.boxes = fx.boxes;
  if (fx.policy) {
    w.policy.oversize = (w.policy.oversize ?? []).filter(
      (e) => !(fx.policy.drop ?? []).includes(`${e.kind}:${e.unit}`),
    );
    w.policy.oversize.push(...(fx.policy.add ?? []));
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
    `tools/check-prose.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

if (live) {
  // The live input MUST pass (it did, above) — every case is built on it.
  for (const name of cases) {
    const fx = JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
    try {
      checkProse(buildFixture(live, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof ProseError)) throw error;
      if (error.check !== fx.check)
        problems.push(
          `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
            `was meant to — the fixture proves something other than what it declares`,
        );
    }
  }
}

// ── the report ────────────────────────────────────────────────────────────────

/** The 6-word sequences a closed position repeats from the lessons it cites (0017). */
const overlap = (positions) => {
  const lessons = read(LESSONS).split('\n');
  const grams = (lines, n = 6) => {
    const w = lines
      .join(' ')
      .toLowerCase()
      .replace(/[`*_[\]()#|—–,.:;"“”'!?]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    return new Set(
      Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) =>
        w.slice(i, i + n).join(' '),
      ),
    );
  };
  const lessonBody = (id) => {
    const at = lessons.findIndex((l) => l.includes(`id="${id}"`));
    return at < 0 ? [] : bodyOf(lessons, at, (l) => l.startsWith('### '));
  };
  let shared = 0;
  let total = 0;
  for (const p of positions.filter((p) => p.closed)) {
    const cited = [...new Set(p.body.join(' ').match(/lesson-\d+/g) ?? [])];
    if (!cited.length) continue;
    const told = grams(cited.flatMap(lessonBody));
    const own = grams(p.body);
    const hits = [...own].filter((g) => told.has(g)).length;
    shared += hits;
    total += own.size;
    if (hits)
      console.log(
        `  ${p.unit.padEnd(6)} ${String(hits).padStart(3)} of ${String(own.size).padStart(4)} 6-grams repeated (${((hits / own.size) * 100).toFixed(1)}%) — ${cited.join(', ')}`,
      );
  }
  console.log(
    `  total ${shared} of ${total} (${total ? ((shared / total) * 100).toFixed(1) : '0.0'}%)`,
  );
};

if (REPORT && live) {
  for (const [title, units, cols] of [
    [
      'HEADERS',
      live.headers,
      (u) => `${u.points} pts ${String(u.words).padStart(4)} words  ${u.unit}`,
    ],
    [
      'POSITIONS',
      live.positions,
      (u) =>
        `${u.closed ? 'closed' : 'open  '} ${u.unit.padEnd(6)} ${String(u.words).padStart(4)} words`,
    ],
  ]) {
    const sum = (key) => units.reduce((a, u) => a + u[key], 0);
    const budget = units.reduce((a, u) => a + budgetOf(u), 0);
    console.log(
      `\n== ${title} — ${units.length} units, ${sum('lines')} lines, budget ${budget}, ${sum('words')} words ==`,
    );
    for (const u of [...units].sort(
      (a, b) => b.lines - budgetOf(b) - (a.lines - budgetOf(a)),
    ))
      console.log(
        `${u.lines > budgetOf(u) ? '!' : ' '} ${String(u.lines).padStart(3)}/${String(budgetOf(u)).padStart(3)} ${cols(u)}`,
      );
  }
  console.log('\n== OVERLAP — closed position vs the lessons it cites ==');
  overlap(live.positions);
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Prose gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const sum = (units, key) => units.reduce((a, u) => a + u[key], 0);
const budgetOfAll = (units) => units.reduce((a, u) => a + budgetOf(u), 0);
console.log(
  `✓ Prose gate: ${live.headers.length} gate headers at ${sum(live.headers, 'lines')} lines against ` +
    `${budgetOfAll(live.headers)}, ${live.positions.length} task positions at ${sum(live.positions, 'lines')} ` +
    `against ${budgetOfAll(live.positions)}, ${(live.policy.oversize ?? []).length} past it with a reason; ` +
    `${WRITE ? `${SNAPSHOT} written` : `${SNAPSHOT} is the record`}. Negative control: the live input ` +
    `passes, ${cases.length} prepared ones rejected on their own points.`,
);
