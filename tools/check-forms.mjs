#!/usr/bin/env node
/**
 * Form-control contract gate: does `req-api-signal-forms` — a control carries the WHOLE
 * signal-forms state block, the same way in every one of them — have a measurement behind
 * it? Every member of `FormUiControl` is optional, so `implements` proves only `value`.
 *
 *  1. DENOMINATOR: sources parse, headers and controls paired, contract read, controls found,
 *  2. CONTRACT: every name the block policy declares is really a member of `FormUiControl`,
 *  3. BLOCK: every control declares every member of the block,
 *  4. SHAPE: factory, default and transform identical in every control, character for character.
 *
 * The contract's member list is read from `@angular/forms`'s own declarations, never copied
 * here (`lesson-122`); the PROSE above those members is deliberately not held. A fifth run
 * examines the gate itself (`req-quality-negative-control`): `check-forms.fixtures/`.
 *
 * Usage: node tools/check-forms.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { classesOf, classKey } from './class-bases.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const POLICY = `${PROJECT}/forms.policy.json`;
const CONTRACT = 'node_modules/@angular/forms/types/signals.d.ts';
const FIXTURES = join(ROOT, 'tools/check-forms.fixtures');
const REFERENCE = '_reference';

/** The interface whose members the block is drawn from, in the dependency's declarations. */
const CONTRACT_INTERFACE = 'FormUiControl';

/**
 * The contracts a class implements to BE a control — the two shapes signal forms offers — by the
 * names `@angular/forms/signals` exports them under.
 */
const CONTRACTS = new Set(['FormValueControl', 'FormCheckboxControl']);

/**
 * A member declaration, as this library and Angular's own guide write them:
 *
 *     readonly invalid = input(false, { transform: booleanAttribute });
 *
 * Anchored at two spaces, where prettier puts a member of a top-level class: the anchor finds the
 * declarations, and the parser says whose each one is (`classesIn`). No list of factories: every
 * `readonly` member is read, whatever it is assigned, so a control cannot leave the
 * denominator by being written in an unusual way. `readonly` itself IS required, which is
 * how every signal member in this library is declared — one written without it is missing
 * from the block and says so.
 */
const MEMBER = /^ {2}readonly (\w+) = ([\s\S]*?);$/dgm;

/**
 * `export class X`, `export abstract class X<T> extends Y implements Z {` — the name, and where
 * it stands. The heritage is not read here: what a class extends is the parser's
 * (`class-bases.mjs`), and so is what it implements (`parsedIn`). A class the pattern does
 * not reach — one written without `export`, exported as the default, nested and indented, or a
 * class expression — is no class of the reading, and point 1 refuses one that implements a
 * contract.
 */
const CLASS = /^export (?:abstract )?class (\w+)/dgm;

/**
 * A violation. It carries the point's `check` AND its `rule`: point 1 has six rules and a
 * case firing on a neighbouring one proves something other than what it declares
 * (`lesson-50`).
 */
class FormsError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (items) => items.map((t) => `      ${t}`).join('\n');

// ── the reading ───────────────────────────────────────────────────────────────

/**
 * The classes of one source file the pattern reads a header for, and the members each declares.
 * The pattern finds the declarations and the parser says whose they are (`owners`): a member is
 * the property whose name stands where the pattern reads the member's, of the class whose name
 * the header stands at. A declaration the parser holds as no property, a line in a comment or a
 * string, is no member. One of a class no header stands at is that class's: no control (point 1
 * refuses one that is), and a base no header stands at hands down nothing, which point 3 can
 * refuse a control for and never pass one. By position, the last header above it, a class of
 * no header lent what it declares at two spaces to the control above, a commented line was a
 * member, and a control without `disabled` or `touched` passed on either (measured).
 */
const classesIn = (file, text, owners) => {
  const headers = [...text.matchAll(CLASS)].map((m) => ({
    name: m[1],
    nameAt: m.indices[1][0],
    line: text.slice(0, m.index).split('\n').length,
    members: new Map(),
  }));
  for (const m of text.matchAll(MEMBER)) {
    const owner = headers.find((h) => h.nameAt === owners.get(m.indices[1][0]));
    const member = {
      name: m[1],
      // The declaration, whitespace collapsed: a member wrapped over two lines by prettier
      // and one written on a single line are the same declaration, and a gate that called
      // them different would fire on the formatter.
      text: m[2].replace(/\s+/g, ' ').trim(),
      file,
      line: text.slice(0, m.index).split('\n').length,
    };
    owner?.members.set(member.name, member);
  }
  return headers;
};

