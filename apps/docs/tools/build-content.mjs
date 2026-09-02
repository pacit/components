/**
 * The docs site's content pass (plan 2.1.5, grown by 2.1.7; site.md "The pipeline").
 *
 * The site renders what the repository already generates and gates — the component cards,
 * the parts snapshot, the token snapshot, the registry, the mutation snapshot — and this
 * script is the whole of how that content reaches the app: one deterministic pass from
 * tracked sources to typed data. Nothing is written twice; the site cannot disagree with
 * the repository because it holds no hand-typed copy of anything the repository measures.
 *
 * Outputs (all under apps/docs/src/generated/, gitignored — build artefacts, not sources):
 *   1. content.ts       — lean card data + the evidence numbers; the landing's diet.
 *   2. cards-html.ts    — each card's sections rendered to HTML; the component pages'
 *                         payload, split out so the landing's chunk never carries it.
 *   3. pages-data.ts    — the registry, decisions, lessons, gates, token inventory and
 *                         support document for /trust, /theming and /support.
 *   4. demo-code.ts     — every demo's own source and the start page's snippets,
 *                         highlighted by shiki AT BUILD TIME: one HTML for both themes
 *                         (`--shiki-dark` variables), zero highlighter shipped.
 *   5. public/llms.txt + public/components.json — the agent surface (plan 2.5).
 *
 * Rendering is the form renderer of `markdown.mjs` — the cards are a FORM, not prose
 * (docs/components/README.md says so and check-docs holds them to it). Links inside the
 * documents point at repository files; `rewriteLink` is the one law mapping them onto the
 * site's routes, and an address it does not know renders as plain text rather than a
 * dead link.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { codeToHtml } from 'shiki';
import { renderInline, renderMarkdown } from './markdown.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const CARDS_DIR = join(ROOT, 'docs/components');
const DEMOS_DIR = join(ROOT, 'apps/docs/src/app/demos');
const SNIPPETS_DIR = join(ROOT, 'apps/docs/src/snippets');
const OUT_DIR = join(ROOT, 'apps/docs/src/generated');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ── 0. the shared renderers ──────────────────────────────────────────────────

// The high-contrast pair on purpose, and the route sweep is the reason it stays: plain
// `github-light` paints tokens at 3.48:1 on white — axe failed /start on the site's own
// bar the first time the sweep ran. A palette below AA has no seat on this site.
const highlight = (source, lang) =>
  codeToHtml(source, {
    lang,
    themes: {
      light: 'github-light-high-contrast',
      dark: 'github-dark-high-contrast',
    },
  });

/**
 * The one law mapping repository addresses onto site routes. Decision records, the
 * requirements and the lessons all render on /trust under stable anchors; a card can name
 * another card; everything else is not a page here and falls back to plain text.
 */
