#!/usr/bin/env node
/**
 * Icon gate: `req-api-icons` — every icon the library draws can be replaced by the consumer's
 * own. Breaking it gives no red test and no ugly page: an `<svg>` written straight into a
 * template renders perfectly and is simply impossible to swap
 * ([0011](../docs/decisions/0011-icons.md), [0028](../docs/decisions/0028-an-icon-set-is-a-component.md)).
 *
 *  1. DENOMINATOR: the name list read, every template parsed, every drawing the walk saw,
 *  2. SWAPPABLE: a drawing stands inside a `<pct-icon>` — outside one it is nobody's icon,
 *  3. NAMED: a `<pct-icon>` of the library carries a name, because a set is asked by name,
 *  4. DEFAULT: a named icon carries its own drawing, so a consumer with no set sees an icon,
 *  5. INVENTORY: the names drawn and `PctIconName` are the same set, both ways,
 *  6. PART: `data-pct-part` never sits below a `pct-icon` — the contract is the box, not
 *     the drawing.
 *
 * Point 1 is the denominator of the rest ([`lesson-48`](../docs/lessons.md#lesson-48)).
 *
 * Usage: node tools/check-icons.mjs
 */
import { parseTemplate } from '@angular/compiler';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-icons.fixtures');
const REFERENCE = '_reference';

/** Where the published list of names lives. */
const NAMES_FILE = `${PROJECT}/icon/src/icon.ts`;
/** `export type PctIconName = 'a' | 'b';` — the union, however prettier wraps it. */
const NAMES = /export type PctIconName\s*=\s*([^;]+);/;
/** A name inside that union, and a name inside a template's binding. */
const LITERAL = /'([^']*)'/g;

const ICON = 'pct-icon';
const DRAWING = 'svg';
const PART = 'data-pct-part';

/** The same two tags counted without parsing, as the denominator of the walk. */
const COUNTERS = {
  [ICON]: /<pct-icon[\s/>]/g,
  [DRAWING]: /<svg[\s/>]/g,
};
/** Comments first: a tag inside one is text, and the walk never sees it. */
const COMMENT = /<!--[\s\S]*?-->/g;

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');
const sorted = (set) => [...set].sort();

class IconError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

// ── the walk ───────────────────────────────────────────────────────────────────

/**
 * Every element of a template, with the `pct-icon` it stands inside (or `null`).
 *
 * Control flow is walked through rather than around: an icon inside an `@if` is an icon,
 * and a `<path>` inside an `@else` is still a drawing. The blocks carry their children on
 * `branches` / `cases` or on a side block of their own (`@empty`, `@placeholder`,
 * `@loading`, `@error`), so all of them are followed and none of them is a scope.
 */
const walk = (nodes, inside, found) => {
  for (const node of nodes ?? []) {
    // `groups` and not only `cases`: an `@switch` carries its branches under that name in
    // Angular 22, and a walk that knew the other two names alone stepped over every switch
    // block in the library. Found by point 1's own denominator, which counted five icons in
    // the text of the toast's template and one in the tree (`lesson-180`).
    const branches = node.branches ?? node.cases ?? node.groups ?? null;
    if (branches) {
      for (const branch of branches) walk(branch.children, inside, found);
      continue;
    }
    const sides = [node.empty, node.placeholder, node.loading, node.error]
      .filter(Boolean)
      .map((side) => side.children);
    if (sides.length) {
      walk(node.children, inside, found);
      for (const side of sides) walk(side, inside, found);
      continue;
    }

    // Angular namespaces what it parses inside an `<svg>`: the element is `:svg:svg` and
    // everything under it `:svg:path`, `:svg:g`. The prefix is the parser's, not the
    // template's, so it comes off before anything is compared with a written tag.
    const tag =
      (node.name ?? node.tagName ?? null)?.replace(/^:[a-z]+:/, '') ?? null;
    if (tag === null) {
      walk(node.children, inside, found);
      continue;
    }

    const element = {
      tag,
      inside,
      attributes: new Map(
        (node.attributes ?? []).map((a) => [a.name, a.value]),
      ),
      // A bound name is a legitimate one: the checkbox asks for `check` or `indeterminate`
      // by the state it is in. What matters to the inventory is which names it can ask for,
      // and those are the literals written in the expression.
      bound: new Map(
        (node.inputs ?? []).map((i) => [
          i.name,
          i.value?.source ?? i.sourceSpan.toString(),
        ]),
      ),
      children: (node.children ?? []).length,
    };
    found.push(element);
    walk(node.children, tag === ICON ? element : inside, found);
  }
};

