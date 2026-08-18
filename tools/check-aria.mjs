#!/usr/bin/env node
/**
 * Accessible-name gate: `req-a11y-built-in` — the name of a widget has to be REACHABLE from
 * the host. A consumer writes attributes on the tag they type and on nothing else, so when
 * the role sits on an element INSIDE the template, an `aria-label` written on the tag lands
 * on an element with no role, where ARIA prohibits it and assistive technology ignores it.
 * `<pct-select aria-label="Country">` was exactly that: an unnamed combobox with no way in.
 *
 *  1. DENOMINATOR: every decorator parsed, every template owned, every tag read,
 *  2. HOST: an ARIA name written into a `host` block needs a role on the host to carry it,
 *  3. INPUTS: a component whose widget sits inside its template declares `ariaLabel` and
 *     `ariaLabelledby`,
 *  4. FORWARDED: both are bound on that one element — an input nobody reads is the same
 *     defect one floor up,
 *  5. SURFACE: the card that names the selector names both inputs.
 *
 * Points 3 and 4 are one rule split at the place it breaks: declaring the inputs is what a
 * consumer sees in the type, binding them is what the screen reader sees.
 *
 * Usage: node tools/check-aria.mjs
 */
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
const DOCUMENTS = 'docs/components';
const FIXTURES = join(ROOT, 'tools/check-aria.fixtures');
const REFERENCE = '_reference';

/** The two inputs by which a component hands its name over. */
const NAME_INPUTS = ['ariaLabel', 'ariaLabelledby'];
/** The attributes they are forwarded through. */
const NAME_ATTRIBUTES = ['[attr.aria-label]', '[attr.aria-labelledby]'];
/** The same names as a consumer could write them on the host, plain or bound. */
const HOST_NAME_KEYS = [
  'aria-label',
  'aria-labelledby',
  '[attr.aria-label]',
  '[attr.aria-labelledby]',
];

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');
const sorted = (set) => [...set].sort();

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * A component decorator. It anchors on the formatting `nx format:check` enforces
 * (`@Component({` and `})` in column zero), and the number of matches is therefore compared
 * against a counter that does NOT repeat that anchor — otherwise a decorator written some
 * other way would leave a whole component unexamined and both sides of the comparison would
 * be out by one together (`lesson-48`).
 *
 * `@Directive` is deliberately absent: an attribute directive sits on an element the
 * consumer chose, so the gate cannot know what role that host carries, nor whether the name
 * reaches it.
 */
const DECORATOR =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DECORATOR_COUNTER = /^[ \t]*@Component\(/gm;

const SELECTOR = /selector\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;

/** `readonly x = input(…)` / `= model(…)` / `= input.required<T>()` in the class body. */
const INPUT =
  /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:input|model)(?:\.required)?\s*[<(]/gm;

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

/**
 * The `host` block of a decorator, read by counting braces rather than by a regex: its
 * values are expressions that carry braces of their own, and a lazy `[\s\S]*?` up to the
 * first `}` would cut one of them in half.
 */
const hostBlock = (body) => {
  const start = body.search(/(?:^|\s)host\s*:\s*\{/m);
  if (start === -1) return null;
  const from = body.indexOf('{', start);
  let depth = 0;
  for (let i = from; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}' && --depth === 0) return body.slice(from + 1, i);
  }
  return null;
};

/** `'key': 'value'` / `key: 'value'` pairs of a host block. */
const HOST_ENTRY =
  /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;

const hostEntries = (text) => {
  const entries = new Map();
  for (const m of text.matchAll(HOST_ENTRY))
    entries.set(m[1] ?? m[2] ?? m[3], m[4] ?? m[5] ?? m[6]);
  return entries;
};

/**
 * The element names a selector puts the component on. `button[pctButton]` is a component on
 * a native button — the host IS the widget there, and the consumer's `aria-label` reaches it
 * with nothing to forward. An attribute-only selector (`[pctPrefix]`) yields nothing, and a
 * host nothing is known about is treated as one that cannot carry the name.
 */
const hostTags = (selector) =>
  selector
    .split(',')
    .map((part) => /^\s*([a-zA-Z][\w-]*)/.exec(part)?.[1]?.toLowerCase() ?? '')
    .filter(Boolean);

const readSources = (root, files) => {
  const components = [];
  let counted = 0;
  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    counted += countOf(content, DECORATOR_COUNTER);
    for (const match of content.matchAll(DECORATOR)) {
      const [body, className] = [match[1], match[2]];
      // The class body ends at the first `}` in column zero — the same formatting anchor
      // as the decorator. Inputs are read from it and not from the file, so a second
      // component in one file cannot lend its inputs to the first.
      const after = content.indexOf(match[0]) + match[0].length;
      const end = content.indexOf('\n}', after);
      const classBody = content.slice(after, end === -1 ? undefined : end);
      const host = hostBlock(body);
      components.push({
        file,
        className,
        selector: SELECTOR.exec(body)?.[2] ?? '',
        template: TEMPLATE_URL.exec(body)?.[2] ?? null,
        host: host === null ? new Map() : hostEntries(host),
        inputs: new Set([...classBody.matchAll(INPUT)].map((m) => m[1])),
      });
    }
  }
  return { components, counted };
};

