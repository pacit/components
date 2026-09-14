#!/usr/bin/env node
/**
 * Harness gate: `req-api-harness` — one harness per component, a DECLARATION over the
 * `data-pct-part` contract. Nothing in one proves itself, so every declaration is held to the
 * BUILT package, both ways, the way the cards are:
 *
 *  1. SET: `./testing` is exported and every harness is a `PctHarness` with distinct parts,
 *  2. HOST: a `hostSelector` is verbatim one exported class's list, and no class has two,
 *  3. EVERY: every class that draws a part has a harness,
 *  4. PARTS: a harness names exactly the parts its class draws, neither more nor fewer,
 *  5. TYPES: the union offered after `part(` is that same list, one inventory read twice,
 *  6. CARDS: a card's **Harness** row names existing harnesses of its own entrypoint, and
 *     every harness stands on some card.
 *
 * The package is read the way `check-parts` reads it, after linking, so the selectors and
 * parts are what a consumer really gets.
 *
 * Usage: node tools/check-harness.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = 'dist/libs/components';
const DECLARATIONS = `${DIST}/types/pacit-components-testing.d.ts`;
const DOCUMENTS = 'docs/components';
const FIXTURES = join(ROOT, 'tools/check-harness.fixtures');
const REFERENCE = '_reference.json';
const TESTING = './testing';
const ATTRIBUTE = 'data-pct-part';
// A form to copy and a directory note — neither is a card (the same two `check-parts` leaves out).
const NOT_A_CARD = new Set(['_template.md', 'README.md']);

class HarnessError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const list = (entries) => entries.map((w) => `      ${w}`).join('\n');
const sorted = (xs) => [...xs].sort();
const quoted = (xs) => xs.map((x) => `\`${x}\``).join(', ');

// ── the package ────────────────────────────────────────────────────────────────

/**
 * `ɵcmp.selectors` rendered as the CSS a consumer writes — `[["button","pctButton",""]]`
 * is `button[pctButton]`, `[["","pctTheme",""]]` is `[pctTheme]`, two entries are a list.
 * A number in the array is a flag (`:not`), a shape no class here has; the gate refuses it
 * rather than render half a selector and compare the half.
 */
const renderSelectors = (selectors, className) =>
  (selectors ?? [])
    .map((one) => {
      let out = one[0] ?? '';
      for (let i = 1; i < one.length; i += 2) {
        const name = one[i];
        const value = one[i + 1];
        if (typeof name !== 'string' || typeof value !== 'string')
          throw new HarnessError(
            'set',
            `${className}: a selector with a flag this gate does not read ` +
              `(${JSON.stringify(one)}) — teach it the shape before trusting point 2`,
          );
        out +=
          name === 'class'
            ? `.${value}`
            : value
              ? `[${name}="${value}"]`
              : `[${name}]`;
      }
      return out;
    })
    .join(', ');

/** The static attributes' prefix of a `consts` entry, read as `check-parts` reads it. */
const pairAttributes = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i++) {
    if (typeof attrs[i] === 'number') break;
    if (attrs[i] === ATTRIBUTE) out.push(attrs[i + 1]);
    i++;
  }
  return out;
};

const partsOf = (def) => {
  const consts =
    typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
  return sorted(
    new Set([
      ...consts.filter(Array.isArray).flatMap(pairAttributes),
      ...pairAttributes(def.hostAttrs ?? []),
    ]),
  );
};