const nameOf = (element) => {
  const written = element.attributes.get('name');
  if (written !== undefined)
    return { source: `"${written}"`, names: [written] };
  const expression = element.bound.get('name');
  if (expression === undefined) return null;
  return {
    source: `[name]="${expression}"`,
    names: [...expression.matchAll(LITERAL)].map((m) => m[1]),
  };
};

const readTemplate = ({ file, content }) => {
  const text = content.replace(COMMENT, '');
  const parsed = parseTemplate(text, file, { preserveWhitespaces: false });
  const elements = [];
  walk(parsed.nodes, null, elements);
  return {
    file,
    elements,
    counted: Object.fromEntries(
      Object.entries(COUNTERS).map(([tag, pattern]) => [
        tag,
        (text.match(pattern) ?? []).length,
      ]),
    ),
  };
};

// ── the rules ──────────────────────────────────────────────────────────────────

/**
 *  `templates`  — `[{ file, content }]` from `libs/components/`,
 *  `names`      — the text of `icon.ts`, or `null` when there is no such file.
 */
const checkIcons = ({ templates, names }) => {
  // ── 1. the denominator ───────────────────────────────────────────────────────
  if (!templates.length)
    throw new IconError(
      'denominator',
      `not one template of ${PROJECT}/ reached the gate — the file list is empty, so ` +
        `points 2-6 would pronounce a library of any shape clean`,
    );

  const declared = names === null ? null : NAMES.exec(names);
  if (declared === null)
    throw new IconError(
      'denominator',
      `\`PctIconName\` is not readable in ${NAMES_FILE} — the published list of names is ` +
        `one side of point 5, and without it the inventory compares a set against nothing`,
    );
  const published = new Set(
    [...declared[1].matchAll(LITERAL)].map((m) => m[1]).filter(Boolean),
  );
  if (!published.size)
    throw new IconError(
      'denominator',
      `\`PctIconName\` in ${NAMES_FILE} holds no name at all`,
    );

  const read = templates.map(readTemplate);
  const miscounted = [];
  for (const template of read)
    for (const [tag, counted] of Object.entries(template.counted)) {
      const parsed = template.elements.filter((e) => e.tag === tag).length;
      if (parsed !== counted)
        miscounted.push(
          `${template.file}: ${parsed} \`<${tag}>\` in the tree, ${counted} in the text`,
        );
    }
  if (miscounted.length)
    throw new IconError(
      'denominator',
      `${miscounted.length} templates hold tags the walk did not reach:\n` +
        list(miscounted) +
        `\n    A drawing the walk misses is a drawing points 2 and 6 pronounce clean ` +
        `without having seen it.`,
    );

  const icons = read.flatMap((t) =>
    t.elements
      .filter((e) => e.tag === ICON)
      .map((e) => ({ ...e, file: t.file })),
  );
  const drawings = read.flatMap((t) =>
    t.elements
      .filter((e) => e.tag === DRAWING)
      .map((e) => ({ ...e, file: t.file })),
  );

  // ── 2. a drawing stands inside an icon ───────────────────────────────────────
  const loose = drawings
    .filter((d) => d.inside === null)
    .map((d) => d.file)
    .filter((file, i, all) => all.indexOf(file) === i);
  if (loose.length)
    throw new IconError(
      'swappable',
      `${loose.length} templates draw an \`<svg>\` outside a \`<${ICON}>\`:\n` +
        list(loose) +
        `\n    It renders and it cannot be replaced: a set is read by \`${ICON}\`, and an ` +
        `\`<svg>\` written beside one is a drawing the consumer has no way in to ` +
        `(req-api-icons).`,
    );

  // ── 3. an icon of the library carries a name ─────────────────────────────────
  const anonymous = icons
    .filter((icon) => nameOf(icon) === null)
    .map((icon) => icon.file);
  if (anonymous.length)
    throw new IconError(
      'named',
      `${anonymous.length} \`<${ICON}>\` of the library carry no name:\n` +
        list(anonymous) +
        `\n    A set answers to a name. An icon without one takes the content it is given ` +
        `and nothing else, which is right in a consumer's markup and is a dead end in ` +
        `ours — the drawing can then be changed only by changing the component.`,
    );

  // ── 4. and its own drawing ───────────────────────────────────────────────────
  const empty = icons
    .filter((icon) => icon.children === 0)
    .map((icon) => `${icon.file}: ${nameOf(icon).source}`);
  if (empty.length)
    throw new IconError(
      'default',
      `${empty.length} icons have no drawing of their own:\n` +
        list(empty) +
        `\n    The content of a \`<${ICON}>\` is what renders when nobody provided a set, ` +
        `and a consumer who provides none is the common case. An empty one is a gap in the ` +
        `page until somebody registers that name.`,
    );

  // ── 5. the inventory, both ways ──────────────────────────────────────────────
  const drawn = new Set(icons.flatMap((icon) => nameOf(icon).names));
  const undrawn = sorted(published).filter((name) => !drawn.has(name));
  if (undrawn.length)
    throw new IconError(
      'inventory',
      `${undrawn.length} names of \`PctIconName\` are drawn by nothing: ` +
        `${undrawn.map((n) => `\`${n}\``).join(', ')}` +
        `\n    The list is public API: a name in it promises that some component draws it ` +
        `and that a set replacing it is seen. A name nothing draws is a promise nobody ` +
        `keeps, and a consumer who registers it gets silence.`,
    );
  const unpublished = sorted(drawn).filter((name) => !published.has(name));
  if (unpublished.length)
    throw new IconError(
      'inventory',
      `${unpublished.length} names are drawn and not published: ` +
        `${unpublished.map((n) => `\`${n}\``).join(', ')}` +
        `\n    A name outside \`PctIconName\` is a name a consumer cannot spell in a set — ` +
        `the input's type rejects it before the set is ever read.`,
    );

  // ── 6. the part is the box ───────────────────────────────────────────────────
  const buried = read.flatMap((t) =>
    t.elements
      .filter((e) => e.inside !== null && e.attributes.has(PART))
      .map((e) => `${t.file}: \`${e.attributes.get(PART)}\` on <${e.tag}>`),
  );
  if (buried.length)
    throw new IconError(
      'part',
      `${buried.length} parts sit inside an icon:\n` +
        list(buried) +
        `\n    A part is a promise to a consumer's stylesheet, and everything below a ` +
        `\`<${ICON}>\` is replaced the moment a set is provided — the promise would then ` +
        `point at an element that no longer exists. Put it on the \`<${ICON}>\` itself ` +
        `(req-api-parts).`,
    );

  return `${icons.length} icons in ${templates.length} templates, ${published.size} published names (${sorted(published).join(', ')})`;
};

