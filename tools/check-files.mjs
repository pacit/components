#!/usr/bin/env node
/**
 * File-structure gate: `req-project-files` — the layout of an entrypoint is FIXED, and the
 * template and the stylesheet of a component always stand in files of their own
 * ([0001](../docs/decisions/0001-separate-files.md)). The rule is a deliberate departure
 * from Angular's own guidance ("prefer inline templates for smaller components"), taken
 * because in a library of dozens of components the cost of inconsistency grows faster than
 * the cost of one more file — and a departure nothing measures is a convention, which is to
 * say a thing that holds until somebody is in a hurry.
 *
 *  1. DENOMINATOR: entrypoints, sources, declarations and the register are all there to be
 *     ruled on, and every `@Component(` in the sources reached the parser,
 *  2. ENTRYPOINT: a directory of sources is an entrypoint, and an entrypoint has an index,
 *  3. COMPONENT ENTRYPOINT: one that declares a component carries the two files named after
 *     it — `button/src/button.ts` and `button/src/button.spec.ts`,
 *  4. TEMPLATE: no component keeps its template in the decorator,
 *  5. STYLES: no component keeps its styles in the decorator,
 *  6. SIBLING: the file it names stands next to it, under the extension it promises, and the
 *     repository really carries it,
 *  7. ORPHAN: every template and stylesheet is named by a declaration,
 *  8. TYPES: a `*.types.ts` is exported by the index of its entrypoint,
 *  9. REGISTER: every excuse in `libs/components/files.policy.json` names a declaration,
 *     carries a reason, and is still needed.
 *
 * WHAT THE DENOMINATOR IS, and why it is two denominators. The layout points (2, 3, 8) run
 * over ENTRYPOINTS, because `index.ts` and `ng-package.json` are an entrypoint's files and
 * there is exactly one of each per directory. The template and stylesheet points (4 to 7)
 * run over `@Component` DECLARATIONS, because an entrypoint is not a component: `breadcrumb/`
 * declares three of them in one source file and `core/` declares none at all. A rule written
 * per entrypoint would have to demand a `.html` of `core/`, and would be excused on the day
 * it was written; a rule written per declaration asks each component the same question.
 *
 * WHAT THIS GATE DOES NOT MEASURE. The promise names `button.types.ts` among a component's
 * files, and the repository does not keep that half: 18 of its 30 component entrypoints have
 * no `*.types.ts` at all, and 13 of them export a public type from the component's own source
 * instead. A point demanding one would therefore be red on the day it was written, which is
 * not a gate but a plan — so point 8 measures what a types file must do ONCE IT EXISTS, and
 * the disagreement between the promise and the tree is written down (in the requirement and
 * in the fixtures README) rather than papered over with eighteen excuses.
 *
 * Usage: node tools/check-files.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const POLICY = `${PROJECT}/files.policy.json`;
const FIXTURES = join(ROOT, 'tools/check-files.fixtures');
const REFERENCE = '_reference';

/**
 * The floor under a reason in the register. The same number as in `check-mutation` and for
 * the same argument: without one an entry says "this component keeps its template in the
 * decorator", which is what the decorator says anyway. The reason is the whole entry.
 */
const MIN_REASON = 40;

/**
 * The parser's anchor and the counter that does NOT repeat it. A decorator is read on the
 * formatting `nx format:check` enforces (`@Component({` and `})` in column zero), so a
 * declaration written otherwise drops out of the parse — and the only thing that can notice
 * is a second count taken differently. The counter allows indentation, which is what makes
 * the pair meaningful: repeating the anchor would put out the parser and the counter at once
 * and the gate would agree with itself about a library it had stopped reading
 * ([`lesson-48`](../docs/lessons.md#lesson-48), the same pair as in `check-styles`).
 *
 * A `@Component(` inside a JSDoc example — `core/src/texts.ts` and `icon/src/icon.ts` both
 * carry one — is filtered by the counter's own anchor: on such a line the asterisk of the
 * comment stands between the indentation and the `@`.
 */
