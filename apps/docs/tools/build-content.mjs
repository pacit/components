/**
 * The docs site's content pass (plan 2.1.5, grown by 2.1.7 and 2.7.2; site.md "The pipeline").
 *
 * The site renders what the repository already generates and gates — the component cards,
 * the parts snapshot, the token snapshot, the registry, the mutation snapshot, and since
 * 2.7.2 the library's own SOURCE — and this script is the whole of how that content
 * reaches the app: one deterministic pass from tracked sources to typed data. Nothing is
 * written twice; the site cannot disagree with the repository because it holds no
 * hand-typed copy of anything the repository measures.
 *
 * Outputs (all under apps/docs/src/generated/, gitignored — build artefacts, not sources):
 *   1. content.ts          — lean card data + the evidence numbers; the landing's diet.
 *   2. component-pages.ts  — one payload per component page: the API read from the
 *                            source, the tokens with their meaning and resolved defaults,
 *                            the examples with their code, the card's sections as a form.
 *   3. pages-data.ts       — the registry, decisions, lessons, gates, token inventory and
 *                            support document for /trust, /theming and /support.
 *   4. demo-code.ts        — the start page's snippets, highlighted by shiki AT BUILD
 *                            TIME: one HTML for both themes, zero highlighter shipped.
 *   5. public/llms.txt + public/components.json — the agent surface (plan 2.5).
 *
 * Rendering is the form renderer of `markdown.mjs` — the cards are a FORM, not prose
 * (docs/components/README.md says so and check-docs holds them to it). Links inside the
 * documents point at repository files; `rewriteLink` is the one law mapping them onto the
 * site's routes, and an address it does not know renders as plain text rather than a
 * dead link.
 *
 * The API reader is deliberately a scanner and not a compiler: it reads `readonly x =
 * input<T>(default)` lines, the JSDoc block that ends right above each, the decorator's
 * `host` object and the entry point's `export` lines. What it cannot read it reports; a
 * card in STRICT has to read whole, the others report until the sweep (2.7.4) closes.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { codeToHtml } from 'shiki';
import { renderInline, renderMarkdown } from './markdown.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const CARDS_DIR = join(ROOT, 'docs/components');
const DEMOS_DIR = join(ROOT, 'apps/docs/src/app/demos');
const SNIPPETS_DIR = join(ROOT, 'apps/docs/src/snippets');
const LIB_DIR = join(ROOT, 'libs/components');
const TOKENS_DIR = join(ROOT, 'libs/tokens/src');
const E2E_DIR = join(ROOT, 'apps/sandbox-e2e/src');
const OUT_DIR = join(ROOT, 'apps/docs/src/generated');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** The cards whose page has to read whole — the model page first, the sweep adds the rest. */
const STRICT = new Set(['button']);
/** The lead's ceiling: the longest of the thirty-three written is 106 characters. */
const SUMMARY_MAX = 200;
/* Six buckets and not the first five (plan 2.8, chosen off a sketch of six card variants).
   The old split changed its cutting rule mid-way — `menu` filed by purpose, `popover` by
   mechanism, though a menu IS a popover with a roving list in it — and kept a bucket named
   by exclusion: "Feedback & display" held an interactive disclosure, a decoration and a
   status readout, whose only shared property was not being one of the other four.

   The fat bucket is what the redesign forced. `Inputs` at 12 of 33 costs nothing while a
   tile is text 13rem wide; with a live preview under every name the card roughly doubles
   in height, and twelve of them under one heading is four screens between one bucket and
   the next. `Text & numbers` / `Choices` cuts at a joint the library itself cuts: `field`
   wraps a control the reader types into, `select`/`radio`/`checkbox` ARE the control.

   The ORDER of this array is the order of the page, and `Layout & theming` is last on
   purpose — the disagreement with the component page's own index is deliberate. That index
   is a FILING order for a reader already inside a page, who knows what they came for; the
   gallery is a BROWSING order for a visitor who has just pressed "Components" and is
   deciding whether the library is serious. `container`, `grid` and `stack` are scaffolding
   one looks up while building and never while choosing, and they are the four weakest
   pictures in the library — `theme` has 0 parts and 0 tokens and nothing at all to draw.
   Opening a gallery whose whole claim is "here is what it looks like" with the four things
   that look like almost nothing spends the screen that decides everything. */
const CATEGORIES = [
  'Actions & navigation',
  'Text & numbers',
  'Choices',
  'Overlays',
  'Data & status',
  'Layout & theming',
];

/* The order the reader meets them, and the only place it is written. Alphabetical is a
   filing order and a gallery is not a filing cabinet: each bucket leads with its wrapper
   or its workhorse (`button`, `field`, `select`, `dialog`, `accordion`, `container`), and
   the page as a whole opens on the best picture the library has of itself.

   Kept here rather than as an `**Order:**` field on the cards because it is a fact about
   the PAGE, not about the component. The gate below is what keeps the two from drifting:
   this list must be a permutation of the cards on disk, and each category must be a
   contiguous run in it — a card refiled without being moved here splits its own bucket in
   two and fails the build rather than rendering a heading twice. */
