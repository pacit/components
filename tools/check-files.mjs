#!/usr/bin/env node
/**
 * File-structure gate: `req-project-files` — the layout of an entrypoint is FIXED, and the
 * template and the stylesheet of a component always stand in files of their own. A departure
 * nothing measures is only a convention ([0001](../docs/decisions/0001-separate-files.md)).
 *
 *  1. DENOMINATOR: entrypoints, sources, declarations, types, register, every decorator parsed,
 *  2. ENTRYPOINT: a directory of sources is an entrypoint, and an entrypoint has an index,
 *  3. COMPONENT ENTRYPOINT: one declaring a component carries `button.ts` and `button.spec.ts`,
 *  4. TEMPLATE: no component keeps its template in the decorator,
 *  5. STYLES: no component keeps its styles in the decorator,
 *  6. SIBLING: the file a declaration names stands beside it, under the extension it promises,
 *  7. ORPHAN: every template and stylesheet is named by a declaration,
 *  8. TYPES: a `*.types.ts` is exported by the index of its entrypoint,
 *  9. REGISTER: an excuse in `libs/components/files.policy.json` says what and why, and is used,
 * 10. INDEX: a type a source of an entrypoint exports is named by that entrypoint's index.
 *
 * Two denominators, not one: the layout points (2, 3, 8, 10) rule over ENTRYPOINTS, the template
 * and stylesheet points (4 to 7) over `@Component` DECLARATIONS — a per-entrypoint rule would
 * demand a `.html` of `core/`. Point 8 stays beside 10: it also sees a types file with no type.
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

/**
 * An exported TYPE declaration — `type`, `interface`, `enum`. Read at the same column-zero
 * anchor as the decorator and for the same reason: `nx format:check` puts a top-level
 * declaration there, so the anchor is a fact about the tree rather than a hope about it. What
 * it cannot see it does not count either: a type declared without `export` and let out further
 * down the file by `export { type X };` is a name this pattern never reads, and point 10 never
 * asks the index about it.
 *
 * A class is deliberately outside the numerator, though a class is a type as well as a value.
 * A class the index passes over is a component nobody can import, and that shows itself the
 * moment anybody tries — the demo does not compile, the harness resolves nothing. A type is
 * the silent half: the library goes on compiling, every spec passes, and the only person who
 * finds out is the consumer, who has no route to the name but the index.
 */
const EXPORTED_TYPE =
  /^export\s+(?:declare\s+)?(?:type|interface|(?:const\s+)?enum)\s+([A-Za-z_$][\w$]*)/gm;

/** `export class X`, `export const x`, `export function x` — what a module lets out as a value. */
const EXPORTED_VALUE =
  /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|const|let|var|function|async\s+function)\s+([A-Za-z_$][\w$]*)/gm;

/** `export { a, b as c };` — a list with no `from`, so the names are the module's own. */
const EXPORT_LIST = /^export\s+(?:type\s+)?\{([^}]*)\}\s*;/gm;

/**
 * A re-export, in the shapes this library writes: `export * from './x'`, `export { a } from
 * './x'` and `export type { A } from './x'`. `export * as ns from './x'` matches too and is
 * deliberately NOT followed — see `surfaceOf`, where an edge the walk cannot read leaves the
 * index's surface open instead of quietly short.
 */
