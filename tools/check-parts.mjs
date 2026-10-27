#!/usr/bin/env node
/**
 * Part inventory gate: `req-api-parts` — the `data-pct-part` attributes are RECORDED and
 * VERSIONED, so a consumer's selector survives an update. They are the one route into a
 * component this library leaves (0013) and the one public API whose change gives no red test.
 *
 *  1. DENOMINATOR: every decorator, base, template and occurrence read, one host part per chain,
 *  2. SET: the parts read from the sources match those read from the BUILT package,
 *  3. STATICNESS: a part's name is nowhere bound by an expression,
 *  4. SURFACE: the **Parts** rows in `docs/components/` carry exactly the exposed names,
 *  5. SNAPSHOT: the versioned inventory matches the current one,
 *  6. NAMESPACE: a component whose parts share a prefix gives it to ALL of them,
 *  7. README: the package README's entrypoint table matches the packed manifest.
 *
 * Two independent reads are the point: the source read catches a part that never reached the
 * package, the package read (JIT over `dist/`) one our scanner cannot see. A part inherited
 * from a base class is followed by both (`lesson-100`, `req-quality-inheritance`).
 *
 * Usage: node tools/check-parts.mjs [--write [<fixture>]]  (--write: rewrite the snapshot)
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
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  JitEvaluator,
  outputAst,
  R3Identifiers,
  TmplAstRecursiveVisitor,
  tmplAstVisitAll,
} from '@angular/compiler';
import * as core from '@angular/core';

import { classesOf, classKey, standsFor } from './class-bases.mjs';
import { decoratorsOf, hostOf, textOf } from './decorators.mjs';
import { freshInputsFor } from './fresh-inputs.mjs';
import { runnerControl } from './runner-control.mjs';
import { valuesOf } from './static-attributes.mjs';
import { readTree } from './template-comments.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const DOCUMENTS = 'docs/components';
const SNAPSHOT = `${PROJECT}/parts.snapshot.md`;
const README = `${PROJECT}/README.md`;
const FIXTURES = join(ROOT, 'tools/check-parts.fixtures');
const REFERENCE = '_reference';
const RUNNER = '_runner.json';

const WRITE = process.argv.includes('--write');

// A parts inventory is read from the built package, so it is written from a build this run
// produced rather than one nx had lying around (**C29**).
freshInputsFor(WRITE, ['components:build']);
const WRITE_FIXTURE = (() => {
  const next = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && next && !next.startsWith('--') ? next : null;
})();

const ATTRIBUTE = 'data-pct-part';

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

const shorten = (entries, countOf = 8) =>
  entries.length <= countOf
    ? entries
    : [...entries.slice(0, countOf), `… and ${entries.length - countOf} more`];

const sorted = (set) => [...set].sort();

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * A component or directive decorator in a source file. It anchors on the formatting
 * `nx format:check` enforces (`@Component({` and `})` in column zero) — and that is why
 * what it reads is held separately against a counter that does NOT repeat that
 * anchor: repeating it would put out both sides of the comparison at once and point 1 would
 * pass having stopped measuring a whole component (`lesson-48`). The counter is the parser's
 * (`decoratorsOf`, `decorators.mjs`): every decorator called by either name, at any depth of the
 * file. A pattern
 * counted them before, from the start of a line past indentation, and a block comment written
 * before the decorator on its line, which prettier keeps, hid one from both: ngc compiled it, and
 * a class no entrypoint exported passed every point (measured).
 *
 * `@Directive` stands here beside `@Component`, because four wrapper parts
 * (`field-prefix-item`, `field-suffix-item`, `field-label-aux-item`,
 * `field-message-aux-item`) live only in the `host` blocks of directives. A gate reading
 * components alone would pronounce on an inventory without them.
 */
const DECORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)([^{]*)\{/dgm;

/**
 * An independent counter: EVERY occurrence of the attribute name in a template outside its
 * comments, whatever its case. The DOM lowercases an HTML attribute's name, so
 * `DATA-PCT-PART="row"` is a part a consumer's selector matches (measured in Chromium), while
 * the tree and the package both hold it as written — and in a template that spelling passed
 * every point until the count stopped telling the cases apart.
 */
const TEMPLATE_COUNTER = new RegExp(ATTRIBUTE, 'gi');
/**
 * The same counter over a decorator's body and the text of every constant its `host` block
 * follows, against the entries `hostOf` reads under the name in lowercase. `hostAttrs` and the
 * host-binding function keep `'DATA-PCT-PART'` as written (measured through the JIT compiler),
 * Angular hands it to the same `setAttribute`, and it passed every point until this count. The
 * package read takes it in any case, as a part or a binding the sources lack; this count says
 * where it is written. A comment is not blanked, so it counts as text: prose naming the
 * attribute is refused, and so is a pair commented out, which is no entry.
 *
 * It runs a second time over the entries themselves, keys and values as the parser reads them.
 * An escape in a key written in capitals hid the name from the text and from a read in
 * lowercase alike, and ngc resolves it into a part (measured through ngc in partial mode and
 * the linker): it passed every point on a class no entrypoint exports. Two counts and not
 * their sum, so that an error in one cannot cancel one in the other. A part restated under its
 * key, a constant spread twice, counts twice as written and once as read and is refused, though
 * ngc composes one part: a refusal too many, and the library writes neither.
 */
const HOST_COUNTER = new RegExp(ATTRIBUTE, 'gi');

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

/**
 * The entrypoint from the directory layout: `libs/components/select/src/select.ts` →
 * `./select`, and `libs/components/src/index.ts` → `.`. The same shape the keys have in
 * the packed manifest's `exports` map, so point 2 compares membership without translating
 * one convention into another.
 */
const entrypointFromPath = (file) => {
  const segment = file.slice(`${PROJECT}/`.length).split('/')[0];
  return segment === 'src' ? '.' : `./${segment}`;
};

/**
 * Decorated classes — `[{ file, className, entrypoint, template, unnamed, inline, composed,
 * parts, statics, dynamic, occurrences, read }]`, the decorators read as no class's (`unheld`,
 * `unparsed`), and the files taking a decorator under another name (`renamed`). The template
 * and the `host` block are read off the decorator's metadata as the parser holds it
 * (`decoratorsOf`, `hostOf`), and the counter runs over the text the pattern reads, over every
 * constant the block follows, and over the entries the parser reads.
 * `parts` come here from the `host` block alone; the template's parts are added by point
 * 1, because a template is a separate file and a separate denominator — its scan has to
 * hold up first.
 *
 * A `host` block is sometimes composed by spreading a constant (`...fitHost` in
 * `field/src/affix.ts`), and the read follows a constant of the file's own, by name or in a
 * spread, and refuses any other composition at point 1 (`composed`). Left to the package read,
 * such a part fired point 2 on an exported class alone: the package read visits no other, so on
 * a class no entrypoint exports, used inside one that is, it passed every point (measured).
 */
const readSources = (root, files) => {
  const classes = [];
  const unheld = [];
  const unparsed = [];
  const renamed = [];
  const unseen = [];
  let declarations = 0;
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  );
  const bases = classesOf(contents);

  for (const [file, content] of contents) {
    const decorators = decoratorsOf(file, content);
    declarations += decorators.declared;
    for (const name of decorators.renamed) renamed.push(`${file}: ${name}`);

    for (const match of content.matchAll(DECORATOR)) {
      const [, kind, body, className] = match;
      const key = classKey(file, className);
      // The class of that name at the top level of the file, and only where its name stands
      // where the pattern read it: one in a comment beside it is not that class.
      const held = bases.get(key);
      if (held?.at !== match.indices[3][0]) {
        unheld.push(`${file}: ${className}`);
        continue;
      }
      // And the decorator the parser holds where the pattern read its `@`, called with an object
      // literal: one in a comment above a class decorated otherwise is not that class's.
      const metadata = decorators.read(match.index);
      if (!metadata) {
        unparsed.push(`${file}: ${className}`);
        continue;
      }
      const url = metadata.get('templateUrl');
      const path = textOf(url);
      const template = metadata.get('template');
      const host = hostOf(metadata.get('host'));
      const entries = host?.entries ?? [];
      const written = entries.filter(([key]) => key === ATTRIBUTE);
      const bound = entries.filter(([key]) => key === `[attr.${ATTRIBUTE}]`);
      const followed = (host?.followed ?? []).map((object) => object.getText());
      classes.push({
        file,
        className,
        key,
        kind,
        // `class X extends Y` — the base whose `host` block is the subclass's too. `base` is Y
        // as written and `from` the class TypeScript binds it to (`class-bases.mjs`), or
        // `undefined` for none this follows, `via` the module the file imports Y from.
        base: held.base ?? null,
        from: held.from,
        via: held.via,
        entrypoint: entrypointFromPath(file),
        template:
          path !== undefined
            ? relative(root, resolve(join(root, dirname(file)), path))
                .split('\\')
                .join('/')
            : null,
        // A path the scanner does not read as written: ngc evaluates the expression, a
        // constant or a concatenation, and compiles a file the source read never opens.
        unnamed: url !== undefined && path === undefined,
        // An empty template (`template: ''` in `number.ts` and `text.ts`) can bring no
        // part, so it is no hole in the denominator. Any other template the decorator hands
        // the compiler is one, a constant it names among them.
        inline: template !== undefined && textOf(template) !== '',
        // A block given otherwise than by an object literal of the file, which ngc evaluates.
        composed: host === null,
        parts: new Set(written.map(([, value]) => value)),
        statics: written.length,
        dynamic: bound.length,
        occurrences: countOf([body, ...followed].join('\n'), HOST_COUNTER),
        read: countOf(entries.flat().join('\n'), HOST_COUNTER),
      });
    }
    unseen.push(...decorators.unseen());
  }

  return { classes, declarations, unseen, unheld, unparsed, renamed };
};

/**
 * The parts of a template, off the tree `parseTemplate` builds: a written one is a
 * `TextAttribute`, its value decoded as the package's `consts` carry it (`lab&#101;l` is
 * `label`), and a bound one an input of that name — `[attr.…]`, `bind-attr.…` and `[…]`
 * alike. A pattern over the text stood here, a second lexer (`lesson-236`): a part quoted in
 * a comment or a `@let` string was a part to it, `bind-attr.data-pct-part="x()"` a part
 * named `x()`, an unquoted value nothing it could read.
 *
 * A value with interpolation (`data-pct-part="{{name()}}"`) is a binding even though it
 * looks like a literal, and the tree holds it as one — measured, not assumed: Angular emits
 * it into `consts` as `[3, 'data-pct-part']`, that is, after the bindings marker, and writes
 * the attribute name into the body of the template function. Read as a literal, it would be
 * a part named `{{name()}}` in the inventory, and point 3 would never see it.
 *
 * The visitor is the compiler's own and enters every block, as the package read enters every
 * view the compiler emits for one. The attributes and inputs of an element under a structural
 * directive stand in the tree twice, hoisted onto the `Template` as the same objects, so each
 * node is counted once.
 */
class PartReader extends TmplAstRecursiveVisitor {
  parts = [];
  dynamic = 0;
  seen = new Set();
  first(node) {
    if (node.name !== ATTRIBUTE || this.seen.has(node)) return false;
    this.seen.add(node);
    return true;
  }
  visitTextAttribute(attribute) {
    if (this.first(attribute)) this.parts.push(attribute.value);
  }
  visitBoundAttribute(input) {
    if (this.first(input)) this.dynamic++;
  }
}

/**
 * A template: the parser's errors, the static parts, the number of bindings, and a count of
 * every occurrence over the text `readTree` hands back, each comment blanked — what a
 * comment quotes is no markup to the build, and so none to the count. Anything else that
 * spells the name (text, another attribute's value, an expression's string, the case of an
 * ICU, where the tree holds no element) is counted and not read, and point 1 refuses it.
 */
const readTemplate = ({ file, content }) => {
  const { nodes, errors, text } = readTree(file, content);
  const reader = new PartReader();
  tmplAstVisitAll(reader, nodes);
  return {
    errors: errors ?? [],
    parts: reader.parts,
    dynamic: reader.dynamic,
    occurrences: countOf(text, TEMPLATE_COUNTER),
  };
};

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the five checks — with an identifier, not just a message. The
 * negative control has to verify that a prepared input fired ON ITS OWN point: an input
 * failing for a reason other than the one it declares proves something other than what it
 * declares.
 */
class PartsError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * The full set of checks over a ready input:
 *   `classes`, `declarations`, `unseen` — from the decorators in the sources (read A),
 *   `templates`   — `[{ file, content }]` of all the project's templates,
 *   `pkg`     — `[{ entrypoint, exportedAs, class, parts, dynamic }]` from the built package
 *                  (read B), one per name an entrypoint exports, `class` the object it holds,
 *   `documents`  — `[{ file, entrypoint, parts }]` from `docs/components/`,
 *   `entrypoints`— the keys of the packed manifest's `exports` map,
 *   `snapshot`   — the file's contents, or `null`.
 * Throws `PartsError` on the first violation and returns `{ description, snapshot }` — the
 * rendered snapshot comes back from a checking run too, because `--write` is to write
 * exactly what the gate has just counted rather than count a second time down another
 * path.
 */
const checkParts = (input) => {
  const {
    classes,
    declarations,
    unseen,
    unheld,
    unparsed,
    renamed,
    templates,
    pkg,
    documents,
    entrypoints,
  } = input;

  // 1. DENOMINATOR. Before anything is compared, the source read has to be able to say
  //    it saw everything it was meant to see. Without that, point 2 would be comparing
  //    two lists, one of which had quietly shrunk.
  if (!classes.length)
    throw new PartsError(
      'denominator',
      `no \`@Component\`/\`@Directive\` decorator found in the sources (${PROJECT}) — ` +
        `the comparison against the counter would then always pass, because zero equals ` +
        `zero (lesson-48).\n    Usual cause: the list of source files stopped returning ` +
        `anything.`,
    );

  // A decorator the pattern reads where the TypeScript parser holds no class at the top level of
  // the file — one in a comment, or one inside a namespace or a function, written in column zero
  // — is no class `extends` can be resolved for, and a class that is not there for the rest. It
  // is said here, as `check-aria` says it.
  if (unheld.length)
    throw new PartsError(
      'denominator',
      `${unheld.length} decorators stand where the TypeScript parser holds no class at the ` +
        `top level of the file:\n` +
        list(unheld) +
        `\n    A decorator in a comment, or a class inside a namespace or a function: no ` +
        `point below may read it as a component of the library.`,
    );

  // The template is read off the metadata the parser holds for the decorator where the pattern
  // read its `@`, as ngc reads it. Where the parser holds no decorator there, or one called with
  // no object literal, the class has no metadata to read it off, and the text the pattern took
  // for it is no decorator's: a comment above a class decorated otherwise, read as a component.
  if (unparsed.length)
    throw new PartsError(
      'denominator',
      `${unparsed.length} decorators stand where the TypeScript parser holds no decorator ` +
        `called with an object literal:\n` +
        list(unparsed) +
        `\n    A decorator in a comment above a class decorated otherwise, or metadata that ` +
        `is no object literal once an \`as\` is off, which ngc refuses as well ` +
        `(\`{ … } satisfies { … }\`, NG1001): ` +
        `the scanner reads a class's template off that object, and here it has none.`,
    );

  // A decorator under a name of the file's own is one neither the pattern nor the counter sees,
  // so the count below agrees without it: a class decorated so is no class to the source read, and
  // its template, written into the decorator, passed every point when no entrypoint exported it.
  if (renamed.length)
    throw new PartsError(
      'denominator',
      `${renamed.length} imports take \`Component\` or \`Directive\` from \`@angular/core\` ` +
        `under another name:\n` +
        list(renamed) +
        `\n    The pattern and the counter know a decorator by \`@Component(\` and ` +
        `\`@Directive(\`, and ngc by the import: a class decorated under another name ` +
        `compiles into the package, and the source read holds no class there. Import them ` +
        `under their own names.`,
    );

  if (unseen.length)
    throw new PartsError(
      'denominator',
      `the pattern read ${classes.length} of the ${declarations} decorators the TypeScript ` +
        `parser holds, and not these:\n` +
        list(unseen) +
        `\n    They would drop out of the inventory without a trace. Usual cause: a decorator ` +
        `written otherwise than the pattern reads it (\`@Component({\` and \`})\` in column ` +
        `zero): indented, inside a namespace or a function, behind a comment on its line, or ` +
        `above \`export default class\`, which the pattern does not take for a class.`,
    );

  // Point 2 compares the two reads by class name, the one key both carry: the package keeps no
  // file, and a class it exports carries its own name, whatever key it is exported under. Two
  // decorated classes of one name are then one key, and the comparison reads one of them — a
  // class that never reached the package hides behind its namesake that did (measured: a second
  // `PctMarker` in `twin.ts`, writing a part and exported by nothing, passed). It is refused
  // wherever the two stand, two bases no entrypoint exports included, which point 2 never
  // reaches: a name meets the package in more than one place below (`exported`, `fromPackage`),
  // and one class per name is what each of them assumes.
  // The chain is not what needs this: `extends` is resolved through the file that writes it, by
  // name and file.
  const shared = [...Map.groupBy(classes, (k) => k.className)].filter(
    ([, named]) => named.length > 1,
  );
  if (shared.length)
    throw new PartsError(
      'denominator',
      `${shared.length} names are borne by more than one decorated class:\n` +
        list(
          shared.map(
            ([name, named]) =>
              `${name}: ${named.map((k) => k.file).join(', ')}`,
          ),
        ) +
        `\n    Point 2 compares the sources with the package by class name, the only key ` +
        `the package carries, and where two classes of a name reach it, it reads one and ` +
        `passes the other over. The name is refused wherever the two stand. Rename one.`,
    );

  const inline = classes.filter((k) => k.inline);
  if (inline.length)
    throw new PartsError(
      'denominator',
      `${inline.length} classes take their template from the decorator, not a file:\n` +
        list(inline.map((k) => `${k.file}: ${k.className}`)) +
        `\n    The source scanner reads templates, not decorators, so parts written ` +
        `there are seen only by the package read — as a drift between two lists rather ` +
        `than as what they are. Move the template out to \`templateUrl\`.`,
    );

  const unnamed = classes.filter((k) => k.unnamed);
  if (unnamed.length)
    throw new PartsError(
      'denominator',
      `${unnamed.length} classes name their template file by an expression, not a string:\n` +
        list(unnamed.map((k) => `${k.file}: ${k.className}`)) +
        `\n    The scanner opens the file \`templateUrl\` names as written; ngc evaluates ` +
        `the expression and compiles a file the source read never opens. Write the path as ` +
        `a string.`,
    );

  // A `host` block ngc composes from more than the read takes: it evaluates the block, and a part
  // it composes reached the package read on an exported class alone (`hostOf`).
  const composed = classes.filter((k) => k.composed);
  if (composed.length)
    throw new PartsError(
      'denominator',
      `${composed.length} classes take a \`host\` block this read does not take as written:\n` +
        list(composed.map((k) => `${k.file}: ${k.className}`)) +
        `\n    ngc evaluates the block, and composes it from a constant by name, an import, a ` +
        `member, a condition, a call, a computed key or a value kept in a constant alike; ` +
        `the read follows an object literal written in place or in a \`const\` of the ` +
        `file's own, under keys and values written as strings. A part composed otherwise ` +
        `passed every point on a class no entrypoint exports. Write the block so.`,
    );

  const used = new Map(); // template -> [classes]
  for (const k of classes)
    if (k.template) used.set(k.template, [...(used.get(k.template) ?? []), k]);

  const known = new Set(templates.map((s) => s.file));
  const missing = [...used.keys()].filter((s) => !known.has(s));
  if (missing.length)
    throw new PartsError(
      'denominator',
      `${missing.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        list(missing) +
        `\n    Their parts will not enter the inventory. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const orphaned = templates.filter((s) => !used.has(s.file));
  if (orphaned.length)
    throw new PartsError(
      'denominator',
      `${orphaned.length} templates belong to no decorator:\n` +
        list(orphaned.map((s) => s.file)) +
        `\n    The scanner assigns parts to a class through \`templateUrl\`; a template ` +
        `nobody points at is invisible to the inventory — and travels to the browser like ` +
        `every other one.`,
    );

  const scans = new Map(templates.map((s) => [s.file, readTemplate(s)]));
  const broken = templates
    .filter((s) => scans.get(s.file).errors.length)
    .map((s) => `${s.file}: ${scans.get(s.file).errors[0].msg}`);
  if (broken.length)
    throw new PartsError(
      'denominator',
      `${broken.length} templates do not parse:\n` +
        list(broken) +
        `\n    The parts are read off the tree the parser builds, and a template read ` +
        `with errors hands it part of the markup or none of it — an address left ` +
        `unquoted opens a comment that takes a part out of the text and the tree ` +
        `together. The build refuses the same text.`,
    );
  const unrecognised = templates
    .map((s) => ({ file: s.file, ...scans.get(s.file) }))
    .filter((s) => s.parts.length + s.dynamic !== s.occurrences);
  if (unrecognised.length)
    throw new PartsError(
      'denominator',
      `${unrecognised.length} templates hold \`${ATTRIBUTE}\` occurrences the scanner did ` +
        `not recognise:\n` +
        list(
          unrecognised.map(
            (s) =>
              `${s.file}: recognised ${s.parts.length} static + ` +
              `${s.dynamic} bound, and the attribute name appears ${s.occurrences} times`,
          ),
        ) +
        `\n    The counter is independent of the tree precisely for this: the name ` +
        `written where the tree holds no such attribute or binding — in capitals, which ` +
        `the DOM still makes a part of, or in a string — is to stop the inventory ` +
        `LOUDLY, not drop out of it quietly.`,
    );
  const unread = classes.filter(
    (k) =>
      k.statics + k.dynamic !== k.occurrences ||
      k.statics + k.dynamic !== k.read,
  );
  if (unread.length)
    throw new PartsError(
      'denominator',
      `${unread.length} decorators hold \`${ATTRIBUTE}\` occurrences the scanner did ` +
        `not recognise:\n` +
        list(
          unread.map(
            (k) =>
              `${k.file}: ${k.className} — recognised ${k.statics} static + ` +
              `${k.dynamic} bound, and the attribute name appears ${k.occurrences} times ` +
              `as written and ${k.read} as read`,
          ),
        ) +
        `\n    A \`host\` block is read by the name ngc gives an entry, in lowercase; the ` +
        `counter takes it in any case, over the decorator and every constant its block ` +
        `follows as written, and over the entries as the parser reads them, an escape ` +
        `resolved. Angular hands \`'DATA-PCT-PART'\` to \`setAttribute\` as written and ` +
        `the DOM lowercases it — a part a consumer's selector matches, which the source ` +
        `read would never list — and of two entries of one key it keeps the later.`,
    );

  // Inheritance, resolved before the two reads are compared. What a base's `host` block
  // declares is merged INTO the classes that extend it, because that is where the linker
  // puts it (`ɵɵInheritDefinitionFeature` merges `hostAttrs` down the chain); a base no
  // entrypoint exports stops being a class of its own, because that is what the package
  // does with it. The merge is Angular's: `mergeHostAttrs` lets an attribute replace the one
  // of the same name a class inherits, so a host carries the part of the nearest class that
  // writes one. A template is not merged: `templateUrl` is the subclass's own, and a base
  // cannot pass one on. A base the scan cannot see is a denominator fault — the package
  // read would then find its parts on the subclass and the source read never would.
  //
  // A link is the class TypeScript binds the base's name to (`class-bases.mjs`) — one the
  // subclass's file declares, or one a module of the sources declares `export class` under the name
  // imported — keyed by its file too, and anything else is no link but the refusal below. So the
  // chain is the one TypeScript builds: a cycle in it is one the compiler refuses as well (TS2506,
  // a class named in its own base expression), and no build compiles it. `seen` guards nothing the
  // gate is handed, and dropping it is equivalent on every input that compiles and whose
  // directories carry no `package.json`, which `class-bases.mjs` does not read.
  const declared = new Map(classes.map((k) => [k.key, k]));
  // The package's classes, one per OBJECT, as `check-zoneless` reads them: a class one
  // entrypoint re-exports from another, or exports a second time under another name, is one
  // class with all of its entrypoints. Its name is its own (`name`), the name the sources give
  // it, not the key it is exported under: by key, `export { PctMarker as PctGhost }` stood in
  // for a decorated `PctGhost` no entrypoint exports, and point 2 passed a part that reaches
  // no consumer.
  const shipped = [...Map.groupBy(pkg, (p) => p.class)].map(([type, of]) => ({
    className: type.name,
    entrypoints: [...new Set(of.map((p) => p.entrypoint))].sort(),
    exports: of.map(({ entrypoint, exportedAs }) => ({
      entrypoint,
      exportedAs,
    })),
    parts: of[0].parts,
    dynamic: of[0].dynamic,
  }));
  const exported = new Set(shipped.map((p) => p.className));
  const extended = new Set(classes.map((k) => k.from));
  const unresolved = classes.filter(
    (k) => k.base !== null && !declared.has(k.from),
  );
  if (unresolved.length)
    throw new PartsError(
      'denominator',
      `${unresolved.length} classes extend a base the scan did not read:\n` +
        list(
          unresolved.map(
            (k) =>
              `${k.file}: ${k.className} extends \`${k.base}\`, ${standsFor(k)}`,
          ),
        ) +
        `\n    Whatever that base writes into a \`host\` block is part of this class in ` +
        `the package, and point 2 would compare the half declared here against the whole ` +
        `of what ships (lesson-100).`,
    );
  const whole = (k, seen = new Set()) => {
    const writes = k.parts.size ? [k] : [];
    if (k.base === null || seen.has(k.key)) return { ...k, writes };
    seen.add(k.key);
    const base = whole(declared.get(k.from), seen);
    return {
      ...k,
      parts: k.parts.size ? k.parts : base.parts,
      dynamic: base.dynamic + k.dynamic,
      writes: [...base.writes, ...writes],
    };
  };
  const resolved = classes
    .map((k) => whole(k))
    .filter((k) => !(extended.has(k.key) && !exported.has(k.className)));

  // One element, one part. A chain in which two classes write a static part hands the
  // element the nearest one, and the other is a part the sources write and no element of
  // the class carries: `PctMarker` writing `widget-marker` over its base's `widget-base` links
  // to `hostAttrs` with `widget-marker` alone (measured through ngc in partial mode). It drops
  // out of the inventory as quietly as a name the scanner cannot read, so it is refused here,
  // whatever the two values. A binding is point 3's, whatever else the chain writes. With
  // this refusal standing a chain has one writer at most, and the merge above gives what a
  // union would; it is Angular's so that a second writer is named here, and not at point 2 as
  // a part that never reached the package.
  const overwritten = resolved.filter((k) => k.writes.length > 1);
  if (overwritten.length)
    throw new PartsError(
      'denominator',
      `${overwritten.length} classes take a \`host\` part from more than one class of ` +
        `their chain:\n` +
        list(
          overwritten.map(
            (k) =>
              `${k.file}: ${k.className} — ` +
              k.writes
                .map(
                  (w) =>
                    `${w.className} writes \`${sorted(w.parts).join(', ')}\``,
                )
                .join(', '),
          ),
        ) +
        `\n    An element carries one \`${ATTRIBUTE}\`, and Angular keeps the nearest ` +
        `class's (\`mergeHostAttrs\`): every other is a part the sources write and no element ` +
        `of the class carries. Write it in one class of the chain.`,
    );

  // Parts from the sources: the `host` block plus the template named by `templateUrl`.
  const fromSources = new Map(); // className -> { entrypoint, file, parts, dynamic }
  for (const k of resolved) {
    const fromTemplate = k.template ? scans.get(k.template) : null;
    const parts = new Set([...k.parts, ...(fromTemplate?.parts ?? [])]);
    if (!parts.size && !k.dynamic && !fromTemplate?.dynamic) continue;
    fromSources.set(k.className, {
      entrypoint: k.entrypoint,
      file: k.file,
      parts,
      dynamic: k.dynamic + (fromTemplate?.dynamic ?? 0),
    });
  }

  // 2. SET — two independent reads of the same list.
  //
  //    Read A (above) reads the SOURCES: the parsed tree of a template and the text of a
  //    decorator.
  //    Read B reads the BUILT PACKAGE through JIT, that is, the output of Angular's real
  //    template parser. Were the list to come from the sources alone, a component that
  //    dropped out of the package would still have its parts in the inventory — and the
  //    consumer would not have them at all. From the package alone — a part brought in by
  //    syntax our scanner cannot read would enter the inventory as a fait accompli, with
  //    no line in the diff.
  //
  //    The two reads meet by class name, so a name two classes of the package bear — one
  //    class bundled into two entrypoints, a copy beside the original — has no class to stand
  //    for. One object exported twice is one class, and is no such name.
  const twins = [...Map.groupBy(shipped, (p) => p.className)].filter(
    ([, named]) => named.length > 1,
  );
  if (twins.length)
    throw new PartsError(
      'set',
      `${twins.length} names are borne by more than one class of the package:\n` +
        list(
          twins.map(
            ([name, named]) =>
              `${name}: ${named.map((p) => p.entrypoints.map((e) => `\`${e}\``).join(' and ')).join(', ')}`,
          ),
        ) +
        `\n    Two objects of one name are two classes to a consumer — an \`instanceof\`, a ` +
        `token or a query for one misses the other — and the comparison with the sources, ` +
        `which keeps one class per name, would read one of them.`,
    );
  const fromPackage = new Map(
    shipped
      .filter((p) => p.parts.length || p.dynamic)
      .map((p) => [
        p.className,
        {
          entrypoints: p.entrypoints,
          parts: new Set(p.parts),
          dynamic: p.dynamic,
        },
      ]),
  );
  // What a name the sources give a class holds in the package where no class bears it.
  const holding = (className) =>
    shipped.flatMap((p) =>
      p.exports
        .filter((e) => e.exportedAs === className)
        .map(
          (e) =>
            `\`${e.entrypoint}\` exports \`${p.className}\` under that name`,
        ),
    );
  const ticked = (entrypoints) => entrypoints.map((e) => `\`${e}\``).join(', ');

  if (!fromSources.size || !fromPackage.size)
    throw new PartsError(
      'set',
      `an empty set of parts (sources: ${fromSources.size} classes, package: ${fromPackage.size}) — ` +
        `every later point would then pass without pronouncing on anything.\n` +
        `    Usual cause: a stale or empty \`${DIST}\` (the gate needs \`dependsOn: ` +
        `build\`), or a file list that stopped returning anything.`,
    );

  const divergences = [];
  for (const className of new Set([
    ...fromSources.keys(),
    ...fromPackage.keys(),
  ]).values()) {
    const a = fromSources.get(className);
    const b = fromPackage.get(className);
    if (!b) {
      // A class the package has and that draws nothing is not missing from it.
      const there = shipped.find((p) => p.className === className);
      if (there) {
        divergences.push(
          `${className} (${a.file}): parts in the sources, and the package's class of ` +
            `${ticked(there.entrypoints)} draws none — ${sorted(a.parts).join(', ')}`,
        );
        continue;
      }
      const held = holding(className);
      divergences.push(
        `${className} (${a.file}): parts in the sources, and no such class in the package — ` +
          `${sorted(a.parts).join(', ')}` +
          (held.length ? ` (${held.join('; ')})` : ''),
      );
      continue;
    }
    if (!a) {
      divergences.push(
        `${className} (${b.entrypoints.join(', ')}): parts in the package, and the source scanner does not see the class — ` +
          `${sorted(b.parts).join(', ')}`,
      );
      continue;
    }
    // A class sits in one entrypoint's directory, and that entrypoint has to export it; one
    // that re-exports it as well hands a consumer the same class.
    if (!b.entrypoints.includes(a.entrypoint))
      divergences.push(
        `${className}: sits in \`${a.entrypoint}\`, and the package exports it from ${ticked(b.entrypoints)}`,
      );
    const missingInPackage = sorted(a.parts).filter((c) => !b.parts.has(c));
    const missingInSources = sorted(b.parts).filter((c) => !a.parts.has(c));
    if (missingInPackage.length)
      divergences.push(
        `${className}: in the sources and not in the package — ${missingInPackage.join(', ')}`,
      );
    if (missingInSources.length)
      divergences.push(
        `${className}: in the package and not in the sources — ${missingInSources.join(', ')}`,
      );
  }
  if (divergences.length)
    throw new PartsError(
      'set',
      `the two reads of the inventory disagree (${divergences.length}):\n` +
        list(shorten(divergences, 12)) +
        `\n    The first kind is a part that never reached the consumer (a component ` +
        `with no export, or a stale \`dist\`); the second is a part the source scanner ` +
        `cannot see, which would enter the package with no line in the diff.`,
    );

  // 3. STATICNESS. A name composed at runtime can be neither recorded nor frozen: the
  //    inventory and the snapshot would then be green exactly because they have nothing
  //    to see. Measured on both sides — in the sources as a binding of the name (`[attr.…]` in
  //    a `host` block, any input of it in a template), in the package as an instruction
  //    binding it in any view or host function (a bound attribute does not reach `consts`,
  //    only the instruction).
  const bound = [
    ...[...fromSources]
      .filter(([, w]) => w.dynamic)
      .map(
        ([className, w]) =>
          `${className} (${w.file}): ${w.dynamic} in the sources`,
      ),
    ...[...fromPackage]
      .filter(([, w]) => w.dynamic)
      .map(
        ([className, w]) =>
          `${className} (${w.entrypoints.join(', ')}): ${w.dynamic} in the package`,
      ),
  ];
  if (bound.length)
    throw new PartsError(
      'staticness',
      `${bound.length} places bind a part's name with an expression:\n` +
        list(bound) +
        `\n    A part whose name appears at runtime is no public API — it is a name ` +
        `nobody wrote down and no snapshot can freeze. \`${ATTRIBUTE}\` is to be a literal ` +
        `in the template or in the \`host\` block.`,
    );

  // 4. SURFACE. The inventory exists to be READ, and today's readable surface is the
  //    cards in `docs/components/`. The **Parts** row is written by hand and lies for
  //    exactly that reason: `field.md` used to list 7 parts out of eleven. The comparison
  //    goes per ENTRYPOINT, because that is how the library is imported, and one card is
  //    sometimes about two classes
  //    (`radio.md`) and one entrypoint has three cards (`field`, `number`,
  //    `text`). A class two entrypoints export counts in both, as it is imported from
  //    both: an entrypoint re-exporting a class hands a consumer its parts, and its cards
  //    say so.
  const byEntrypoint = new Map();
  for (const [, w] of fromPackage)
    for (const entrypoint of w.entrypoints) {
      const set = byEntrypoint.get(entrypoint) ?? new Set();
      for (const c of w.parts) set.add(c);
      byEntrypoint.set(entrypoint, set);
    }

  const unknownEntrypoints = documents
    .filter((d) => d.entrypoint === null || !entrypoints.has(d.entrypoint))
    .map(
      (d) =>
        `${d.file}: ${d.entrypoint === null ? 'no **Entrypoint:** heading' : `\`${d.entrypoint}\` is not an entrypoint of the package`}`,
    );
  if (unknownEntrypoints.length)
    throw new PartsError(
      'documentation',
      `${unknownEntrypoints.length} cards name an entrypoint that is not in the package:\n` +
        list(unknownEntrypoints) +
        `\n    The gate assigns a **Parts** row to an entrypoint by exactly that heading; ` +
        `a card without one stays outside the comparison, that is, outside the inventory.`,
    );

  const documentationProblems = [];
  for (const [entrypoint, parts] of [...byEntrypoint].sort()) {
    const cards = documents.filter((d) => d.entrypoint === entrypoint);
    if (!cards.length) {
      documentationProblems.push(
        `\`${entrypoint}\` exposes ${parts.size} parts and has no card at all ` +
          `in \`${DOCUMENTS}/\``,
      );
      continue;
    }

    const whereFrom = new Map(); // part -> [cards]
    for (const card of cards)
      for (const c of card.parts)
        whereFrom.set(c, [...(whereFrom.get(c) ?? []), card.file]);

    const twice = [...whereFrom]
      .filter(([, where]) => where.length > 1)
      .map(([c, where]) => `\`${c}\` in ${where.join(' and ')}`);
    if (twice.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the same part in two cards — ${twice.join('; ')}`,
      );

    const missingFromCards = sorted(parts).filter((c) => !whereFrom.has(c));
    const surplus = [...whereFrom.keys()].filter((c) => !parts.has(c)).sort();
    if (missingFromCards.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the package exposes what the cards do not list — ` +
          missingFromCards.map((c) => `\`${c}\``).join(', '),
      );
    if (surplus.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the cards list what the package does not expose — ` +
          surplus.map((c) => `\`${c}\``).join(', '),
      );
  }
  if (documentationProblems.length)
    throw new PartsError(
      'documentation',
      `the **Parts** rows have drifted from the package (${documentationProblems.length}):\n` +
        list(shorten(documentationProblems, 12)) +
        `\n    A card listing a part that does not exist sends the consumer to a selector ` +
        `matching nothing; a card silent about an existing one undoes the "recorded" ` +
        `promise entirely. ` +
        `The section is written: \`| **Parts** | \\\`name\\\`, \\\`name\\\` |\`.`,
    );

  // 6. NAMESPACE — a container's parts carry one prefix, and all of them do
  // (`req-api-parts-unique`). The rule reads the inventory rather than a list of container
  // components, because "is this a container" is not decidable from a template: a button
  // projects content too. What IS visible is a component whose own parts disagree — three
  // of `PctRadioGroup`'s four carried `group-` and `options` did not, so a consumer's
  // `[data-pct-part="options"]` inside a group had nothing telling it apart from the same
  // selector aimed at anything else.
  //
  // Scope written down rather than guessed at: the rule fires only where there is EXACTLY
  // ONE shared prefix. A component that deliberately builds sub-namespaces (`panel-header`,
  // `panel-body` beside a `trigger`) has two, and the day one arrives is the day to decide
  // whether it needs a register of exceptions — inventing that register now would be
  // machinery for a case that does not exist.
  const outside = [];
  for (const [className, w] of fromPackage) {
    const parts = sorted(w.parts);
    const counted = new Map();
    for (const part of parts) {
      const i = part.indexOf('-');
      if (i < 1) continue;
      const prefix = part.slice(0, i + 1);
      counted.set(prefix, (counted.get(prefix) ?? 0) + 1);
    }
    const shared = [...counted].filter(([, n]) => n >= 2).map(([p]) => p);
    if (shared.length !== 1) continue;
    for (const part of parts)
      if (!part.startsWith(shared[0]))
        outside.push(
          `${className}: \`${part}\` stands outside \`${shared[0]}\``,
        );
  }
  if (outside.length)
    throw new PartsError(
      'namespace',
      `${outside.length} parts stand outside their component's namespace:\n` +
        list(shorten(outside)) +
        `\n    A composite component prefixes its own parts so that a consumer's selector ` +
        `cannot reach the parts of the members inside it (lesson-15, req-api-parts-unique). ` +
        `One part left outside is the hole the prefix was introduced to close — and it is ` +
        `the one nobody notices, because it collides with nothing TODAY.`,
    );

  // 5. SNAPSHOT — the versioned inventory a change is measured against. It stands LAST,
  // because it fires on every change of a name, including the ones the earlier points can
  // name precisely. The reverse order would answer a part brought in by a binding with
  // "the snapshot has drifted" — a correct diagnosis of a problem that is not there.
  const rows = [...fromPackage]
    .flatMap(([className, w]) =>
      w.entrypoints.flatMap((e) =>
        sorted(w.parts).map((c) => [e, className, c]),
      ),
    )
    .sort((a, b) => (a.join(' ') < b.join(' ') ? -1 : 1));
  const content = renderSnapshot(rows);
  const divergence = (description) =>
    Object.assign(new PartsError('snapshot', description), {
      snapshot: content,
    });

  if (input.snapshot === null)
    throw divergence(
      `no \`${SNAPSHOT}\` — run \`node tools/check-parts.mjs --write\`.\n` +
        `    Without a snapshot this gate watches that three reads agree, but does not ` +
        `measure CHANGE: renaming a part together with its card in docs then passes ` +
        `without a trace, and breaks a selector at the consumer's.`,
    );
  if (input.snapshot !== content) {
    const old = snapshotRows(input.snapshot);
    const fresh = snapshotRows(content);
    const removed = [...old].filter((w) => !fresh.has(w));
    const added = [...fresh].filter((w) => !old.has(w));
    throw divergence(
      `the inventory snapshot has drifted from the current one:\n` +
        (removed.length
          ? `    gone from the API (${removed.length}):\n` +
            list(shorten(removed)) +
            '\n'
          : '') +
        (added.length
          ? `    added to the API (${added.length}):\n` +
            list(shorten(added)) +
            '\n'
          : '') +
        (!removed.length && !added.length
          ? `    the list of parts is the same — the heading or the row order drifted.\n`
          : '') +
        `    \`${ATTRIBUTE}\` is the public styling API (decision 0013): a part that has ` +
        `gone takes a consumer's selector with it and gives not one red test, because the ` +
        `template and the sheet change together. If the change is deliberate — ` +
        `\`node tools/check-parts.mjs --write\`.`,
    );
  }

  // 7. README — the package README's entrypoint table, held to the packed manifest. The
  // npm page is the first surface a consumer reads and it was the last one whose drift
  // nothing measured: it named 7 of 21 entrypoints after six components had shipped
  // without a row. It stands after the snapshot so that `--write` keeps answering a
  // snapshot drift with one command; a case here always has a current snapshot.
  const named = new Set(
    [
      ...(input.readme ?? '').matchAll(
        /^\|\s*`@pacit\/components(\/[a-z-]+)?`/gm,
      ),
    ].map((m) => `.${m[1] ?? ''}`),
  );
  const unlisted = [...input.entrypoints].filter((e) => !named.has(e));
  const phantom = [...named].filter((e) => !input.entrypoints.has(e));
  if (input.readme === null)
    throw new PartsError(
      'readme',
      `no \`${README}\` — the package publishes its README as the npm page, and this ` +
        `gate reads the page's entrypoint table against the packed manifest`,
    );
  if (unlisted.length || phantom.length)
    throw new PartsError(
      'readme',
      `the README's entrypoint table has drifted from the packed manifest:\n` +
        (unlisted.length
          ? `    entrypoints with no row (${unlisted.length}):\n` +
            list(shorten(unlisted.map((e) => `\`${e}\``))) +
            '\n'
          : '') +
        (phantom.length
          ? `    rows naming no entrypoint (${phantom.length}):\n` +
            list(shorten(phantom.map((e) => `\`${e}\``))) +
            '\n'
          : '') +
        `    The npm page is what a consumer reads before installing, and a table kept by ` +
        `hand names fewer components every month — measured at seven of twenty-one before ` +
        `this point existed. A new entrypoint takes a row with it, in \`${README}\`.`,
    );

  return {
    description:
      `${rows.length} parts in ${fromPackage.size} classes ` +
      `(${byEntrypoint.size} entrypoints), ${documents.length} cards in docs, ` +
      `${named.size} rows on the npm page`,
    snapshot: content,
  };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The same choice of format as in `libs/tokens/tokens.snapshot.md` and for the same
 * reason: a markdown table run through prettier pads its columns to the longest cell, so
 * one long name rewrites the WHOLE file and the diff stops showing what really changed.
 */
