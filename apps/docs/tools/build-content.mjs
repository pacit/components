/**
 * The docs site's content pass (plan 2.1.5, site.md "The pipeline").
 *
 * The site renders what the repository already generates and gates — the component cards,
 * the parts snapshot, the token snapshot, the registry, the mutation snapshot — and this
 * script is the whole of how that content reaches the app: one deterministic pass from
 * tracked sources to typed data. Nothing is written twice; the site cannot disagree with
 * the repository because it holds no hand-typed copy of anything the repository measures.
 *
 * Outputs (all under apps/docs/src/generated/, gitignored — build artefacts, not sources):
 *   1. content.ts        — typed card data + the evidence numbers, imported by the pages.
 *   2. public/llms.txt   — the agent-facing index (plan 2.5, co-built as ordered there).
 *   3. public/components.json — the machine-readable catalogue, same source, same pass.
 *
 * Deliberately dependency-free: the cards are a FORM, not prose (docs/components/README.md
 * says so and check-docs holds them to it), and a form is parsed by the lines it promises.
 * A markdown engine would render; this pass only lifts the fields the pages type against.
 * Rendering — and the syntax highlighting that goes with it — belongs to the step that
 * draws code on screen (2.1.7), not to the data.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../../..');
const CARDS_DIR = join(ROOT, 'docs/components');
const OUT_DIR = join(ROOT, 'apps/docs/src/generated');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ── 1. the cards ─────────────────────────────────────────────────────────────

/** `**Field:** value` possibly wrapped over lines — the card header's own shape. */
const field = (text, name) => {
  const m = text.match(
    new RegExp(`\\*\\*${name}:\\*\\* ([^\\n]*(?:\\n(?!\\*\\*|\\n)[^\\n]*)*)`),
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};

const cards = readdirSync(CARDS_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md')
  .sort()
  .map((file) => {
    const id = file.replace(/\.md$/, '');
    const text = readFileSync(join(CARDS_DIR, file), 'utf8');

    const title = text.match(/^# (.*)$/m)?.[1] ?? id;
    // `` `PctX` / `PctY` — role `` — classes before the dash, the role after it.
    const dash = title.indexOf('—');
    const classes = [...title.matchAll(/`(Pct[A-Za-z]+)`/g)].map((m) => m[1]);
    const role = dash === -1 ? '' : title.slice(dash + 1).trim();

    const entrypoint = field(text, 'Entrypoint')?.replaceAll('`', '') ?? null;
    const selector = field(text, 'Selector')?.replaceAll('`', '') ?? null;
    const status = field(text, 'Status') ?? null;

    // The prose between the header block and the first section is the card's own lead.
    const intro = (text.split(/\n## /)[0] ?? '')
      .split(/\n\n/)
      .slice(1)
      .filter((p) => !p.startsWith('**') && !p.startsWith('# '))
      .join('\n\n')
      .trim();

    return {
      id,
      classes,
      role,
      entrypoint,
      selector,
      status,
      intro,
      body: text,
    };
  });

// ── 2. the inventories ───────────────────────────────────────────────────────

const fenced = (text) => text.match(/```\n([\s\S]*?)```/)?.[1] ?? '';

const partsByEntrypoint = new Map();
for (const line of fenced(read('libs/components/parts.snapshot.md')).split(
  '\n',
)) {
  const m = line.match(/^\.\/(\S+) (\S+) (\S+)$/);
  if (!m) continue;
  const list = partsByEntrypoint.get(m[1]) ?? [];
  if (!list.includes(m[3])) list.push(m[3]);
  partsByEntrypoint.set(m[1], list);
}

const tokensByComponent = new Map();
for (const line of fenced(read('libs/tokens/tokens.snapshot.md')).split('\n')) {
  const m = line.match(/^(--pct-([a-z0-9]+)-\S+) \S+ component public$/);
  if (!m) continue;
  const list = tokensByComponent.get(m[2]) ?? [];
  list.push(m[1]);
  tokensByComponent.set(m[2], list);
}

// ── 3. the evidence numbers — tracked snapshots only ─────────────────────────

const mutation = read('libs/components/mutation.snapshot.md');
const total = mutation.match(/^TOTAL ([\d.]+) (\d+)\/(\d+)$/m);

const registry = read('docs/registry.md');
const count = (label) =>
  Number(
    registry.match(
      new RegExp(
        `\\| ${label}[^|]*\\|[^|]*\\|\\s*\\*{0,2}(\\d+)\\*{0,2}\\s*\\|`,
      ),
    )?.[1] ?? NaN,
  );

// The landing leads with accessibility (site.md, recalibrated 2026-09-02), so the two
// numbers its strip shows come from the same tracked sources the gates read: the contrast
// policy is the DENOMINATOR of the contrast gate — every entry is measured on both themes
// at every token build — and the touch floor is the primitive the controls consume.
const contrastPairs = JSON.parse(read('libs/tokens/src/contrast.policy.json'))
  .checks.length;
const touchTarget = JSON.parse(read('libs/tokens/src/primitive.json')).pct
  .target.min.$value;
if (!/^\d+px$/.test(touchTarget))
  throw new Error(
    `content pass: --pct-target-min reads "${touchTarget}" — not a pixel dimension`,
  );

const evidence = {
  a11y: { contrastPairs, touchTarget },
  mutation: {
    score: Number(total?.[1] ?? NaN),
    killed: Number(total?.[2] ?? NaN),
    mutants: Number(total?.[3] ?? NaN),
  },
  requirements: {
    enforced: count('✅ enforced'),
    partial: count('🟡 partial'),
    gap: count('⛔ gap'),
    total: count('\\*\\*total\\*\\*'),
  },
  decisions: readdirSync(join(ROOT, 'docs/decisions')).filter((f) =>
    /^\d{4}-/.test(f),
  ).length,
  lessons: (read('docs/lessons.md').match(/^### <a id="lesson-\d+"/gm) ?? [])
    .length,
  engines: 3,
};

for (const [where, value] of [
  ['mutation snapshot', evidence.mutation.mutants],
  ['registry counts', evidence.requirements.total],
  ['contrast policy', evidence.a11y.contrastPairs],
]) {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(
      `content pass: could not read the ${where} — a page must never show a number nothing measured`,
    );
}

// ── 4. emit ──────────────────────────────────────────────────────────────────

mkdirSync(join(OUT_DIR, 'public'), { recursive: true });

const entry = (card) => ({
  ...card,
  parts: partsByEntrypoint.get(card.entrypoint?.split('/').pop() ?? '') ?? [],
  tokens: tokensByComponent.get(card.entrypoint?.split('/').pop() ?? '') ?? [],
});
const full = cards.map(entry);

writeFileSync(
  join(OUT_DIR, 'content.ts'),
  `// GENERATED by apps/docs/tools/build-content.mjs — do not edit; the sources are the
// repository's own cards and snapshots, and this file is rebuilt on every docs build.

export interface DocsCard {
  readonly id: string;
  readonly classes: readonly string[];
  readonly role: string;
  readonly entrypoint: string | null;
  readonly selector: string | null;
  readonly status: string | null;
  readonly intro: string;
  readonly body: string;
  readonly parts: readonly string[];
  readonly tokens: readonly string[];
}

export const DOCS_CARDS: readonly DocsCard[] = ${JSON.stringify(full, null, 2)};

export const DOCS_EVIDENCE = ${JSON.stringify(evidence, null, 2)} as const;
`,
);

writeFileSync(
  join(OUT_DIR, 'public/components.json'),
  JSON.stringify(
    full.map(({ body, intro, ...c }) => c),
    null,
    2,
  ) + '\n',
);

const llms = [
  '# @pacit/components',
  '',
  '> An accessible Angular component library: standalone, zoneless, signal forms, SSR and',
  '> design-token theming — where every promise is held by a machine-checked gate. The',
  `> numbers below are read from the repository's own snapshots: a mutation score of`,
  `> ${evidence.mutation.score} over ${evidence.mutation.mutants} mutants, ${evidence.requirements.enforced} of ${evidence.requirements.total} promises enforced,`,
  `> ${evidence.decisions} decision records, ${evidence.lessons} logged lessons, every e2e case in ${evidence.engines} engines.`,
  '',
  'Install: `npm install @pacit/components` (Angular 22, zoneless).',
  '',
  '## Components',
  '',
  ...full
    .filter((c) => c.entrypoint)
    .map(
      (c) =>
        `- [${c.classes.join(' / ')}](/components/${c.id}): ${c.role || c.id} — \`${c.entrypoint}\``,
    ),
  '',
  '## Machine catalogue',
  '',
  '- [components.json](/components.json): the same inventory with selectors, parts and token names, one JSON object per component.',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, 'public/llms.txt'), llms + '\n');

console.log(
  `content pass: ${full.length} cards, ${[...partsByEntrypoint.values()].flat().length} parts, ` +
    `${[...tokensByComponent.values()].flat().length} component tokens, evidence ${evidence.mutation.mutants} mutants @ ${evidence.mutation.score}`,
);