const DECLARATION =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DECLARATION_COUNT = /^[ \t]*@Component\(/gm;

/** `templateUrl: './button.html'` — one string, and the decorator admits no array form. */
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/g;

/** `styleUrl: './button.scss'` or `styleUrls: ['./a.scss', './b.scss']` — both are Angular's. */
const STYLE_URLS = /styleUrls?\s*:\s*(?:\[([^\]]*)\]|(['"])([^'"]*)\2)/g;

/** The decorator's own members. `template\s*:` cannot match `templateUrl:` — the `U` is in the way. */
const INLINE_TEMPLATE = /^\s*template\s*:/m;
const INLINE_STYLES = /^\s*styles\s*:/m;

/** A path that can be predicted without opening the directory: `./name.ext`, and nothing else. */
const SIBLING = /^\.\/[^/]+$/;

/** `libs/components/button/src/…` and `libs/components/src/…` — the two shapes of a source root. */
const SOURCE_ROOT = new RegExp(`^(${PROJECT}/(?:[^/]+/)?src)/`);
const MANIFEST = new RegExp(`^${PROJECT}/(?:[^/]+/)?ng-package\\.json$`);

const list = (entries) => entries.map((e) => `      ${e}`).join('\n');

/**
 * A violation of one of the nine points. It carries the point's name and the rule under it,
 * not only the message: the negative control has to verify that a prepared input fired ON ITS
 * OWN point and its own rule — an input failing for another reason proves something other
 * than what it declares.
 */
class FilesError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

// ── reading a tree ────────────────────────────────────────────────────────────

/** The line a match starts on, so every message can send a person to a place. */
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** The quoted strings of a `styleUrls: [...]` array, or the single string of a `styleUrl:`. */
const styleUrlsOf = (body) =>
  [...body.matchAll(STYLE_URLS)].flatMap(([, array, , single]) =>
    single !== undefined
      ? [single]
      : [...array.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]),
  );

/**
 * The `@Component` declarations of one source file. A file may hold several — `breadcrumb.ts`
 * holds three — so the unit here is the declaration and its class name, not the file.
 */
const declarationsOf = (file, text) => {
  const found = [];
  for (const match of text.matchAll(DECLARATION)) {
    const [, body, className] = match;
    found.push({
      file,
      className,
      line: lineOf(text, match.index),
      templates: [...body.matchAll(TEMPLATE_URL)].map((m) => m[2]),
      sheets: styleUrlsOf(body),
      inlineTemplate: INLINE_TEMPLATE.test(body),
      inlineStyles: INLINE_STYLES.test(body),
    });
  }
  return found;
};

/**
 * The register, read defensively. Every shape it can arrive in that this gate cannot rule on
 * comes back as `{ error }` and becomes a message from point 1 — a malformed policy file is a
 * sentence a person acts on, never a `TypeError` two hundred lines further down.
 *
 * It is read from the DISK and not from the file list, unlike everything else here. That is the
 * same division the sibling gates keep — the index says which files the repository carries, the
 * disk says what is in them — and it leaves one narrow case: a register written and never added
 * to the index passes here and is missing in CI, where this same point reports it. CI is the
 * authority on that question, so the case corrects itself on the first push rather than needing
 * a rule of its own.
 */
const readPolicy = (root) => {
  const path = join(root, POLICY);
  if (!existsSync(path)) return { error: 'the file is not there' };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return {
      error: `it is not readable JSON (${error.message.split('\n')[0]})`,
    };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
    return { error: 'its top level is not an object' };
  if (!Array.isArray(parsed.inline))
    return { error: 'it carries no `inline` array' };
  return { inline: parsed.inline };
};

/**
 * An input built from a list of paths — the same shape for the repository and for a fixture,
 * so the two runs exercise one reader rather than two that agree by hand.
 *
 * `entrypoints` are the directories holding an `ng-package.json`: the package's own at the
 * project root and one per secondary entrypoint. `roots` are the directories that hold
 * sources, derived from the files rather than from the entrypoints — point 2 compares the two
 * lists, and a list derived from the other side would have nothing to say.
 */
const collectInput = (root, files) => {
  const has = new Set(files);
  const entrypoints = files
    .filter((f) => MANIFEST.test(f))
    .map((f) => f.slice(0, f.length - '/ng-package.json'.length))
    .sort();
  const roots = [
    ...new Set(files.map((f) => f.match(SOURCE_ROOT)?.[1]).filter(Boolean)),
  ].sort();
  const inRoots = (f) => roots.some((r) => f.startsWith(`${r}/`));
  const sources = files.filter(
    (f) => inRoots(f) && f.endsWith('.ts') && !f.endsWith('.spec.ts'),
  );
  const assets = files.filter(
    (f) => inRoots(f) && (f.endsWith('.html') || f.endsWith('.scss')),
  );

  let counted = 0;
  const declarations = [];
  for (const file of sources) {
    const text = readFileSync(join(root, file), 'utf8');
    counted += (text.match(DECLARATION_COUNT) ?? []).length;
    declarations.push(...declarationsOf(file, text));
  }

  return {
    has,
    files,
    entrypoints,
    roots,
    sources,
    assets,
    declarations,
    counted,
    policy: readPolicy(root),
    read: (file) => readFileSync(join(root, file), 'utf8'),
  };
};

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input. It throws `FilesError` on the first violated
 * rule — the points run from the most basic one, so a later point would be ruling on material
 * an earlier one has just shown to be missing.
 */
const checkFiles = (input) => {
  denominator(input);
  entrypoint(input);
  componentEntrypoint(input);
  const excused = register(input);
  template(input, excused);
  styles(input, excused);
  const referenced = sibling(input);
  orphan(input, referenced);
  types(input);
  registerEntries(input);

  const components = new Set(
    input.declarations.map((d) => entrypointOf(d.file)),
  );
  return (
    `${input.entrypoints.length} entrypoints (${components.size} declaring a component), ` +
    `${input.declarations.length} declarations over ${input.assets.length} templates and ` +
    `sheets, ${input.policy.inline.length} excused`
  );
};

/** The entrypoint a file belongs to: its source root without the `src` segment. */
const entrypointOf = (file) => {
  const root = file.match(SOURCE_ROOT)?.[1] ?? dirname(file);
  return root.slice(0, root.length - '/src'.length);
};

/**
 * 1. DENOMINATOR — the four kinds of material the later points rule over, and the parse that
 * turns the third of them into declarations. Every one of these has a state in which this
 * gate examines nothing and says so in green: an empty file list is what a git pathspec
 * returns when it is written as a shell glob (`lesson-48`), and a decorator the parser cannot
 * see is a component whose template nobody asked about.
 */
const denominator = ({
  entrypoints,
  roots,
  sources,
  declarations,
  counted,
  policy,
}) => {
  if (!entrypoints.length)
    throw new FilesError(
      'denominator',
      'no-entrypoint',
      `no \`ng-package.json\` found under \`${PROJECT}/\` — the list of entrypoints is the ` +
        `denominator of points 2, 3 and 8, and over an empty one all three pass having ` +
        `examined nothing. Usual cause: the file list stopped returning anything.`,
    );
  if (!roots.length || !sources.length)
    throw new FilesError(
      'denominator',
      'no-source',
      `not one source file under \`${PROJECT}/*/src/\` — there is then no declaration to ` +
        `read, and points 4 to 7 pronounce a library clean without opening it.`,
    );
  if (!declarations.length)
    throw new FilesError(
      'denominator',
      'no-declaration',
      `not one \`@Component\` in ${sources.length} source files — points 4 to 7 are about ` +
        `components, so an empty set of them makes all four silent. Either the parse broke ` +
        `or the sources are not the library's.`,
    );
  if (declarations.length !== counted)
    throw new FilesError(
      'denominator',
      'decorator-unparsed',
      `the parser read ${declarations.length} of ${counted} \`@Component\` decorators — ` +
        `the rest drop out of points 4 to 7 without a trace. Usual cause: a decorator ` +
        `written otherwise than prettier formats it (\`@Component({\` and \`})\` in column ` +
        `zero).`,
    );
  if (policy.error)
    throw new FilesError(
      'denominator',
      'register-unreadable',
      `\`${POLICY}\` cannot be read: ${policy.error}. The register is what points 4 and 5 ` +
        `consult before they fire, so a file they cannot read would either excuse ` +
        `everything or nothing — and neither answer is one anybody chose.`,
    );
};

/**
 * 2. ENTRYPOINT — the two files that make a directory an entrypoint rather than a folder of
 * code. Both directions are checked, and the second is the one worth having: sources with no
 * `ng-package.json` beside them compile, test and lint exactly like the rest of the library
 * and reach no consumer at all, because ng-packagr never learns they are a thing to publish.
 */
const entrypoint = ({ has, entrypoints, roots }) => {
  const unpublished = roots
    .map((root) => root.slice(0, root.length - '/src'.length))
    .filter((dir) => !entrypoints.includes(dir));
  if (unpublished.length)
    throw new FilesError(
      'entrypoint',
      'no-manifest',
      `${unpublished.length} directory(ies) hold sources and no \`ng-package.json\`:\n` +
        list(
          unpublished.map(
            (d) => `${d}/src/ — nothing at \`${d}/ng-package.json\``,
          ),
        ) +
        `\n    The code builds and is tested like every other, and ng-packagr publishes ` +
        `none of it: the consumer has no path to reach it by.`,
    );

  const indexless = entrypoints.filter(
    (dir) => !has.has(`${dir}/src/index.ts`),
  );
  if (indexless.length)
    throw new FilesError(
      'entrypoint',
      'no-index',
      `${indexless.length} entrypoint(s) have no \`src/index.ts\`:\n` +
        list(indexless.map((d) => `${d}/ — nothing at \`${d}/src/index.ts\``)) +
        `\n    The index is the entrypoint's public surface and the one file a consumer's ` +
        `import resolves to; without it the directory is a manifest pointing at nothing.`,
    );
};

/**
 * 3. COMPONENT ENTRYPOINT — the eponymous pair. An entrypoint that declares a component is
 * named after that component, so `button/src/button.ts` and `button/src/button.spec.ts` can
 * be opened without listing the directory first — which is the consequence decision 0001
 * claims for the whole rule.
 *
 * The package's own entrypoint is skipped, and not as a courtesy: `libs/components/` is named
 * after the package rather than after a component, so `src/components.ts` would be a file
 * named for nothing. The plain entrypoints — `core`, `testing`, `theme`, `regions` — are
 * skipped by the rule's own denominator, because they declare no component.
 */
const componentEntrypoint = ({ has, declarations }) => {
  const dirs = [
    ...new Set(declarations.map((d) => entrypointOf(d.file))),
  ].sort();
  for (const [rule, suffix, what] of [
    ['no-eponymous-source', '.ts', 'the source that declares it'],
    ['no-eponymous-spec', '.spec.ts', 'the spec that exercises it'],
  ]) {
    const missing = dirs
      .filter((dir) => dir !== PROJECT)
      .map((dir) => ({ dir, want: `${dir}/src/${basename(dir)}${suffix}` }))
      .filter(({ want }) => !has.has(want));
    if (missing.length)
      throw new FilesError(
        'component-entrypoint',
        rule,
        `${missing.length} entrypoint(s) declare a component and carry no file named ` +
          `after the entrypoint:\n` +
          list(missing.map(({ want }) => `nothing at \`${want}\``)) +
          `\n    The name of an entrypoint is the name of ${what}: a consumer importing ` +
          `\`@pacit/components/${basename(missing[0].dir)}\` and a maintainer opening the ` +
          `directory are to find the same word.`,
      );
  }
};

/**
 * 4. TEMPLATE — the template comes from a file. This is the rule the requirement names as its
 * control, and the one Angular's own guidance argues against; the argument for it is in
 * decision 0001 and is about scale, not taste.
 *
 * An excused declaration is one standing in the register; whether that excuse is worth
 * anything is point 9's business, so that a register gone stale reads as a defect of the
 * register rather than as a component quietly losing its file.
 */
const template = ({ declarations }, excused) => {
  const inline = declarations.filter(
    (d) =>
      d.inlineTemplate &&
      !excused.has(`${d.file}\u0000${d.className}\u0000template`),
  );
  if (inline.length)
    throw new FilesError(
      'template',
      'inline-template',
      `${inline.length} component(s) keep the template in the decorator:\n` +
        list(
          inline.map(
            (d) => `${d.file}:${d.line} — ${d.className} has \`template:\``,
          ),
        ) +
        `\n    Template and styles always stand in files of their own (decision 0001). A ` +
        `component that genuinely cannot — one whose host IS the element, so its template ` +
        `is empty — goes into \`${POLICY}\` with a reason.`,
    );

  const templateless = declarations.filter(
    (d) => !d.inlineTemplate && !d.templates.length,
  );
  if (templateless.length)
    throw new FilesError(
      'template',
      'no-template',
      `${templateless.length} component(s) name no template at all:\n` +
        list(
          templateless.map(
            (d) =>
              `${d.file}:${d.line} — ${d.className} has neither \`templateUrl\` nor \`template\``,
          ),
        ) +
        `\n    This is the point's own denominator: a declaration whose \`templateUrl\` ` +
        `this gate failed to read looks exactly like one that obeys the rule, and point 6 ` +
        `then has no path to check.`,
    );
};

/** 5. STYLES — the same rule for the stylesheet, and the same two directions. */
const styles = ({ declarations }, excused) => {
  const inline = declarations.filter(
    (d) =>
      d.inlineStyles &&
      !excused.has(`${d.file}\u0000${d.className}\u0000styles`),
  );
  if (inline.length)
    throw new FilesError(
      'styles',
      'inline-styles',
      `${inline.length} component(s) keep the styles in the decorator:\n` +
        list(
          inline.map(
            (d) => `${d.file}:${d.line} — ${d.className} has \`styles:\``,
          ),
        ) +
        `\n    Styles in a decorator are not SCSS: they fall outside every rule the ` +
        `stylesheets are held to — logical properties, forced colours, the motion axis — ` +
        `and \`check-styles\` reports them clean because it reads sheets, not decorators.`,
    );

  const sheetless = declarations.filter(
    (d) => !d.inlineStyles && !d.sheets.length,
  );
  if (sheetless.length)
    throw new FilesError(
      'styles',
      'no-styles',
      `${sheetless.length} component(s) name no stylesheet at all:\n` +
        list(
          sheetless.map(
            (d) =>
              `${d.file}:${d.line} — ${d.className} has neither \`styleUrl\` nor \`styles\``,
          ),
        ) +
        `\n    A component of this library paints the box it draws — its own spacing, its ` +
        `own focus ring — so a declaration with no sheet is far more often a sheet this ` +
        `gate could not read than a component that needs none.`,
    );
};

/**
 * 6. SIBLING — what the declaration names is where the reader will look for it. Three rules,
 * run one after the other so that each message lists every case of ITS OWN kind: the shape of
 * the path, the extension it promises, and whether the repository carries the file.
 *
 * Returns the set of paths the declarations point at — the other half of point 7.
 */
const sibling = ({ has, declarations }) => {
  const all = declarations.flatMap((d) => [
    ...d.templates.map((url) => ({
      d,
      url,
      kind: 'templateUrl',
      extension: '.html',
    })),
    ...d.sheets.map((url) => ({
      d,
      url,
      kind: 'styleUrl',
      extension: '.scss',
    })),
  ]);

  const crossing = all.filter(({ url }) => !SIBLING.test(url));
  if (crossing.length)
    throw new FilesError(
      'sibling',
      'not-a-sibling',
      `${crossing.length} reference(s) leave the declaration's own directory:\n` +
        list(
          crossing.map(
            ({ d, url, kind }) =>
              `${d.file}:${d.line} — ${d.className} names \`${kind}: '${url}'\``,
          ),
        ) +
        `\n    The whole of decision 0001's payoff is that the path to a component's ` +
        `artefacts can be predicted without opening the directory. \`./name.ext\`, and ` +
        `nothing else.`,
    );

  const mistyped = all.filter(({ url, extension }) => !url.endsWith(extension));
  if (mistyped.length)
    throw new FilesError(
      'sibling',
      'wrong-extension',
      `${mistyped.length} reference(s) promise one kind of file and name another:\n` +
        list(
          mistyped.map(
            ({ d, url, kind, extension }) =>
              `${d.file}:${d.line} — ${d.className} names \`${kind}: '${url}'\`, and \`${extension}\` was expected`,
          ),
        ) +
        `\n    A component's styles are an SCSS file so that they fall under the same lint ` +
        `rules as every other sheet (decision 0001); a \`.css\` beside them compiles and is ` +
        `read by nothing.`,
    );

  const referenced = new Set(
    all.map(({ d, url }) => `${dirname(d.file)}/${url.slice('./'.length)}`),
  );
  const missing = all
    .map(({ d, url, kind }) => ({
      d,
      url,
      kind,
      path: `${dirname(d.file)}/${url.slice('./'.length)}`,
    }))
    .filter(({ path }) => !has.has(path));
  if (missing.length)
    throw new FilesError(
      'sibling',
      'missing-file',
      `${missing.length} reference(s) point at a file the repository does not carry:\n` +
        list(
          missing.map(
            ({ d, url, kind, path }) =>
              `${d.file}:${d.line} — ${d.className} names \`${kind}: '${url}'\`, and \`${path}\` is not in the git index`,
          ),
        ) +
        `\n    A file present on disk and absent from the index is the same defect in its ` +
        `quiet form: it builds here and nowhere else.`,
    );

  return referenced;
};

/**
 * 7. ORPHAN — the other direction. A rename moves the declaration and leaves the old template
 * behind, and nothing in the toolchain minds: the file compiles for nobody, ships in no
 * package and reads like a component's template to the next person who opens the directory.
 */
const orphan = ({ assets }, referenced) => {
  const unclaimed = assets.filter((a) => !referenced.has(a));
  if (unclaimed.length)
    throw new FilesError(
      'orphan',
      null,
      `${unclaimed.length} template(s) or stylesheet(s) no declaration names:\n` +
        list(unclaimed) +
        `\n    Nothing compiles them and nothing ships them, so nothing reports them ` +
        `either — and the next reader takes them for a component's files. Usual cause: a ` +
        `rename that moved the decorator and left the file.`,
    );
};

/**
 * 8. TYPES — a `*.types.ts` is exported by the index of its entrypoint. A types file the
 * index passes over is the one arrangement here that looks finished from every side: the
 * types are written, they compile, the library uses them internally — and the consumer,
 * who can only see what the index re-exports, cannot name a single one of them.
 *
 * That every component HAS such a file is the half of the promise this gate does not measure;
 * the reason is in the header, and the count is in the requirement.
 */
const types = ({ has, sources, read }) => {
  const typeFiles = sources.filter((f) => f.endsWith('.types.ts'));
  const unexported = [];
  for (const file of typeFiles) {
    const index = `${entrypointOf(file)}/src/index.ts`;
    // A missing index is point 2's finding, and reporting it again here would be a second
    // voice on one defect.
    if (!has.has(index)) continue;
    const module = basename(file, '.ts').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`from\\s*'\\./${module}'`).test(read(index)))
      unexported.push({ file, index });
  }
  if (unexported.length)
    throw new FilesError(
      'types',
      null,
      `${unexported.length} types file(s) are not exported by their entrypoint's index:\n` +
        list(
          unexported.map(
            ({ file, index }) =>
              `${file} — \`${index}\` names no \`./${basename(file, '.ts')}\``,
          ),
        ) +
        `\n    The types compile, the library uses them, and the consumer cannot name one ` +
        `of them: the index is the whole of what an entrypoint exports.`,
    );
};