const rewriteLink = (href) => {
  if (/^https?:/.test(href) || href.startsWith('#')) return href;
  const path = href.replace(/^(\.\.\/)+/, '');
  const adr = path.match(/^decisions\/(\d{4})-[^#]*\.md$/);
  if (adr) return `/trust#adr-${adr[1]}`;
  const requirement = path.match(/^requirements\/[a-z]+\.md#(req-[a-z0-9-]+)$/);
  if (requirement) return `/trust#${requirement[1]}`;
  const lesson = path.match(/^lessons\.md#(lesson-\d+)$/);
  if (lesson) return `/trust#${lesson[1]}`;
  const card = path.match(/^([a-z-]+)\.md$/);
  if (card && cardIds.has(card[1])) return `/components/${card[1]}`;
  return null;
};

const render = (markdown) =>
  renderMarkdown(markdown, { link: rewriteLink, code: highlight });

// ── 1. the cards ─────────────────────────────────────────────────────────────

/** `**Field:** value` possibly wrapped over lines — the card header's own shape. */
const field = (text, name) => {
  const m = text.match(
    new RegExp(`\\*\\*${name}:\\*\\* ([^\\n]*(?:\\n(?!\\*\\*|\\n)[^\\n]*)*)`),
  );
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};

const cardFiles = readdirSync(CARDS_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md')
  .sort();
const cardIds = new Set(cardFiles.map((f) => f.replace(/\.md$/, '')));

const cards = await Promise.all(
  cardFiles.map(async (file) => {
    const id = file.replace(/\.md$/, '');
    const text = readFileSync(join(CARDS_DIR, file), 'utf8');

    const title = text.match(/^# (.*)$/m)?.[1] ?? id;
    // `` `PctX` / `PctY` — role `` — classes before the dash, the role after it.
    const dash = title.indexOf('—');
    const classes = [...title.matchAll(/`(Pct[A-Za-z]+)`/g)].map((m) => m[1]);
    const role = dash === -1 ? '' : title.slice(dash + 1).trim();

    const entrypoint = field(text, 'Entrypoint')?.replaceAll('`', '') ?? null;
    const selector = field(text, 'Selector') ?? null;
    const status = field(text, 'Status') ?? null;
    const pattern = field(text, 'ARIA APG pattern') ?? null;

    // The prose between the header block and the first section is the card's own lead.
    const intro = (text.split(/\n## /)[0] ?? '')
      .split(/\n\n/)
      .slice(1)
      .filter((p) => !p.startsWith('**') && !p.startsWith('# '))
      .join('\n\n')
      .trim();

    const sectionsAt = text.indexOf('\n## ');
    const sections = sectionsAt === -1 ? '' : text.slice(sectionsAt + 1);

    return {
      id,
      classes,
      role,
      entrypoint,
      // The selector field can carry a parenthesised note beside the code mark — the
      // pages want the bare machine name, the note stays in the rendered card.
      selector: selector?.match(/`([^`]+)`/)?.[1] ?? null,
      status,
      pattern: pattern ? renderInline(pattern, { link: rewriteLink }) : null,
      intro,
      introHtml: intro
        .split(/\n\n/)
        .filter(Boolean)
        .map(
          (p) =>
            `<p>${renderInline(p.replace(/\n/g, ' '), { link: rewriteLink })}</p>`,
        )
        .join('\n'),
      bodyHtml: await render(sections),
      body: text,
    };
  }),
);

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
const tokenRows = [];
for (const line of fenced(read('libs/tokens/tokens.snapshot.md')).split('\n')) {
  const inventory = line.match(/^(--pct-\S+) (\S+) (\S+) (\S+)$/);
  if (inventory)
    tokenRows.push({
      name: inventory[1],
      type: inventory[2],
      tier: inventory[3],
      visibility: inventory[4],
    });
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

const gates = readdirSync(join(ROOT, 'tools'))
  .filter((f) => /^check-[a-z]+\.mjs$/.test(f))
  .map((f) => f.replace(/^check-|\.mjs$/g, ''));

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
  gates: gates.length,
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

// ── 4. the trust page's registers ────────────────────────────────────────────

/** The registry's axis tables: one row per requirement, the cells inline-rendered. */
const registryRows = [];
{
  let axis = null;
  for (const line of registry.split('\n')) {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      axis = heading[1] === 'Gaps by urgency' ? null : heading[1];
      continue;
    }
    if (!axis || !line.startsWith('|')) continue;
    const m = line.match(
      /^\| \[`(req-[a-z0-9-]+)`\][^|]*\| (✅|🟡|⛔)[^|]*\|([^|]*)\|([^|]*)\|$/,
    );
    if (!m) continue;
    const state =
      m[2] === '✅' ? 'enforced' : m[2] === '🟡' ? 'partial' : 'gap';
    registryRows.push({
      id: m[1],
      axis,
      state,
      gate: renderInline(m[3].trim().replaceAll('\\|', '|'), {
        link: rewriteLink,
      }),
      control: renderInline(m[4].trim().replaceAll('\\|', '|'), {
        link: rewriteLink,
      }),
    });
  }
  if (registryRows.length !== evidence.requirements.total)
    throw new Error(
      `content pass: the registry table renders ${registryRows.length} rows against a stated total of ${evidence.requirements.total}`,
    );
}

const decisions = readdirSync(join(ROOT, 'docs/decisions'))
  .filter((f) => /^\d{4}-/.test(f))
  .sort()
  .map((file) => {
    const title = readFileSync(
      join(ROOT, 'docs/decisions', file),
      'utf8',
    ).match(/^# \d{4} — (.*)$/m)?.[1];
    if (!title)
      throw new Error(`content pass: ${file} opens with no "# NNNN — title"`);
    return { id: file.slice(0, 4), title: renderInline(title) };
  });

const lessons = [
  ...read('docs/lessons.md').matchAll(
    /^### <a id="lesson-(\d+)"><\/a>`lesson-\d+` — (.*)$/gm,
  ),
].map((m) => ({ id: Number(m[1]), title: renderInline(m[2]) }));

const supportHtml = await render(
  read('docs/support.md').replace(/^# .*\n/, ''),
);

// ── 5. the demos' own sources, and the start page's snippets ─────────────────

const demoCode = {};
for (const file of readdirSync(DEMOS_DIR).sort()) {
  const m = file.match(/^([a-z-]+)\.demo\.ts$/);
  if (!m) continue;
  demoCode[m[1]] = await highlight(
    readFileSync(join(DEMOS_DIR, file), 'utf8').trimEnd(),
    'angular-ts',
  );
}

const snippetCode = {};
for (const file of readdirSync(SNIPPETS_DIR).sort()) {
  const m = file.match(/^([a-z-]+)\.([a-z]+)\.txt$/);
  if (!m) continue;
  snippetCode[m[1]] = await highlight(
    readFileSync(join(SNIPPETS_DIR, file), 'utf8').trimEnd(),
    m[2] === 'sh' ? 'shellscript' : m[2],
  );
}

// ── 6. emit ──────────────────────────────────────────────────────────────────

mkdirSync(join(OUT_DIR, 'public'), { recursive: true });

const entry = (card) => ({
  ...card,
  parts: partsByEntrypoint.get(card.entrypoint?.split('/').pop() ?? '') ?? [],
  tokens: tokensByComponent.get(card.entrypoint?.split('/').pop() ?? '') ?? [],
});
const full = cards.map(entry);

const banner = `// GENERATED by apps/docs/tools/build-content.mjs — do not edit; the sources are the
// repository's own cards and snapshots, and this file is rebuilt on every docs build.
`;

/** The landing's diet — the emitted shape spelled once, nothing rendered inside it. */
const lean = full.map((card) => ({
  id: card.id,
  classes: card.classes,
  role: card.role,
  entrypoint: card.entrypoint,
  selector: card.selector,
  status: card.status,
  intro: card.intro,
  parts: card.parts,
  tokens: card.tokens,
}));

writeFileSync(
  join(OUT_DIR, 'content.ts'),
  `${banner}
export interface DocsCard {
  readonly id: string;
  readonly classes: readonly string[];
  readonly role: string;
  readonly entrypoint: string | null;
  readonly selector: string | null;
  readonly status: string | null;
  readonly intro: string;
  readonly parts: readonly string[];
  readonly tokens: readonly string[];
}

export const DOCS_CARDS: readonly DocsCard[] = ${JSON.stringify(lean, null, 2)};

export const DOCS_EVIDENCE = ${JSON.stringify(evidence, null, 2)} as const;
`,
);

writeFileSync(
  join(OUT_DIR, 'cards-html.ts'),
  `${banner}
/** Each card's lead, ARIA pattern line and sections, rendered — the component pages' payload. */
export const CARD_HTML: Readonly<
  Record<string, { readonly pattern: string | null; readonly intro: string; readonly body: string }>
> = ${JSON.stringify(
    Object.fromEntries(
      full.map((c) => [
        c.id,
        { pattern: c.pattern, intro: c.introHtml, body: c.bodyHtml },
      ]),
    ),
    null,
    2,
  )};
`,
);

writeFileSync(
  join(OUT_DIR, 'pages-data.ts'),
  `${banner}
export interface RegistryRow {
  readonly id: string;
  readonly axis: string;
  readonly state: 'enforced' | 'partial' | 'gap';
  readonly gate: string;
  readonly control: string;
}

export const TRUST_REGISTRY: readonly RegistryRow[] = ${JSON.stringify(registryRows, null, 2)};

export const TRUST_DECISIONS: readonly { readonly id: string; readonly title: string }[] = ${JSON.stringify(decisions, null, 2)};

export const TRUST_LESSONS: readonly { readonly id: number; readonly title: string }[] = ${JSON.stringify(lessons, null, 2)};

export const TRUST_GATES: readonly string[] = ${JSON.stringify(gates, null, 2)};

export interface TokenRow {
  readonly name: string;
  readonly type: string;
  readonly tier: string;
  readonly visibility: string;
}

export const THEMING_TOKENS: readonly TokenRow[] = ${JSON.stringify(tokenRows, null, 2)};

export const SUPPORT_HTML = ${JSON.stringify(supportHtml)};
`,
);

writeFileSync(
  join(OUT_DIR, 'demo-code.ts'),
  `${banner}
/** Every demo's own source, shiki-highlighted for both themes — the code tab IS the file. */
export const DEMO_CODE: Readonly<Record<string, string>> = ${JSON.stringify(demoCode, null, 2)};

export const SNIPPET_CODE: Readonly<Record<string, string>> = ${JSON.stringify(snippetCode, null, 2)};
`,
);

writeFileSync(
  join(OUT_DIR, 'public/components.json'),
  JSON.stringify(
    full.map((card) => ({
      id: card.id,
      classes: card.classes,
      role: card.role,
      entrypoint: card.entrypoint,
      selector: card.selector,
      status: card.status,
      parts: card.parts,
      tokens: card.tokens,
    })),
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
  `content pass: ${full.length} cards rendered, ${Object.keys(demoCode).length} demos and ` +
    `${Object.keys(snippetCode).length} snippets highlighted, ${registryRows.length} registry rows, ` +
    `${lessons.length} lessons, ${tokenRows.length} tokens, evidence ${evidence.mutation.mutants} mutants @ ${evidence.mutation.score}`,
);