/**
 * What the TypeScript parser holds of one source file, at every depth, exported or not:
 *   `implementers` — the classes implementing a contract, by the offset their name stands at (a
 *                    class with no name: where it starts), to their name and line,
 *   `owners`       — every property of a class, by the offset its name stands at, to its class's.
 * The pattern sees a header at the margin and nothing else: a control written without `export`,
 * nested in a function, a namespace or a method, or written as a class expression had none, and
 * the gate measured fewer controls than the library has — passing five such inputs, and
 * refusing a sixth on its members rather than on the control they belong to (measured).
 *
 * A contract is a type of the class's own `implements` clause, in any position, or a type within
 * one (`Readonly<FormValueControl<T>>`, which compiles and passed), so a contract wrapped in any
 * type makes a control: that errs toward measuring a class, never toward leaving one out. It is
 * named by a named import of the file under the contract's name, from whatever module — through
 * `FormValueControl as PctValueContract`, `PctValueContract` is the contract — or by the last
 * part of a qualified name, `signals.FormValueControl` through a namespace import. A name no
 * named import binds is none: an interface the file declares under a contract's name is what
 * TypeScript binds the name to there. Not read is a contract reached through another name of the
 * sources — a type alias (`type PctContract<T> = FormValueControl<T>`), an interface extending
 * one, a re-export under another name — or through a base that implements it: what is read is
 * the clause, not the type TypeScript's checker resolves it to. A class's `extends` clause is
 * not read: a class of the sources may carry a contract's name, and one extending it is no
 * control (`lookalike.ts` in the reference input).
 */
const parsedIn = (file, text) => {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imported = new Map(
    source.statements.flatMap((statement) => {
      const bound = ts.isImportDeclaration(statement)
        ? statement.importClause?.namedBindings
        : undefined;
      return bound !== undefined && ts.isNamedImports(bound)
        ? bound.elements.map((element) => [
            element.name.text,
            (element.propertyName ?? element.name).text,
          ])
        : [];
    }),
  );
  const contract = (name) =>
    ts.isIdentifier(name)
      ? imported.get(name.text)
      : ts.isPropertyAccessExpression(name)
        ? name.name.text
        : ts.isQualifiedName(name)
          ? name.right.text
          : undefined;
  // A type of the clause names its contract by an expression, and a type within it by a type name.
  const reaches = (node) =>
    CONTRACTS.has(
      ts.isExpressionWithTypeArguments(node)
        ? contract(node.expression)
        : ts.isTypeReferenceNode(node)
          ? contract(node.typeName)
          : undefined,
    ) || ts.forEachChild(node, reaches) === true;
  const where = (node) => (node.name ?? node).getStart(source);
  const implementers = new Map();
  const owners = new Map();
  const visit = (node) => {
    if (
      ts.isClassLike(node) &&
      node.heritageClauses?.some(
        (clause) =>
          clause.token === ts.SyntaxKind.ImplementsKeyword &&
          clause.types.some(reaches),
      )
    )
      implementers.set(where(node), {
        name: node.name?.text ?? 'a class with no name',
        line: source.getLineAndCharacterOfPosition(where(node)).line + 1,
      });
    // A property's parent is the class that declares it, a class expression's included.
    if (ts.isPropertyDeclaration(node))
      owners.set(node.name.getStart(source), where(node.parent));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { implementers, owners };
};

/**
 * The library's classes, keyed by name AND file (`class-bases.mjs`), with what each one
 * declares and what it stands on. Two exported classes of one name are legal TypeScript, and
 * keyed by the name alone the one read later took the other's place: a control without its
 * block vanished behind a namesake that is no control, and point 3 passed (measured). `extends`
 * is followed later, at the point that needs it: a base is a class of this library like any
 * other, and resolving the chain here would hide which file a member really came from. What is
 * resolved here is which class the base stands for — the one TypeScript binds the name in its
 * `extends` clause to (`class-bases.mjs`), and not a class of that name anywhere else. A header
 * the pattern reads where the parser holds no class at the top level is none of the library's,
 * and is set aside for point 1: one in a comment took the place of the control of its name in
 * the same file, and the control's missing `touched` passed (measured). The pairing is by where
 * the name stands, not by the name: the one in the comment and the control share a key.
 *
 * A class is a control when the parser holds one implementing a contract where its name stands
 * (`parsedIn`), and each such class is taken off the parser's list as its header pairs
 * with it. What remains is a control no header stands at, set aside for point 1 as well: by
 * where the name stands again, so a control nested beside a header of its name is not that one.
 */
const readSources = (root, files) => {
  const classes = new Map();
  const unheld = [];
  const unread = [];
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  );
  const bases = classesOf(contents);
  for (const [file, content] of contents) {
    const { implementers, owners } = parsedIn(file, content);
    for (const header of classesIn(file, content, owners)) {
      const key = classKey(file, header.name);
      const held = bases.get(key);
      if (held?.at !== header.nameAt) {
        unheld.push(`${file}:${header.line}: ${header.name}`);
        continue;
      }
      classes.set(key, {
        ...header,
        file,
        from: held.from,
        control: implementers.delete(header.nameAt),
      });
    }
    for (const { name, line } of implementers.values())
      unread.push(`${file}:${line}: ${name}`);
  }
  return { classes, unheld, unread };
};

