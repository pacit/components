#!/usr/bin/env node
/**
 * Icon gate: `req-api-icons` — every icon the library draws can be replaced by the consumer's
 * own. Breaking it gives no red test and no ugly page: an `<svg>` written straight into a
 * template renders perfectly and is simply impossible to swap
 * ([0011](../docs/decisions/0011-icons.md), [0028](../docs/decisions/0028-an-icon-set-is-a-component.md)).
 *
 *  1. DENOMINATOR: the names read, each template parsed, no `@content` and no template below
 *     an icon, each drawing walked,
 *  2. SWAPPABLE: a drawing stands inside a `<pct-icon>`, or is the SVG renderer's own,
 *  3. NAMED: a `<pct-icon>` of the library carries a name, because a set is asked by name,
 *  4. DEFAULT: a named icon carries its own drawing, so a consumer with no set sees an icon,
 *  5. INVENTORY: the names drawn and `PctIconName` are the same set, both ways,
 *  6. PART: `data-pct-part` never sits below a `pct-icon`: the contract is the box, not the drawing.
 *
 * Point 1 is the denominator of the rest ([`lesson-48`](../docs/lessons.md#lesson-48)).
 *
 * Usage: node tools/check-icons.mjs
 */
import {
  splitNsName,
  TmplAstContent,
  TmplAstElement,
  TmplAstLetDeclaration,
  TmplAstRecursiveVisitor,
  TmplAstTemplate,
  tmplAstVisitAll,
} from '@angular/compiler';
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
import { readTree } from './template-comments.mjs';
import { runnerControl } from './runner-control.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-icons.fixtures');
const REFERENCE = '_reference';
const RUNNER = '_runner.json';

/** Where the published list of names lives. */
const NAMES_FILE = `${PROJECT}/icon/src/icon.ts`;
/** `export type PctIconName = 'a' | 'b';` — the union, however prettier wraps it. */
const NAMES = /export type PctIconName\s*=\s*([^;]+);/;
/** A name inside that union, and a name inside a template's binding. */
const LITERAL = /'([^']*)'/g;

const ICON = 'pct-icon';
const DRAWING = 'svg';
/**
 * The places a bare `<svg>` is the mechanism and not a drawing. The SVG renderer's own
 * templates, where a drawing given as DATA is rendered element by element (0083): every
 * template there is the renderer of what a source answered, so nothing in it is a picture
 * a consumer would want to swap — the swap already happened one level up. And a chart's
 * marks', named one by one: the scene's layers, the line's and the bars' drawings, where the
 * drawing IS the data, scaled and decimated (0099), the annotations' lines, bands, notes and
 * the moment of now, drawn on the same scales, and a picture of the consumer's numbers is
 * nothing a set could hold. Any other template of the chart — a legend, a marker — draws what a set
 * could, and answers to point 2. Narrow on purpose, and the reference input carries one
 * template of each kind, so both exemptions are exercised and not merely written.
 */
const RENDERER = new RegExp(`^${PROJECT}/svg-icon/src/[^/]+\\.html$`);
const DATA_DRAWINGS = new Set([
  `${PROJECT}/chart/src/chart.html`,
  `${PROJECT}/chart/src/line.html`,
  `${PROJECT}/chart/src/bars.html`,
  `${PROJECT}/chart/src/reference.html`,
  `${PROJECT}/chart/src/span.html`,
  `${PROJECT}/chart/src/note.html`,
  `${PROJECT}/chart/src/now.html`,
  `${PROJECT}/chart/src/band.html`,
  `${PROJECT}/chart/src/points.html`,
  `${PROJECT}/chart/src/area.html`,
  `${PROJECT}/chart/src/range.html`,
  `${PROJECT}/chart/src/box.html`,
]);
const PART = 'data-pct-part';

/**
 * The same two tags counted without parsing, as the denominator of the walk — over the text with
 * its comments blanked (`readTemplate`), since a tag inside one is text and the walk never sees it.
 * Each is read as Angular's lexer reads a tag (`isNameEnd`, `isPrefixEnd`): in any namespace the
 * template writes, a letter and then letters or digits before a colon (`PREFIX`), and ended by its
 * whitespace — a tab to a space, a no-break space — by `<`, `>`, `/`, a quote, `=` or the end
 * (`NAME_END`). Read with no prefix up to `[\s/>]`, `<svg:svg>`, `<svg="1">` and an `<svg` a control
 * character ends were drawings to the walk and none to the text, and each stood in for an `<svg>`
 * the walk never reaches, an ICU's: the two counts agreed and a loose one passed.
 */
