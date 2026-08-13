#!/usr/bin/env node
/**
 * Documentation gate: does every promise in `docs/` name a machine that can fail on it,
 * and does that machine exist (`req-quality-registry`)? The drift between documentation
 * and reality has happened once already and was patched by hand — 18 „not implemented"
 * annotations in a single commit after the fact.
 *
 *  1. completeness — every requirement has `Promise`, `Gate`, `Control`, a gap `Binds at`,
 *  2. existence — every path cited in `Gate`/`Control` exists on disk,
 *  3. wired into CI — the target implied by a cited path runs in `nx affected -t …`,
 *  4. no dangling citations — every `req-*` / `lesson-*` in the repo resolves,
 *  5. freshness — `docs/registry.md` and the generated ID union agree with the source,
 *  6. negative control — the broken requirements in `check-docs.fixtures/` are rejected.
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
const REJESTR = 'docs/registry.md';
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

/**
 * Files where the old identifiers are the content rather than a citation: `docs/README.md`
 * carries the migration table, `docs/overview.md` is the signpost left after the split,
 * `docs/review.md` is a dated snapshot kept in its own shape.
 */
const CITATION_EXEMPT = new Set([
  'docs/README.md',
  'docs/overview.md',
  'docs/review.md',
  REJESTR,
]);

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
 * („— examines\n**the packed artifact**, not the sources").
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
for (const d of new Set(dupes))
  fail('docs', `zduplikowany identyfikator \`${d}\``);

// ── lekcje ────────────────────────────────────────────────────────────────────

const lessonIds = new Set(
  [...read('docs/lessons.md').matchAll(/<a id="(lesson-\d+)"><\/a>/g)].map(
    (m) => m[1],
  ),
);

// ── 1. completeness + state classification ───────────────────────────────────────

const BRAK = /^none\s*[—-]\s*(deliberately|gap)\s*:\s*(.+)$/s;

/** `egzekwowane` | `świadomie` | `luka` | null (an error) */
const classify = (value, req, fieldName) => {
  const v = (value ?? '').trim();
  if (!v) {
    fail(req.id, `pole **${fieldName}** jest puste`);
    return null;
  }
  if (/^not applicable\b/i.test(v)) return 'świadomie';
  if (/^none\b/.test(v)) {
    const m = v.match(BRAK);
    if (!m) {
      fail(
        req.id,
        `field **${fieldName}** says „none", but not as \`none — deliberately: <why>\` ` +
          `or \`none — gap: <what is needed>\``,
      );
      return null;
    }
    if (m[2].trim().length < 10)
      fail(
        req.id,
        `field **${fieldName}**: the reason for the absence is empty or too general`,
      );
    return m[1] === 'gap' ? 'luka' : 'świadomie';
  }
  return 'egzekwowane';
};

for (const req of requirements) {
  if (!req.fields.Promise?.trim()) fail(req.id, 'brak pola **Promise**');
  if (req.fields.Gate === undefined) fail(req.id, 'brak pola **Gate**');
  if (req.fields.Control === undefined) fail(req.id, 'brak pola **Control**');

  req.stanBramki = classify(req.fields.Gate, req, 'Gate');
  req.stanKontroli = classify(req.fields.Control, req, 'Control');

  req.stan =
    req.stanBramki === 'egzekwowane' && req.stanKontroli === 'egzekwowane'
      ? 'egzekwowane'
      : req.stanBramki === 'luka' || req.stanKontroli === 'luka'
        ? 'luka'
        : req.stanBramki === null || req.stanKontroli === null
          ? 'BŁĄD'
          : 'częściowo';

  if (req.stan === 'luka' && !req.fields['Binds at']?.trim())
    fail(
      req.id,
      'state `luka` with no **Binds at** field — a gap without a date is a wish',
    );
}

// ── 2. cited paths exist ───────────────────────────────────────────

const PATHISH = /`([^`\n]+)`/g;
const ROOTS = /^(libs|apps|tools|\.github|\.verdaccio)\//;

/** Resolves a citation to real files, or returns null when it is not a path at all. */
const resolveCitation = (raw) => {
  // „file.spec.ts › test name" — the path is the part before the arrow
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

const ci = read('.github/workflows/ci.yml');
const ciTargets = new Set(
  [...ci.matchAll(/nx affected -t ([a-z0-9:\-\s]+)/g)]
    .flatMap((m) => m[1].trim().split(/\s+/))
    .filter(Boolean),
);

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

// Explicit „target `X`" mentions — only in fields that actually declare a gate. Inside
// `none — gap: …` a target name is sometimes a description of the state („the
// `local-registry` target exists and nothing uses it"), not a claim that something runs.
for (const req of requirements) {
  const declared = ['Gate', 'Control']
    .map((f) => req.fields[f] ?? '')
    .filter((v) => !/^\s*(none|not applicable)\b/.test(v));
  const text = declared.join(' ');
  for (const [, name] of text.matchAll(/target `([a-z0-9:\-]+)`/g)) {
    if (name.includes(':')) continue; // np. `tokens:build` — biegnie przez `^build`
    if (!ciTargets.has(name))
      fail(
        req.id,
        `wskazany target \`${name}\` nie biegnie w \`nx affected -t\` w CI`,
      );
  }
}