const RE_EXPORT =
  /^export\s+(?:type\s+)?(\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s*from\s*(['"])([^'"]+)\2/gm;

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
 * The names a list of specifiers lets out: `a`, `a as b`, `type a as b`. BOTH sides of an `as`
 * are kept, and deliberately: point 10 asks whether the consumer can name a declaration at all,
 * and a type re-exported under an alias is one they can name — under the alias. Keeping only
 * the alias would report the declaration missing; keeping only the local name would miss the
 * name they actually write.
 */
const specifiers = (list) =>
  list
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean)
    .flatMap((s) => s.split(/\s+as\s+/));

/**
 * What one module exports, as points 9 and 10 need it: the types it declares — each with the
 * line it stands on, so a message can send a person to a place — every name it lets out under
 * its own roof, and its re-export edges, which are the only way the names of one module reach
 * the index of another.
 */
const exportsOf = (file, text) => ({
  types: [...text.matchAll(EXPORTED_TYPE)].map((match) => ({
    file,
    name: match[1],
    line: lineOf(text, match.index),
  })),
  names: new Set([
    ...[...text.matchAll(EXPORTED_TYPE)].map((m) => m[1]),
    ...[...text.matchAll(EXPORTED_VALUE)].map((m) => m[1]),
    ...[...text.matchAll(EXPORT_LIST)].flatMap((m) => specifiers(m[1])),
  ]),
  edges: [...text.matchAll(RE_EXPORT)].map((match) => ({
    clause: match[1].replace(/\s+/g, ' '),
    star: match[1].startsWith('*'),
    namespace: /^\*\s+as\s/.test(match[1]),
    names: match[1].startsWith('*') ? [] : specifiers(match[1].slice(1, -1)),
    from: match[3],
    line: lineOf(text, match.index),
  })),
});

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
  // Both lists are required, and the missing one is a failure rather than an empty set: a
  // register that has lost half of itself excuses nothing, so the run that follows measures a
  // library nobody wrote — loud here, and a page of findings about untouched code further down.
  if (!Array.isArray(parsed.internal))
    return { error: 'it carries no `internal` array' };
  return { inline: parsed.inline, internal: parsed.internal };
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
  const modules = new Map();
  const exportedTypes = [];
  for (const file of sources) {
    const text = readFileSync(join(root, file), 'utf8');
    counted += (text.match(DECLARATION_COUNT) ?? []).length;
    declarations.push(...declarationsOf(file, text));
    const exported = exportsOf(file, text);
    modules.set(file, exported);
    exportedTypes.push(...exported.types);
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
    modules,
    exportedTypes,
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
  template(input, excused.members);
  styles(input, excused.members);
  const referenced = sibling(input);
  orphan(input, referenced);
  types(input);
  const surfaces = indexSurfaces(input);
  registerEntries(input, surfaces);
  indexExports(input, surfaces, excused.types);

  const components = new Set(
    input.declarations.map((d) => entrypointOf(d.file)),
  );
  return (
    `${input.entrypoints.length} entrypoints (${components.size} declaring a component), ` +
    `${input.declarations.length} declarations over ${input.assets.length} templates and ` +
    `sheets, ${input.exportedTypes.length} exported types, ` +
    `${input.policy.inline.length + input.policy.internal.length} excused`
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
  exportedTypes,
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
  if (!exportedTypes.length)
    throw new FilesError(
      'denominator',
      'no-exported-type',
      `not one exported \`type\`, \`interface\` or \`enum\` in ${sources.length} source ` +
        `files — point 10 then holds every index of the library to an empty list of names ` +
        `and passes. This library publishes 80-odd types, so the answer is a pattern that ` +
        `has stopped reading them, not a library that has stopped declaring them.`,
    );
  if (policy.error)
    throw new FilesError(
      'denominator',
      'register-unreadable',
      `\`${POLICY}\` cannot be read: ${policy.error}. The register is what points 4, 5 and ` +
        `10 consult before they fire, so a file they cannot read would either excuse ` +
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
 * the reason and the count are both in `req-project-files`.
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

/** `'./button.types'` read from an index, as a source file this gate really has in hand. */
const resolveModule = (modules, from, spec) => {
  if (!spec.startsWith('.')) return null;
  const path = join(dirname(from), spec).split('\\').join('/');
  return [`${path}.ts`, `${path}/index.ts`].find((c) => modules.has(c)) ?? null;
};

/**
 * What one index really exports, followed through the entrypoint's own re-exports — because
 * `export * from './button'` hands on every name of `button.ts`, and a walk that stopped at the
 * index would call all of them missing.
 *
 * The set is complete only where the walk can read every edge it meets. One it cannot — a
 * package specifier, `export * as ns from`, a relative path to no source in this tree — hands
 * on a list of names this gate has never seen, and the set is then OPEN: it can still say that
 * a name IS exported, and it can no longer say that one is not. Those edges come back as
 * `opaque` and are point 10's first rule. The alternative is the failure this repository is
 * named after: a point that has quietly stopped measuring an entrypoint and reports it green.
 */
const surfaceOf = (
  modules,
  file,
  names = new Set(),
  opaque = [],
  seen = new Set(),
) => {
  if (seen.has(file)) return { names, opaque };
  seen.add(file);
  const module = modules.get(file);
  for (const name of module.names) names.add(name);
  for (const edge of module.edges) {
    if (!edge.star) {
      for (const name of edge.names) names.add(name);
      continue;
    }
    const target = edge.namespace
      ? null
      : resolveModule(modules, file, edge.from);
    if (!target) {
      opaque.push({ file, edge });
      continue;
    }
    surfaceOf(modules, target, names, opaque, seen);
  }
  return { names, opaque };
};

/**
 * The surface of every entrypoint that has one, by entrypoint directory. An entrypoint with no
 * `src/index.ts` is left out rather than reported: that is point 2's finding, and a second
 * voice on one defect is how a gate starts being read for the noise it makes.
 */
const indexSurfaces = ({ entrypoints, modules }) =>
  new Map(
    entrypoints
      // The index this gate has READ, not merely one the file list mentions: the walk below
      // needs the module in hand, and the two lists can only disagree if the reader upstream
      // has changed under it.
      .filter((dir) => modules.has(`${dir}/src/index.ts`))
      .map((dir) => [dir, surfaceOf(modules, `${dir}/src/index.ts`)]),
  );

/**
 * 10. INDEX — a type a source of an entrypoint exports is a type that entrypoint's index
 * exports too. This is the narrowed promise of `req-project-files`, on the axis that pays: not
 * WHICH file a type stands in, but whether a consumer can name it at all.
 *
 * The defect it fires on has no other symptom. A `PctButtonVariant` that `button/src/index.ts` never
 * re-exports resolves perfectly inside the library — the component compiles, the spec passes,
 * the demo renders — and the person outside, holding `@pacit/components/button`, cannot write
 * the variable that receives it, cannot type the wrapper they were going to put around it and
 * cannot say in their own test what they expect back. Nothing in the toolchain is even looking:
 * ng-packagr publishes what the index names and reports nothing about the rest.
 *
 * A type that is deliberately internal — one no public signature carries — goes into the
 * `internal` list of the register with a reason, and point 9 holds that reason to the same
 * floor as every other excuse here.
 */
const indexExports = ({ exportedTypes }, surfaces, excused) => {
  const opaque = [...surfaces.values()].flatMap((surface) => surface.opaque);
  if (opaque.length)
    throw new FilesError(
      'index',
      're-export-not-followed',
      `${opaque.length} re-export(s) reached from an entrypoint's index lead where this ` +
        `gate cannot follow:\n` +
        list(
          opaque.map(
            ({ file, edge }) =>
              `${file}:${edge.line} — \`export ${edge.clause} from '${edge.from}'\` is an edge this walk does not follow`,
          ),
        ) +
        `\n    A star hands on every name of the module it points at, and this walk reads only ` +
        `the sources of the tree under a plain \`export *\`: a package specifier, a namespace ` +
        `re-export or a path to no source here leaves the index's surface open-ended — and over ` +
        `an open set "this type is not exported" is a sentence with no evidence behind it. The ` +
        `entrypoint would stop being measured, and nothing would say so.`,
    );

  const missing = exportedTypes.filter(
    (type) =>
      !excused.has(`${type.file}\u0000${type.name}`) &&
      surfaces.get(entrypointOf(type.file))?.names.has(type.name) === false,
  );
  if (missing.length)
    throw new FilesError(
      'index',
      'type-not-exported',
      `${missing.length} exported type(s) their entrypoint's index does not name:\n` +
        list(
          missing.map(
            ({ file, line, name }) =>
              `${file}:${line} — \`${name}\` is nowhere in \`${entrypointOf(file)}/src/index.ts\``,
          ),
        ) +
        `\n    The index is the whole of what an entrypoint exports, and a type outside it is ` +
        `one the consumer cannot write down: not in a variable, not in a signature of their ` +
        `own, not in a test. The library compiles over it without a word, because inside the ` +
        `entrypoint the name resolves. A type that is meant to stay in goes into the ` +
        `\`internal\` list of \`${POLICY}\` with a reason.`,
    );
};

/**
 * The register, as the points that read it need it: a set of `file | class | member` keys for
 * the inline list and one of `file | type` keys for the internal list. Read before points 4, 5
 * and 10 so that they can consult it, audited by point 9 on its own — that split is deliberate
 * and is `check-mutation`'s: an entry excuses on its PRESENCE, and whether it deserves to exist
 * is a finding about the register rather than about the code.
 */
const register = ({ policy }) => ({
  members: new Set(
    policy.inline.map(
      (e) => `${e?.file ?? ''}\u0000${e?.class ?? ''}\u0000${e?.member ?? ''}`,
    ),
  ),
  types: new Set(
    policy.internal.map((e) => `${e?.file ?? ''}\u0000${e?.type ?? ''}`),
  ),
});

/**
 * 9. REGISTER — an excuse names the thing it excuses, carries a reason, and is still needed.
 * Six rules, because the register keeps two lists: `inline`, the components whose decorator
 * holds what decision 0001 sends to a file, and `internal`, the types an entrypoint keeps to
 * itself. The third rule of each pair is the one that keeps a register honest: an entry whose
 * component has since moved its template into a file, or whose type the index has since
 * exported, goes on reading as though something here were still an exception, and the next
 * person writes their own entry beside it.
 */
const registerEntries = ({ declarations, exportedTypes, policy }, surfaces) => {
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

  const byType = new Map(
    exportedTypes.map((t) => [`${t.file}\u0000${t.name}`, t]),
  );
  const internal = policy.internal.map((entry, position) => ({
    position,
    file: typeof entry?.file === 'string' ? entry.file : null,
    type: typeof entry?.type === 'string' ? entry.type : null,
    reason: typeof entry?.reason === 'string' ? entry.reason : '',
    declaration: byType.get(`${entry?.file}\u0000${entry?.type}`) ?? null,
  }));

  const nameless = internal.filter((e) => !e.declaration);
  if (nameless.length)
    throw new FilesError(
      'register',
      'internal-entry-without-type',
      `${nameless.length} entry(ies) of the \`internal\` list of \`${POLICY}\` name no ` +
        `exported type this gate read:\n` +
        list(
          nameless.map(
            (e) =>
              `entry ${e.position + 1}: \`${e.type ?? '(no type)'}\` in \`${e.file ?? '(no file)'}\``,
          ),
        ) +
        `\n    An excuse for a type nothing exports excuses nothing, and in the register it ` +
        `reads as though the library kept one more shape to itself than it does. A rename, or ` +
        `a type that has since lost its \`export\`, leaves exactly this behind.`,
    );

  const unexplained = internal.filter(
    (e) => e.reason.trim().length < MIN_REASON,
  );
  if (unexplained.length)
    throw new FilesError(
      'register',
      'internal-entry-without-reason',
      `${unexplained.length} entry(ies) of the \`internal\` list of \`${POLICY}\` carry no ` +
        `reason:\n` +
        list(
          unexplained.map(
            (e) =>
              `${e.file}: ${e.type} (${e.reason.trim().length} of ${MIN_REASON} characters)`,
          ),
        ) +
        `\n    Without one the entry says "this type is internal", which is what its absence ` +
        `from the index says anyway. What the reason has to say is why a consumer will never ` +
        `need the name — and what would put it back on the surface.`,
    );

  // An entrypoint whose surface is open is one point 10 refuses to rule on, so this rule has
  // nothing to stand on there either: it would read "the index does not export it" out of a
  // list of names known to be short. Point 10 reports that entrypoint on its own rule.
  const stale = internal.filter((e) => {
    const surface = surfaces.get(entrypointOf(e.file));
    return surface && !surface.opaque.length && surface.names.has(e.type);
  });
  if (stale.length)
    throw new FilesError(
      'register',
      'internal-entry-unused',
      `${stale.length} entry(ies) of the \`internal\` list of \`${POLICY}\` excuse a type ` +
        `the index exports:\n` +
        list(
          stale.map(
            (e) =>
              `${e.file}:${e.declaration.line} — \`${e.type}\` is exported by \`${entrypointOf(e.file)}/src/index.ts\``,
          ),
        ) +
        `\n    The type went public and the excuse stayed. From here on it stands ready to ` +
        `cover the next type that quietly drops off the surface, and the register — which is ` +
        `read as the list of what this library keeps to itself — is wrong by one line.`,
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