const CARD_ORDER = [
  // Actions & navigation
  'button',
  'menu',
  'tabs',
  'breadcrumb',
  'pagination',
  // Text & numbers
  'field',
  'text',
  'textarea',
  'number',
  'date',
  // Choices
  'select',
  'checkbox',
  'radio',
  'switch',
  'chips',
  'slider',
  'calendar',
  // Overlays
  'dialog',
  'drawer',
  'popover',
  'toast',
  'tooltip',
  // Data & status
  'accordion',
  'tree',
  'stepper',
  'progress',
  'badge',
  'avatar',
  'skeleton',
  // Layout & theming
  'container',
  'grid',
  'stack',
  'theme',
];
const warnings = [];
const warn = (id, message) => warnings.push({ id, message });

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
 * another card; everything else is not a page here and falls back to plain text. A JSDoc
 * inside the library reaches the same files through `../../../../docs/…`, so the `docs/`
 * prefix is shed with the climbs.
 */
const rewriteLink = (href) => {
  if (/^https?:/.test(href) || href.startsWith('#')) return href;
  const path = href.replace(/^(\.\.\/)+/, '').replace(/^docs\//, '');
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

const inline = (text) => renderInline(text ?? '', { link: rewriteLink });
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

/**
 * The conformance claim, read out of the card's `**ARIA APG pattern:**` field.
 *
 * The page states it as a sentence — "Implements the W3C ARIA APG Tabs pattern" — and a
 * sentence cannot be assembled from a field cut at its first dash, which is what this used
 * to do: eleven cards ended up saying the single word "none" where they hold an argument,
 * and the stepper's said half of one. So the field's HEAD is read as a small grammar, and a
 * card whose head fits none of the three is rejected rather than rendered badly.
 *
 *   `<qualifier?> [Name](https://www.w3.org/WAI/…)`  a pattern is implemented
 *   `a native \`<button>\``                          the platform carries the semantics
 *   `none`                                          no pattern applies, deliberately
 *
 * Everything after the first dash is prose, and it keeps its seat under Accessibility.
 */
const patternClaim = (pattern, file) => {
  if (!pattern) return null;
  const head = pattern.split(' — ')[0].trim();

  if (head === 'none') return { kind: 'none' };

  // The tag as text, not as rendered markup: the page puts it in a `<code>` of its own and
  // Angular escapes it there, so nothing on this path needs the sanitizer.
  const platform = head.match(/^(?:a )?native `(<[a-z]+>)`$/);
  if (platform) return { kind: 'platform', element: platform[1] };

  const apg = head.match(
    /^(.*?)\[([^\]]+)\]\((https:\/\/www\.w3\.org\/[^)]+)\)$/,
  );
  if (apg)
    return {
      kind: 'apg',
      // "the grid of", "the non-modal reading of" — kept, because a component that
      // implements one part of a pattern must not claim the whole of it.
      qualifier: apg[1].trim() || null,
      name: apg[2],
      href: apg[3],
    };

  throw new Error(
    `content pass: ${file} opens its **ARIA APG pattern:** with "${head}", which is none of ` +
      `the three the page can state — a W3C link, a native element, or the word "none"`,
  );
};