// ── 4. dangling citations across the repo ─────────────────────────────────────────

/**
 * Two dead namespaces, both rejected. The numeric one comes from the 2026-07-27 migration,
 * the Polish one (`wym-…`, `lekcja-N`) from 2026-08-06; the table in `docs/README.md`
 * resolves both. The Polish pattern requires a letter after the dash, so a sentence about
 * the prefix alone (`wym-*`, `wym-…`) is not a citation and does not fire.
 */
const LEGACY =
  /wym-(proj|tech|ws|sbx|api|a11y|styl|theme|token|ikon|test|wer|real)-\d+|\bwym-[a-z][a-z0-9-]*[a-z0-9]\b|\blekcja-\d+\b/g;
/**
 * A citation is not a **path segment**: `req-` is a prefix common enough to turn up in file
 * names (`req-ids.ts` used to fire this gate as a dangling citation). Hence the slash
 * before and the extension after are excluded.
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
  if (
    !text.includes('req-') &&
    !text.includes('lesson-') &&
    !text.includes('wym-') &&
    !text.includes('lekcja-')
  )
    continue;

  for (const [old] of text.matchAll(LEGACY))
    fail(
      rel,
      `stary identyfikator \`${old}\` — patrz tabele migracji w docs/README.md`,
    );

  for (const [, ref] of text.matchAll(REF)) {
    if (ref.startsWith('lesson-')) {
      if (!lessonIds.has(ref))
        fail(rel, `citation \`${ref}\` does not resolve`);
    } else if (!ids.has(ref)) {
      fail(rel, `citation \`${ref}\` resolves to no requirement`);
    }
  }
}

// ── generowanie rejestru i unii ID ────────────────────────────────────────────

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
  egzekwowane: '✅ enforced',
  częściowo: '🟡 partial',
  luka: '⛔ gap',
  BŁĄD: '❌ ERROR',
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

const buildRejestr = () => {
  const byArea = new Map();
  for (const r of requirements) {
    const a = AREA(r.id);
    if (!byArea.has(a)) byArea.set(a, []);
    byArea.get(a).push(r);
  }

  const counts = { egzekwowane: 0, częściowo: 0, luka: 0, BŁĄD: 0 };
  for (const r of requirements) counts[r.stan]++;

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
  L.push('There is no „built, just unverified" state — see');
  L.push('[README](README.md#fields-gate-and-control).');
  L.push('');
  L.push('| state | means | count |');
  L.push('| --- | --- | ---: |');
  L.push(
    `| ✅ enforced | gate and control exist and run in CI | ${counts.egzekwowane} |`,
  );
  L.push(
    `| 🟡 partial | the gate is there, the negative control is not (deliberately) | ${counts.częściowo} |`,
  );
  L.push(
    `| ⛔ gap | gate or control missing, with a recorded deadline | ${counts.luka} |`,
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
  const luki = requirements
    .filter((r) => r.stan === 'luka')
    .sort((a, b) => {
      const na = /immediately/i.test(a.fields['Binds at'] ?? '') ? 0 : 1;
      const nb = /immediately/i.test(b.fields['Binds at'] ?? '') ? 0 : 1;
      return na - nb || a.id.localeCompare(b.id);
    });
  for (const r of luki) {
    const brak =
      r.stanBramki === 'luka'
        ? short(
            (r.fields.Gate ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          )
        : short(
            (r.fields.Control ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          ) + ' _(control)_';
    L.push(
      `| [\`${r.id}\`](${link(r)}) | ${brak} | ${short(r.fields['Binds at'], 60)} |`,
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
        `| [\`${r.id}\`](${link(r)}) | ${STAN_ICON[r.stan]} | ${short(r.fields.Gate, 70)} | ${short(r.fields.Control, 70)} |`,
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
    '/** Identyfikator wymagania z `docs/requirements/` albo osi z `docs/00-axis.md`. */',
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

const rejestr = await format(buildRejestr(), REJESTR);
const reqIds = await format(buildReqIds(), REQ_IDS);

if (WRITE) {
  writeFileSync(join(ROOT, REJESTR), rejestr);
  writeFileSync(join(ROOT, REQ_IDS), reqIds);
  console.log(`v Wrote ${REJESTR} and ${REQ_IDS}`);
} else {
  // ── 5. freshness ─────────────────────────────────────────────────────────────
  for (const [rel, want] of [
    [REJESTR, rejestr],
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

// ── 6. kontrola odniesienia ───────────────────────────────────────────────────

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
      if (b === 'luka' && !req.fields['Binds at']?.trim()) fail(fx, 'x');
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
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Documentation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

const counts = requirements.reduce(
  (a, r) => ((a[r.stan] = (a[r.stan] ?? 0) + 1), a),
  {},
);
console.log(
  `v Documentation gate: ${requirements.length} requirements, ${lessonIds.size} lessons — ` +
    `enforced ${counts.egzekwowane ?? 0}, partial ${counts.częściowo ?? 0}, gap ${counts.luka ?? 0}`,
);