/**
 * The members of `FormUiControl`, from the dependency's own declarations. Read by brace
 * depth rather than by a pattern over the whole file: the interface holds a member per
 * paragraph of JSDoc, and the next interface after it holds members of its own.
 */
const readContract = (text) => {
  if (text === null) return null;
  const start = text.indexOf(`interface ${CONTRACT_INTERFACE}`);
  if (start < 0) return null;
  const open = text.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const body = text.slice(open, end);
  return new Set(
    [...body.matchAll(/^ {4}readonly (\w+)\??:/gm)].map((m) => m[1]),
  );
};

/**
 * The controls, with every member they carry — their own and their bases'. A base is the class
 * its name stands for in the file that extends it, and a base this reading has not got — one
 * no file exports, or a package's — hands down nothing: what a control would inherit from it is
 * missing from what point 3 reads, which can refuse a control and never pass one.
 *
 * A link is the class TypeScript binds the base's name to (`class-bases.mjs`), keyed by its file,
 * so the chain is the one TypeScript builds: a cycle in it is one the compiler refuses as well
 * (TS2506, a class named in its own base expression), and no build compiles it. `seen` guards
 * nothing the gate is handed, and dropping it is equivalent on every input that compiles and whose
 * directories carry no `package.json`, which `class-bases.mjs` does not read.
 */