/** The body of one `## name` section, or null when the card has none. */
const sectionOf = (text, name) =>
  text
    .match(new RegExp(`\\n## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1]
    .trim() ?? null;

/** The first fence of a section: `{ lang, code }`. */
const fenceOf = (section) => {
  const m = section?.match(/```(\w+)?\n([\s\S]*?)```/);
  return m ? { lang: m[1] ?? 'text', code: m[2].trimEnd() } : null;
};

/** A section's table as `{ header, rows }` of raw cell strings. */
const tableOf = (section) => {
  const lines = (section ?? '')
    .split('\n')
    .filter((l) => /^\|.*\|\s*$/.test(l));
  if (lines.length < 2) return null;
  const cells = (line) =>
    line
      .trim()
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replaceAll('\\|', '|'));
  return {
    header: cells(lines[0]),
    rows: lines
      .slice(1)
      .filter((l) => !/^\|[\s:|-]+\|\s*$/.test(l))
      .map(cells),
  };
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
    const claim = patternClaim(pattern, file);
    const category = field(text, 'Category');
    if (!category || !CATEGORIES.includes(category))
      throw new Error(
        `content pass: ${file} carries no **Category:** the index knows (${category ?? 'none'})`,
      );

    // The lead the page opens with, and the one field this pass reads with a shape. It is
    // held to being SHORT and SELF-CONTAINED because of where it is rendered: directly under
    // the component's name, to somebody who has not decided to use it yet. A requirement
    // number or a decision link there sends that reader into this repository's own machinery
    // before they have seen the component run — the card's prose below is where that belongs,
    // and the page puts it under Evidence.
    const summary = field(text, 'Summary');
    if (!summary)
      throw new Error(
        `content pass: ${file} carries no **Summary:** to lead the page with`,
      );
    if (summary.length > SUMMARY_MAX)
      throw new Error(
        `content pass: ${file} leads with ${summary.length} characters, and the lead is capped at ${SUMMARY_MAX}`,
      );
    const inward = summary.match(
      /\]\(|req-[a-z]+-|lesson-\d|decisions\/\d/,
    )?.[0];
    if (inward)
      throw new Error(
        `content pass: ${file} leads with "${inward}" — a link or a promise number, which the lead does not carry`,
      );

    // The prose between the header block and the first section is the design note: the
    // reasoning, with every link it needs.
    const notes = (text.split(/\n## /)[0] ?? '')
      .split(/\n\n/)
      .slice(1)
      .filter((p) => !p.startsWith('**') && !p.startsWith('# '))
      .join('\n\n')
      .trim();

    const paragraphs = (md) =>
      md
        .split(/\n\n/)
        .filter(Boolean)
        .map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`)
        .join('\n');

    // The sections the page reads as a form — each one optional until the sweep.
    const usage = fenceOf(sectionOf(text, 'Usage'));
    const theming = fenceOf(sectionOf(text, 'Theming'));
    const partsTable = tableOf(sectionOf(text, 'Parts'));
    const keyboard = sectionOf(text, 'Keyboard map');
    const limitations = sectionOf(text, 'Known limitations');
    const checksTable = tableOf(sectionOf(text, 'Checks'));
    const decisionIds = [
      ...(sectionOf(text, 'Decisions') ?? '').matchAll(/decisions\/(\d{4})-/g),
    ].map((m) => m[1]);
    const lessonIds = [
      ...new Set(
        [...text.matchAll(/lessons\.md#lesson-(\d+)/g)].map((m) =>
          Number(m[1]),
        ),
      ),
    ];

    const checks = (checksTable?.rows ?? []).map((row) => {
      const at = (name, fallback) => {
        const i = checksTable.header.findIndex((h) =>
          new RegExp(name, 'i').test(h),
        );
        return row[i === -1 ? fallback : i] ?? '';
      };
      const evidence = at('evidence', row.length - 1);
      const state = /^not applicable/i.test(evidence)
        ? 'na'
        : /^none\s*[—-]\s*deliberately/i.test(evidence)
          ? 'deliberate'
          : /^none\b/i.test(evidence)
            ? 'gap'
            : 'measured';
      return {
        criterion: inline(at('criterion', 0)),
        evidence: inline(evidence),
        state,
      };
    });

    return {
      id,
      classes,
      role,
      entrypoint,
      // The selector field can carry a parenthesised note beside the code mark — the
      // pages want the bare machine name, the note stays in the rendered card.
      selector: selector?.match(/`([^`]+)`/)?.[1] ?? null,
      status,
      category,
      pattern: pattern ? inline(pattern) : null,
      patternClaim: claim,
      summary: inline(summary),
      notesHtml: notes ? paragraphs(notes) : null,
      usage: usage ? { code: await highlight(usage.code, usage.lang) } : null,
      theming: theming
        ? {
            code: await highlight(theming.code, theming.lang),
            // The declarations, joined — the page paints them onto a second instance of
            // the preview, so the reader sees the tokens move.
            style: [...theming.code.matchAll(/(--pct-[\w-]+)\s*:\s*([^;]+);/g)]
              .map((m) => `${m[1]}: ${m[2].trim()}`)
              .join('; '),
          }
        : null,
      partsDescribed: new Map(
        (partsTable?.rows ?? []).map((r) => [
          r[0].replaceAll('`', ''),
          inline(r[1] ?? ''),
        ]),
      ),
      keyboard: keyboard ? await render(keyboard) : null,
      limitations: limitations ? await render(limitations) : null,
      checks,
      decisionIds,
      lessonIds,
    };
  }),
);

// ── 1b. the source: the API read from the code itself (2.7.2) ────────────────

const sourcesOf = (() => {
  const cache = new Map();
  return (entry) => {
    if (!cache.has(entry)) {
      const dir = join(LIB_DIR, entry, 'src');
      const files = existsSync(dir)
        ? readdirSync(dir).filter(
            (f) => f.endsWith('.ts') && !/\.(spec|mutation)\.ts$/.test(f),
          )
        : [];
      cache.set(
        entry,
        Object.fromEntries(
          files.map((f) => [f, readFileSync(join(dir, f), 'utf8')]),
        ),
      );
    }
    return cache.get(entry);
  };
})();

const jsdocText = (block) =>
  block
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();

/** The JSDoc block that ends right before `index` — whitespace only between — or null. */
const docBefore = (text, index) => {
  const m = text.slice(0, index).match(/[\s\S]*(\/\*\*[\s\S]*?\*\/)\s*$/);
  return m ? jsdocText(m[1]) : null;
};
const firstParagraph = (doc) =>
  (doc ?? '')
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The text inside the bracket pair opening at `from` — strings, comments and arrows
 * respected, because the library's comments are prose and prose holds braces
 * (`{pct.control.height}` is one of them).
 */
const balanced = (text, from, where = 'a source file') => {
  const open = text[from];
  const close = { '(': ')', '{': '}', '<': '>', '[': ']' }[open];
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      for (i++; i < text.length && text[i] !== ch; i++)
        if (text[i] === '\\') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      i = text.indexOf('\n', i);
      if (i === -1) break;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1;
      if (i === 0) break;
      continue;
    }
    if (open === '<' && ch === '>' && text[i - 1] === '=') continue;
    if (ch === open) depth++;
    else if (ch === close && --depth === 0)
      return { inner: text.slice(from + 1, i), end: i + 1 };
  }
  throw new Error(`content pass: unbalanced ${open} in ${where}`);
};