// ── template scanner ───────────────────────────────────────────────────────────

const COMMENT = /<!--[\s\S]*?-->/g;
/** An opening tag with its attribute text; quoted values may hold `>`. */
const OPENING_TAG = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
/** The same tags counted without parsing, as the denominator of the parse. */
const FOCUSABLE_COUNTER = /<(?:a|button|input|select|textarea)(?=[\s/>])/gi;
const ATTRIBUTE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const FOCUSABLE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea']);

const attributesOf = (text) => {
  const attrs = new Map();
  for (const m of text.matchAll(ATTRIBUTE))
    attrs.set(m[1], m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
};

/**
 * Focusable — that is, an element the user can land on, and therefore one whose accessible
 * name is announced. A link without an address is not focusable, nor is a hidden input; a
 * `tabindex` makes anything focusable, which is how a role written onto a `div` becomes a
 * widget.
 */
const isFocusable = (tag, attrs) => {
  if (
    attrs.has('tabindex') ||
    attrs.has('[tabindex]') ||
    attrs.has('[attr.tabindex]')
  )
    return true;
  if (!FOCUSABLE_TAGS.has(tag)) return false;
  if (tag === 'a')
    return attrs.has('href') || attrs.has('[href]') || attrs.has('[attr.href]');
  if (tag === 'input') return attrs.get('type') !== 'hidden';
  return true;
};

const readTemplate = (content) => {
  const text = content.replace(COMMENT, '');
  const tags = [...text.matchAll(OPENING_TAG)].map((m) => ({
    tag: m[1].toLowerCase(),
    attrs: attributesOf(m[2]),
  }));
  return {
    focusable: tags.filter((t) => isFocusable(t.tag, t.attrs)),
    parsed: tags.filter((t) => FOCUSABLE_TAGS.has(t.tag)).length,
    counted: countOf(text, FOCUSABLE_COUNTER),
  };
};

// ── documentation ──────────────────────────────────────────────────────────────

const SELECTOR_LINE = /^\*\*Selector:\*\*(.*)$/m;
/** The selectors a card claims, as whole tokens: `pct-radio` is a part of `pct-radio-group`. */
const cardSelectors = (content) =>
  new Set(
    (SELECTOR_LINE.exec(content)?.[1] ?? '')
      .split(/[^A-Za-z0-9[\]-]+/)
      .filter(Boolean),
  );

// ── the check ──────────────────────────────────────────────────────────────────

class AriaError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

const checkAria = ({ components, counted, templates, documents }) => {
  // ── 1. denominator ───────────────────────────────────────────────────────────
  if (components.length !== counted)
    throw new AriaError(
      'denominator',
      `${counted} component decorators in the sources, ${components.length} parsed — a ` +
        `decorator written some other way leaves a whole component unexamined, and the ` +
        `gate would report on the rest as though on all of them (lesson-48)`,
    );

  const byPath = new Map(templates.map((t) => [t.file, t]));
  const owned = new Set();
  for (const component of components) {
    if (component.template === null) continue;
    const path = join(dirname(component.file), component.template).replaceAll(
      '\\',
      '/',
    );
    if (!byPath.has(path))
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) names the template \`${path}\`, and it ` +
          `is not among the files read — the component would pass every point below on an ` +
          `empty template`,
      );
    component.templatePath = path;
    owned.add(path);
  }

  const orphans = templates.map((t) => t.file).filter((f) => !owned.has(f));
  if (orphans.length)
    throw new AriaError(
      'denominator',
      `${orphans.length} template(s) belong to no component decorator — a template nothing ` +
        `owns is a template nothing reads:\n${list(orphans)}`,
    );

  for (const template of templates) {
    const read = readTemplate(template.content);
    if (read.parsed !== read.counted)
      throw new AriaError(
        'denominator',
        `${template.file}: ${read.counted} focusable tag(s) in the text, ${read.parsed} ` +
          `parsed — an unbalanced quote swallows the rest of the file, and every element ` +
          `after it stops being examined`,
      );
    byPath.get(template.file).read = read;
  }

  // ── classification ───────────────────────────────────────────────────────────
  // The host carries the widget when the selector puts the component on a natively focusable
  // element, or when the host block declares a role of its own. Only then does a consumer's
  // `aria-label`, written on the tag, reach the thing it names.
  for (const component of components) {
    const tags = hostTags(component.selector);
    component.hostIsWidget =
      (tags.length > 0 && tags.every((t) => FOCUSABLE_TAGS.has(t))) ||
      component.host.has('role') ||
      component.host.has('[attr.role]');
    component.widgets =
      (component.templatePath && byPath.get(component.templatePath).read
        ? byPath.get(component.templatePath).read.focusable
        : []) ?? [];
    component.needsName =
      !component.hostIsWidget && component.widgets.length > 0;
  }

  // ── 2. an ARIA name in a host block ──────────────────────────────────────────
  for (const component of components) {
    const written = HOST_NAME_KEYS.filter((key) => component.host.has(key));
    if (written.length && !component.hostIsWidget)
      throw new AriaError(
        'host',
        `${component.className} (${component.file}) writes ${written.join(', ')} into its ` +
          `host block, and the host carries no role — ARIA prohibits a name on a generic ` +
          `element, so it is read by nobody. Put it on the element that has the role`,
      );
  }

  const naming = components.filter((c) => c.needsName);

  // ── 3. the inputs exist ──────────────────────────────────────────────────────
  for (const component of naming) {
    const missing = NAME_INPUTS.filter((name) => !component.inputs.has(name));
    if (missing.length)
      throw new AriaError(
        'inputs',
        `${component.className} (${component.file}) keeps its widget inside the template ` +
          `and declares no ${missing.join(' / ')} — a consumer's \`aria-label\` lands on the ` +
          `roleless host, so with this missing the control cannot be named at all`,
      );
  }

  // ── 4. and they are forwarded ────────────────────────────────────────────────
  for (const component of naming) {
    const carriers = component.widgets.filter((widget) =>
      NAME_ATTRIBUTES.every((attribute, i) =>
        (widget.attrs.get(attribute) ?? '').includes(`${NAME_INPUTS[i]}(`),
      ),
    );
    if (carriers.length !== 1)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ${carriers.length} of the ` +
          `${component.widgets.length} focusable element(s) bind both ` +
          `${NAME_ATTRIBUTES.join(' and ')} to the inputs, and exactly one has to — ` +
          `${carriers.length === 0 ? 'an input read by nobody names nothing' : 'two named elements are two names for one control'}`,
      );
  }

  // ── 5. the card says so ──────────────────────────────────────────────────────
  for (const component of naming) {
    const cards = documents.filter((d) => d.selectors.has(component.selector));
    if (cards.length !== 1)
      throw new AriaError(
        'surface',
        `${cards.length} card(s) in ${DOCUMENTS}/ name the selector \`${component.selector}\` ` +
          `and exactly one has to — a public input whose page nobody can find is an input ` +
          `nobody uses`,
      );
    const missing = NAME_INPUTS.filter(
      (name) => !cards[0].content.includes(name),
    );
    if (missing.length)
      throw new AriaError(
        'surface',
        `${cards[0].file} is silent about ${missing.join(' / ')} of \`${component.selector}\` ` +
          `— the input exists and the one page a consumer reads does not mention it`,
      );
  }

  return {
    description:
      `${components.length} components, ${naming.length} of them naming a widget of their ` +
      `own (${sorted(naming.map((c) => c.selector)).join(', ')})`,
  };
};

