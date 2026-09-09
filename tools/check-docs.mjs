#!/usr/bin/env node
/**
 * Documentation gate: does every promise in `docs/` name a machine that can fail on it,
 * and does that machine exist (`req-quality-registry`)? Documentation drifts from reality
 * silently, and a hand-maintained "not implemented" annotation is worth exactly as much as
 * somebody's memory of adding it.
 *
 *  1. completeness — every requirement has `Promise`, `Gate`, `Control`, a gap `Binds at`,
 *  2. existence — every path cited in `Gate`/`Control` exists on disk,
 *  3. wired into CI — the target implied by a cited path runs in `nx affected -t …`,
 *     and the graph fact that line stands on is re-probed, never remembered,
 *  4. no dangling citations — every `req-*` / `lesson-*` in the repo resolves,
 *  5. freshness — `docs/registry.md` and the generated ID union agree with the source,
 *  6. negative control — the broken requirements in `check-docs.fixtures/` are rejected,
 *  7. no card denies a gate — a component card that says a requirement has no gate must
 *     agree with that requirement's own **Gate** field.
 *
 * Usage:
 *   node tools/check-docs.mjs           verifies (CI)
 *   node tools/check-docs.mjs --write   regenerates the registry and the ID union
 */
import { readFileSync, writeFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REGISTRY = 'docs/registry.md';
const REQ_IDS = 'apps/sandbox/src/app/ui/doc-ids.ts';

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

// ── sources ────────────────────────────────────────────────────────────────────

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const REQ_FILES = [
  'docs/00-axis.md',
  ...globSync('docs/requirements/*.md', { cwd: ROOT }).sort(),
];

const trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

/** The registry is generated FROM the citations, so it cites everything by construction. */
const CITATION_EXEMPT = new Set([REGISTRY]);

/** An index of file names — lets `number.spec.ts` be verified without a directory. */
const byBasename = new Map();
for (const f of trackedFiles) {
  const b = basename(f);
  if (!byBasename.has(b)) byBasename.set(b, []);
  byBasename.get(b).push(f);
}

// ── requirement parser ────────────────────────────────────────────────────────────

const FIELD =
  /^\*\*(Promise|Gate|Control|Decision|Lessons|Binds at|Non-goals|Exceptions)[.:]\*\*/;
const HEADING = /^#{2,3} <a id="(req-[a-z0-9-]+)"><\/a>`\1` — (.+)$/;

/**
 * Returns the list of requirements. A field ends only at the next field FROM THE KNOWN
 * LIST — not at any line starting with `**`, because wrapped text can begin with bold
 * ("— examines\n**the packed artifact**, not the sources").
 */
const parseRequirements = (text, file) => {
  const out = [];
  const lines = text.split('\n');
  let cur = null;
  let field = null;

  const push = () => {
    if (cur) out.push(cur);
  };

  for (const line of lines) {
    const h = line.match(HEADING);
    if (h) {
      push();
      cur = { id: h[1], title: h[2], file, fields: {} };
      field = null;
      continue;
    }
    if (!cur) continue;
    const f = line.match(FIELD);
    if (f) {
      field = f[1];
      cur.fields[field] =
        (cur.fields[field] ?? '') + line.slice(f[0].length).trim();
      continue;
    }
    if (field) cur.fields[field] += ' ' + line.trim();
  }
  push();
  return out;
};

const requirements = REQ_FILES.flatMap((f) => parseRequirements(read(f), f));

if (requirements.length === 0) fail('docs', 'no requirement found at all');

const ids = new Set(requirements.map((r) => r.id));
const dupes = requirements
  .map((r) => r.id)
  .filter((id, i, a) => a.indexOf(id) !== i);
for (const d of new Set(dupes)) fail('docs', `duplicate identifier \`${d}\``);

// ── lessons ───────────────────────────────────────────────────────────────────

const lessonIds = new Set(
  [...read('docs/lessons.md').matchAll(/<a id="(lesson-\d+)"><\/a>/g)].map(
    (m) => m[1],
  ),
);

// ── 1. completeness + state classification ───────────────────────────────────────

const NONE = /^none\s*[—-]\s*(deliberately|gap)\s*:\s*(.+)$/s;

/** `enforced` | `deliberate` | `gap` | null (an error) */
const classify = (value, req, fieldName) => {
  const v = (value ?? '').trim();
  if (!v) {
    fail(req.id, `field **${fieldName}** is empty`);
    return null;
  }
  if (/^not applicable\b/i.test(v)) return 'deliberate';
  if (/^none\b/.test(v)) {
    const m = v.match(NONE);
    if (!m) {
      fail(
        req.id,
        `field **${fieldName}** says "none", but not as \`none — deliberately: <why>\` ` +
          `or \`none — gap: <what is needed>\``,
      );
      return null;
    }
    if (m[2].trim().length < 10)
      fail(
        req.id,
        `field **${fieldName}**: the reason for the absence is empty or too general`,
      );
    return m[1] === 'gap' ? 'gap' : 'deliberate';
  }
  return 'enforced';
};

for (const req of requirements) {
  if (!req.fields.Promise?.trim()) fail(req.id, 'no **Promise** field');
  if (req.fields.Gate === undefined) fail(req.id, 'no **Gate** field');
  if (req.fields.Control === undefined) fail(req.id, 'no **Control** field');

  req.gateState = classify(req.fields.Gate, req, 'Gate');
  req.controlState = classify(req.fields.Control, req, 'Control');

  req.state =
    req.gateState === 'enforced' && req.controlState === 'enforced'
      ? 'enforced'
      : req.gateState === 'gap' || req.controlState === 'gap'
        ? 'gap'
        : req.gateState === null || req.controlState === null
          ? 'ERROR'
          : 'partial';

  if (req.state === 'gap' && !req.fields['Binds at']?.trim())
    fail(
      req.id,
      'state `gap` with no **Binds at** field — a gap without a date is a wish',
    );
}

// ── 2. cited paths exist ───────────────────────────────────────────

const PATHISH = /`([^`\n]+)`/g;
const ROOTS = /^(libs|apps|tools|\.github|\.verdaccio)\//;

/** Resolves a citation to real files, or returns null when it is not a path at all. */
const resolveCitation = (raw) => {
  // "file.spec.ts › test name" — the path is the part before the arrow
  const path = raw
    .split('›')[0]
    .trim()
    .replace(/[.,;]$/, '');
  if (ROOTS.test(path)) {
    if (path.includes('*')) {
      const hits = globSync(path, { cwd: ROOT });
      return hits.length ? hits : [];
    }
    return existsSync(join(ROOT, path)) ? [path] : [];
  }
  // A bare file name — only for the shapes that MEAN a path in this documentation
  // (`number.spec.ts`, `playwright.config.mts`). Deliberately narrow: `zone.js` and
  // `pct.css` appear in the text as names of things, not as file citations, and a wide
  // rule would report them as missing files.
  if (/\.(spec|config)\.(ts|mts)$/.test(path))
    return byBasename.get(path) ?? [];
  return null;
};

const citedPaths = new Map(); // path -> Set(requirement ids)

for (const req of requirements) {
  for (const fieldName of ['Gate', 'Control']) {
    const value = req.fields[fieldName] ?? '';
    if (/^\s*(none|not applicable)\b/.test(value)) continue;
    for (const [, raw] of value.matchAll(PATHISH)) {
      const hits = resolveCitation(raw);
      if (hits === null) continue; // does not look like a path (a target name, a token, …)
      if (hits.length === 0) {
        fail(
          req.id,
          `field **${fieldName}** points at a path that does not exist: \`${raw}\``,
        );
        continue;
      }
      for (const h of hits) {
        if (!citedPaths.has(h)) citedPaths.set(h, new Set());
        citedPaths.get(h).add(req.id);
      }
    }
  }
}