/** Top-level split on commas — a call's arguments. */
const splitTop = (inner) => {
  const out = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of inner) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
};

const inferType = (dflt) =>
  !dflt
    ? null
    : /^(true|false)$/.test(dflt)
      ? 'boolean'
      : /^-?\d[\d.]*$/.test(dflt)
        ? 'number'
        : /^['"`]/.test(dflt)
          ? 'string'
          : dflt === '[]'
            ? 'readonly unknown[]'
            : null;

/** Inputs, models and outputs of one class body, each with the JSDoc line above it. */
const membersOf = (body, file, id) => {
  const members = [];
  const re = /readonly (\w+) = (input|model|output)(\.required)?/g;
  let m;
  while ((m = re.exec(body))) {
    let at = m.index + m[0].length;
    let generic = null;
    if (body[at] === '<') {
      const g = balanced(body, at);
      generic = g.inner.replace(/\s+/g, ' ').trim();
      at = g.end;
    }
    if (body[at] !== '(') continue;
    const args = splitTop(balanced(body, at).inner);
    const kind = m[2];
    const required = Boolean(m[3]);
    const dflt = kind === 'output' || required ? null : (args[0] ?? null);
    const doc = docBefore(body, m.index);
    if (!doc) warn(id, `${file}: \`${m[1]}\` (${kind}) has no JSDoc line`);
    // `input<Read, Write>` names the write type second — the page shows what is READ.
    // A transform names the type when no generic does: `booleanAttribute`, `numberAttribute`.
    const readType = generic ? splitTop(generic)[0] : null;
    const transformed = /booleanAttribute/.test(args[1] ?? '')
      ? 'boolean'
      : /numberAttribute/.test(args[1] ?? '')
        ? 'number'
        : null;
    members.push({
      name: m[1],
      kind,
      required,
      type: readType ?? transformed ?? inferType(dflt) ?? 'unknown',
      default: dflt?.replace(/^this\.config\./, 'config.') ?? null,
      description: inline(firstParagraph(doc)),
    });
  }
  return members;
};

/** The decorator's `host` object: what the directive writes on the element. */
const hostOf = (args) => {
  const at = args.search(/\bhost:\s*\{/);
  if (at === -1) return [];
  const { inner } = balanced(args, args.indexOf('{', at));
  const rows = [];
  let note = [];
  for (const raw of inner.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//')) {
      note.push(line.replace(/^\/\/\s?/, ''));
      continue;
    }
    const e = line.match(/^'?(\[?[\w.-]+\]?)'?:\s*'((?:[^'\\]|\\.)*)'/);
    if (e) {
      const key = e[1];
      rows.push({
        attribute:
          key.match(/^\[attr\.([\w-]+)\]$/)?.[1] ??
          key.match(/^\[([\w-]+)\]$/)?.[1] ??
          key,
        kind: key.startsWith('[attr.')
          ? 'attribute'
          : key.startsWith('[')
            ? 'property'
            : 'static',
        bound: e[2],
        note: inline(note.join(' ')),
      });
    }
    note = [];
  }
  return rows;
};

const decoratorBefore = (text, classStart) => {
  const head = text.slice(0, classStart);
  const m = head.match(
    /[\s\S]*@(Component|Directive|Injectable|Pipe)\(([\s\S]*)\)\s*$/,
  );
  if (!m) return null;
  return {
    kind: m[1].toLowerCase(),
    args: m[2],
    selector: m[2].match(/selector:\s*'([^']+)'/)?.[1] ?? null,
    doc: docBefore(text, head.lastIndexOf(`@${m[1]}(`)),
  };
};