// ── input ──────────────────────────────────────────────────────────────────────

const isTemplate = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');
const read = (root, path) => readFileSync(join(root, path), 'utf8');

const collectInput = (root, files) => ({
  templates: files
    .filter(isTemplate)
    .map((file) => ({ file, content: read(root, file) })),
  names: files.includes(NAMES_FILE) ? read(root, NAMES_FILE) : null,
});

/**
 * Files from the GIT INDEX rather than from a glob over the disk — the same reason as in
 * `check-aria`, `check-parts` and `check-styles`: the index is an independent record of
 * what the repository really carries, and an untracked template is not part of the library.
 */
const repoFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ───────────────────────────────────────────────────────────

/**
 * A prepared input: a copy of the reference, the case's files on top. The case directory
 * then holds NOTHING BUT its own defect instead of one more copy of a correct input.
 *
 * The sources and the templates sit in the repository as `*.txt` and get their real
 * extension only here — a `.ts` file under `tools/` belongs to no compiler program and
 * would fire `check-typecheck`, and a template with a deliberate defect is a template
 * `nx format:check` would rather not see. **One gate's fixture must not be another's
 * defect.**
 */
const buildFixture = (name) => {
  const target = mkdtempSync(join(tmpdir(), 'pct-check-icons-'));
  cpSync(join(FIXTURES, REFERENCE), target, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), target, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const file of globSync('**/*.txt', { cwd: target }))
    renameSync(join(target, file), join(target, file.replace(/\.txt$/, '')));
  return target;
};

const fixtureInput = (directory) =>
  collectInput(
    directory,
    globSync('**/*.{ts,html}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ────────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkIcons(collectInput(ROOT, repoFiles()));
} catch (error) {
  if (!(error instanceof IconError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-icons.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false.
{
  const directory = buildFixture(REFERENCE);
  try {
    checkIcons(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof IconError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — every prepared ` +
        `case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name);
  try {
    checkIcons(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
        `(\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof IconError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Icon gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Icons: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