// ── input ──────────────────────────────────────────────────────────────────────

const isSource = (p) =>
  p.startsWith(`${PROJECT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const isTemplate = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');
const isCard = (p) =>
  p.startsWith(`${DOCUMENTS}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

const read = (root, path) => readFileSync(join(root, path), 'utf8');

const collectInput = (root, files) => ({
  ...readSources(root, files.filter(isSource)),
  templates: files
    .filter(isTemplate)
    .map((file) => ({ file, content: read(root, file) })),
  documents: files.filter(isCard).map((file) => {
    const content = read(root, file);
    return { file, content, selectors: cardSelectors(content) };
  }),
});

/**
 * Files from the GIT INDEX rather than from a glob over the disk — the same reason as in
 * `check-parts` and `check-styles`: the index is an independent record of what the
 * repository really carries, and an untracked template is not part of the library.
 */
const repoFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT, DOCUMENTS], {
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
 * extension only here. A `.ts` file under `tools/` belongs to no compiler program, so it
 * would fire `check-typecheck`; and one of the templates carries a malformed tag by design,
 * which prettier refuses outright — `nx format:check` would fail on the very file that
 * proves this gate can fail. **One gate's fixture must not be another's defect.**
 */
const buildFixture = (name) => {
  const target = mkdtempSync(join(tmpdir(), 'pct-check-aria-'));
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
    globSync('**/*.{ts,html,md}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ────────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkAria(collectInput(ROOT, repoFiles())).description;
} catch (error) {
  if (!(error instanceof AriaError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-aria.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false.
{
  const directory = buildFixture(REFERENCE);
  try {
    checkAria(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof AriaError)) throw error;
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
    checkAria(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
        `(\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof AriaError)) throw error;
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
  console.error(`X Accessible-name gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ ARIA names: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