/**
 * The register, as the pair of points that read it needs it: a set of `file | class | member`
 * keys. Read before points 4 and 5 so that they can consult it, audited after them by point 9
 * — that split is deliberate and is `check-mutation`'s: an entry excuses on its PRESENCE, and
 * whether it deserves to exist is a finding about the register rather than about the code.
 */
const register = ({ policy }) =>
  new Set(
    policy.inline.map(
      (e) => `${e?.file ?? ''}\u0000${e?.class ?? ''}\u0000${e?.member ?? ''}`,
    ),
  );

/**
 * 9. REGISTER — an excuse names a declaration that exists, carries a reason, and is still
 * needed. The third rule is the one that keeps a register honest: an entry whose component
 * has since moved its template into a file goes on reading as though something here were
 * still an exception, and the next person writes their own entry beside it.
 */
const registerEntries = ({ declarations, policy }) => {
  const byKey = new Map(
    declarations.map((d) => [`${d.file}\u0000${d.className}`, d]),
  );
  const entries = policy.inline.map((entry, index) => ({
    index,
    file: typeof entry?.file === 'string' ? entry.file : null,
    className: typeof entry?.class === 'string' ? entry.class : null,
    member:
      entry?.member === 'styles'
        ? 'styles'
        : entry?.member === 'template'
          ? 'template'
          : null,
    reason: typeof entry?.reason === 'string' ? entry.reason : '',
    declaration: byKey.get(`${entry?.file}\u0000${entry?.class}`) ?? null,
  }));

  const phantom = entries.filter((e) => !e.declaration || !e.member);
  if (phantom.length)
    throw new FilesError(
      'register',
      'entry-without-declaration',
      `${phantom.length} entry(ies) of \`${POLICY}\` name no declaration this gate read:\n` +
        list(
          phantom.map(
            (e) =>
              `entry ${e.index + 1}: \`${e.className ?? '(no class)'}\` in \`${e.file ?? '(no file)'}\`, member \`${e.member ?? '(neither template nor styles)'}\``,
          ),
        ) +
        `\n    An excuse for something the rule never asks about excuses nothing — and in ` +
        `the register it reads as though it did. A rename leaves exactly this behind.`,
    );

  const unreasoned = entries.filter((e) => e.reason.trim().length < MIN_REASON);
  if (unreasoned.length)
    throw new FilesError(
      'register',
      'entry-without-reason',
      `${unreasoned.length} entry(ies) of \`${POLICY}\` carry no reason:\n` +
        list(
          unreasoned.map(
            (e) =>
              `${e.file}: ${e.className} (${e.reason.trim().length} of ${MIN_REASON} characters)`,
          ),
        ) +
        `\n    Without one the entry says "this component keeps its template in the ` +
        `decorator", which is what the decorator says anyway. The reason is the whole entry.`,
    );

  const unused = entries.filter(
    (e) =>
      !(e.member === 'template'
        ? e.declaration.inlineTemplate
        : e.declaration.inlineStyles),
  );
  if (unused.length)
    throw new FilesError(
      'register',
      'entry-unused',
      `${unused.length} entry(ies) of \`${POLICY}\` excuse something that is not happening:\n` +
        list(
          unused.map(
            (e) =>
              `${e.file}:${e.declaration.line} — ${e.className} has no \`${e.member}:\` in its decorator`,
          ),
        ) +
        `\n    The component was fixed and the excuse stayed. From here on it stands ready ` +
        `to cover the next one silently, and the next person reads the register as the ` +
        `list of what this library tolerates.`,
    );
};