// ── 3. wired into CI ───────────────────────────────────────────────────────────

// Both workflows count as CI: the push gate (ci.yml) and the nightly full run
// (nightly.yml), where the two heaviest targets moved while the repository is a metered
// private stage. A target is wired if either file runs it — `affected` on a push or
// `run-many` on the schedule; a gate that runs only at night is still a gate, and the
// alternative reading would force the mutation pair back onto every push for the
// wiring check's sake alone.
const ci =
  read('.github/workflows/ci.yml') + read('.github/workflows/nightly.yml');
const ciTargets = new Set(
  [...ci.matchAll(/nx (?:affected|run-many) -t ([a-z0-9:\-\s]+)/g)]
    .flatMap((m) => m[1].trim().split(/\s+/))
    .filter(Boolean),
);

/**
 * The fact the matching above stands on, re-probed rather than remembered. Presence in
 * the `-t` text is wiring only while `nx affected` marks the right projects affected:
 * every `check-*` target lives on the root project, `test` on the library, `vite:test`
 * and `e2e` on the sandbox pair — so a change deep under `libs/` has to reach all four,
 * or a push that stays there runs a SUBSET of the gates while this point keeps reporting
 * them wired. That reach was measured once (lesson-47) against an installed nx and is a
 * dependency's behaviour, not a constant; `check-browsers` point 6 re-probes its own
 * facts on every run for exactly this reason. The probe file is a leaf manifest — the
 * deep case; `--files` overrides the SHAs nx-set-shas exports, measured, so the answer
 * is about the graph and not about whatever the current diff happens to touch.
 */