// `extends` may sit on its own line after a generic parameter list — Prettier's own wrap.
const classRe =
  /export (?:abstract )?class (\w+)(?:<[^{]*?>)?(?:\s+extends\s+(\w+)(?:<[^{]*?>)?)?[^{]*\{/g;
const classesIn = (text) => {
  const out = [];
  for (const m of text.matchAll(classRe)) {
    const body = balanced(text, m.index + m[0].length - 1, `class ${m[1]}`);
    out.push({
      name: m[1],
      base: m[2] ?? null,
      start: m.index,
      body: body.inner,
    });
  }
  return out;
};

/** `{ file, class }` for a class name inside an entry point, or null. */
const findClass = (entry, name) => {
  for (const [file, text] of Object.entries(sourcesOf(entry))) {
    const hit = classesIn(text).find((c) => c.name === name);
    if (hit) return { file, text, ...hit };
  }
  return null;
};

/** One card's classes, read: kind, selector, JSDoc, members (base classes first), host. */
const apiOf = (card) => {
  const entry = card.entrypoint?.split('/').pop();
  if (!entry) return [];
  return card.classes.flatMap((name) => {
    const found = findClass(entry, name);
    if (!found) {
      warn(
        card.id,
        `class \`${name}\` was not found under libs/components/${entry}/src`,
      );
      return [];
    }
    const decorator = decoratorBefore(found.text, found.start);
    const chain = [];
    for (let cur = found, depth = 0; cur && depth < 4; depth++) {
      chain.unshift(cur);
      cur = cur.base ? findClass(entry, cur.base) : null;
    }
    return [
      {
        name,
        kind: decorator?.kind ?? 'class',
        selector: decorator?.selector ?? null,
        description: inline(
          firstParagraph(decorator?.doc ?? docBefore(found.text, found.start)),
        ),
        file: `libs/components/${entry}/src/${found.file}`,
        members: chain.flatMap((c) => membersOf(c.body, c.file, card.id)),
        // A base directive may carry the `host` object (Angular's own idiom for shared
        // bindings), so the rows come from the whole chain, base first.
        host: chain.flatMap((c) => {
          const d = decoratorBefore(c.text, c.start);
          return d ? hostOf(d.args) : [];
        }),
      },
    ];
  });
};

/** Everything an entry point exports, with the kind each name has. */
const exportsOf = (entry) => {
  const src = sourcesOf(entry);
  const rows = [];
  for (const m of (src['index.ts'] ?? '').matchAll(
    /export \* from '\.\/([\w.-]+)';/g,
  )) {
    const file = `${m[1]}.ts`;
    const text = src[file];
    if (!text) continue;
    for (const e of text.matchAll(
      /^export (?:abstract )?(class|type|interface|const|function|enum) (\w+)/gm,
    )) {
      const [, kind, name] = e;
      const row = { name, kind, selector: null, detail: null, description: '' };
      const decorator =
        kind === 'class' ? decoratorBefore(text, e.index) : null;
      if (decorator) {
        row.kind = decorator.kind;
        row.selector = decorator.selector;
        row.description = inline(firstParagraph(decorator.doc));
      } else {
        row.description = inline(firstParagraph(docBefore(text, e.index)));
        if (kind === 'type') {
          // The alias's shape: past the generic parameter list first — `<T = string>`
          // holds an `=` of its own, and the page showed `string> = …` for it.
          let after = text.slice(e.index + e[0].length);
          if (after.startsWith('<'))
            after = after.slice(balanced(after, 0, `type ${name}`).end);
          row.detail =
            after
              .match(/^\s*=\s*([\s\S]*?);/)?.[1]
              .replace(/\s+/g, ' ')
              .trim() ?? null;
        }
        if (
          kind === 'const' &&
          /InjectionToken/.test(text.slice(e.index, e.index + 240))
        )
          row.kind = 'token';
      }
      rows.push(row);
    }
  }
  return rows;
};

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

// ── 2b. the tokens' meaning and defaults, from the DTCG sources (2.7.2) ─────

const dtcg = (file) => JSON.parse(readFileSync(join(TOKENS_DIR, file), 'utf8'));
const flatten = (tree, prefix = [], out = {}) => {
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    const path = [...prefix, key];
    if (value && typeof value === 'object' && '$value' in value)
      out[path.join('.')] = value;
    else if (value && typeof value === 'object') flatten(value, path, out);
  }
  return out;
};
const primitive = flatten(dtcg('primitive.json'));
const semantic = {
  light: flatten(dtcg('semantic.light.json')),
  dark: flatten(dtcg('semantic.dark.json')),
};
const componentTokens = {};
for (const file of readdirSync(TOKENS_DIR).filter((f) =>
  /^component\..+\.json$/.test(f),
))
  Object.assign(componentTokens, flatten(dtcg(file)));

/** A `{a.b.c}` reference followed to its literal, per theme; an unknown one stays as is. */
const resolve = (value, theme) => {
  let v = value;
  for (let i = 0; i < 12 && typeof v === 'string' && /^\{.+\}$/.test(v); i++) {
    const path = v.slice(1, -1);
    const hit =
      (theme === 'dark' ? semantic.dark[path] : null) ??
      semantic.light[path] ??
      primitive[path] ??
      componentTokens[path];
    if (!hit) return v;
    v = hit.$value;
  }
  return typeof v === 'string' ? v : JSON.stringify(v);
};
const cssName = (path) => `--${path.replaceAll('.', '-')}`;
const tokenByName = new Map(
  Object.entries(componentTokens).map(([path, token]) => [
    cssName(path),
    { path, token },
  ]),
);

const tokensOf = (card) => {
  const names =
    tokensByComponent.get(card.entrypoint?.split('/').pop() ?? '') ?? [];
  return names.map((name) => {
    const hit = tokenByName.get(name);
    if (!hit) {
      warn(
        card.id,
        `token ${name} is in the snapshot but not in the DTCG sources`,
      );
      return {
        name,
        type: null,
        ref: null,
        light: null,
        dark: null,
        description: '',
      };
    }
    if (!hit.token.$description)
      warn(card.id, `token ${name} carries no $description`);
    const ref =
      typeof hit.token.$value === 'string'
        ? hit.token.$value
        : JSON.stringify(hit.token.$value);
    return {
      name,
      type: hit.token.$type ?? null,
      ref: /^\{.+\}$/.test(ref) ? ref : null,
      light: resolve(ref, 'light'),
      dark: resolve(ref, 'dark'),
      description: inline(hit.token.$description ?? ''),
    };
  });
};

// ── 3. the evidence numbers — tracked snapshots only ─────────────────────────

const mutation = read('libs/components/mutation.snapshot.md');
const total = mutation.match(/^TOTAL ([\d.]+) (\d+)\/(\d+)$/m);
// Columns (the snapshot's own legend): file · score · killed (of that, by the clock) ·
// surviving · not covered · ignored. The denominator is what was measured: ignored is out.
const mutationRows = [
  ...mutation.matchAll(
    /^(libs\/components\/\S+) ([\d.]+) (\d+)\((\d+)\) (\d+) (\d+) (\d+)$/gm,
  ),
].map((m) => ({
  file: m[1],
  score: Number(m[2]),
  killed: Number(m[3]),
  survived: Number(m[5]),
  notCovered: Number(m[6]),
}));

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
const contrastChecks = JSON.parse(
  read('libs/tokens/src/contrast.policy.json'),
).checks;
const contrastPairs = contrastChecks.length;
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

// ── 3b. the evidence per component (2.7.2) ───────────────────────────────────

const baselineFiles = existsSync(join(E2E_DIR, '__screenshots__/linux'))
  ? readdirSync(join(E2E_DIR, '__screenshots__/linux'))
  : [];
// A card whose cases live in a shared spec names it here; a card with neither shows none.
const SPEC_ALIAS = {
  calendar: 'date',
  text: 'field',
  container: 'layout',
  stack: 'layout',
  grid: 'layout',
};

const evidenceOf = (card, api) => {
  const files = new Set(api.map((c) => c.file));
  const rows = mutationRows.filter((r) => files.has(r.file));
  const killed = rows.reduce((n, r) => n + r.killed, 0);
  const survived = rows.reduce((n, r) => n + r.survived, 0);
  const notCovered = rows.reduce((n, r) => n + r.notCovered, 0);
  const measured = killed + survived + notCovered;
  const spec = `${SPEC_ALIAS[card.id] ?? card.id}.spec.ts`;
  const specPath = join(E2E_DIR, spec);
  return {
    mutation:
      rows.length === 0
        ? null
        : {
            score: measured
              ? Math.round((killed / measured) * 10000) / 100
              : 100,
            killed,
            survived,
            mutants: measured,
            files: rows.length,
          },
    e2e: existsSync(specPath)
      ? {
          cases: (readFileSync(specPath, 'utf8').match(/^\s*test\(/gm) ?? [])
            .length,
          spec: `apps/sandbox-e2e/src/${spec}`,
        }
      : null,
    pairs: contrastChecks.filter((c) => c.name.startsWith(`${card.id}/`))
      .length,
    baselines: baselineFiles.filter((f) => f.startsWith(`${card.id}-`)).length,
  };
};

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
      gate: inline(m[3].trim().replaceAll('\\|', '|')),
      control: inline(m[4].trim().replaceAll('\\|', '|')),
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
const decisionTitle = new Map(decisions.map((d) => [d.id, d.title]));

const lessons = [
  ...read('docs/lessons.md').matchAll(
    /^### <a id="lesson-(\d+)"><\/a>`lesson-\d+` — (.*)$/gm,
  ),
].map((m) => ({ id: Number(m[1]), title: renderInline(m[2]) }));
const lessonTitle = new Map(lessons.map((l) => [l.id, l.title]));

const supportHtml = await render(
  read('docs/support.md').replace(/^# .*\n/, ''),
);

// ── 5. the demos — the preview, the examples, and the start page's snippets ──

const demoRegistry = readFileSync(join(DEMOS_DIR, 'index.ts'), 'utf8');

/** The JSDoc above a demo's `@Component`: the first line is the title, the rest the prose. */
const demoDoc = (text) => {
  const doc = jsdocText(
    text.match(/(\/\*\*[\s\S]*?\*\/)\s*@Component/)?.[1] ?? '',
  );
  const [title, ...rest] = doc.split('\n');
  return {
    title: title.trim(),
    prose: rest
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((p) => `<p>${inline(p)}</p>`)
      .join('\n'),
  };
};

const previews = {};
const examples = {};
for (const file of readdirSync(DEMOS_DIR).sort()) {
  const preview = file.match(/^([a-z-]+)\.demo\.ts$/);
  const example = file.match(/^([a-z-]+)\.([a-z-]+)\.demo\.ts$/);
  if (!preview && !example) continue;
  const source = readFileSync(join(DEMOS_DIR, file), 'utf8').trimEnd();
  const code = await highlight(source, 'angular-ts');
  if (preview) {
    const { title, prose } = demoDoc(source);
    previews[preview[1]] = {
      code,
      source,
      caption: `<p>${inline(title)}</p>${prose}`,
    };
    continue;
  }
  const [, id, key] = example;
  if (!demoRegistry.includes(`'./${id}.${key}.demo'`))
    throw new Error(
      `content pass: ${file} is on disk but not in EXAMPLES (demos/index.ts)`,
    );
  const { title, prose } = demoDoc(source);
  if (!title)
    throw new Error(
      `content pass: ${file} opens with no title line in its JSDoc`,
    );
  (examples[id] ??= []).push({ key, title, prose, code, source });
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

// ── 6. assemble, then emit ───────────────────────────────────────────────────

mkdirSync(join(OUT_DIR, 'public'), { recursive: true });

const entry = (card) => {
  const suffix = card.entrypoint?.split('/').pop() ?? '';
  const api = apiOf(card);
  const partNames = partsByEntrypoint.get(suffix) ?? [];
  for (const name of card.partsDescribed.keys())
    if (!partNames.includes(name))
      warn(
        card.id,
        `the Parts table names \`${name}\`, which the inventory does not hold`,
      );
  return {
    ...card,
    api,
    exports: suffix ? exportsOf(suffix) : [],
    parts: partNames.map((name) => ({
      name,
      description: card.partsDescribed.get(name) ?? '',
    })),
    tokens: tokensOf(card),
    // In the registry's order — the page tells a story, the directory sorts letters.
    examples: (examples[card.id] ?? [])
      .slice()
      .sort(
        (a, b) =>
          demoRegistry.indexOf(`'./${card.id}.${a.key}.demo'`) -
          demoRegistry.indexOf(`'./${card.id}.${b.key}.demo'`),
      ),
    preview: previews[card.id] ?? null,
    decisions: card.decisionIds.map((id) => ({
      id,
      title: decisionTitle.get(id) ?? '',
    })),
    lessons: card.lessonIds.map((id) => ({
      id,
      title: lessonTitle.get(id) ?? '',
    })),
    evidence: evidenceOf(card, api),
  };
};
const full = cards.map(entry);

/* One order for every surface downstream — the gallery, the component page's index, the
   machine catalogue and llms.txt all read this array, so sorting it once is the whole of
   it. The two gates first, because a silent misorder is the failure mode this replaces. */
{
  const listed = new Set(CARD_ORDER);
  if (listed.size !== CARD_ORDER.length)
    throw new Error('content pass: CARD_ORDER repeats an id');
  const missing = full.map((c) => c.id).filter((id) => !listed.has(id));
  const unknown = CARD_ORDER.filter((id) => !cardIds.has(id));
  if (missing.length || unknown.length)
    throw new Error(
      `content pass: CARD_ORDER is not the cards on disk — missing ${missing.join(', ') || 'none'}, unknown ${unknown.join(', ') || 'none'}`,
    );

  const rank = new Map(CARD_ORDER.map((id, i) => [id, i]));
  full.sort((a, b) => rank.get(a.id) - rank.get(b.id));

  // Each category has to be ONE run, or the page renders its heading twice.
  const runs = [];
  for (const card of full)
    if (runs.at(-1) !== card.category) runs.push(card.category);
  const split = runs.filter((c, i) => runs.indexOf(c) !== i);
  if (split.length)
    throw new Error(
      `content pass: ${[...new Set(split)].join(', ')} is not contiguous in CARD_ORDER`,
    );
  const stray = runs.filter((c) => !CATEGORIES.includes(c));
  if (stray.length)
    throw new Error(`content pass: ${stray.join(', ')} is not a category`);
  // The buckets appear in the order CATEGORIES states, so the two cannot disagree.
  const expected = CATEGORIES.filter((c) => runs.includes(c));
  if (runs.join('|') !== expected.join('|'))
    throw new Error(
      `content pass: CARD_ORDER runs (${runs.join(', ')}) do not follow CATEGORIES (${expected.join(', ')})`,
    );
}

for (const card of full) {
  if (!card.usage) warn(card.id, 'the card has no `## Usage` fence');
  if (!card.theming && card.tokens.length)
    warn(card.id, 'the card has no `## Theming` fence');
  if (card.parts.some((p) => !p.description))
    warn(card.id, 'a part has no line in the `## Parts` table');
  if (!card.examples.length)
    warn(card.id, 'no `<id>.<key>.demo.ts` example beside the preview');
}
const strictWarnings = warnings.filter((w) => STRICT.has(w.id));
if (strictWarnings.length)
  throw new Error(
    `content pass: a page in STRICT does not read whole —\n` +
      strictWarnings.map((w) => `  ${w.id}: ${w.message}`).join('\n'),
  );

const banner = `// GENERATED by apps/docs/tools/build-content.mjs — do not edit; the sources are the
// repository's own cards, snapshots and source files, and this file is rebuilt on every docs build.
`;

/** The landing's diet — the emitted shape spelled once, nothing rendered inside it. */
const lean = full.map((card) => ({
  id: card.id,
  classes: card.classes,
  role: card.role,
  entrypoint: card.entrypoint,
  selector: card.selector,
  status: card.status,
  category: card.category,
  summary: card.summary,
  parts: card.parts.map((p) => p.name),
  tokens: card.tokens.map((t) => t.name),
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
  readonly category: string;
  readonly summary: string;
  readonly parts: readonly string[];
  readonly tokens: readonly string[];
}

export const DOCS_CATEGORIES: readonly string[] = ${JSON.stringify(CATEGORIES)};

export const DOCS_CARDS: readonly DocsCard[] = ${JSON.stringify(lean, null, 2)};

export const DOCS_EVIDENCE = ${JSON.stringify(evidence, null, 2)} as const;
`,
);

const pages = Object.fromEntries(
  full.map((c) => [
    c.id,
    {
      id: c.id,
      category: c.category,
      classes: c.classes,
      role: c.role,
      status: c.status,
      entrypoint: c.entrypoint,
      selector: c.selector,
      pattern: c.pattern,
      patternClaim: c.patternClaim,
      summary: c.summary,
      notes: c.notesHtml,
      usage: c.usage,
      preview: c.preview,
      examples: c.examples,
      api: c.api,
      exports: c.exports,
      parts: c.parts,
      tokens: c.tokens,
      theming: c.theming,
      keyboard: c.keyboard,
      checks: c.checks,
      limitations: c.limitations,
      decisions: c.decisions,
      lessons: c.lessons,
      evidence: c.evidence,
    },
  ]),
);

writeFileSync(
  join(OUT_DIR, 'component-pages.ts'),
  `${banner}
export interface ApiMember {
  readonly name: string;
  readonly kind: 'input' | 'model' | 'output';
  readonly required: boolean;
  readonly type: string;
  readonly default: string | null;
  /** Rendered HTML — the JSDoc line above the member. */
  readonly description: string;
}

export interface HostRow {
  readonly attribute: string;
  readonly kind: 'attribute' | 'property' | 'static';
  readonly bound: string;
  readonly note: string;
}

export interface ApiClass {
  readonly name: string;
  readonly kind: string;
  readonly selector: string | null;
  readonly description: string;
  readonly file: string;
  readonly members: readonly ApiMember[];
  readonly host: readonly HostRow[];
}

export interface ExportRow {
  readonly name: string;
  readonly kind: string;
  readonly selector: string | null;
  readonly detail: string | null;
  readonly description: string;
}

export interface TokenDoc {
  readonly name: string;
  readonly type: string | null;
  readonly ref: string | null;
  readonly light: string | null;
  readonly dark: string | null;
  readonly description: string;
}

export interface PartDoc {
  readonly name: string;
  readonly description: string;
}

export interface CheckRow {
  readonly criterion: string;
  readonly evidence: string;
  readonly state: 'measured' | 'gap' | 'deliberate' | 'na';
}

export interface DemoDoc {
  readonly code: string;
  readonly source: string;
}

export type PatternClaim =
  | { readonly kind: 'none' }
  | { readonly kind: 'platform'; readonly element: string }
  | {
      readonly kind: 'apg';
      readonly qualifier: string | null;
      readonly name: string;
      readonly href: string;
    };

export interface ExampleDoc extends DemoDoc {
  readonly key: string;
  readonly title: string;
  readonly prose: string;
}

export interface ComponentPage {
  readonly id: string;
  readonly category: string;
  readonly classes: readonly string[];
  readonly role: string;
  readonly status: string | null;
  readonly entrypoint: string | null;
  readonly selector: string | null;
  readonly pattern: string | null;
  readonly patternClaim: PatternClaim | null;
  readonly summary: string;
  readonly notes: string | null;
  readonly usage: { readonly code: string } | null;
  readonly preview: (DemoDoc & { readonly caption: string }) | null;
  readonly examples: readonly ExampleDoc[];
  readonly api: readonly ApiClass[];
  readonly exports: readonly ExportRow[];
  readonly parts: readonly PartDoc[];
  readonly tokens: readonly TokenDoc[];
  readonly theming: { readonly code: string; readonly style: string } | null;
  readonly keyboard: string | null;
  readonly checks: readonly CheckRow[];
  readonly limitations: string | null;
  readonly decisions: readonly { readonly id: string; readonly title: string }[];
  readonly lessons: readonly { readonly id: number; readonly title: string }[];
  readonly evidence: {
    readonly mutation: {
      readonly score: number;
      readonly killed: number;
      readonly survived: number;
      readonly mutants: number;
      readonly files: number;
    } | null;
    readonly e2e: { readonly cases: number; readonly spec: string } | null;
    readonly pairs: number;
    readonly baselines: number;
  };
}

/** One payload per component page — everything above was read, nothing was typed here. */
export const COMPONENT_PAGES: Readonly<Record<string, ComponentPage>> = ${JSON.stringify(pages, null, 2)};
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
/** The start page's snippets, shiki-highlighted for both themes. */
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
      category: card.category,
      entrypoint: card.entrypoint,
      selector: card.selector,
      status: card.status,
      parts: card.parts.map((p) => p.name),
      tokens: card.tokens.map((t) => t.name),
      inputs: card.api.flatMap((c) =>
        c.members
          .filter((m) => m.kind !== 'output')
          .map((m) => `${c.name}.${m.name}`),
      ),
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
  '- [components.json](/components.json): the same inventory with selectors, parts, token names and input names, one JSON object per component.',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, 'public/llms.txt'), llms + '\n');

if (process.env['DOCS_WARNINGS']) {
  const byCard = {};
  for (const w of warnings) (byCard[w.id] ??= []).push(w.message);
  for (const [id, list] of Object.entries(byCard))
    console.log(`${id}: ${list.length}\n  ${list.slice(0, 6).join('\n  ')}`);
}
const members = full.reduce(
  (n, c) => n + c.api.reduce((k, a) => k + a.members.length, 0),
  0,
);
console.log(
  `content pass: ${full.length} cards rendered, ${members} API members read, ` +
    `${Object.keys(previews).length} previews and ${Object.values(examples).flat().length} examples highlighted, ` +
    `${registryRows.length} registry rows, ${lessons.length} lessons, ${tokenRows.length} tokens, ` +
    `evidence ${evidence.mutation.mutants} mutants @ ${evidence.mutation.score}; ` +
    `${warnings.length} readings still owed by the sweep (2.7.4)`,
);
