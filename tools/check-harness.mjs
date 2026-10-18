#!/usr/bin/env node
/**
 * Harness gate: `req-api-harness` — one harness per component, a DECLARATION over the
 * `data-pct-part` contract. Nothing in one proves itself, so every declaration is held to the
 * BUILT package, both ways, the way the cards are:
 *
 *  1. SET: `./testing` is exported, every harness a `PctHarness` of its own name, distinct parts,
 *  2. HOST: a `hostSelector` is verbatim one exported class's list, and no class has two,
 *  3. EVERY: every class that draws a part has a harness,
 *  4. PARTS: a harness names exactly the parts its class draws, neither more nor fewer,
 *  5. TYPES: the union offered after `part(` is that same list, one inventory read twice,
 *  6. CARDS: a card's **Harness** row names existing harnesses of classes its own entrypoint
 *     exports, and every harness stands on some card.
 *
 * The package is read as `check-parts` reads it, after linking, and a class (a harness too) is
 * the object exported, with every name and entrypoint it is exported under.
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

/**
 * The harnesses of the testing module — every exported class but the base itself, one record
 * per name it is exported under; `checkHarness` makes one harness of the records of one class.
 */
const harnessesOf = (module) => {
  const Base = module.PctHarness;
  return {
    base: typeof Base === 'function',
    list: Object.entries(module)
      .filter(([, v]) => isClass(v) && v !== Base)
      .map(([exportedAs, H]) => ({
        entrypoint: TESTING,
        exportedAs,
        class: H,
        hostSelector: H.hostSelector,
        parts: Array.isArray(H.parts) ? [...H.parts] : H.parts,
        base: typeof Base === 'function' && H.prototype instanceof Base,
      })),
  };
};

/**
 * The classes behind a module's export records, one per OBJECT: a class one entrypoint
 * re-exports from another, or exports under a second name, is one class with all of its
 * names, as `check-zoneless` reads it. Its name is its own (`name`), the one its declaration
 * and the sources give it, not the key it is exported under.
 */
const byClass = (records) =>
  [...Map.groupBy(records, (r) => r.class)].map(([type, of]) => ({
    ...of[0],
    className: type.name,
    names: of.map((r) => r.exportedAs),
    entrypoints: [...new Set(of.map((r) => r.entrypoint))],
  }));