const renderSnapshot = (rows) =>
  [
    '# Part inventory snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-parts.mjs --write`. The `check-parts` gate rejects a drift.',
    '',
    'The `data-pct-part` attribute is the public styling API — the one route this library',
    'leaves into a component ([decision 0013](../../docs/decisions/0013-no-headless-split.md)).',
    'Changing it gives not one red test, because the template and the sheet change together;',
    'it breaks only for somebody who wrote that name down on their side.',
    '',
    'This file is the list a change is measured against. A drift does not mean "an error" —',
    'it means "a change of public API that is to be visible in review".',
    '',
    'Columns: entrypoint · the class exposing the part · the part name. The list comes',
    'from the **built package** (`ɵcmp.consts` and `ɵdir.hostAttrs` after linking), that is',
    'from what the browser really gets.',
    '',
    '```',
    ...rows.map((w) => w.join(' ')),
    '```',
    '',
  ].join('\n');

/**
 * The data rows alone — for computing the difference, with no heading.
 *
 * A missing file (`null`) is an empty list here, not a failure, even though the branch
 * above catches that case separately and earlier. A dependency between the branches of one
 * point is normal; writing it so that breaking it produces no sentence is not: the first
 * version read `null.split`, and disarming the "no snapshot" branch as part of the negative
 * control turned the gate into a `TypeError` — the control lost the ability to examine the
 * point it was meant to examine. The same defect twice over, found by the same
 * control.
 */