const PREFIX = '(?:[a-zA-Z][a-zA-Z\\d]*:)?';
const NAME_END = `(?=[\\t-\\x20\\xa0<>/'"=]|$)`;
const COUNTERS = {
  [ICON]: new RegExp(`<${PREFIX}pct-icon${NAME_END}`, 'g'),
  [DRAWING]: new RegExp(`<${PREFIX}svg${NAME_END}`, 'g'),
};

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
 * A node the walk reads as an element, asked of the compiler's own classes: an element and an
 * `<ng-content>`, each a tag the template writes, drawn where it is written. A template is none —
 * an `<ng-template>`, or the one a structural directive wraps around what it is written on, which
 * around an element carries the element's tag and attributes too (read as one, `<svg *x>` was
 * counted twice). What it holds stands where whatever stamps it puts it, and the walk reads it
 * through; below an icon, point 1 refuses it (`stamped`). An `@let` and an `@content` block carry
 * a `name` as well and are no element: `@let svg = 1;` was a drawing, and one inside an icon stood
 * in for an `<svg>` the walk never reaches, an ICU's, so that the two counts of point 1 agreed and
 * a loose one passed.
 */
const isElement = (node) =>
  node instanceof TmplAstElement || node instanceof TmplAstContent;

/** A child point 4 counts as an icon's own drawing: any but an `@let`, which renders nothing. */
const draws = (child) => !(child instanceof TmplAstLetDeclaration);

/**
 * What a block draws in place of its body, by the name the tree holds it under: one block
 * (`@empty`, `@placeholder`, `@loading`, a deferred `@error`) or a list of them, the `@error`
 * blocks of an `@boundary` — the names `check-aria` walks. Without the last, an icon in a
 * boundary's fallback failed point 1 as a tag the walk did not reach, which `ngc` compiles.
 */
const SIDE_BLOCKS = ['empty', 'placeholder', 'loading', 'error', 'errorBlocks'];

/**
 * Every element of a template (`isElement`), with the `pct-icon` it stands inside (or `null`),
 * and the line of each template below one (`stamped`).
 *
 * Control flow is walked through rather than around: an icon inside an `@if` is an icon,
 * and a `<path>` inside an `@else` is still a drawing. The blocks carry their children on
 * `branches` / `cases` or on a side block of their own (`SIDE_BLOCKS`), so all of them are
 * followed and none of them is a scope.
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
    const sides = SIDE_BLOCKS.flatMap((name) => node[name] ?? []).map(
      (side) => side.children,
    );
    if (sides.length) {
      walk(node.children, inside, found);
      for (const side of sides) walk(side, inside, found);
      continue;
    }

    if (node instanceof TmplAstTemplate && inside !== null)
      found.stamped.push(node.sourceSpan.start.line + 1);
    if (!isElement(node)) {
      walk(node.children, inside, found);
      continue;
    }
    // The parser names an element with its namespace: what it parses inside an `<svg>` is
    // `:svg:path`, and a prefix the template writes stays on (`<svg:svg>`, `<X1:pct-icon>`). A
    // selector matches the name without one, in any namespace — `ngc` makes the icon of each —
    // so it comes off before anything is compared with a written tag, as the counts read it.
    const tag = splitNsName(node.name)[1];

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
      // The part as `check-parts` reads one: written in any case, which `setAttribute` lowers on
      // an HTML element (`DATA-PCT-PART="arrow"`), and bound by any input of the name, `attr.`
      // or not (`[attr.data-pct-part]`). `name` above is an input of the icon, matched as written.
      part: [
        ...(node.attributes ?? [])
          .filter((a) => a.name.toLowerCase() === PART)
          .map((a) => `${a.name}="${a.value}"`),
        ...(node.inputs ?? [])
          .filter((i) => i.name.toLowerCase() === PART)
          .map((i) => i.sourceSpan.toString()),
      ][0],
      // An icon holding an `@let` alone passed point 4 as one with a drawing of its own.
      children: (node.children ?? []).filter(draws).length,
    };
    found.elements.push(element);
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

/** Whether a template holds an `@content` block at any depth, as the compiler's visitor finds it. */
class ContentBlocks extends TmplAstRecursiveVisitor {
  found = false;
  visitContentBlock() {
    this.found = true;
  }
}

/**
 * A template read: its tree walked, and its two tags counted over its text with each comment
 * blanked. Both come from `readTree` (`template-comments.mjs`): one reader for this gate and
 * `check-aria`, not a copy in each. A tag a comment quotes is text to the count as it is to the
 * tree, so the two readings agree wherever the markup does.
 *
 * A template the parser reads with errors, or throws on, is refused by point 1 whatever a comment
 * found there takes with it (`<a href=//x.example>` opens one that takes the rest of its line,
 * and the tag never ends). So is one holding an `@content` block (`ContentBlocks`).
 */