const AFFECTED_PROBE = 'libs/components/package.json';
const AFFECTED_REACH = ['components', 'sandbox', 'sandbox-e2e', '@org/source'];
try {
  const answer = JSON.parse(
    execSync(
      `npx nx show projects --affected --json --files=${AFFECTED_PROBE}`,
      { cwd: ROOT, encoding: 'utf8' },
    ),
  );
  const missing = AFFECTED_REACH.filter((p) => !answer.includes(p));
  if (missing.length)
    fail(
      'nx-affected',
      `a change to \`${AFFECTED_PROBE}\` does not mark ${missing
        .map((p) => `\`${p}\``)
        .join(
          ', ',
        )} affected (nx answered: ${answer.join(', ') || 'nothing'}). ` +
        `The targets living there — the \`check-*\` family on the root, \`test\`, ` +
        `\`vite:test\`, \`e2e\` — would silently stop running on such a push, while ` +
        `the \`-t\` text above still reads as wired`,
    );
} catch (error) {
  fail(
    'nx-affected',
    `the probe \`nx show projects --affected\` gave no readable answer over ` +
      `\`${AFFECTED_PROBE}\` (${error.message.split('\n')[0]}). No answer is not a ` +
      `pass: this point trusts the affected graph, and a probe that cannot read it ` +
      `leaves the whole wiring check standing on memory`,
  );
}

/** Which target runs this file. `null` = cannot be inferred, and that is fine. */
const impliedTarget = (path) => {
  if (path.startsWith('apps/sandbox-e2e/')) return 'e2e';
  if (path.startsWith('apps/sandbox/') && path.endsWith('.spec.ts'))
    return 'vite:test';
  if (path.startsWith('libs/components/') && path.endsWith('.spec.ts'))
    return 'test';
  if (path.endsWith('eslint.config.mjs')) return 'lint';
  return null;
};

for (const [path, reqIds] of citedPaths) {
  const target = impliedTarget(path);
  if (target && !ciTargets.has(target))
    fail(
      [...reqIds][0],
      `\`${path}\` is a gate, but the \`${target}\` target does not run in CI ` +
        `(\`nx affected -t\` in ci.yml) — a gate outside CI is not a gate`,
    );
}

// Explicit "target `X`" mentions — only in fields that actually declare a gate. Inside
// `none — gap: …` a target name is sometimes a description of the state ("the
// `local-registry` target exists and nothing uses it"), not a claim that something runs.
for (const req of requirements) {
  const declared = ['Gate', 'Control']
    .map((f) => req.fields[f] ?? '')
    .filter((v) => !/^\s*(none|not applicable)\b/.test(v));
  const text = declared.join(' ');
  for (const [, name] of text.matchAll(/target `([a-z0-9:\-]+)`/g)) {
    if (name.includes(':')) continue; // e.g. `tokens:build` — runs through `^build`
    if (!ciTargets.has(name))
      fail(
        req.id,
        `the named target \`${name}\` does not run in \`nx affected -t\` in CI`,
      );
  }
}

// ── 4. dangling citations across the repo ─────────────────────────────────────────

/**
 * A citation is not a **path segment**: `req-` is a prefix common enough to turn up in file
 * names, and a file name is not a citation. Hence the slash before and the extension after
 * are excluded.
 */
const REF =
  /(?<![\w/-])(req-[a-z][a-z0-9-]*[a-z0-9]|lesson-\d+)(?![\w-]|\.[a-z])/g;