const snapshotRows = (content) =>
  new Set(
    (content ?? '').split('\n').filter((w) => /^\.(\/[a-z0-9-]+)?\s/.test(w)),
  );

// ── input from disk ───────────────────────────────────────────────────────────

const read = (root, path) => readFileSync(join(root, path), 'utf8');

/**
 * A component card: the entrypoint from the heading and the part names from the **Parts**
 * row. `_template.md` and `README.md` are left out — the first is a form to copy (its row
 * describes what to write), the second a table of contents.
 */
const ENTRYPOINT_HEADING =
  /^\*\*Entrypoint:\*\*\s*`@pacit\/components(\/[a-z-]+)?`/m;
const PARTS_SECTION = /^\|\s*\*\*Parts\*\*.*$/m;

const readCard = (file, content) => {
  const heading = ENTRYPOINT_HEADING.exec(content);
  const section = PARTS_SECTION.exec(content);
  return {
    file,
    entrypoint: heading ? `.${heading[1] ?? ''}` : null,
    parts: new Set(
      section
        ? [...section[0].matchAll(/`([^`]+)`/g)]
            .map((m) => m[1])
            .filter((n) => /^[a-z][a-z0-9-]*$/.test(n))
        : [],
    ),
  };
};

/**
 * Definitions from the BUILT package. It is partially compiled: each class carries a
 * declaration (`ɵɵngDeclareComponent`), which the compiler imported above turns into `ɵcmp`
 * through JIT as the module defining the class is evaluated — the step the linker performs at
 * the consumer's, and the same as in `check-zoneless`.
 *
 * Its parts are the static attributes of the name (`static-attributes.mjs`), in any case. `consts`
 * and `hostAttrs` keep `'DATA-PCT-PART'` as written — an element's attribute in a template, a
 * host attribute spread from an object (each measured through ngc in partial mode and the
 * linker) — and the DOM lowercases it in `setAttribute`: a part a consumer's selector matches.
 * The source read refuses both at point 1, so either reaches this read alone, from a `dist`
 * built before its source changed. The list reaches `setUpAttributes` through `mergeHostAttrs`,
 * which drops a namespaced attribute and every pair after it when it merges the list into a
 * non-empty one, so on an element that also matches a directive with host attributes this read
 * records a part never set: it errs toward recording too much. Five mutants of the shared loop
 * read as it does on every input this gate is handed: `i += 0` or no `continue` after the `0`
 * differ on `xlink:data-pct-part` alone and `i++` on a value spelling the name, both of which
 * point 1 refuses; `==` against the `0` on a name equal to it as a number (`0`, `00`), which no
 * template writes; `<=` on none.
 */
const pairAttributes = (attrs) => valuesOf(attrs, ATTRIBUTE);

/**
 * The name of a BOUND attribute reaches no `consts` (`[attr.…]` puts nothing there —
 * measured), only an instruction: `ɵɵattribute('data-pct-part', ctx.x)`. So a binding is read
 * as the instruction itself, off the statements the JIT compiler evaluates for a definition,
 * every view's function among them. The text of `ɵcmp.template` stood here, and it is one
 * view alone: an `@if`, `@for`, `@switch`, `@defer`, `<ng-template>`, `*` directive or the
 * fallback content of an `<ng-content>` renders through a function of its own, any embedded
 * view does, and a part bound in any of them read as no binding (measured, 0 for each). The text also held whatever spells the name — a `@let` string, a text
 * node, another attribute's value, an output so named — and counted each as one (6 in one
 * template, measured through ngc).
 *
 * A call counts when its instruction is one of the four that bind a name — an attribute, a
 * property, a DOM property, a two-way property — and its first argument IS the name, in any case,
 * as `@HostBinding('attr.DATA-PCT-PART')` leaves it. The three property kinds set no attribute
 * at all, so no part either, and they are counted all the same, as the source read refuses
 * any input of the name (it refuses `[class.…]` and `[style.…]` of it too). A chained call,
 * `ɵɵattribute('title', a)('lang', b)('data-pct-part', c)`, is the instruction at its root.
 */
const BINDINGS = new Set([
  R3Identifiers.attribute,
  R3Identifiers.property,
  R3Identifiers.domProperty,
  R3Identifiers.twoWayProperty,
]);
const DEFINITIONS = new Set([
  R3Identifiers.defineComponent,
  R3Identifiers.defineDirective,
]);

class BindingCounter extends outputAst.RecursiveAstVisitor {
  count = 0;
  visitInvokeFunctionExpr(call, context) {
    let instruction = call.fn;
    while (instruction instanceof outputAst.InvokeFunctionExpr)
      instruction = instruction.fn;
    const [name] = call.args;
    if (
      BINDINGS.has(instruction.value) &&
      String(name.value).toLowerCase() === ATTRIBUTE
    )
      this.count++;
    return super.visitInvokeFunctionExpr(call, context);
  }
}

/**
 * The bindings of every definition compiled in this process, by the class it defines:
 * `{ views, host }`. The hook stands before any module of the package is imported, because a
 * declaration compiles as its class is evaluated, not as `ɵcmp` is read. The host function is
 * kept apart from the views: `ɵɵInheritDefinitionFeature` hands a base's host bindings down
 * to the class extending it, and not its template — and a subclass with host bindings of its
 * own runs the base's through a closure whose text names nothing (measured).
 */
const compiled = new Map();
const evaluateStatements = JitEvaluator.prototype.evaluateStatements;
JitEvaluator.prototype.evaluateStatements = function (
  url,
  statements,
  ...rest
) {
  for (const statement of statements) {
    const call =
      statement instanceof outputAst.DeclareVarStmt ? statement.value : null;
    if (
      !(call instanceof outputAst.InvokeFunctionExpr) ||
      !DEFINITIONS.has(call.fn.value)
    )
      continue;
    const field = (key) =>
      call.args[0].entries.find((entry) => entry.key === key)?.value;
    const all = new BindingCounter();
    for (const each of statements) each.visitStatement(all, null);
    const host = new BindingCounter();
    field('hostBindings')?.visitExpression(host, null);
    compiled.set(field('type')?.node, {
      views: all.count - host.count,
      host: host.count,
    });
  }
  return evaluateStatements.call(this, url, statements, ...rest);
};

/**
 * One definition: its parts off `consts` and `hostAttrs` (read after the features ran, so a
 * base's host attributes are merged into the class extending it, as its element gets them),
 * and its bindings — those of its own views, and those of the host of the class and of every
 * class up the chain `ɵɵInheritDefinitionFeature` walks, past one with no definition of its
 * own. A class with none of its own is read as the class whose definition it inherits, as
 * Angular renders it: an undecorated subclass is its base. A definition with nothing captured
 * was not compiled from a declaration here — a package compiled in full, or a module evaluated
 * before the hook — and of its bindings this read could say nothing but zero.
 */
const readCompiled = (type) => {
  const def = type['ɵcmp'] ?? type['ɵdir'];
  const own = compiled.get(def.type);
  if (!own)
    throw new PartsError(
      'set',
      `${type.name}: a definition this read did not see compiled — its bindings would ` +
        `read as none.\n    The package read compiles each class's declaration through JIT ` +
        `(\`compilationMode: partial\`); a package compiled in full carries none.`,
    );
  const consts = typeof def.consts === 'function' ? def.consts() : def.consts;
  let dynamic = own.views;
  for (let link = def.type; link; link = Object.getPrototypeOf(link))
    dynamic += compiled.get(link)?.host ?? 0;
  return {
    parts: [
      ...new Set([
        ...(consts ?? []).filter(Array.isArray).flatMap(pairAttributes),
        ...pairAttributes(def.hostAttrs ?? []),
      ]),
    ],
    dynamic,
  };
};

const packageComponents = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new PartsError(
      'set',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
    );

  const exports = JSON.parse(read(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];
  const entrypoints = new Set();

  for (const [entrypoint, target] of Object.entries(exports)) {
    const file = typeof target === 'object' ? target.default : target;
    if (typeof file !== 'string' || !file.endsWith('.mjs')) continue;
    entrypoints.add(entrypoint);

    const module = await import(
      pathToFileURL(join(dist, file.replace(/^\.\//, ''))).href
    );
    for (const [exportedAs, value] of Object.entries(module)) {
      if (typeof value !== 'function' || !(value['ɵcmp'] ?? value['ɵdir']))
        continue;
      out.push({
        entrypoint,
        exportedAs,
        class: value,
        ...readCompiled(value),
      });
    }
  }
  return { pkg: out, entrypoints };
};

/**
 * The sources searched for decorators. Specs are left out on purpose: they define host
 * components with the template written into the decorator, and those travel nowhere —
 * point 1 would fire on every rendering test.
 */
const isSource = (p) =>
  p.startsWith(`${PROJECT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const isTemplate = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');
const isCard = (p) =>
  p.startsWith(`${DOCUMENTS}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

/** An input built from a file list — the same shape for the repo and for a fixture. */
const collectInput = async (root, files, packageFromDisk) => {
  const { pkg, entrypoints } =
    packageFromDisk ?? (await packageComponents(root));
  return {
    ...readSources(root, files.filter(isSource)),
    templates: files
      .filter(isTemplate)
      .map((file) => ({ file, content: read(root, file) })),
    pkg,
    entrypoints,
    documents: files
      .filter(isCard)
      .map((file) => readCard(file, read(root, file))),
    snapshot: existsSync(join(root, SNAPSHOT)) ? read(root, SNAPSHOT) : null,
    readme: files.includes(README) ? read(root, README) : null,
  };
};

/**
 * Files from the GIT INDEX, not from a glob over the disk — the same reason as in
 * `check-styles`, `check-tokens`, `check-zoneless` and `check-typecheck`: the index is an
 * independent record of what the repository really carries.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS: a git pathspec is not a shell
 * glob, and without `:(glob)` a star crosses `/`, so a pattern with a star can return ZERO
 * files rather than an error (`lesson-48`).
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

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, then the deletions
 * from `fixture.json`. The case directory then holds NOTHING BUT its own defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * The package read arrives as DATA (`package.json`) rather than from a real build: building
 * an Angular package for each of a dozen-odd cases would cost minutes per run, and this
 * gate is to run on every commit. The same choice as in `check-zoneless` and for the same
 * reason. A class may carry, instead of `parts` and `dynamic`, the DECLARATION the package
 * would hold for it (as ngc writes it in partial mode), and `declare` compiles it through the
 * JIT compiler and the hook the package goes through, and `readCompiled` reads it. Such a
 * case is a probe of the read run against the compiler installed: an upgrade that moves a
 * binding into another view or renames its instruction turns the case green, and the control
 * red. What no fixture exercises is the way to the package's classes (the manifest's
 * `exports`, the import) and the `consts()` call: no definition here or in the library has
 * `consts` as a function.
 *
 * The sources sit in the repository as `*.ts.txt` and become `*.ts` only here — the same
 * move as in `check-styles` and `check-tokens`: a `.ts` file in `tools/` belongs to no
 * compiler program, so it would fire `check-typecheck` (point 1 — a file with no project).
 * A template prettier would rewrite or refuse — an unquoted value, a comment in a start tag —
 * sits there as `*.html.txt` for the same reason, as in `check-icons`. One gate's fixture
 * must not be another's defect.
 */
const buildFixture = (name, fx) => {
  const target = mkdtempSync(join(tmpdir(), 'pct-check-parts-'));
  cpSync(join(FIXTURES, REFERENCE), target, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), target, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const path of fx.drop ?? [])
    rmSync(join(target, path), { recursive: true, force: true });
  for (const file of globSync('**/*.{ts,html}.txt', { cwd: target }))
    renameSync(join(target, file), join(target, file.replace(/\.txt$/, '')));
  return target;
};

/**
 * A class of a prepared input's package, compiled from its declaration: the fields ngc
 * writes, less those supplied here. `extends` declares a base the same way, beside the
 * `usesInheritance` ngc writes: one no entrypoint exports, or an exported class compiled apart
 * from its own entry, as `PctMarker` under `PctMarkerOutline`; a dependency is named by its
 * selector, and the type standing in for it is no matter to the compile. `undecorated` leaves
 * the class without a definition of its own, as ngc leaves a class with no decorator. `full`
 * defines the class as a package compiled in full would, with no declaration for the read to
 * see compiled.
 */
const declare = ({
  className,
  kind = 'Component',
  extends: base,
  dependencies,
  undecorated,
  full,
  ...fields
}) => {
  const parent = base ? declare(base) : null;
  const type = parent
    ? { [className]: class extends parent {} }[className]
    : { [className]: class {} }[className];
  if (undecorated) return type;
  if (full) {
    type['ɵcmp'] = core.ɵɵdefineComponent({
      type,
      selectors: [[className]],
      decls: 0,
      vars: 0,
      template: () => {},
      ...fields,
    });
    return type;
  }
  const declaration = {
    minVersion: '14.0.0',
    version: core.VERSION.full,
    ngImport: core,
    type,
    isStandalone: true,
    dependencies: dependencies?.map((d) => ({ ...d, type: class {} })),
    ...fields,
  };
  if (kind === 'Directive')
    type['ɵdir'] = core.ɵɵngDeclareDirective(declaration);
  else type['ɵcmp'] = core.ɵɵngDeclareComponent(declaration);
  return type;
};

const fixtureInput = (directory) => {
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  // Every case compiles its own `PctWidget`, and Angular warns (NG0912) of a second class
  // whose definition hashes as an earlier one's. The registry is cleared between cases, as
  // `TestBed` clears it between tests.
  core.ɵresetCompiledComponents();
  return collectInput(
    directory,
    globSync('**/*.{ts,html,md}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    {
      pkg: inNamespaceOrder(pkg.classes.flatMap(packageClass), pkg.entrypoints),
      entrypoints: new Set(pkg.entrypoints),
    },
  );
};

/**
 * One class of a prepared input's package — one object, compiled from its declaration or
 * standing for one read already — as the records the package read gives for it: one per name
 * an entrypoint exports it under. `exports` lists them where the class is exported otherwise
 * than once, from `entrypoint`, under its own name: a re-export from another entrypoint, a
 * second name, a name that is not its own.
 */
const packageClass = (k) => {
  const type = k.declaration
    ? declare({ className: k.className, ...k.declaration })
    : { [k.className]: class {} }[k.className];
  const read = k.declaration
    ? readCompiled(type)
    : { parts: k.parts ?? [], dynamic: k.dynamic ?? 0 };
  return (k.exports ?? [{ entrypoint: k.entrypoint, as: k.className }]).map(
    ({ entrypoint, as }) => ({
      entrypoint,
      exportedAs: as,
      class: type,
      ...read,
    }),
  );
};

/**
 * The records as the package read gives them: the entrypoints in the manifest's order, each
 * one's names in code-unit order, as a module namespace lists them, and none twice in one
 * module. Listed as a case writes them, a class's own name would always come before its other
 * names, and `PctGadget` comes before `PctWidget`.
 */
const inNamespaceOrder = (records, manifest) => {
  const modules = Map.groupBy(records, (r) => r.entrypoint);
  for (const entrypoint of modules.keys())
    if (!manifest.includes(entrypoint))
      throw new Error(
        `\`${entrypoint}\` exports a class and is not in the case's \`entrypoints\``,
      );
  return [...modules]
    .toSorted(([a], [b]) => manifest.indexOf(a) - manifest.indexOf(b))
    .flatMap(([entrypoint, of]) => {
      const names = of.map((r) => r.exportedAs);
      const twice = names.filter((n, i) => names.indexOf(n) !== i);
      if (twice.length)
        throw new Error(
          `\`${entrypoint}\` exports ${twice.join(', ')} twice — no module can`,
        );
      return of.toSorted((a, b) => (a.exportedAs < b.exportedAs ? -1 : 1));
    });
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

// The maintenance path: rewrite a fixture's snapshot and exit. A fixture has a snapshot of
// its own and has to get it from the same renderer as the repository — otherwise the
// reference input stops passing at the first change to the file's format.
if (WRITE_FIXTURE) {
  const directory = buildFixture(WRITE_FIXTURE, {});
  const target = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    checkParts(await fixtureInput(directory));
    console.log(`✓ ${WRITE_FIXTURE}: the snapshot was already current.`);
  } catch (error) {
    if (!(error instanceof PartsError) || error.check !== 'snapshot')
      throw error;
    writeFileSync(target, error.snapshot);
    console.log(`✓ Rewrote ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const result = checkParts(await collectInput(ROOT, repoFiles(), null));
  description = result.description;
} catch (error) {
  if (!(error instanceof PartsError)) throw error;
  // `--write` exists so that a snapshot drift can be accepted with one command. Every
  // other point stays an error under it too: rewriting the snapshot is no answer to a part
  // brought in by a binding.
  if (WRITE && error.check === 'snapshot') {
    writeFileSync(join(ROOT, SNAPSHOT), error.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-parts.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false — this
// control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkParts(await fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof PartsError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const readCase = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));

/**
 * What the runner reports of one prepared case: nothing, when it was rejected on its own point
 * and says what it pins. The loop plays every case through it, and so does the runner's own
 * control (`runner-control.mjs`).
 */
const runCase = async (name, fx) => {
  const said = [];
  // One check, several refusals: point 1 throws sixteen ways, all of them `denominator`, and the
  // lines of a list say which of two reads or which part disagreed. A case names a fragment of
  // the refusal it declares, and the fragment is held, so a change that moves the case onto a
  // neighbouring refusal is a failure here and not a pass. `no-sources` fired "templates belong
  // to no decorator" for as long as the check alone was compared. The fragment is required:
  // a case that names none holds its refusal to nothing, and a blank one is in every message.
  const named = typeof fx.message === 'string' && fx.message.trim() !== '';
  if (!named)
    said.push(
      `${name}: \`fixture.json\` names no \`message\` — a fragment of the refusal the case ` +
        `declares, which point ${fx.point} (\`${fx.check}\`) shares with its other refusals`,
    );
  const directory = buildFixture(name, fx);
  try {
    checkParts(await fixtureInput(directory));
    said.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof PartsError)) throw error;
    if (error.check !== fx.check)
      said.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
    else if (named && !error.message.includes(fx.message))
      said.push(
        `${name}: point ${fx.point} (\`${fx.check}\`) fired without "${fx.message}" — another ` +
          `refusal of the same check than the one the fixture declares:\n    ${error.message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return said;
};

for (const name of cases)
  problems.push(...(await runCase(name, readCase(name))));

// The runner refuses a fragment it cannot hold a refusal to as well, so the control pins the
// case to the shapes of one beside the neighbour's words: none, and a blank one.
problems.push(
  ...(await runnerControl({
    where: `tools/check-parts.fixtures/${RUNNER}`,
    control: JSON.parse(readFileSync(join(FIXTURES, RUNNER), 'utf8')),
    cases,
    read: readCase,
    run: runCase,
    pin: (fx, message) => ({ ...fx, message }),
  })),
);

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Part inventory gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Parts: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points, and the runner reports a ` +
    `case pinned to a phrase its refusal lacks, or to none.`,
);