// ── reading the repository ────────────────────────────────────────────────────

/**
 * The project's files from the GIT INDEX, not from a glob over the disk — the same reason as
 * in `check-styles`, `check-parts`, `check-tokens` and `check-typecheck`: the index is an
 * independent record of what the repository really carries, and it leaves out the generated
 * things by itself (`libs/components/themes/` is written by the token build on every run and
 * is gitignored). For point 6 the distinction is the whole point: a template present on disk
 * and absent from the index builds here and nowhere else.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS. A git pathspec is not a shell
 * glob: without `:(glob)` a star crosses `/`, so a pattern with a star can return ZERO files
 * rather than an error, and the gate then measures an empty library in green
 * (`lesson-48`).
 */
const projectFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the reference tree, the case's files on top, the
 * deletions from `fixture.json` last. The case directory then holds NOTHING BUT its own
 * defect, rather than one more copy of a correct library to hunt through.
 *
 * Sources sit in the repository as `*.ts.txt` and become `*.ts` only here — the same move as
 * in `check-styles` and `check-parts`, and for a hard reason: a `.ts` file under `tools/`
 * belongs to no compiler program, so it would fire `check-typecheck` (point 1 — a file with
 * no project). One gate's fixture must not be another's defect. The composition goes to a
 * temporary directory outside the repository, so no gate ever sees the intermediate material.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-files-'));
  cpSync(join(FIXTURES, REFERENCE), destination, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), destination, {
      recursive: true,
      filter: (source) => basename(source) !== 'fixture.json',
    });
  for (const path of fx.drop ?? [])
    rmSync(join(destination, path), { recursive: true, force: true });
  for (const file of globSync('**/*.ts.txt', { cwd: destination }))
    renameSync(
      join(destination, file),
      join(destination, file.replace(/\.txt$/, '')),
    );
  return destination;
};