for (const rel of trackedFiles) {
  if (CITATION_EXEMPT.has(rel)) continue;
  if (rel.startsWith('tools/check-docs.fixtures/')) continue;
  if (rel === 'tools/check-docs.mjs') continue;
  let text;
  try {
    text = readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    continue;
  }
  if (!text.includes('req-') && !text.includes('lesson-')) continue;

  for (const [, ref] of text.matchAll(REF)) {
    if (ref.startsWith('lesson-')) {
      if (!lessonIds.has(ref))
        fail(rel, `citation \`${ref}\` does not resolve`);
    } else if (!ids.has(ref)) {
      fail(rel, `citation \`${ref}\` resolves to no requirement`);
    }
  }
}

// ── generating the registry and the ID union ────────────────────────────────────────────

const AREA = (id) => id.split('-')[1];
const AREA_LABEL = {
  axis: 'axis',
  project: 'project',
  api: 'API',
  a11y: 'accessibility',
  token: 'tokens',
  quality: 'quality',
  release: 'release',
};

const STAN_ICON = {
  enforced: '✅ enforced',
  partial: '🟡 partial',
  gap: '⛔ gap',
  ERROR: '❌ ERROR',
};

/**
 * Shortened for a table cell. Markdown links are flattened to their text: the relative
 * paths come from `docs/requirements/*.md`, so in `docs/registry.md` they would point one
 * directory too high — and truncation could cut them in half on top of that.
 */
