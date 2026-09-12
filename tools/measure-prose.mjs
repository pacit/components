#!/usr/bin/env node
/**
 * Measures prose volume against the budget of decision 0017 (`req-project-concise`).
 * A measurement, not a gate: it prints and always exits 0. The gate comes after the
 * compression pass, laid on the state that pass leaves — never on today's (`lesson-49`).
 *
 *  1. HEADERS: leading comment of each tools/*.mjs — 12 lines + 1 per numbered point,
 *  2. POSITIONS: task positions in docs/plan.md — 12 lines closed, 20 open.
 *
 * Lines are what review reads; words come along because a line is elastic. Overlap
 * counts the 6-word sequences a closed position repeats from the lessons it cites —
 * narration has one home, and a position that retells it is the thing to cut.
 *
 * Usage: node tools/measure-prose.mjs [--over]   (--over: only what exceeds budget)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONLY_OVER = process.argv.includes('--over');
const PLAN = readFileSync(join(ROOT, 'docs/plan.md'), 'utf8').split('\n');
const LESSONS = readFileSync(join(ROOT, 'docs/lessons.md'), 'utf8').split('\n');

/** A position opens with a checkbox and a dotted number, at any indent. */
const POSITION = /^\s*- \[(.)\] \*\*(\d+(?:\.\d+)*)\b/;

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
const bodyOf = (lines, from, isNext) => {
  let end = from + 1;
  while (end < lines.length && !isNext(lines[end])) end++;
  while (end > from && lines[end - 1].trim() === '') end--;
  return lines.slice(from, end);
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

// ── 2. task positions ────────────────────────────────────────────────────────
const positions = [];
for (let i = 0; i < PLAN.length; i++) {
  const m = PLAN[i].match(POSITION);
  if (!m) continue;
  const body = bodyOf(PLAN, i, (l) => POSITION.test(l) || l.startsWith('## '));
  positions.push({
    id: m[2],
    closed: m[1] === 'x',
    lines: body.length,
    budget: m[1] === 'x' ? 12 : 20,
    words: words(body.join(' ')),
    body,
  });
}
report(
  'POSITIONS',
  [...positions].sort((a, b) => b.lines - b.budget - (a.lines - a.budget)),
  (r) =>
    `${r.closed ? 'closed' : 'open  '} ${r.id.padEnd(6)} ${pad(r.words, 4)} words`,
);

// ── overlap: what a closed position repeats from the lessons it cites ────────
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

/** Body of one lesson, found by its anchor id. */
const lessonBody = (id) => {
  const at = LESSONS.findIndex((l) => l.includes(`id="${id}"`));
  return at < 0 ? [] : bodyOf(LESSONS, at, (l) => l.startsWith('### '));
};

console.log('\n== OVERLAP — closed position vs the lessons it cites ==');
let shared = 0;
let total = 0;
for (const p of positions.filter((p) => p.closed)) {
  const cited = [...new Set(p.body.join(' ').match(/lesson-\d+/g) ?? [])];
  if (!cited.length) continue;
  const told = grams(cited.flatMap((id) => lessonBody(id)));
  const gp = grams(p.body);
  const hits = [...gp].filter((g) => told.has(g)).length;
  shared += hits;
  total += gp.size;
  if (hits)
    console.log(
      `  ${p.id.padEnd(6)} ${pad(hits)} of ${pad(gp.size, 4)} 6-grams repeated (${((hits / gp.size) * 100).toFixed(1)}%) — ${cited.join(', ')}`,
    );
}
console.log(
  `  total ${shared} of ${total} (${total ? ((shared / total) * 100).toFixed(1) : '0.0'}%)`,
);
