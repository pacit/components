#!/usr/bin/env node
/**
 * Form-control contract gate: `req-api-signal-forms` — a control of this library carries the
 * WHOLE state block of the signal-forms contract, and carries it the same way in every one
 * of them.
 *
 * The reason it exists is a fact about the contract rather than a suspicion about the
 * authors: in `FormUiControl` **every member is optional**. `implements FormValueControl`
 * therefore proves one thing, that a `value` model exists, and says nothing at all about
 * `invalid`, `touched`, `errors` or the rest — a control omitting one compiles, and so does
 * a control declaring `invalid` with no `booleanAttribute`, which then reads `invalid=""`
 * from a template as the string `''` and is falsy for ever after. Eight controls carry the
 * block today, from seven declaration sites, and only a person comparing the files can see
 * that they agree.
 *
 *  1. DENOMINATOR: the sources parse, every member declaration is attributed to a class,
 *     the contract is read from the dependency, and controls are found,
 *  2. CONTRACT: every name the block policy declares is really a member of `FormUiControl`,
 *  3. BLOCK: every control declares every member of the block,
 *  4. SHAPE: a block member is declared the SAME way in every control — the factory, the
 *     default and the transform, character for character.
 *
 * A fifth run examines the gate itself (`req-quality-negative-control`):
 * `check-forms.fixtures/`.
 *
 * What this gate deliberately does NOT hold is the PROSE. The JSDoc above these members
 * differs across the controls and it is right that it does — `readonly` has six different
 * true sentences here, because a native checkbox has no `readonly` and swallows the click
 * while a date field hands it to the input and disables the calendar button. A member with
 * no JSDoc at all is already red one gate over: the content pass
 * (`apps/docs/tools/build-content.mjs`) refuses a member without one.
 *
 * The contract's member list is read from `@angular/forms`'s own type declarations and not
 * copied here — a list typed into this file would be a promise about somebody else's package
 * that nothing re-measures, which is `lesson-122`'s shape.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const POLICY = `${PROJECT}/forms.policy.json`;
const CONTRACT = 'node_modules/@angular/forms/types/signals.d.ts';
const FIXTURES = join(ROOT, 'tools/check-forms.fixtures');
const REFERENCE = '_reference';

/** The interface whose members the block is drawn from, in the dependency's declarations. */
const CONTRACT_INTERFACE = 'FormUiControl';

/** The contracts a class implements to BE a control — the two shapes signal forms offers. */
const CONTRACTS = /\b(FormValueControl|FormCheckboxControl)\b/;

/**
 * A member declaration, as this library and Angular's own guide write them:
 *
 *     readonly invalid = input(false, { transform: booleanAttribute });
 *
 * Anchored at two spaces because that is a member of a top-level class and nothing else — a
 * local inside a method stands deeper, a module constant at the margin. The anchor is what
 * makes point 1's attribution honest rather than clever. No list of factories: every
 * `readonly` member is read, whatever it is assigned, so a control cannot leave the
 * denominator by being written in an unusual way. `readonly` itself IS required, which is
 * how every signal member in this library is declared — one written without it is missing
 * from the block and says so.
 */
const MEMBER = /^ {2}readonly (\w+) = ([\s\S]*?);$/gm;

/**
 * `export class X`, `export abstract class X<T> extends Y implements Z {` — the name and the
 * heritage, which may run over three lines as prettier writes it. `[^{]*` reaches the body's
 * own brace and stops there; a heritage carrying a brace of its own would leave the class
 * unfound, and its members then become point 1's `unattributed`, which is the reading saying
 * so rather than guessing.
 */
const CLASS = /^export (?:abstract )?class (\w+)([^{]*)\{/gm;

/**
 * A violation. It carries the point's `check` AND its `rule`: point 1 has four rules and a
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
 * The classes of one source file and the members each declares. A class runs from its own
 * header to the next one, which is enough here and is not a parser: these files hold one
 * exported class each, or a base and its leaf, never a class inside a class. What the
 * arrangement buys is that the LAST header before a member is the class that owns it, and
 * point 1 counts the members that found no header at all.
 */
const classesIn = (file, text) => {
  const headers = [...text.matchAll(CLASS)].map((m) => ({
    name: m[1],
    heritage: m[0],
    at: m.index,
    line: text.slice(0, m.index).split('\n').length,
    members: new Map(),
  }));
  const orphans = [];
  for (const m of text.matchAll(MEMBER)) {
    const owner = [...headers].reverse().find((h) => h.at < m.index);
    const member = {
      name: m[1],
      // The declaration, whitespace collapsed: a member wrapped over two lines by prettier
      // and one written on a single line are the same declaration, and a gate that called
      // them different would fire on the formatter.
      text: m[2].replace(/\s+/g, ' ').trim(),
      file,
      line: text.slice(0, m.index).split('\n').length + 1,
    };
    if (!owner) orphans.push(`${file}:${member.line}: ${member.name}`);
    else owner.members.set(member.name, member);
  }
  return { headers, orphans };
};

/**
 * The library's classes, keyed by name, with what each one declares and what it stands on.
 * `extends` is followed later, at the point that needs it: a base is a class of this library
 * like any other, and resolving the chain here would hide which file a member really
 * came from.
 */
const readSources = (root, files) => {
  const classes = new Map();
  const orphans = [];
  for (const file of files) {
    const { headers, orphans: loose } = classesIn(
      file,
      readFileSync(join(root, file), 'utf8'),
    );
    orphans.push(...loose);
    for (const header of headers)
      classes.set(header.name, {
        ...header,
        file,
        base: /\bextends\s+(\w+)/.exec(header.heritage)?.[1] ?? null,
        control: CONTRACTS.test(header.heritage),
      });
  }
  return { classes, orphans };
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

/** The controls, with every member they carry — their own and their bases'. */
const controlsOf = (classes) => {
  const inherited = (name, seen = new Set()) => {
    const cls = classes.get(name);
    if (!cls || seen.has(name)) return new Map();
    seen.add(name);
    // The base FIRST, so a leaf redeclaring a member wins — which is what TypeScript does,
    // and the file the violation names then has to be the file a reader would edit.
    return new Map([
      ...(cls.base ? inherited(cls.base, seen) : []),
      ...cls.members,
    ]);
  };
  return [...classes.values()]
    .filter((c) => c.control)
    .map((c) => ({ name: c.name, file: c.file, members: inherited(c.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * The four points over a ready input:
 *   `policy`   — the block declared in `forms.policy.json`, or null,
 *   `classes`  — every class of the sources, by name,
 *   `orphans`  — member declarations no class header stands above,
 *   `contract` — the member names of `FormUiControl`, or null,
 *   `files`    — how many source files were read.
 * Throws on the first violation: the points run from the most basic, so a later one would
 * be examining an input nobody has established anything about.
 */
const checkForms = ({ policy, classes, orphans, contract, files }) => {
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
      `no class parsed out of ${files} source file(s) of \`${PROJECT}\` — the points ` +
        `below would then all be measuring an empty set and passing`,
    );

  if (orphans.length)
    throw new FormsError(
      'denominator',
      'unattributed',
      `${orphans.length} member declaration(s) stand above every class header:\n` +
        list(orphans) +
        `\n    A member the reading could not attribute is a member no point examines. ` +
        `The attribution is positional — the last header before the declaration owns it — ` +
        `so this fires when a file is shaped in a way the reading was not written for, ` +
        `which is the moment to widen it rather than to guess.`,
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
  const { classes, orphans } = readSources(root, sources);
  return {
    policy: JSON.parse(read(root, POLICY) ?? 'null'),
    classes,
    orphans,
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