const short = (v, n = 90) => {
  const t = (v ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

const buildRegistry = () => {
  const byArea = new Map();
  for (const r of requirements) {
    const a = AREA(r.id);
    if (!byArea.has(a)) byArea.set(a, []);
    byArea.get(a).push(r);
  }

  const counts = { enforced: 0, partial: 0, gap: 0, ERROR: 0 };
  for (const r of requirements) counts[r.state]++;

  const L = [];
  L.push('# Registry — promise → gate → control');
  L.push('');
  L.push('> **This file is generated.** Do not edit it by hand —');
  L.push(
    '> `node tools/check-docs.mjs --write`. The `check-docs` gate rejects drift.',
  );
  L.push('');
  L.push(
    'The state is **derived** from the contents of the `Gate` and `Control` fields, not typed in.',
  );
  L.push('There is no "built, just unverified" state — see');
  L.push('[README](README.md#fields-gate-and-control).');
  L.push('');
  L.push('| state | means | count |');
  L.push('| --- | --- | ---: |');
  L.push(
    `| ✅ enforced | gate and control exist and run in CI | ${counts.enforced} |`,
  );
  L.push(
    `| 🟡 partial | the gate is there, the negative control is not (deliberately) | ${counts.partial} |`,
  );
  L.push(
    `| ⛔ gap | gate or control missing, with a recorded deadline | ${counts.gap} |`,
  );
  L.push(`| **total** | | **${requirements.length}** |`);
  L.push('');

  L.push('## Gaps by urgency');
  L.push('');
  L.push(
    'The order comes from the **Binds at** field, not from a requirement number.',
  );
  L.push('');
  L.push('| requirement | what is missing | binds at |');
  L.push('| --- | --- | --- |');
  const gaps = requirements
    .filter((r) => r.state === 'gap')
    .sort((a, b) => {
      const na = /immediately/i.test(a.fields['Binds at'] ?? '') ? 0 : 1;
      const nb = /immediately/i.test(b.fields['Binds at'] ?? '') ? 0 : 1;
      return na - nb || a.id.localeCompare(b.id);
    });
  for (const r of gaps) {
    const missing =
      r.gateState === 'gap'
        ? short(
            (r.fields.Gate ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          )
        : short(
            (r.fields.Control ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          ) + ' _(control)_';
    L.push(
      `| [\`${r.id}\`](${link(r)}) | ${missing} | ${short(r.fields['Binds at'], 60)} |`,
    );
  }
  L.push('');

  for (const [area, reqs] of byArea) {
    L.push(`## ${AREA_LABEL[area] ?? area}`);
    L.push('');
    L.push('| requirement | state | gate | control |');
    L.push('| --- | --- | --- | --- |');
    for (const r of reqs)
      L.push(
        `| [\`${r.id}\`](${link(r)}) | ${STAN_ICON[r.state]} | ${short(r.fields.Gate, 70)} | ${short(r.fields.Control, 70)} |`,
      );
    L.push('');
  }

  L.push('## Reverse index — lesson → requirements');
  L.push('');
  L.push(
    'Which lesson feeds which requirement. Generated from the **Lessons** fields.',
  );
  L.push('');
  // The `Lessons` field carries markdown links, so the same identifier appears in it
  // twice (label and anchor) — hence a Set per requirement, not a list.
  const rev = new Map();
  for (const r of requirements) {
    const cited = new Set(
      [...(r.fields.Lessons ?? '').matchAll(/lesson-\d+/g)].map((m) => m[0]),
    );
    for (const l of cited) {
      if (!rev.has(l)) rev.set(l, []);
      rev.get(l).push(r.id);
    }
  }
  const revRows = [...lessonIds].sort(
    (a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]),
  );
  L.push('| lesson | requirements |');
  L.push('| --- | --- |');
  for (const l of revRows) {
    const who = rev.get(l);
    L.push(
      `| [\`${l}\`](lessons.md#${l}) | ${who ? who.map((i) => `\`${i}\``).join(', ') : '— _(not cited)_'} |`,
    );
  }
  L.push('');
  return L.join('\n');
};

function link(r) {
  const rel = r.file.replace(/^docs\//, '');
  return `${rel}#${r.id}`;
}

const buildReqIds = () => {
  const reqs = [...ids].sort();
  const lessons = [...lessonIds].sort(
    (a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]),
  );
  return [
    '// GENERATED FILE — do not edit.',
    '// Source: docs/00-axis.md + docs/requirements/*.md + docs/lessons.md',
    '// Generator: node tools/check-docs.mjs --write',
    '//',
    '// Why: a sandbox card declares what its example is about. While that was `string[]`,',
    '// a typo gave a chip leading nowhere — a silent defect (`req-axis`). The same move as',
    '// `PctCssVar` in `lesson-43`, on the second class of names.',
    '',
    '/** A requirement identifier from `docs/requirements/`, or an axis one from `docs/00-axis.md`. */',
    'export type PctReqId =',
    ...reqs.map((id) => `  | '${id}'`),
    '  ;',
    '',
    '/** A lesson identifier from `docs/lessons.md`. A card may cite proof, not just a promise. */',
    'export type PctLessonId =',
    ...lessons.map((id) => `  | '${id}'`),
    '  ;',
    '',
    '/** Anything a sandbox card may refer to. */',
    'export type PctDocId = PctReqId | PctLessonId;',
    '',
  ].join('\n');
};

/**
 * The generator's output goes through prettier, because `nx format:check` covers `docs/`
 * and `apps/`. Without it two gates would want different shapes of the same file: the
 * formatter would rewrite it after every `--write`, and the freshness check (5) would
 * report the drift at once. Listing the files in `.prettierignore` would be a workaround —
 * it would hide the conflict instead of removing it.
 */
const prettier = await import('prettier');
const format = async (text, filepath) =>
  prettier.format(text, {
    ...(await prettier.resolveConfig(join(ROOT, filepath))),
    filepath,
  });

const registry = await format(buildRegistry(), REGISTRY);
const reqIds = await format(buildReqIds(), REQ_IDS);

if (WRITE) {
  writeFileSync(join(ROOT, REGISTRY), registry);
  writeFileSync(join(ROOT, REQ_IDS), reqIds);
  console.log(`v Wrote ${REGISTRY} and ${REQ_IDS}`);
} else {
  // ── 5. freshness ─────────────────────────────────────────────────────────────
  for (const [rel, want] of [
    [REGISTRY, registry],
    [REQ_IDS, reqIds],
  ]) {
    if (!existsSync(join(ROOT, rel)))
      fail(rel, 'the file does not exist — run `--write`');
    else if (read(rel) !== want)
      fail(
        rel,
        'drift from the source — run `node tools/check-docs.mjs --write`',
      );
  }
}

// ── 7. a card may not deny a gate the requirement declares ───────────────────

/**
 * A component card's scorecard says what is measured for that component and what is not, and
 * where it says nothing is, it may name the requirement that would close the gap. It may then
 * say something about that requirement which is simply false. `docs/components/button.md`
 * carried "`req-token-logical` has no gate" while the gate had existed all along — point 5 of
 * `tools/check-styles.mjs`, with a negative control of its own — and every reader of
 * `/components/button` was shown the sentence (4.34).
 *
 * The rule is narrow on purpose. It polices ONE assertion — "this requirement has no gate" —
 * against the one place that knows, which is the requirement's own **Gate** field. A card may
 * still say that a COMPONENT has no evidence of its own while the requirement is enforced
 * across the library; that is a different claim, and this gate has no way to check it.
 */
const NO_GATE = /\bno gate\b/i;
const CARD_CITATION = /`(req-[a-z][a-z0-9-]*[a-z0-9])`/g;

const gateStateOf = new Map(requirements.map((r) => [r.id, r.gateState]));

/** Every requirement a table cell of this card claims has no gate. */
const gateDenialsIn = (text) => {
  const denied = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const cell of line.split('|')) {
      if (!NO_GATE.test(cell)) continue;
      for (const [, id] of cell.matchAll(CARD_CITATION)) denied.push(id);
    }
  }
  return denied;
};

