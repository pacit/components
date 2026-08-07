#!/usr/bin/env node
/**
 * Measures prose volume against the budget of decision 0017 (`req-project-concise`).
 * A measurement, not a gate: it prints and always exits 0. The gate comes after the
 * compression pass, laid on the state that pass leaves — never on today's (`lesson-49`).
 *
 *  1. HEADERS: leading comment of each tools/*.mjs — 12 lines + 1 per numbered point,
 *  2. JOURNAL: entries under the journal heading of docs/plan.md — 25 lines,
 *  3. POSITIONS: task positions in the same file — 12 lines closed, 20 open.
 *
 * Lines are what review reads; words come along because a line is elastic. Overlap
 * counts the 6-word sequences a closed position repeats from its own journal entry.
 *
 * Usage: node tools/measure-prose.mjs [--over]   (--over: only what exceeds budget)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONLY_OVER = process.argv.includes('--over');
const PLAN = readFileSync(join(ROOT, 'docs/plan.md'), 'utf8').split('\n');
const JOURNAL_AT = PLAN.findIndex((l) => /^## (Dziennik|Journal)\b/.test(l));

const pad = (n, w = 3) => String(n).padStart(w);
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const sum = (rows, key) => rows.reduce((a, r) => a + r[key], 0);

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
const bodyOf = (from, isNext) => {
  let end = from + 1;
  while (end < PLAN.length && !isNext(PLAN[end])) end++;
  while (end > from && PLAN[end - 1].trim() === '') end--;
  return PLAN.slice(from, end);
};

const report = (title, rows, cols) => {
  const over = rows.filter((r) => r.lines > r.budget);
  console.log(
    `\n== ${title} — ${rows.length} units, ${sum(rows, 'lines')} lines, budget ${sum(rows, 'budget')} ==`,
  );
  for (const r of ONLY_OVER ? over : rows)
    console.log(
      `${r.lines > r.budget ? '!' : ' '} ${pad(r.lines)}/${pad(r.budget)} ${cols(r)}`,
    );
  console.log(
    `  ${over.length} over budget, ${sum(over, 'lines') - sum(over, 'budget')} lines to cut`,
  );
};

// ── 1. headers of tools/*.mjs ────────────────────────────────────────────────
const headers = readdirSync(join(ROOT, 'tools'))
  .filter((f) => f.endsWith('.mjs'))
  .sort()
  .map((file) => {
    const all = readFileSync(join(ROOT, 'tools', file), 'utf8').split('\n');
    const head = headerOf(all);
    const points = head.filter((l) => /^\s*\*\s+\d+\./.test(l)).length;
    return {
      file,
      lines: head.length,
      budget: 12 + points,
      points,
      words: words(head.join(' ')),
      fileLines: all.length,
    };
  })
  .sort((a, b) => b.lines - b.budget - (a.lines - a.budget));

report(
  'HEADERS',
  headers,
  (r) => `${r.points} pts ${pad(r.words, 4)} words  ${r.file}`,
);

// ── 2. journal entries ───────────────────────────────────────────────────────
const journal = [];
for (let i = JOURNAL_AT; i >= 0 && i < PLAN.length; i++) {
  if (!PLAN[i].startsWith('### ')) continue;
  const body = bodyOf(i, (l) => l.startsWith('### '));
  journal.push({
    id: PLAN[i].match(/—\s*([A-H]\d+)\b/)?.[1] ?? '',
    title: PLAN[i].slice(4, 52),
    lines: body.length,
    budget: 25,
    body,
  });
}
report('JOURNAL', journal, (r) => r.title);

// ── 3. task positions ────────────────────────────────────────────────────────
const positions = [];
for (let i = 0; i < JOURNAL_AT; i++) {
  const m = PLAN[i].match(/^- \[(.)\] \*\*([A-H]\d+)/);
  if (!m) continue;
  const body = bodyOf(i, (l) => /^- \[.\] \*\*/.test(l) || l.startsWith('## '));
  positions.push({
    id: m[2],
    closed: m[1] === 'x',
    lines: body.length,
    budget: m[1] === 'x' ? 12 : 20,
    body,
  });
}
report(
  'POSITIONS',
  positions,
  (r) => `${r.closed ? 'closed' : 'open  '} ${r.id}`,
);

// ── overlap: what a closed position repeats from its own journal entry ───────
const grams = (lines, n = 6) => {
  const w = lines
    .join(' ')
    .toLowerCase()
    .replace(/[`*_[\]()#|—–,.:;„"”'!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return new Set(
    Array.from({ length: Math.max(0, w.length - n + 1) }, (_, i) =>
      w.slice(i, i + n).join(' '),
    ),
  );
};

console.log('\n== OVERLAP — closed position vs its journal entry ==');
let shared = 0;
let total = 0;
for (const p of positions.filter((p) => p.closed)) {
  const entry = journal.find((e) => e.id === p.id);
  if (!entry) continue;
  const gp = grams(p.body);
  const hits = [...gp].filter((g) => grams(entry.body).has(g)).length;
  shared += hits;
  total += gp.size;
  if (hits)
    console.log(
      `  ${p.id.padEnd(4)} ${pad(hits)} of ${pad(gp.size, 4)} 6-grams repeated (${((hits / gp.size) * 100).toFixed(1)}%)`,
    );
}
console.log(
  `  total ${shared} of ${total} (${((shared / total) * 100).toFixed(1)}%)`,
);