const readPackage = async () => {
  if (!existsSync(join(ROOT, DIST, 'package.json')))
    throw new HarnessError(
      'set',
      `no built package in ${DIST} — this gate reads the artifact, not the sources.\n` +
        `    The target needs a \`dependsOn\` on the library's build.`,
    );
  await import('@angular/compiler');
  const exportsMap = JSON.parse(read(`${DIST}/package.json`)).exports ?? {};
  const exported = [];
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
    for (const [exportedAs, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const def = value['ɵcmp'] ?? value['ɵdir'];
      if (!def) continue;
      const selector = renderSelectors(def.selectors, value.name);
      // A class with no selector has no host — there is nothing for a harness to stand on.
      if (!selector) continue;
      exported.push({
        entrypoint,
        exportedAs,
        class: value,
        selector,
        parts: partsOf(def),
      });
    }
  }
  return { exported, harnesses };
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
  const { declarations, documents } = input;
  // A class and a harness are the OBJECT a module exports, with every name it is exported
  // under: by export record, `./chips` re-exporting `PctButton`, or `./button` exporting it a
  // second time under another name, made two classes of one selector, and point 2 refused the
  // harness of either as standing on two.
  const classes = byClass(input.exported);
  const harnesses = input.harnesses && {
    base: input.harnesses.base,
    list: byClass(input.harnesses.list),
  };

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
  // Point 5 finds a harness's declaration by the harness's own name, and the messages name it
  // so: two harnesses of one name would be held to one declaration.
  const clashing = [...Map.groupBy(harnesses.list, (h) => h.className)].filter(
    ([, named]) => named.length > 1,
  );
  if (clashing.length)
    throw new HarnessError(
      'set',
      `${clashing.length} names are borne by more than one harness of \`${TESTING}\`:\n` +
        list(
          clashing.map(
            ([name, named]) =>
              `${name}: exported as ` +
              named
                .map((h) => h.names.map((n) => `\`${n}\``).join(' and '))
                .join(', '),
          ),
        ) +
        `\n    A harness is named by its own name, as its declaration is, so point 5 would ` +
        `hold both to one \`declare class\`.`,
    );

  // 2. The host — one harness, one class, the selector verbatim. A harness finds its class by
  // the selector and nothing else, and the harnesses are kept per class the package exports —
  // the object, not its name: two entrypoints are two modules and may each declare a class of
  // one name, and by name the harness of one answered for the other at point 3.
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
            : `${owners.length} classes (${owners.map((c) => `${c.className} of ${c.entrypoints.join(' and ')}`).join(', ')})`),
      );
      continue;
    }
    classOf.set(h, owners[0]);
    harnessesOfClass.set(owners[0], [
      ...(harnessesOfClass.get(owners[0]) ?? []),
      h.className,
    ]);
  }
  for (const [c, names] of harnessesOfClass)
    if (names.length > 1)
      wrong.push(
        `${c.className} (${c.entrypoints.join(', ')}): ${names.length} harnesses answer to its selector — ${names.join(', ')}`,
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
    .filter((c) => c.parts.length && !harnessesOfClass.has(c))
    .map(
      (c) =>
        `${c.className} (${c.entrypoints.join(', ')}): draws ${c.parts.length} parts ` +
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
    const c = classOf.get(h);
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

  // 6. The cards — the page names the harness, by any name `./testing` exports it under, and
  // the harness is of a class the card's entrypoint exports. A class two entrypoints export is
  // what both of them hand a consumer, so the card of either may name its harness, and one card
  // naming it is enough: the point asks for every harness on some card, not every harness of an
  // entrypoint on its card. The namespaces do not tell the entrypoint declaring a class from one
  // re-exporting it, and this point does not ask.
  const harnessNamed = new Map(
    harnesses.list.flatMap((h) => h.names.map((name) => [name, h])),
  );
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
      const h = harnessNamed.get(name);
      if (!h) {
        faults.push(
          `${d.file}: names \`${name}\`, which \`${TESTING}\` does not export`,
        );
        continue;
      }
      named.add(h);
      const owners = classOf.get(h).entrypoints;
      if (!owners.includes(d.entrypoint))
        faults.push(
          `${d.file}: names \`${name}\`, a harness of ${quoted(owners)} — the card's ` +
            `entrypoint is \`${d.entrypoint}\``,
        );
    }
  }
  for (const h of harnesses.list)
    if (!named.has(h))
      // By the names a card can write, which a harness exported under another name is not.
      faults.push(`${quoted(h.names)}: stands on no card in ${DOCUMENTS}/`);
  if (faults.length)
    throw new HarnessError(
      'cards',
      `${faults.length} disagreements between the cards and the harnesses:\n${list(faults)}`,
    );

  return { classOf, harnessesOfClass, harnesses: harnesses.list };
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
    } else if (i < 0) items.push({ ...blank(name, patch), ...patch });
    else if (patch.className !== undefined)
      throw new Error(
        `${what} \`${name}\`: \`className\` names a class the case adds — an exported one ` +
          `keeps its own`,
      );
    else items[i] = { ...items[i], ...patch };
  }
};

/** A class of the case's own, distinct from every other: a namesake is another object. */
const classNamed = (name) => ({ [name]: class {} })[name];

/**
 * The records as module namespaces give them: each entrypoint's names in code-unit order, and
 * none twice in one module. A case that appended a name would otherwise always put a class's
 * own name before the ones it adds, and `PctBtnHarness` comes before `PctButtonHarness`.
 */
const inNamespaceOrder = (records) =>
  [...Map.groupBy(records, (r) => r.entrypoint).values()].flatMap((of) => {
    const names = of.map((r) => r.exportedAs);
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    if (twice.length)
      throw new Error(
        `\`${of[0].entrypoint}\` exports ${quoted(twice)} twice — no module can`,
      );
    return of.toSorted((a, b) => (a.exportedAs < b.exportedAs ? -1 : 1));
  });

