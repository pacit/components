#!/usr/bin/env node
/**
 * Conformance gate: is `docs/acr.md` — the Accessibility Conformance Report a buyer asks for
 * since the EAA — a rendering of what the gates measure, or prose somebody wrote
 * (`req-a11y-acr`)? Here the evidence runs on every commit and the report is derived from it.
 *
 *  1. CATALOGUE: the claims name every WCAG 2.2 success criterion at A and AA, once,
 *  2. LEVEL: a level is one of the five words, and each word demands its own input,
 *  3. EVIDENCE: every citation resolves — a point, a case title, a sentence, a decision,
 *  4. WIRED: a cited gate or suite runs in CI (`nx affected -t …`),
 *  5. CARDS: a claim over the component cards is the cards' own Checks rows,
 *  6. FINDINGS: a finding a row leans on is still open in the plan,
 *  7. THE PASS: an assistive-technology pass claimed as recorded has its logs and readings,
 *  8. RENDERING: `docs/acr.md` is the rendering of the claims.
 *
 * A row cannot say more than a gate proves, and the rows nothing measures say so in their own
 * words. A ninth run examines the gate itself (`req-quality-negative-control`):
 * `check-acr.fixtures/`.
 *
 * Usage: node tools/check-acr.mjs [--write]  (--write: regenerate docs/acr.md)
 */
import { execSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { targetsIn } from './workflow-targets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CLAIMS = 'docs/acr/claims.json';
const REPORT = 'docs/acr.md';
const CARDS_DIR = 'docs/components';
const PLAN = 'docs/plan.md';
const CI = '.github/workflows/ci.yml';
const IDS = 'apps/sandbox/src/app/ui/doc-ids.ts';
const MANIFEST = 'libs/components/package.json';
const LIB = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-acr.fixtures');
const REFERENCE = '_reference.json';

/** WCAG 2.2, the 31 criteria of level A and the 24 of level AA, in the standard's order. */
const CATALOGUE = [
  ['1.1.1', 'Non-text Content', 'A'],
  ['1.2.1', 'Audio-only and Video-only (Prerecorded)', 'A'],
  ['1.2.2', 'Captions (Prerecorded)', 'A'],
  ['1.2.3', 'Audio Description or Media Alternative (Prerecorded)', 'A'],
  ['1.2.4', 'Captions (Live)', 'AA'],
  ['1.2.5', 'Audio Description (Prerecorded)', 'AA'],
  ['1.3.1', 'Info and Relationships', 'A'],
  ['1.3.2', 'Meaningful Sequence', 'A'],
  ['1.3.3', 'Sensory Characteristics', 'A'],
  ['1.3.4', 'Orientation', 'AA'],
  ['1.3.5', 'Identify Input Purpose', 'AA'],
  ['1.4.1', 'Use of Color', 'A'],
  ['1.4.2', 'Audio Control', 'A'],
  ['1.4.3', 'Contrast (Minimum)', 'AA'],
  ['1.4.4', 'Resize Text', 'AA'],
  ['1.4.5', 'Images of Text', 'AA'],
  ['1.4.10', 'Reflow', 'AA'],
  ['1.4.11', 'Non-text Contrast', 'AA'],
  ['1.4.12', 'Text Spacing', 'AA'],
  ['1.4.13', 'Content on Hover or Focus', 'AA'],
  ['2.1.1', 'Keyboard', 'A'],
  ['2.1.2', 'No Keyboard Trap', 'A'],
  ['2.1.4', 'Character Key Shortcuts', 'A'],
  ['2.2.1', 'Timing Adjustable', 'A'],
  ['2.2.2', 'Pause, Stop, Hide', 'A'],
  ['2.3.1', 'Three Flashes or Below Threshold', 'A'],
  ['2.4.1', 'Bypass Blocks', 'A'],
  ['2.4.2', 'Page Titled', 'A'],
  ['2.4.3', 'Focus Order', 'A'],
  ['2.4.4', 'Link Purpose (In Context)', 'A'],
  ['2.4.5', 'Multiple Ways', 'AA'],
  ['2.4.6', 'Headings and Labels', 'AA'],
  ['2.4.7', 'Focus Visible', 'AA'],
  ['2.4.11', 'Focus Not Obscured (Minimum)', 'AA'],
  ['2.5.1', 'Pointer Gestures', 'A'],
  ['2.5.2', 'Pointer Cancellation', 'A'],
  ['2.5.3', 'Label in Name', 'A'],
  ['2.5.4', 'Motion Actuation', 'A'],
  ['2.5.7', 'Dragging Movements', 'AA'],
  ['2.5.8', 'Target Size (Minimum)', 'AA'],
  ['3.1.1', 'Language of Page', 'A'],
  ['3.1.2', 'Language of Parts', 'AA'],
  ['3.2.1', 'On Focus', 'A'],
  ['3.2.2', 'On Input', 'A'],
  ['3.2.3', 'Consistent Navigation', 'AA'],
  ['3.2.4', 'Consistent Identification', 'AA'],
  ['3.2.6', 'Consistent Help', 'A'],
  ['3.3.1', 'Error Identification', 'A'],
  ['3.3.2', 'Labels or Instructions', 'A'],
  ['3.3.3', 'Error Suggestion', 'AA'],
  ['3.3.4', 'Error Prevention (Legal, Financial, Data)', 'AA'],
  ['3.3.7', 'Redundant Entry', 'A'],
  ['3.3.8', 'Accessible Authentication (Minimum)', 'AA'],
  ['4.1.2', 'Name, Role, Value', 'A'],
  ['4.1.3', 'Status Messages', 'AA'],
];
const BY_ID = new Map(
  CATALOGUE.map(([id, name, level]) => [id, { name, level }]),
);

/** The five words of the ITI template, and what each demands here (point 2). */
const LEVELS = [
  'Supports',
  'Partially Supports',
  'Does Not Support',
  'Not Applicable',
  'Not Evaluated',
];
/** The kinds of evidence that MEASURE; the others point at prose. */
const MEASURING = new Set(['gate', 'spec', 'cards', 'scan', 'source']);
const KINDS = new Set([...MEASURING, 'req', 'lesson', 'decision', 'finding']);

/**
 * A scan is a claim "by construction" turned into a measurement: the pattern a criterion
 * forbids, read over the library's own sources on every run. `over` picks the sources:
 * templates, sheets, or the TypeScript outside the specs.
 */
const SCANS = {
  'no-media-elements': {
    over: ['html'],
    pattern: /<(video|audio)\b/,
    means: 'an `<audio>` or `<video>` element',
  },
  'no-orientation-lock': {
    over: ['scss'],
    pattern: /\borientation\s*:/,
    means: 'an `orientation` media feature',
  },
  'no-positive-tabindex': {
    over: ['html', 'ts'],
    pattern: /tabindex\s*[:=]\s*["']?[1-9]/,
    means: 'a positive `tabindex`',
  },
  'no-accesskey': {
    over: ['html'],
    pattern: /\baccesskey\b/,
    means: 'an `accesskey`',
  },
  'no-device-motion': {
    over: ['ts'],
    pattern: /devicemotion|deviceorientation/,
    means: 'a device-motion listener',
  },
  'no-svg-text': {
    over: ['html', 'ts'],
    pattern: /<text\b/,
    means: 'an SVG `<text>` element',
  },
};

/** The cards' row this gate reads when the pass is claimed as recorded (point 7). */
const SCREEN_READER_ROW = 'Screen-reader log';

/**
 * A violation of one of the eight points. It carries the point's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN point.
 */
class AcrError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

// ── reading the repository ────────────────────────────────────────────────────

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every file under the entrypoints' `src` directories, by extension, specs left out. */
const librarySources = () => {
  const out = {};
  for (const entry of readdirSync(join(ROOT, LIB))) {
    const src = join(ROOT, LIB, entry, 'src');
    if (!existsSync(src) || !statSync(src).isDirectory()) continue;
    for (const file of readdirSync(src)) {
      const ext = file.split('.').pop();
      if (!['html', 'scss', 'ts'].includes(ext) || file.endsWith('.spec.ts'))
        continue;
      out[`${LIB}/${entry}/src/${file}`] = readFileSync(
        join(src, file),
        'utf8',
      );
    }
  }
  return out;
};

const ROW = /^\s*\|(.*)\|\s*$/;
/** The `## Checks` table of one card, as `{ criterion, evidence }` rows of trimmed cells. */
const checksOf = (text) => {
  const rows = [];
  let on = false;
  for (const line of text.split('\n')) {
    if (/^## /.test(line)) on = /^## Checks\b/.test(line);
    if (!on) continue;
    const m = line.match(ROW);
    if (!m) continue;
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.length < 2 || cells[0] === 'criterion' || /^-+$/.test(cells[0]))
      continue;
    rows.push({ criterion: cells[0], evidence: cells[1] });
  }
  return rows;
};

const readCards = () =>
  Object.fromEntries(
    readdirSync(join(ROOT, CARDS_DIR))
      .filter(
        (f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md',
      )
      .sort()
      .map((f) => [
        f.replace(/\.md$/, ''),
        checksOf(read(`${CARDS_DIR}/${f}`)),
      ]),
  );

/** Requirement ids with the file that declares them, and the lesson ids — for the links. */
const readIds = () => {
  const reqFile = {};
  for (const file of [
    'docs/00-axis.md',
    ...readdirSync(join(ROOT, 'docs/requirements'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => `docs/requirements/${f}`),
  ])
    for (const [, id] of read(file).matchAll(/id="(req-[a-z0-9-]+)"/g))
      reqFile[id] = file.replace(/^docs\//, '');
  const lessons = new Set(
    [...read('docs/lessons.md').matchAll(/id="(lesson-\d+)"/g)].map(
      (m) => m[1],
    ),
  );
  return { reqFile, lessons };
};

/** Every path the claims cite, read once — a fixture overrides the map, not the disk. */
const readTexts = (claims, files) => {
  const texts = {};
  for (const c of claims.criteria ?? [])
    for (const e of c.evidence ?? []) {
      const path = e.gate ?? e.spec ?? e.source;
      if (path && files.has(path) && texts[path] === undefined)
        texts[path] = read(path);
    }
  return texts;
};

const readInput = () => {
  const claims = JSON.parse(read(CLAIMS));
  const files = new Set(
    execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean),
  );
  const at = join(ROOT, claims.assistiveTechnology?.logs ?? 'docs/acr/at/');
  return {
    claims,
    files,
    texts: readTexts(claims, files),
    sources: librarySources(),
    cards: readCards(),
    ids: readIds(),
    decisions: readdirSync(join(ROOT, 'docs/decisions')).filter((f) =>
      /^\d{4}-.*\.md$/.test(f),
    ),
    ci: read(CI),
    plan: read(PLAN),
    atLogs: existsSync(at)
      ? readdirSync(at).filter((f) => f.endsWith('.md'))
      : [],
    // How much of the sandbox each log actually covers. Counting the FILES is what the
    // report used to do, and three files would have read as three readings — while two of
    // them can be a single view out of thirty-six, taken to prove a runner works.
    atViews: existsSync(at)
      ? readdirSync(at)
          .filter((f) => f.endsWith('.md'))
          .sort()
          .map((f) =>
            Number(
              /over (\d+) views?/.exec(
                readFileSync(join(at, f), 'utf8'),
              )?.[1] ?? 0,
            ),
          )
      : [],
    version: JSON.parse(read(MANIFEST)).version,
    rendered: existsSync(join(ROOT, REPORT)) ? read(REPORT) : null,
  };
};

// ── the eight points ──────────────────────────────────────────────────────────

/** Which target runs this file — the same reading `check-docs` makes of a cited path. */
const impliedTarget = (path) => {
  const gate = path.match(/^tools\/(check-[a-z-]+)\.mjs$/);
  if (gate) return gate[1];
  if (path.startsWith('apps/sandbox-e2e/') || path.startsWith('apps/docs-e2e/'))
    return 'e2e';
  if (path.startsWith('libs/components/') && path.endsWith('.spec.ts'))
    return 'test';
  return null;
};

/*
 * Which targets CI runs. The reading lives in `workflow-targets.mjs`, and moving it there
 * fixed two defects this copy had: it held `\s` in its class, so a match could run past the
 * newline into the next step, and it read neither comments nor options. The second one had
 * teeth — the sharded browser job puts `--shard=…` between the command and `-t`, so this
 * gate stopped seeing the `e2e` run line, while a COMMENT naming it was enough to answer
 * "the suite runs in CI" with the run line deleted (0081).
 */
const ciTargets = (ci) => targetsIn(ci);

/** What one Checks row says: measured (a path), argued (deliberately, not applicable), a gap. */
const rowState = (evidence) => {
  if (/^none\s+—\s+gap/i.test(evidence)) return 'gap';
  if (/^(none\s+—\s+deliberately|not applicable)/i.test(evidence))
    return 'argued';
  return 'measured';
};

/** The cards' rows behind one `cards` citation: who measured, who argued, who owes. */
const aggregate = (cards, label) => {
  const out = { label, measured: [], argued: [], gaps: [], missing: [] };
  for (const [id, rows] of Object.entries(cards)) {
    const row = rows.find((r) => r.criterion.includes(label));
    if (!row) out.missing.push(id);
    else
      out[
        rowState(row.evidence) === 'gap' ? 'gaps' : rowState(row.evidence)
      ].push(id);
  }
  return out;
};

const findingState = (plan, n) => {
  const m = plan.match(
    new RegExp(`^- \\[( |x|~|-)\\] \\*\\*${n.replace('.', '\\.')} — `, 'm'),
  );
  return m ? m[1] : null;
};

/**
 * Runs the eight points over one input and returns what the report is rendered from.
 * Throws `AcrError` on the first violation — the points run from the most basic one, so
 * the later ones would have nothing to examine anyway.
 */
const checkAcr = (input) => {
  const { claims, files, texts, sources, cards, ids, decisions, plan } = input;
  const rows = claims.criteria ?? [];

  // 1. CATALOGUE
  const seen = new Set();
  for (const row of rows) {
    if (!BY_ID.has(row.id))
      throw new AcrError(
        'catalogue',
        `\`${row.id}\` is not a success criterion of WCAG 2.2 at level A or AA — the report ` +
          `is the 55 of the standard, in the standard's order, and nothing else`,
      );
    if (seen.has(row.id))
      throw new AcrError('catalogue', `\`${row.id}\` is claimed twice`);
    seen.add(row.id);
  }
  const missing = CATALOGUE.filter(([id]) => !seen.has(id)).map(([id]) => id);
  if (missing.length)
    throw new AcrError(
      'catalogue',
      `${missing.length} success criteria have no row: ${missing.join(', ')} — a report ` +
        `that skips a criterion is read as passing it`,
    );

  // 2. LEVEL
  for (const row of rows) {
    if (!LEVELS.includes(row.conformance))
      throw new AcrError(
        'level',
        `\`${row.id}\` says "${row.conformance}", which is none of the five words: ` +
          LEVELS.join(', '),
      );
    if (typeof row.remarks !== 'string' || !row.remarks.trim())
      throw new AcrError(
        'level',
        `\`${row.id}\` carries no remark — every row says in words what the level rests on`,
      );
    if (!Array.isArray(row.evidence))
      throw new AcrError('level', `\`${row.id}\` has no evidence list`);
    for (const e of row.evidence) {
      const kind = Object.keys(e).find((k) => KINDS.has(k));
      if (!kind)
        throw new AcrError(
          'evidence',
          `\`${row.id}\` cites ${JSON.stringify(e)}, which is no kind of evidence this gate reads`,
        );
    }
    const kinds = row.evidence.map((e) =>
      Object.keys(e).find((k) => KINDS.has(k)),
    );
    const measures = kinds.some((k) => MEASURING.has(k));
    const findings = kinds.filter((k) => k === 'finding').length;
    const limits = findings + kinds.filter((k) => k === 'cards').length;
    if (row.conformance === 'Supports' && !measures)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Supports on no measurement — a requirement, a lesson or a ` +
          `decision is prose about a gate, not the gate`,
      );
    if (row.conformance === 'Supports' && findings)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Supports and cites an open finding — a limit with an owner is ` +
          `exactly what Partially Supports is for`,
      );
    if (row.conformance === 'Partially Supports' && !measures)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Partially Supports on no measurement`,
      );
    if (row.conformance === 'Partially Supports' && !limits)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Partially Supports and names no limit — an open finding, or a ` +
          `cards' row with a gap in it`,
      );
    if (
      ['Does Not Support', 'Not Evaluated'].includes(row.conformance) &&
      !findings
    )
      throw new AcrError(
        'level',
        `\`${row.id}\` says ${row.conformance} and cites no open finding — a criterion the ` +
          `library fails or nobody measures needs an owner in the plan`,
      );
  }

  // 3. EVIDENCE
  const targets = new Map();
  const scanned = {};
  for (const row of rows)
    for (const e of row.evidence) {
      const where = `\`${row.id}\``;
      if (
        e.gate !== undefined ||
        e.spec !== undefined ||
        e.source !== undefined
      ) {
        const path = e.gate ?? e.spec ?? e.source;
        if (!files.has(path) || texts[path] === undefined)
          throw new AcrError(
            'evidence',
            `${where} cites \`${path}\`, which is not a tracked file`,
          );
        const text = texts[path];
        for (const p of e.points ?? []) {
          if (!new RegExp(`^\\s*\\*\\s+${p}\\.\\s`, 'm').test(text))
            throw new AcrError(
              'evidence',
              `${where} cites point ${p} of \`${path}\`, and the gate's header numbers no ` +
                `such point`,
            );
        }
        for (const title of e.titles ?? [])
          if (!text.includes(title))
            throw new AcrError(
              'evidence',
              `${where} cites a case "${title}" that \`${path}\` does not hold — renamed, ` +
                `or never written`,
            );
        if (e.says !== undefined && !text.includes(e.says))
          throw new AcrError(
            'evidence',
            `${where} says \`${path}\` reads "${e.says}", and it does not`,
          );
        const target = impliedTarget(path);
        if (target) targets.set(path, target);
      }
      if (e.req !== undefined && !ids.reqFile[e.req])
        throw new AcrError(
          'evidence',
          `${where} cites \`${e.req}\`, which no requirement declares`,
        );
      if (e.lesson !== undefined && !ids.lessons.has(e.lesson))
        throw new AcrError(
          'evidence',
          `${where} cites \`${e.lesson}\`, which is not in lessons.md`,
        );
      if (
        e.decision !== undefined &&
        !decisions.some((f) => f.startsWith(`${e.decision}-`))
      )
        throw new AcrError(
          'evidence',
          `${where} cites decision ${e.decision}, which is not on disk`,
        );
      if (e.finding !== undefined && !/^\d+\.\d+$/.test(String(e.finding)))
        throw new AcrError(
          'evidence',
          `${where} cites finding "${e.finding}", which is not a plan number`,
        );
      if (e.scan !== undefined) {
        const scan = SCANS[e.scan];
        if (!scan)
          throw new AcrError(
            'evidence',
            `${where} cites scan \`${e.scan}\`, which this gate does not know (${Object.keys(SCANS).join(', ')})`,
          );
        const over = Object.entries(sources).filter(([path]) =>
          scan.over.includes(path.split('.').pop()),
        );
        for (const [path, text] of over) {
          const lines = text.split('\n');
          const at = lines.findIndex((l) => scan.pattern.test(l));
          if (at !== -1)
            throw new AcrError(
              'evidence',
              `${where} rests on scan \`${e.scan}\` (${scan.means}), and \`${path}:${at + 1}\` ` +
                `holds one — the claim "by construction" no longer holds`,
            );
        }
        scanned[e.scan] = over.length;
      }
    }

  // 4. WIRED
  const wired = ciTargets(input.ci);
  for (const [path, target] of targets)
    if (!wired.has(target))
      throw new AcrError(
        'wired',
        `\`${path}\` is cited as evidence, and the \`${target}\` target does not run in CI ` +
          `(\`nx affected -t\` in ci.yml) — a gate outside CI proves nothing about a commit`,
      );

  // 5. CARDS
  const aggregates = {};
  for (const row of rows)
    for (const e of row.evidence) {
      if (e.cards === undefined) continue;
      const agg = aggregate(cards, e.cards);
      aggregates[e.cards] = agg;
      const owed = [...agg.gaps, ...agg.missing];
      if (row.conformance === 'Supports' && owed.length)
        throw new AcrError(
          'cards',
          `\`${row.id}\` says Supports over the cards' \`${e.cards}\` row, and ${owed.length} ` +
            `of ${Object.keys(cards).length} cards owe it: ${owed.join(', ')} — a gap in a ` +
            `card is a gap in the claim`,
        );
      if (
        row.conformance === 'Partially Supports' &&
        !owed.length &&
        !row.evidence.some((x) => x.finding !== undefined)
      )
        throw new AcrError(
          'cards',
          `\`${row.id}\` says Partially Supports over the cards' \`${e.cards}\` row, and no ` +
            `card owes it any more — the limit has closed, the row is a Supports to raise`,
        );
    }

  // 6. FINDINGS
  for (const row of rows)
    for (const e of row.evidence) {
      if (e.finding === undefined) continue;
      const state = findingState(plan, String(e.finding));
      if (state === null)
        throw new AcrError(
          'finding',
          `\`${row.id}\` leans on finding ${e.finding}, and the plan has no such item`,
        );
      if (state === 'x' || state === '-')
        throw new AcrError(
          'finding',
          `\`${row.id}\` leans on finding ${e.finding}, which the plan marks ` +
            `${state === 'x' ? 'closed' : 'dropped'} — a limit that has gone is a claim to revisit`,
        );
    }

  // 7. THE PASS
  const at = claims.assistiveTechnology ?? {};
  if (
    !Array.isArray(at.readers) ||
    !at.readers.length ||
    typeof at.logs !== 'string'
  )
    throw new AcrError(
      'pass',
      `the assistive-technology pass names no readers or no place for its logs`,
    );
  const sr = aggregate(cards, SCREEN_READER_ROW);
  if (at.recorded === true) {
    if (!input.atLogs.length)
      throw new AcrError(
        'pass',
        `the pass is claimed as recorded and \`${at.logs}\` holds no log`,
      );
    const owed = [...sr.gaps, ...sr.missing, ...sr.argued];
    if (owed.length)
      throw new AcrError(
        'pass',
        `the pass is claimed as recorded and ${owed.length} cards carry no reading in their ` +
          `\`${SCREEN_READER_ROW}\` row: ${owed.join(', ')}`,
      );
  }

  // 8. RENDERING
  const rendered = renderAcr(input, aggregates, scanned, sr);
  return { rendered, aggregates, sr };
};

// ── the report ────────────────────────────────────────────────────────────────

const renderEvidence = (e, ids, aggregates, scanned) => {
  if (e.gate !== undefined) {
    const pts = e.points ?? [];
    return `\`${e.gate}\`${pts.length ? ` (point${pts.length > 1 ? 's' : ''} ${pts.join(', ')})` : ''}`;
  }
  if (e.spec !== undefined)
    return `\`${e.spec}\`${(e.titles ?? []).length ? ` › ${e.titles.map((t) => `"${t}"`).join(', ')}` : ''}`;
  if (e.source !== undefined)
    return `\`${e.source}\`${e.says !== undefined ? ` ("${e.says.replace(/`/g, '')}")` : ''}`;
  if (e.scan !== undefined)
    return `scan \`${e.scan}\` — no match in ${scanned[e.scan]} source files`;
  if (e.cards !== undefined) {
    const a = aggregates[e.cards];
    const total =
      a.measured.length + a.argued.length + a.gaps.length + a.missing.length;
    const held = a.measured.length + a.argued.length;
    const owed = [...a.gaps, ...a.missing];
    return (
      `the cards' \`${e.cards}\` row: ${held} of ${total} (${a.measured.length} measured, ` +
      `${a.argued.length} by argument${owed.length ? `; owed by ${owed.join(', ')}` : ''})`
    );
  }
  if (e.req !== undefined)
    return `[\`${e.req}\`](${ids.reqFile[e.req]}#${e.req})`;
  if (e.lesson !== undefined)
    return `[\`${e.lesson}\`](lessons.md#${e.lesson})`;
  if (e.decision !== undefined)
    return `decision [${e.decision}](decisions/README.md)`;
  if (e.finding !== undefined)
    return `finding ${e.finding} in [plan.md](plan.md)`;
  return '';
};

const renderAcr = (input, aggregates, scanned, sr) => {
  const { claims, ids, version, cards } = input;
  const byId = new Map(claims.criteria.map((c) => [c.id, c]));
  const table = (level) =>
    [
      '| Criterion | Conformance level | Remarks and explanations |',
      '| --- | --- | --- |',
      ...CATALOGUE.filter(([, , l]) => l === level).map(([id, name]) => {
        const c = byId.get(id);
        const evidence = c.evidence
          .map((e) => renderEvidence(e, ids, aggregates, scanned))
          .filter(Boolean);
        const remark =
          c.remarks.replace(/\|/g, '\\|') +
          (evidence.length ? ` _Evidence:_ ${evidence.join(' · ')}` : '');
        return `| **${id}** ${name} | ${c.conformance} | ${remark} |`;
      }),
    ].join('\n');
  const count = (level, word) =>
    CATALOGUE.filter(
      ([id, , l]) => l === level && byId.get(id).conformance === word,
    ).length;
  const summary = [
    '| Conformance level | Level A (31) | Level AA (24) |',
    '| --- | ---: | ---: |',
    ...LEVELS.map((w) => `| ${w} | ${count('A', w)} | ${count('AA', w)} |`),
  ].join('\n');
  const at = claims.assistiveTechnology;
  // Two readers read as "A and B"; three would read as "A and B and C" without this.
  const readers = (list) =>
    list.length < 3
      ? list.join(' and ')
      : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
  const total = Object.keys(cards).length;
  const notEvaluated = CATALOGUE.filter(
    ([id]) => byId.get(id).conformance === 'Not Evaluated',
  );
  const passText = at.recorded
    ? `**Recorded.** ${readers(at.readers)} over ${at.views}; the logs stand under \`${at.logs}\` (${input.atLogs.length} file${input.atLogs.length === 1 ? '' : 's'}), and every one of the ${total} component cards points its \`${SCREEN_READER_ROW}\` row at them.`
    : `**Not recorded.** The gates end where axe ends — the DOM and the CSS. What a screen reader says on arriving at each view is a question they do not answer, and this report says so rather than guessing: ${sr.gaps.length} of the ${total} component cards carry a \`${SCREEN_READER_ROW}\` row that reads \`none — gap\`, ${sr.measured.length} carry a reading, and ${sr.missing.length} have no row yet. The pass this report waits for: ${readers(at.readers)}, over ${at.views}, one log per reader under \`${at.logs}\` (${input.atLogs.length} of ${at.readers.length} on disk today${input.atViews?.length ? `, covering ${input.atViews.join(', ')} view(s)` : ''}), the announcement transcribed per view. The day the claims say \`"recorded": true\`, point 7 of the gate demands the logs on disk and a reading in every card. Until then the site says "machine-audited" and never "conformant" (decision 0061).`;
  return `# Accessibility Conformance Report

<!-- GENERATED by \`node tools/check-acr.mjs --write\` from \`docs/acr/claims.json\` — do not
edit. The gate holds every citation below to the repository and rejects a report that
differs from its claims. -->

**Product:** \`@pacit/components\` ${version} — the Angular component library. The documentation
site and the consuming application are outside this report: a criterion about a page is
theirs, and its row says so.

**Standard:** WCAG 2.2, levels A and AA. EN 301 549, the European standard the EAA points
tenders at, refers web content to the same criteria (clause 9 is WCAG 2.1 AA, which these
tables cover).

**Report date:** ${claims.reportDate}

**Evaluation methods:** the repository's own gates, run on every commit in CI and named per
row — axe-core over every component view and every special state in three engines, a
contrast policy measured on every token build for both themes, a keyboard map tested key by
key per component, forced colours and reduced motion emulated and read back, an accessible
name gate over the sources, and scans over the library's templates and stylesheets for what
a criterion forbids. The assistive-technology pass: **${at.recorded ? 'recorded' : 'not recorded'}** (see below).

**Status: machine-audited.** The library is built and machine-audited to WCAG 2.2 AA; it does
not call itself conformant until the assistive-technology pass is on record — the wording
law of decision 0061, held by the documentation site's own suite.

## The words

| Level | What it means in this report |
| --- | --- |
| Supports | a gate that runs on every commit measures the criterion and finds nothing wrong |
| Partially Supports | measured, and a limit is named in the row — an open finding in the plan, or a component card that still owes the reading |
| Does Not Support | measured, and found wrong; the finding that owns the repair is named |
| Not Applicable | the criterion is about something the library does not ship, and the row says what — where a scan can prove the absence, it does |
| Not Evaluated | no gate measures the criterion yet, and the row names the finding that will |

The last word is this report's one deviation from the ITI template, which reserves _Not
Evaluated_ for level AAA. A claim nothing measured is exactly what this document exists to
avoid, so a criterion no gate reaches says so in its own row rather than borrowing a
_Supports_ from a reading of the code; the list of those rows is the work order, not a
footnote.

## Summary

${summary}

## Table 1: success criteria, level A

${table('A')}

## Table 2: success criteria, level AA

${table('AA')}

## The assistive-technology pass

${passText}

## What no gate measures yet

${
  notEvaluated.length
    ? notEvaluated
        .map(([id, name]) => `- **${id}** ${name} — ${byId.get(id).remarks}`)
        .join('\n')
    : 'Every criterion has a gate behind its row.'
}
`;
};

// ── formatting ────────────────────────────────────────────────────────────────

/**
 * The rendering goes through prettier, because \`nx format:check\` covers \`docs/\` and a
 * generated table that prettier would re-align is a drift the next format run reports.
 */
const prettier = await import('prettier');
const format = async (text) =>
  prettier.format(text, {
    ...((await prettier.resolveConfig(join(ROOT, REPORT))) ?? {}),
    parser: 'markdown',
  });

// ── the real run ──────────────────────────────────────────────────────────────

const problems = [];
let summary = null;
try {
  const input = readInput();
  const { rendered, aggregates, sr } = checkAcr(input);
  const text = await format(rendered);
  if (WRITE) {
    writeFileSync(join(ROOT, REPORT), text);
  } else if (input.rendered !== text) {
    const a = (input.rendered ?? '').split('\n');
    const b = text.split('\n');
    const at = b.findIndex((line, i) => a[i] !== line);
    throw new AcrError(
      'rendering',
      `\`${REPORT}\` is not the rendering of \`${CLAIMS}\` — first difference at line ` +
        `${at + 1}: ${JSON.stringify(b[at] ?? '')} — run \`node tools/check-acr.mjs --write\``,
    );
  }
  summary = { input, aggregates, sr };
} catch (error) {
  if (!(error instanceof AcrError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect. The live input is the reference: the report is a reading of this repository
 * and a case is that reading with one thing broken.
 */
const buildFixture = (live, fx) => {
  const w = structuredClone(live);
  w.rendered = null; // a case examines the decision, not the drift of the file on disk
  for (const [id, patch] of Object.entries(fx.criteria ?? {})) {
    const i = w.claims.criteria.findIndex((c) => c.id === id);
    if (patch === null) w.claims.criteria.splice(i, 1);
    else if (i === -1) w.claims.criteria.push({ id, ...patch });
    else w.claims.criteria[i] = { ...w.claims.criteria[i], ...patch };
  }
  Object.assign(w.claims.assistiveTechnology, fx.assistiveTechnology ?? {});
  for (const [id, rows] of Object.entries(fx.cards ?? {}))
    for (const [label, evidence] of Object.entries(rows)) {
      const row = w.cards[id]?.find((r) => r.criterion.includes(label));
      if (row) row.evidence = evidence;
      else (w.cards[id] ??= []).push({ criterion: label, evidence });
    }
  Object.assign(w.texts, fx.texts ?? {});
  Object.assign(w.sources, fx.sources ?? {});
  for (const path of fx.dropFiles ?? []) w.files.delete(path);
  for (const [n, state] of Object.entries(fx.plan ?? {}))
    w.plan = w.plan.replace(
      new RegExp(`^- \\[( |~)\\] \\*\\*${n.replace('.', '\\.')} — `, 'm'),
      state === 'absent'
        ? '- **gone — '
        : `- [${state === 'closed' ? 'x' : '-'}] **${n} — `,
    );
  if (fx.ci !== undefined) w.ci = fx.ci;
  if (fx.atLogs !== undefined) w.atLogs = fx.atLogs;
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-acr.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

if (summary) {
  // The live input MUST pass (it did, above) — every case is built on it.
  for (const name of cases) {
    const fx = readFixture(name);
    try {
      checkAcr(buildFixture(summary.input, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof AcrError)) throw error;
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
  console.error(`X Conformance gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const { input, sr } = summary;
const words = Object.fromEntries(
  LEVELS.map((w) => [
    w,
    input.claims.criteria.filter((c) => c.conformance === w).length,
  ]),
);
console.log(
  `✓ Conformance gate: ${CATALOGUE.length} criteria — ` +
    LEVELS.map((w) => `${words[w]} ${w.toLowerCase()}`).join(', ') +
    `; the assistive-technology pass ${input.claims.assistiveTechnology.recorded ? 'recorded' : `not recorded (${sr.gaps.length + sr.missing.length} of ${Object.keys(input.cards).length} cards owe the reading)`}; ` +
    `${WRITE ? `${REPORT} written` : `${REPORT} is the rendering of the claims`}. ` +
    `Negative control: the live input passes, ${cases.length} prepared ones rejected on their own points.`,
);