const readTemplate = ({ file, content }) => {
  const { nodes, errors, text } = readTree(file, content);
  const found = { elements: [], stamped: [] };
  walk(nodes, null, found);
  const blocks = new ContentBlocks();
  tmplAstVisitAll(blocks, nodes);
  return {
    file,
    errors: errors ?? [],
    handsContent: blocks.found,
    ...found,
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
  const broken = read
    .filter((t) => t.errors.length)
    .map((t) => `${t.file}: ${t.errors[0].msg}`);
  if (broken.length)
    throw new IconError(
      'denominator',
      `${broken.length} templates do not parse:\n` +
        list(broken) +
        `\n    The walk reads what the parser hands it, and a template read with errors ` +
        `hands it part of the markup or none of it — a comment opened by mistake takes a ` +
        `drawing out of the text and the tree together. The build refuses the same text.`,
    );
  // An `@content` block hands what it holds to a foreign component (`foreignImports`), which
  // places it where its own render function puts it, and Angular builds one there alone:
  // anywhere else the compiler refuses it (`NG8026`, measured on 22.2.1 with the type check
  // and without), and no component here imports a foreign one. Read through, a drawing in one
  // stood inside the icon around the block, which nothing promises; read as an element,
  // `@content(svg)` was a drawing.
  const handed = read.filter((t) => t.handsContent).map((t) => t.file);
  if (handed.length)
    throw new IconError(
      'denominator',
      `${handed.length} templates hold an \`@content\` block:\n` +
        list(handed) +
        `\n    Angular builds one only as a direct child of a foreign component and refuses ` +
        `it anywhere else (NG8026), and what one holds the foreign component places where ` +
        `its own render puts it: points 2 to 6 would read it as standing where the block is ` +
        `written.`,
    );
  const miscounted = [];
  const unreached = new Set();
  for (const template of read)
    for (const [tag, counted] of Object.entries(template.counted)) {
      const parsed = template.elements.filter((e) => e.tag === tag).length;
      if (parsed !== counted) {
        miscounted.push(
          `${template.file}: ${parsed} \`<${tag}>\` in the tree, ${counted} in the text`,
        );
        unreached.add(template.file);
      }
    }
  // Counted by template and listed by tag: one template can miss both.
  if (miscounted.length)
    throw new IconError(
      'denominator',
      `${unreached.size} templates hold tags the walk did not reach:\n` +
        list(miscounted) +
        `\n    A drawing the walk misses is a drawing points 2 and 6 pronounce clean ` +
        `without having seen it.`,
    );
  // A template holds what stands where whatever stamps it puts it: an outlet anywhere in the
  // template, the directive written on it (`cdkPortal` hands its own to an outlet elsewhere) or
  // the class through a query, which no reading of the template sees (plan 4.83). Read where it
  // is written, a drawing in one below an icon passed point 2 as the icon's own, stamped outside
  // it by an outlet beside the icon, which `ngc` compiles. No template of the library stands
  // below an icon (twelve stand outside every one, 2026-10-17).
  //
  // A component below an icon is the same class and is not refused: what it is handed stands
  // where its own template projects it (`<ng-content>` inside an `<ng-template>`). The library's
  // own selectors, matched as Angular matches them (`SelectorMatcher`), would hold each of its
  // components, attribute selectors too (`<g pctThing>`); that reader is not built, since none
  // stands below an icon (2026-10-17). One of another package is in scope and projects in place:
  // `OverlayModule` re-exports CDK's `cdk-virtual-scroll-viewport` into four templates (the
  // select's serves two components), its `<ng-content>` inside its own host. The day a component
  // that moves what it is handed stands below an icon, the reader is built (plan 4.83).
  const templated = read
    .filter((t) => t.stamped.length)
    .map((t) => `${t.file}: line ${[...new Set(t.stamped)].join(', ')}`);
  if (templated.length)
    throw new IconError(
      'denominator',
      `${templated.length} templates hold a template below a \`<${ICON}>\`:\n` +
        list(templated) +
        `\n    An \`<ng-template>\` or a structural directive draws what it holds where an ` +
        `outlet, the directive or the class stamps it, which the template does not say: ` +
        `points 2 and 6 would read it as part of the icon. Write the drawing in the icon, and ` +
        `branch with \`@if\`.`,
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
    .filter(
      (d) =>
        d.inside === null &&
        !RENDERER.test(d.file) &&
        !DATA_DRAWINGS.has(d.file),
    )
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
      .filter((e) => e.inside !== null && e.part !== undefined)
      .map((e) => `${t.file}: \`${e.part}\` on <${e.tag}>`),
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

const readCase = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));

/**
 * What the runner reports of one prepared case: nothing, when it was rejected on its own point.
 * The loop plays every case through it, and so does the runner's own control
 * (`runner-control.mjs`).
 */
const runCase = (name, fx) => {
  const said = [];
  const directory = buildFixture(name);
  try {
    checkIcons(fixtureInput(directory));
    said.push(
      `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
        `(\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof IconError)) throw error;
    if (error.check !== fx.check)
      said.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return said;
};

for (const name of cases) problems.push(...runCase(name, readCase(name)));

problems.push(
  ...(await runnerControl({
    where: `tools/check-icons.fixtures/${RUNNER}`,
    load: () => JSON.parse(readFileSync(join(FIXTURES, RUNNER), 'utf8')),
    cases,
    read: readCase,
    run: runCase,
    holds: ['passed', 'check'],
  })),
);

// ── result ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Icon gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Icons: ${description}. Negative control: the reference input passes, ${cases.length} ` +
    `prepared ones rejected on their own points, and the runner reports a case that passed or ` +
    `fired another check.`,
);