const checkCardClaims = (rel, text, report) => {
  for (const id of gateDenialsIn(text)) {
    const state = gateStateOf.get(id);
    // A citation that resolves to nothing is point 4's to report, in its own words.
    if (state === undefined) continue;
    if (state !== 'gap')
      report(
        rel,
        `says \`${id}\` has no gate, and that requirement's **Gate** field is ` +
          `\`${state}\` — a card may not deny a machine the requirement declares`,
      );
  }
};

for (const rel of globSync('docs/components/*.md', { cwd: ROOT }).sort())
  checkCardClaims(rel, read(rel), fail);

// ── 6. negative control ───────────────────────────────────────────────────────

const FIXTURES = 'tools/check-docs.fixtures';

if (!WRITE) {
  const fixtures = globSync(`${FIXTURES}/*.md`, { cwd: ROOT })
    .filter((f) => basename(f) !== 'README.md')
    .sort();
  if (fixtures.length === 0) {
    fail(
      FIXTURES,
      'no negative control — a gate with no proof that it can fail is one more ' +
        'silent defect (req-quality-negative-control)',
    );
  }
  for (const fx of fixtures) {
    const reqs = parseRequirements(read(fx), fx);
    if (reqs.length === 0) {
      fail(fx, 'the fixture holds no requirement — there is nothing to reject');
      continue;
    }
    const before = problems.length;
    for (const req of reqs) {
      if (!req.fields.Promise?.trim()) fail(fx, 'x');
      if (req.fields.Gate === undefined) fail(fx, 'x');
      if (req.fields.Control === undefined) fail(fx, 'x');
      const b = classify(req.fields.Gate, { id: fx }, 'Gate');
      const k = classify(req.fields.Control, { id: fx }, 'Control');
      if (b === 'gap' && !req.fields['Binds at']?.trim()) fail(fx, 'x');
      for (const fieldName of ['Gate', 'Control']) {
        const value = req.fields[fieldName] ?? '';
        if (/^\s*(none|not applicable)\b/.test(value)) continue;
        for (const [, raw] of value.matchAll(PATHISH)) {
          const hits = resolveCitation(raw);
          if (hits !== null && hits.length === 0) fail(fx, 'x');
        }
      }
      void k;
    }
    const rejected = problems.length > before;
    problems.length = before; // a fixture's errors are EXPECTED — they do not count
    if (!rejected)
      fail(
        fx,
        'the negative control PASSED and was meant not to — the gate stopped examining anything',
      );
  }

  // Point 7's control is a CARD and not a requirement, so it stands in its own directory —
  // the loop above parses everything beside it as a requirement.
  const cards = globSync(`${FIXTURES}/cards/*.md`, { cwd: ROOT }).sort();
  if (cards.length === 0)
    fail(
      `${FIXTURES}/cards`,
      'no negative control for point 7 — a gate with no proof that it can fire is one ' +
        'more silent defect (req-quality-negative-control)',
    );
  for (const fx of cards) {
    const before = problems.length;
    checkCardClaims(fx, read(fx), fail);
    const rejected = problems.length > before;
    problems.length = before;
    if (!rejected)
      fail(
        fx,
        'the negative control PASSED and was meant not to — point 7 stopped examining anything',
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Documentation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

const counts = requirements.reduce(
  (a, r) => ((a[r.state] = (a[r.state] ?? 0) + 1), a),
  {},
);
console.log(
  `v Documentation gate: ${requirements.length} requirements, ${lessonIds.size} lessons — ` +
    `enforced ${counts.enforced ?? 0}, partial ${counts.partial ?? 0}, gap ${counts.gap ?? 0}`,
);