/** The records of the live input copied, each holding the very class the live one holds. */
const copyRecords = (records) =>
  records.map((r) => ({
    ...r,
    parts: Array.isArray(r.parts) ? [...r.parts] : r.parts,
  }));

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect: `entrypoint: null` loses the testing module; `harnesses` and `classes` patch
 * an export by the name it is exported under (`null` drops it, an unknown name adds a class
 * of its own, a harness named by `className` where that is not the export's name); `reexport`
 * exports an exported class once more, the same object, from `to` (its own entrypoint by
 * default) under `as` (its own name by default), after the patches; the records then stand
 * in a namespace's order; `declarations: null` loses the declaration file and
 * `declarations.replace` rewrites it by a pattern that has to match; `cards` patches a card
 * by file name (`null` drops it, `harnesses: null` takes its row away); `addClasses` adds
 * classes as written, each an object of its own, a namesake of an exported one included.
 *
 * The copy holds the live classes and not clones of them: a class is the object an entrypoint
 * exports, and `checkHarness` tells one class from another by nothing else.
 */
const buildFixture = (fixtureLive, fx) => {
  const w = {
    ...structuredClone({
      declarations: fixtureLive.declarations,
      documents: fixtureLive.documents,
    }),
    exported: copyRecords(fixtureLive.exported),
    harnesses: fixtureLive.harnesses && {
      base: fixtureLive.harnesses.base,
      list: copyRecords(fixtureLive.harnesses.list),
    },
  };
  if (fx.entrypoint === null) w.harnesses = null;
  if (w.harnesses)
    patchList(
      w.harnesses.list,
      'exportedAs',
      fx.harnesses,
      (exportedAs, patch) => ({
        entrypoint: TESTING,
        exportedAs,
        class: classNamed(patch.className ?? exportedAs),
        hostSelector: '',
        parts: [],
        base: true,
      }),
      'harness',
    );
  patchList(
    w.exported,
    'exportedAs',
    fx.classes,
    (exportedAs, patch) => {
      if (patch.className !== undefined)
        throw new Error(
          `class \`${exportedAs}\`: a class added under a name not its own is written in \`addClasses\``,
        );
      return {
        entrypoint: './nowhere',
        exportedAs,
        class: classNamed(exportedAs),
        selector: '',
        parts: [],
      };
    },
    'class',
  );
  w.exported.push(
    ...(fx.addClasses ?? []).map(({ className, ...c }) => ({
      exportedAs: className,
      ...c,
      class: classNamed(className),
    })),
  );
  for (const { entrypoint, exportedAs, to, as } of fx.reexport ?? []) {
    const records = entrypoint === TESTING ? w.harnesses?.list : w.exported;
    const source = records?.find(
      (r) => r.entrypoint === entrypoint && r.exportedAs === exportedAs,
    );
    if (!source)
      throw new Error(
        `\`${exportedAs}\` of \`${entrypoint}\` is not in the live input — the case re-exports nothing`,
      );
    records.push({
      ...source,
      entrypoint: to ?? entrypoint,
      exportedAs: as ?? exportedAs,
    });
  }
  w.exported = inNamespaceOrder(w.exported);
  if (w.harnesses) w.harnesses.list = inNamespaceOrder(w.harnesses.list);
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
      else if (fx.message !== undefined && !error.message.includes(fx.message))
        problems.push(
          `${name}: point ${fx.point} (\`${fx.check}\`) fired without "${fx.message}" — another ` +
            `refusal of the same point, or the right one saying something else`,
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
const named = held.harnesses.reduce((n, h) => n + h.parts.length, 0);
const entrypoints = new Set(
  [...held.classOf.values()].flatMap((c) => c.entrypoints),
);
console.log(
  `✓ Harnesses: ${held.harnesses.length} harnesses on ${held.harnessesOfClass.size} classes ` +
    `of ${entrypoints.size} entrypoints, ${named} parts named and typed, ${live.documents.length} cards ` +
    `naming them. Negative control: the reference input passes, ${cases.length} prepared ones ` +
    `rejected on their own points.`,
);