const isClass = (v) =>
  typeof v === 'function' &&
  /^class[\s{]/.test(Function.prototype.toString.call(v));

/** The harnesses of the testing module — every exported class but the base itself. */
const harnessesOf = (module) => {
  const Base = module.PctHarness;
  return {
    base: typeof Base === 'function',
    list: Object.entries(module)
      .filter(([, v]) => isClass(v) && v !== Base)
      .map(([className, H]) => ({
        className,
        hostSelector: H.hostSelector,
        parts: Array.isArray(H.parts) ? [...H.parts] : H.parts,
        base: typeof Base === 'function' && H.prototype instanceof Base,
      })),
  };
};

const readPackage = async () => {
  if (!existsSync(join(ROOT, DIST, 'package.json')))
    throw new HarnessError(
      'set',
      `no built package in ${DIST} — this gate reads the artifact, not the sources.\n` +
        `    The target needs a \`dependsOn\` on the library's build.`,
    );
  await import('@angular/compiler');
  const exportsMap = JSON.parse(read(`${DIST}/package.json`)).exports ?? {};
  const classes = [];
  let harnesses = null;
  for (const [entrypoint, target] of Object.entries(exportsMap)) {
    const file = typeof target === 'object' ? target.default : target;
    if (typeof file !== 'string' || !file.endsWith('.mjs')) continue;
    const module = await import(
      pathToFileURL(join(ROOT, DIST, file.replace(/^\.\//, ''))).href
    );
    if (entrypoint === TESTING) {
      harnesses = harnessesOf(module);
      continue;
    }
    for (const [className, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const def = value['ɵcmp'] ?? value['ɵdir'];
      if (!def) continue;
      const selector = renderSelectors(def.selectors, className);
      // A class with no selector has no host — there is nothing for a harness to stand on.
      if (!selector) continue;
      classes.push({ entrypoint, className, selector, parts: partsOf(def) });
    }
  }
  return { classes, harnesses };
};

// ── the declaration file ───────────────────────────────────────────────────────

/** `declare class PctButtonHarness extends PctHarness<'label' | 'spinner'>` → the names. */
const declaredUnions = (text) => {
  const out = new Map();
  for (const m of text.matchAll(
    /declare class (\w+) extends PctHarness<([^>]*)>/g,
  )) {
    const union = m[2].trim();
    out.set(
      m[1],
      union === 'never'
        ? []
        : sorted(
            union.split('|').map((s) => s.trim().replace(/^['"]|['"]$/g, '')),
          ),
    );
  }
  return out;
};

// ── the cards ──────────────────────────────────────────────────────────────────

const ENTRYPOINT = /^\*\*Entrypoint:\*\*\s*`@pacit\/components(\/[a-z-]+)?`/m;
const HARNESS_ROW = /^\|\s*\*\*Harness\*\*\s*\|(.*)\|\s*$/m;

const readCards = () =>
  readdirSync(join(ROOT, DOCUMENTS))
    .filter((f) => f.endsWith('.md') && !NOT_A_CARD.has(f))
    .sort()
    .map((file) => {
      const text = read(`${DOCUMENTS}/${file}`);
      const heading = text.match(ENTRYPOINT);
      const row = text.match(HARNESS_ROW);
      return {
        file,
        entrypoint: heading ? `.${heading[1] ?? ''}` : null,
        harnesses: row
          ? [...row[1].matchAll(/`(\w+)`/g)].map((m) => m[1])
          : null,
      };
    });

const readInput = async () => ({
  ...(await readPackage()),
  declarations: existsSync(join(ROOT, DECLARATIONS))
    ? read(DECLARATIONS)
    : null,
  documents: readCards(),
});

// ── the points ─────────────────────────────────────────────────────────────────

const checkHarness = (input) => {
  const { classes, harnesses, declarations, documents } = input;

  // 1. The set — what the package hands a consumer, and its shape.
  if (!harnesses)
    throw new HarnessError(
      'set',
      `the packed manifest exports no \`${TESTING}\` — the entrypoint the harnesses ` +
        `travel in is not in the package, and a consumer's import ends in ERR_PACKAGE_PATH_NOT_EXPORTED`,
    );
  if (!harnesses.base)
    throw new HarnessError(
      'set',
      `\`${TESTING}\` exports no \`PctHarness\` — the base every harness stands on`,
    );
  if (harnesses.list.length === 0)
    throw new HarnessError('set', `\`${TESTING}\` exports not one harness`);
  const malformed = [];
  for (const h of harnesses.list) {
    if (!h.base) malformed.push(`${h.className}: does not extend PctHarness`);
    if (typeof h.hostSelector !== 'string' || !h.hostSelector.trim())
      malformed.push(`${h.className}: no \`hostSelector\``);
    if (
      !Array.isArray(h.parts) ||
      h.parts.some((p) => typeof p !== 'string' || !p)
    )
      malformed.push(`${h.className}: \`parts\` is not a list of names`);
    else {
      const twice = new Set(h.parts.filter((p, i) => h.parts.indexOf(p) !== i));
      if (twice.size)
        malformed.push(`${h.className}: names ${quoted([...twice])} twice`);
    }
  }
  if (malformed.length)
    throw new HarnessError(
      'set',
      `${malformed.length} harnesses are not declarations of the shape the base defines:\n` +
        list(malformed),
    );

  // 2. The host — one harness, one class, the selector verbatim.
  const bySelector = new Map();
  for (const c of classes)
    bySelector.set(c.selector, [...(bySelector.get(c.selector) ?? []), c]);
  const classOf = new Map();
  const harnessesOfClass = new Map();
  const wrong = [];
  for (const h of harnesses.list) {
    const owners = bySelector.get(h.hostSelector) ?? [];
    if (owners.length !== 1) {
      wrong.push(
        `${h.className}: \`${h.hostSelector}\` is the selector of ` +
          (owners.length === 0
            ? 'no class the package exports'
            : `${owners.length} classes (${owners.map((c) => c.className).join(', ')})`),
      );
      continue;
    }
    classOf.set(h.className, owners[0]);
    harnessesOfClass.set(owners[0].className, [
      ...(harnessesOfClass.get(owners[0].className) ?? []),
      h.className,
    ]);
  }
  for (const [className, names] of harnessesOfClass)
    if (names.length > 1)
      wrong.push(
        `${className}: ${names.length} harnesses answer to its selector — ${names.join(', ')}`,
      );
  if (wrong.length)
    throw new HarnessError(
      'host',
      `${wrong.length} harnesses do not stand on exactly one class:\n${list(wrong)}\n` +
        `    A harness's \`hostSelector\` is the component's own selector list, verbatim — ` +
        `narrower and a test finds nothing, wider and it finds somebody else's element.`,
    );

  // 3. Every class that draws a part — the denominator a consumer's suite reaches for.
  const orphaned = classes
    .filter((c) => c.parts.length && !harnessesOfClass.has(c.className))
    .map(
      (c) =>
        `${c.className} (${c.entrypoint}): draws ${c.parts.length} parts ` +
        `(${c.parts.join(', ')}) and has no harness`,
    );
  if (orphaned.length)
    throw new HarnessError(
      'every',
      `${orphaned.length} classes draw parts a test has no harness for:\n${list(orphaned)}`,
    );

  // 4. The parts — both directions.
  const drift = [];
  for (const h of harnesses.list) {
    const c = classOf.get(h.className);
    const extra = h.parts.filter((p) => !c.parts.includes(p));
    const missing = c.parts.filter((p) => !h.parts.includes(p));
    if (extra.length)
      drift.push(
        `${h.className}: names ${quoted(extra)}, which ${c.className} does not draw`,
      );
    if (missing.length)
      drift.push(
        `${h.className}: leaves out ${quoted(missing)}, which ${c.className} draws`,
      );
  }
  if (drift.length)
    throw new HarnessError(
      'parts',
      `${drift.length} harnesses disagree with the package about the parts:\n${list(drift)}`,
    );

  // 5. The types — what the editor offers is what the list holds.
  if (declarations === null)
    throw new HarnessError(
      'types',
      `no \`${DECLARATIONS}\` — the typed API is what a consumer's editor reads, and it is ` +
        `not in the package`,
    );
  const unions = declaredUnions(declarations);
  const render = (xs) =>
    xs.length ? xs.map((x) => `'${x}'`).join(' | ') : 'never';
  const typed = [];
  for (const h of harnesses.list) {
    const union = unions.get(h.className);
    if (!union) {
      typed.push(`${h.className}: no \`extends PctHarness<…>\` declaration`);
      continue;
    }
    const held = sorted(h.parts);
    if (union.join('|') !== held.join('|'))
      typed.push(
        `${h.className}: the declaration offers ${render(union)} and the list says ${render(held)}`,
      );
  }
  if (typed.length)
    throw new HarnessError(
      'types',
      `${typed.length} harnesses offer a consumer's editor a different list than they hold:\n` +
        list(typed),
    );

  // 6. The cards — the page names the harness, and the name is a real one of its own entrypoint.
  const known = new Set(harnesses.list.map((h) => h.className));
  const named = new Set();
  const faults = [];
  for (const d of documents) {
    if (d.harnesses === null) {
      faults.push(`${d.file}: no **Harness** row in its Contract table`);
      continue;
    }
    if (d.harnesses.length === 0)
      faults.push(`${d.file}: the **Harness** row names no harness`);
    for (const name of d.harnesses) {
      named.add(name);
      if (!known.has(name)) {
        faults.push(
          `${d.file}: names \`${name}\`, which \`${TESTING}\` does not export`,
        );
        continue;
      }
      const owner = classOf.get(name).entrypoint;
      if (owner !== d.entrypoint)
        faults.push(
          `${d.file}: names \`${name}\`, a harness of \`${owner}\` — the card's ` +
            `entrypoint is \`${d.entrypoint}\``,
        );
    }
  }
  for (const h of harnesses.list)
    if (!named.has(h.className))
      faults.push(`${h.className}: stands on no card in ${DOCUMENTS}/`);
  if (faults.length)
    throw new HarnessError(
      'cards',
      `${faults.length} disagreements between the cards and the harnesses:\n${list(faults)}`,
    );

  return { classOf, harnessesOfClass };
};

// ── the run ────────────────────────────────────────────────────────────────────

const problems = [];
let live = null;
let held = null;
try {
  const input = await readInput();
  held = checkHarness(input);
  live = input;
} catch (error) {
  if (!(error instanceof HarnessError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

const patchList = (items, key, patches, blank, what) => {
  for (const [name, patch] of Object.entries(patches ?? {})) {
    const i = items.findIndex((x) => x[key] === name);
    if (patch === null) {
      if (i < 0)
        throw new Error(
          `${what} \`${name}\` is not in the live input — the case drops nothing`,
        );
      items.splice(i, 1);
    } else if (i < 0) items.push({ ...blank(name), ...patch });
    else items[i] = { ...items[i], ...patch };
  }
};

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect: `entrypoint: null` loses the testing module; `harnesses` and `classes` patch
 * an entry by name (`null` drops it, an unknown name adds it); `declarations: null` loses
 * the declaration file and `declarations.replace` rewrites it by a pattern that has to
 * match; `cards` patches a card by file name (`null` drops it, `harnesses: null` takes its
 * row away).
 */
const buildFixture = (fixtureLive, fx) => {
  const w = structuredClone(fixtureLive);
  if (fx.entrypoint === null) w.harnesses = null;
  if (w.harnesses)
    patchList(
      w.harnesses.list,
      'className',
      fx.harnesses,
      (className) => ({ className, hostSelector: '', parts: [], base: true }),
      'harness',
    );
  patchList(
    w.classes,
    'className',
    fx.classes,
    (className) => ({
      entrypoint: './nowhere',
      className,
      selector: '',
      parts: [],
    }),
    'class',
  );
  if (fx.declarations === null) w.declarations = null;
  for (const { pattern, flags, with: replacement } of fx.declarations
    ?.replace ?? []) {
    const re = new RegExp(pattern, flags ?? '');
    if (!re.test(w.declarations))
      throw new Error(
        `${fx.check}: the pattern ${JSON.stringify(pattern)} matches nothing in \`${DECLARATIONS}\` — the case breaks nothing`,
      );
    w.declarations = w.declarations.replace(re, replacement);
  }
  patchList(
    w.documents,
    'file',
    fx.cards,
    (file) => ({ file, entrypoint: null, harnesses: [] }),
    'card',
  );
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-harness.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

if (live) {
  for (const name of cases) {
    const fx = readFixture(name);
    try {
      checkHarness(buildFixture(live, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof HarnessError)) throw error;
      if (error.check !== fx.check)
        problems.push(
          `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
            `was meant to — the fixture proves something other than what it declares`,
        );
    }
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Harness gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const named = live.harnesses.list.reduce((n, h) => n + h.parts.length, 0);
const entrypoints = new Set(
  [...held.classOf.values()].map((c) => c.entrypoint),
);
console.log(
  `✓ Harnesses: ${live.harnesses.list.length} harnesses on ${held.harnessesOfClass.size} classes ` +
    `of ${entrypoints.size} entrypoints, ${named} parts named and typed, ${live.documents.length} cards ` +
    `naming them. Negative control: the reference input passes, ${cases.length} prepared ones ` +
    `rejected on their own points.`,
);