const fixtureInput = (directory) =>
  collectInput(
    directory,
    globSync('**/*', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .filter((p) => statSync(join(directory, p)).isFile())
      .sort(),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkFiles(collectInput(ROOT, projectFiles()));
} catch (error) {
  if (!(error instanceof FilesError)) throw error;
  problems.push(
    `${error.check}${error.rule ? ` / ${error.rule}` : ''}: ${error.message}`,
  );
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== REFERENCE)
  .map((entry) => entry.name)
  .sort();

if (!cases.length)
  problems.push(
    `tools/check-files.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference tree MUST pass. Were it defective itself, every case would fire because of it
// rather than because of its own defect, and every "rejected" would be false — this control
// would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkFiles(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof FilesError)) throw error;
    problems.push(
      `${REFERENCE}: the reference tree does NOT pass (${error.check}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  let fx;
  try {
    fx = JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));
  } catch (error) {
    problems.push(
      `${name}: \`fixture.json\` cannot be read (${error.message.split('\n')[0]}) — a case ` +
        `that declares nothing proves nothing`,
    );
    continue;
  }
  const directory = buildFixture(name, fx);
  try {
    checkFiles(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof FilesError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
    else if ((fx.rule ?? null) !== (error.rule ?? null))
      problems.push(
        `${name}: point ${fx.point} fired on rule \`${error.rule ?? '—'}\` and the case is ` +
          `built for \`${fx.rule ?? '—'}\` — one point, several rules, and the one this ` +
          `input exists to prove is the one that stayed silent`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X File-structure gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Files: ${description}. Negative control: the reference tree passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