const controlsOf = (classes) => {
  const inherited = (key, seen = new Set()) => {
    const cls = classes.get(key);
    if (!cls || seen.has(key)) return new Map();
    seen.add(key);
    // The base FIRST, so a leaf redeclaring a member wins — which is what TypeScript does,
    // and the file the violation names then has to be the file a reader would edit.
    return new Map([...inherited(cls.from, seen), ...cls.members]);
  };
  return [...classes]
    .filter(([, c]) => c.control)
    .map(([key, c]) => ({
      name: c.name,
      file: c.file,
      members: inherited(key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * The four points over a ready input:
 *   `policy`   — the block declared in `forms.policy.json`, or null,
 *   `classes`  — every class of the sources a header stands at, by name and file,
 *   `unheld`   — class headers where the parser holds no top-level class,
 *   `unread`   — classes implementing a contract where the reading reads no header,
 *   `contract` — the member names of `FormUiControl`, or null,
 *   `files`    — how many source files were read.
 * Throws on the first violation: the points run from the most basic, so a later one would
 * be examining an input nobody has established anything about.
 */
const checkForms = ({ policy, classes, unheld, unread, contract, files }) => {
  // ── 1. DENOMINATOR ──────────────────────────────────────────────────────────
  const block = policy?.block;
  if (!Array.isArray(block) || block.length === 0)
    throw new FormsError(
      'denominator',
      'no-policy',
      `\`${POLICY}\` declares no block — the members every control of this library ` +
        `carries are then whatever the last control to be written happens to have. The ` +
        `list cannot be derived from the contract: every member of \`${CONTRACT_INTERFACE}\` ` +
        `is optional, so the dependency admits a control with none of them.`,
    );

  if (!classes.size)
    throw new FormsError(
      'denominator',
      'no-classes',
      `the reading holds no class in ${files} source file(s) of \`${PROJECT}\` — the points ` +
        `below would then all be measuring an empty set and passing`,
    );

  if (unheld.length)
    throw new FormsError(
      'denominator',
      'header-without-class',
      `${unheld.length} class header(s) stand where the TypeScript parser holds no class at ` +
        `the top level of the file:\n` +
        list(unheld) +
        `\n    A header in a comment, or a class inside a namespace or a function, is no ` +
        `class of the library, and read as one it takes the place of the class of its name ` +
        `in the same file.`,
    );

  if (unread.length)
    throw new FormsError(
      'denominator',
      'control-unread',
      `${unread.length} class(es) implement a form contract where the reading reads no ` +
        `class header:\n` +
        list(unread) +
        `\n    The reading takes a class from \`export class\` or \`export abstract class\` ` +
        `at the margin, and a control written without \`export\`, exported as the default, ` +
        `nested in a function, a namespace or a method, or written as a class expression ` +
        `has no such header: it is a control no point examines, and the gate measures ` +
        `fewer controls than the library has.`,
    );

  if (contract === null || contract.size === 0)
    throw new FormsError(
      'denominator',
      'no-contract',
      `\`${CONTRACT_INTERFACE}\` was not readable from \`${CONTRACT}\` — point 2 then has ` +
        `nothing to hold the policy against, and a typo in the block would be a member ` +
        `name nobody binds and nobody reports`,
    );

  const controls = controlsOf(classes);
  if (!controls.length)
    throw new FormsError(
      'denominator',
      'no-controls',
      `not one class implements \`FormValueControl\` or \`FormCheckboxControl\` in ` +
        `${files} source file(s) — points 3 and 4 would pass over an empty list, which is ` +
        `exactly how a gate goes quiet when the sources move`,
    );

  // ── 2. CONTRACT ─────────────────────────────────────────────────────────────
  const strangers = block.filter((name) => !contract.has(name));
  if (strangers.length)
    throw new FormsError(
      'contract',
      'outside-the-contract',
      `${strangers.length} name(s) of the block are no member of ` +
        `\`${CONTRACT_INTERFACE}\`:\n` +
        list(strangers) +
        `\n    The \`Field\` directive binds the contract's members by name, so a name ` +
        `outside it is bound by nobody. Nothing would report that: every member of the ` +
        `contract is optional, so the misspelt input is simply an input of this library ` +
        `that the form never writes to.`,
    );

  // ── 3. BLOCK ────────────────────────────────────────────────────────────────
  const missing = controls.flatMap((c) =>
    block
      .filter((name) => !c.members.has(name))
      .map((name) => `${c.file}: ${c.name} has no \`${name}\``),
  );
  if (missing.length)
    throw new FormsError(
      'block',
      'member-missing',
      `${missing.length} member(s) of the block are not declared:\n` +
        list(missing) +
        `\n    Every member of \`${CONTRACT_INTERFACE}\` is optional, so this compiles ` +
        `and the control simply never learns that state — an invalid field that never ` +
        `opens red, a readonly one that goes on taking input. What a consumer sees is a ` +
        `control that ignores the form it is bound to.`,
    );

  // ── 4. SHAPE ────────────────────────────────────────────────────────────────
  const drift = [];
  for (const name of block) {
    const variants = new Map();
    for (const control of controls) {
      const declaration = control.members.get(name);
      // A SET of places, because two tags standing on one base are two controls reading the
      // same line, and a line printed twice reads as two copies that agree with each other.
      const seen = variants.get(declaration.text) ?? new Set();
      seen.add(`${declaration.file}:${declaration.line}`);
      variants.set(declaration.text, seen);
    }
    if (variants.size === 1) continue;
    drift.push(
      `\`${name}\` is declared ${variants.size} different ways:\n` +
        [...variants]
          .map(
            ([text, where]) =>
              `        ${text}\n          ${[...where].sort().join(', ')}`,
          )
          .join('\n'),
    );
  }
  if (drift.length)
    throw new FormsError(
      'shape',
      'shape-drift',
      `${drift.length} member(s) of the block are not declared the same way ` +
        `everywhere:\n` +
        list(drift) +
        `\n    The transforms are the half that breaks quietly: without ` +
        `\`booleanAttribute\`, \`<pct-x invalid>\` passes the string \`''\`, which is ` +
        `falsy — the control is valid for ever and the template that says otherwise is ` +
        `right there in the consumer's file. The prose above these members is NOT held ` +
        `and differs on purpose: what \`readonly\` means is the control's own knowledge.`,
    );

  // The sites are counted from where the MEMBERS stand, not from where the controls do:
  // two tags over one abstract class are two controls and one copy of the block, and the
  // number worth printing is how many copies there are to drift.
  const sites = new Set(
    controls.flatMap((c) => block.map((name) => c.members.get(name).file)),
  );
  return (
    `${controls.length} controls carrying the block from ${sites.size} declaration ` +
    `site(s), ${block.length} members each declared one way, ` +
    `${contract.size} members in the contract, ${classes.size} classes read`
  );
};

// ── reading the repository ────────────────────────────────────────────────────

const read = (root, file) =>
  existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : null;

const sourcesIn = (root, files) =>
  files.filter(
    (p) =>
      /^libs\/components\/[^/]+\/src\/.+\.ts$/.test(p) &&
      !p.endsWith('.spec.ts'),
  );

const gatherInput = (root, files) => {
  const sources = sourcesIn(root, files);
  const { classes, unheld, unread } = readSources(root, sources);
  return {
    policy: JSON.parse(read(root, POLICY) ?? 'null'),
    classes,
    unheld,
    unread,
    contract: readContract(read(root, CONTRACT)),
    files: sources.length,
  };
};

const repoFiles = () =>
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
 * A case's input, built ON A COPY of the reference one so the case directory holds nothing
 * but its own defect.
 *
 * The dependency's declarations come from the REPOSITORY and are copied into the tree under
 * the path the gate reads them from, so the reference re-probes the real contract exactly as
 * the live run does — a `node_modules` path is nothing git would track, so a case that needs
 * a doctored contract carries the text in its `fixture.json` (`contract`, or `null` for
 * none) rather than as a file.
 *
 * The sources sit in the repository as `*.ts.txt` and become `*.ts` only here — a `.ts` file
 * in `tools/` belongs to no compiler program, so it would fire `check-typecheck`. One gate's
 * fixture must not be another's defect.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-forms-'));
  cpSync(join(FIXTURES, REFERENCE), destination, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), destination, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const path of fx.drop ?? [])
    rmSync(join(destination, path), { recursive: true, force: true });
  const contract = 'contract' in fx ? fx.contract : read(ROOT, CONTRACT);
  if (contract !== null) {
    mkdirSync(join(destination, dirname(CONTRACT)), { recursive: true });
    writeFileSync(join(destination, CONTRACT), contract);
  }
  for (const file of globSync('**/*.ts.txt', { cwd: destination }))
    renameSync(
      join(destination, file),
      join(destination, file.replace(/\.txt$/, '')),
    );
  return destination;
};

const fixtureInput = (directory) =>
  gatherInput(
    directory,
    globSync('**/*.ts', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkForms(gatherInput(ROOT, repoFiles()));
} catch (error) {
  if (!(error instanceof FormsError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-forms.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkForms(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof FormsError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name, fx);
  try {
    checkForms(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}/${fx.rule}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof FormsError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: \`${error.check}/${error.rule}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}/${fx.rule}\`) was meant to — the fixture proves something ` +
          `other than what it declares`,
      );
    // A rule that names what it found says it in the message, and a case may hold that too.
    else if (fx.message !== undefined && !error.message.includes(fx.message))
      problems.push(
        `${name}: \`${fx.check}/${fx.rule}\` fired without "${fx.message}" — the right rule ` +
          `saying something else:\n    ${error.message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(
    `X Form-control contract gate — ${problems.length} violations:\n`,
  );
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Forms: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
