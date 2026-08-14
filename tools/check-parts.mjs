#!/usr/bin/env node
/**
 * Part inventory gate: `req-api-parts` — the `data-pct-part` attributes are RECORDED and
 * VERSIONED, so a consumer's selector survives an update. They are the one route into a
 * component this library leaves (decision 0013) and the one public API whose change gives
 * no red test: a rename moves the template and the sheet together.
 *
 *  1. DENOMINATOR: every decorator parsed, every template owned, every occurrence read,
 *  2. SET: the parts read from the sources match those read from the BUILT package,
 *  3. STATICNESS: a part's name is nowhere bound by an expression,
 *  4. SURFACE: the **Parts** rows in `docs/components/` carry exactly the exposed names,
 *  5. SNAPSHOT: the versioned inventory matches the current one.
 *
 * Two independent reads are the point: the source read catches a part that never reached
 * the package, the package read (JIT over `dist/`) one our scanner cannot see.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const DOCUMENTS = 'docs/components';
const SNAPSHOT = `${PROJECT}/parts.snapshot.md`;
const FIXTURES = join(ROOT, 'tools/check-parts.fixtures');
const REFERENCE = '_reference';

const WRITE = process.argv.includes('--write');
const WRITE_FIXTURE = (() => {
  const next = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && next && !next.startsWith('--') ? next : null;
})();

const ATTRIBUTE = 'data-pct-part';

const list = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, countOf = 8) =>
  wpisy.length <= countOf
    ? wpisy
    : [...wpisy.slice(0, countOf), `… i ${wpisy.length - countOf} dalszych`];

const sorted = (set) => [...set].sort();

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * A component or directive decorator in a source file. It anchors on the formatting
 * `nx format:check` enforces (`@Component({` and `})` in column zero) — and that is why
 * the number of matches is compared separately against a counter that does NOT repeat that
 * anchor. The counter allows indentation, because repeating the anchor would put out both
 * sides of the comparison at once and point 1 would pass having stopped measuring a whole
 * component (`lesson-48`). `[ \t]*` filters out occurrences in comments — a JSDoc line
 * starts with an asterisk.
 *
 * `@Directive` stands here beside `@Component`, because four wrapper parts
 * (`field-prefix-item`, `field-suffix-item`, `field-label-aux-item`,
 * `field-message-aux-item`) live only in the `host` blocks of directives. A gate reading
 * components alone would pronounce on an inventory without them.
 */
const DECORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DECORATOR_COUNTER = /^[ \t]*@(?:Component|Directive)\(/gm;

/** `templateUrl: './x.html'` — one occurrence per decorator. */
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
/** `template:` in a decorator — the literal value, to tell an empty one from the rest. */
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** `'data-pct-part': 'name'` w bloku `host`. */
const HOST_STATIC = new RegExp(
  `(['"])${ATTRIBUTE}\\1\\s*:\\s*(['"])([^'"]*)\\2`,
  'g',
);
/** `'[attr.data-pct-part]': 'expression()'` — a part name from an expression. */
const HOST_DYNAMIC = new RegExp(`(['"])\\[attr\\.${ATTRIBUTE}\\]\\1\\s*:`, 'g');

/** `data-pct-part="name"` in a template. */
const TEMPLATE_STATIC = new RegExp(
  `${ATTRIBUTE}\\s*=\\s*(['"])([^'"]*)\\1`,
  'g',
);
/** `[attr.data-pct-part]="expression"` in a template. */
const TEMPLATE_DYNAMIC = new RegExp(`\\[attr\\.${ATTRIBUTE}\\]\\s*=`, 'g');
/** An independent counter: EVERY occurrence of the attribute name in a template. */
const TEMPLATE_COUNTER = new RegExp(ATTRIBUTE, 'g');

const countOf = (tekst, wzorzec) => (tekst.match(wzorzec) ?? []).length;

/**
 * The entrypoint from the directory layout: `libs/components/select/src/select.ts` →
 * `./select`, and `libs/components/src/index.ts` → `.`. The same shape the keys have in
 * the packed manifest's `exports` map, so point 2 compares membership without translating
 * one convention into another.
 */
const entrypointZeSciezki = (file) => {
  const segment = file.slice(`${PROJECT}/`.length).split('/')[0];
  return segment === 'src' ? '.' : `./${segment}`;
};

/**
 * Decorated classes — `[{ file, className, entrypoint, template, inline, parts, dynamic }]`.
 * `parts` come here from the `host` block alone; the template's parts are added by point
 * 1, because a template is a separate file and a separate denominator — its scan has to
 * hold up first.
 *
 * A `host` block is sometimes composed by spreading somebody else's object (`...fitHost`
 * in `field/src/affix.ts`) and this scanner does not see that — deliberately. A part
 * brought in that way appears in the package read and is missing from the source read,
 * that is, it fires point 2 with the part's name in the message. Exactly the work the
 * second read is there to do.
 */
const czytajZrodla = (root, files) => {
  const classes = [];
  let declarations = 0;

  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    declarations += countOf(content, DECORATOR_COUNTER);

    for (const [, rodzaj, cialo, className] of content.matchAll(DECORATOR)) {
      const url = TEMPLATE_URL.exec(cialo);
      const inline = TEMPLATE_INLINE.exec(cialo);
      classes.push({
        file,
        className,
        rodzaj,
        entrypoint: entrypointZeSciezki(file),
        template: url
          ? relative(root, resolve(join(root, dirname(file)), url[2]))
              .split('\\')
              .join('/')
          : null,
        // An empty template (`template: ''` in `number.ts` and `text.ts`) can bring no
        // part, so it is no hole in the denominator. Any other notation written into the
        // decorator is one.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        parts: new Set([...cialo.matchAll(HOST_STATIC)].map((m) => m[3])),
        dynamic: countOf(cialo, HOST_DYNAMIC),
      });
    }
  }

  return { classes, declarations };
};

/**
 * A template: the static parts, the number of bindings and a count of all occurrences.
 *
 * A value with interpolation (`data-pct-part="{{name()}}"`) is a binding even though it
 * looks like a literal — measured, not assumed: Angular emits it into `consts` as
 * `[3, 'data-pct-part']`, that is, after the bindings marker, and writes the attribute
 * name into the body of the template function. Without that distinction the scanner would
 * enter a part named `{{name()}}` into the inventory, and point 3 would never see it.
 */
const czytajSzablon = (content) => {
  const trafienia = [...content.matchAll(TEMPLATE_STATIC)].map((m) => m[2]);
  const interpolated = trafienia.filter((w) => w.includes('{{'));
  return {
    parts: trafienia.filter((w) => !w.includes('{{')),
    dynamic: countOf(content, TEMPLATE_DYNAMIC) + interpolated.length,
    occurrences: countOf(content, TEMPLATE_COUNTER),
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
 *   `classes`, `declarations` — from the decorators in the sources (read A),
 *   `templates`   — `[{ file, content }]` of all the project's templates,
 *   `pkg`     — `[{ entrypoint, className, parts, dynamic }]` from the built package
 *                  (read B),
 *   `documents`  — `[{ file, entrypoint, parts }]` from `docs/components/`,
 *   `entrypoints`— the keys of the packed manifest's `exports` map,
 *   `snapshot`   — the file's contents, or `null`.
 * Throws `PartsError` on the first violation and returns `{ description, snapshot }` — the
 * rendered snapshot comes back from a checking run too, because `--write` is to write
 * exactly what the gate has just counted rather than count a second time down another
 * path.
 */
const checkParts = (input) => {
  const { classes, declarations, templates, pkg, documents, entrypoints } =
    input;

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

  if (classes.length !== declarations)
    throw new PartsError(
      'denominator',
      `the parser recognised ${classes.length} of ${declarations} decorators — the rest ` +
        `would drop out of the inventory without a trace. Usual cause: a decorator ` +
        `written otherwise than prettier formats it (\`@Component({\` and \`})\` in ` +
        `column zero).`,
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

  const uzywane = new Map(); // template -> [classes]
  for (const k of classes)
    if (k.template)
      uzywane.set(k.template, [...(uzywane.get(k.template) ?? []), k]);

  const znane = new Set(templates.map((s) => s.file));
  const brakujace = [...uzywane.keys()].filter((s) => !znane.has(s));
  if (brakujace.length)
    throw new PartsError(
      'denominator',
      `${brakujace.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        list(brakujace) +
        `\n    Their parts will not enter the inventory. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const osierocone = templates.filter((s) => !uzywane.has(s.file));
  if (osierocone.length)
    throw new PartsError(
      'denominator',
      `${osierocone.length} templates belong to no decorator:\n` +
        list(osierocone.map((s) => s.file)) +
        `\n    The scanner assigns parts to a class through \`templateUrl\`; a template ` +
        `nobody points at is invisible to the inventory — and travels to the browser like ` +
        `every other one.`,
    );

  const skany = new Map(
    templates.map((s) => [s.file, czytajSzablon(s.content)]),
  );
  const nierozpoznane = templates
    .map((s) => ({ file: s.file, ...skany.get(s.file) }))
    .filter((s) => s.parts.length + s.dynamic !== s.occurrences);
  if (nierozpoznane.length)
    throw new PartsError(
      'denominator',
      `${nierozpoznane.length} templates hold \`${ATTRIBUTE}\` occurrences the scanner did ` +
        `not recognise:\n` +
        list(
          nierozpoznane.map(
            (s) =>
              `${s.file}: recognised ${s.parts.length} static + ` +
              `${s.dynamic} bound, and the attribute name appears ${s.occurrences} times`,
          ),
        ) +
        `\n    The counter is independent of the scanner precisely for this: a part ` +
        `written in syntax the regex is blind to is to drop out of the inventory LOUDLY, ` +
        `not quietly.`,
    );

  // Parts from the sources: the `host` block plus the template named by `templateUrl`.
  const fromSources = new Map(); // className -> { entrypoint, file, parts, dynamic }
  for (const k of classes) {
    const zeSzablonu = k.template ? skany.get(k.template) : null;
    const parts = new Set([...k.parts, ...(zeSzablonu?.parts ?? [])]);
    if (!parts.size && !k.dynamic && !zeSzablonu?.dynamic) continue;
    fromSources.set(k.className, {
      entrypoint: k.entrypoint,
      file: k.file,
      parts,
      dynamic: k.dynamic + (zeSzablonu?.dynamic ?? 0),
    });
  }

  // 2. SET — two independent reads of the same list.
  //
  //    Read A (above) reads the SOURCES: the text of a template and of a decorator.
  //    Read B reads the BUILT PACKAGE through JIT, that is, the output of Angular's real
  //    template parser. Were the list to come from the sources alone, a component that
  //    dropped out of the package would still have its parts in the inventory — and the
  //    consumer would not have them at all. From the package alone — a part brought in by
  //    syntax our scanner cannot read would enter the inventory as a fait accompli, with
  //    no line in the diff.
  const fromPackage = new Map(
    pkg
      .filter((p) => p.parts.length || p.dynamic)
      .map((p) => [
        p.className,
        {
          entrypoint: p.entrypoint,
          parts: new Set(p.parts),
          dynamic: p.dynamic,
        },
      ]),
  );

  if (!fromSources.size || !fromPackage.size)
    throw new PartsError(
      'set',
      `an empty set of parts (sources: ${fromSources.size} classes, package: ${fromPackage.size}) — ` +
        `every later point would then pass without pronouncing on anything.\n` +
        `    Usual cause: a stale or empty \`${DIST}\` (the gate needs \`dependsOn: ` +
        `build\`), or a file list that stopped returning anything.`,
    );

  const rozjazdy = [];
  for (const className of new Set([
    ...fromSources.keys(),
    ...fromPackage.keys(),
  ]).values()) {
    const a = fromSources.get(className);
    const b = fromPackage.get(className);
    if (!b) {
      rozjazdy.push(
        `${className} (${a.file}): parts in the sources, and no such class in the package — ` +
          `${sorted(a.parts).join(', ')}`,
      );
      continue;
    }
    if (!a) {
      rozjazdy.push(
        `${className} (${b.entrypoint}): parts in the package, and the source scanner does not see the class — ` +
          `${sorted(b.parts).join(', ')}`,
      );
      continue;
    }
    if (a.entrypoint !== b.entrypoint)
      rozjazdy.push(
        `${className}: sits in \`${a.entrypoint}\`, and the package exports it from \`${b.entrypoint}\``,
      );
    const missingInPackage = sorted(a.parts).filter((c) => !b.parts.has(c));
    const missingInSources = sorted(b.parts).filter((c) => !a.parts.has(c));
    if (missingInPackage.length)
      rozjazdy.push(
        `${className}: in the sources and not in the package — ${missingInPackage.join(', ')}`,
      );
    if (missingInSources.length)
      rozjazdy.push(
        `${className}: in the package and not in the sources — ${missingInSources.join(', ')}`,
      );
  }
  if (rozjazdy.length)
    throw new PartsError(
      'set',
      `the two reads of the inventory disagree (${rozjazdy.length}):\n` +
        list(skroc(rozjazdy, 12)) +
        `\n    The first kind is a part that never reached the consumer (a component ` +
        `with no export, or a stale \`dist\`); the second is a part the source scanner ` +
        `cannot see, which would enter the package with no line in the diff.`,
    );

  // 3. STATICNESS. A name composed at runtime can be neither recorded nor frozen: the
  //    inventory and the snapshot would then be green exactly because they have nothing
  //    to see. Measured on both sides — in the sources as `[attr.…]`, in the package as an
  //    occurrence of the attribute name inside the compiled template function (a bound
  //    attribute does not reach `consts`, only the instruction).
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
          `${className} (${w.entrypoint}): ${w.dynamic} w pakiecie`,
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
  //    `text`).
  const byEntrypoint = new Map();
  for (const [, w] of fromPackage) {
    const set = byEntrypoint.get(w.entrypoint) ?? new Set();
    for (const c of w.parts) set.add(c);
    byEntrypoint.set(w.entrypoint, set);
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
    const karty = documents.filter((d) => d.entrypoint === entrypoint);
    if (!karty.length) {
      documentationProblems.push(
        `\`${entrypoint}\` exposes ${parts.size} parts and has no card at all ` +
          `w \`${DOCUMENTS}/\``,
      );
      continue;
    }

    const skad = new Map(); // part -> [cards]
    for (const card of karty)
      for (const c of card.parts)
        skad.set(c, [...(skad.get(c) ?? []), card.file]);

    const dwaRazy = [...skad]
      .filter(([, gdzie]) => gdzie.length > 1)
      .map(([c, gdzie]) => `\`${c}\` w ${gdzie.join(' i ')}`);
    if (dwaRazy.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the same part in two cards — ${dwaRazy.join('; ')}`,
      );

    const brakujeWKartach = sorted(parts).filter((c) => !skad.has(c));
    const nadmiarowe = [...skad.keys()].filter((c) => !parts.has(c)).sort();
    if (brakujeWKartach.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the package exposes what the cards do not list — ` +
          brakujeWKartach.map((c) => `\`${c}\``).join(', '),
      );
    if (nadmiarowe.length)
      documentationProblems.push(
        `\`${entrypoint}\`: the cards list what the package does not expose — ` +
          nadmiarowe.map((c) => `\`${c}\``).join(', '),
      );
  }
  if (documentationProblems.length)
    throw new PartsError(
      'documentation',
      `the **Parts** rows have drifted from the package (${documentationProblems.length}):\n` +
        list(skroc(documentationProblems, 12)) +
        `\n    A card listing a part that does not exist sends the consumer to a selector ` +
        `matching nothing; a card silent about an existing one undoes the „recorded" ` +
        `promise entirely. ` +
        `Zapis rubryki: \`| **Parts** | \\\`name\\\`, \\\`name\\\` |\`.`,
    );

  // 5. SNAPSHOT — the versioned inventory a change is measured against. It stands LAST,
  // because it fires on every change of a name, including the ones the earlier points can
  // name precisely. The reverse order would answer a part brought in by a binding with
  // „the snapshot has drifted" — a correct diagnosis of a problem that is not there.
  const rows = [...fromPackage]
    .flatMap(([className, w]) =>
      sorted(w.parts).map((c) => [w.entrypoint, className, c]),
    )
    .sort((a, b) => (a.join(' ') < b.join(' ') ? -1 : 1));
  const content = renderujSnapshot(rows);
  const rozjazd = (description) =>
    Object.assign(new PartsError('snapshot', description), {
      snapshot: content,
    });

  if (input.snapshot === null)
    throw rozjazd(
      `no \`${SNAPSHOT}\` — run \`node tools/check-parts.mjs --write\`.\n` +
        `    Without a snapshot this gate watches that three reads agree, but does not ` +
        `measure CHANGE: renaming a part together with its card in docs then passes ` +
        `without a trace, and breaks a selector at the consumer's.`,
    );
  if (input.snapshot !== content) {
    const stare = wierszeSnapshotu(input.snapshot);
    const nowe = wierszeSnapshotu(content);
    const removed = [...stare].filter((w) => !nowe.has(w));
    const dodane = [...nowe].filter((w) => !stare.has(w));
    throw rozjazd(
      `the inventory snapshot has drifted from the current one:\n` +
        (removed.length
          ? `    gone from the API (${removed.length}):\n` +
            list(skroc(removed)) +
            '\n'
          : '') +
        (dodane.length
          ? `    added to the API (${dodane.length}):\n` +
            list(skroc(dodane)) +
            '\n'
          : '') +
        (!removed.length && !dodane.length
          ? `    the list of parts is the same — the heading or the row order drifted.\n`
          : '') +
        `    \`${ATTRIBUTE}\` is the public styling API (decision 0013): a part that has ` +
        `gone takes a consumer's selector with it and gives not one red test, because the ` +
        `template and the sheet change together. If the change is deliberate — ` +
        `\`node tools/check-parts.mjs --write\`.`,
    );
  }

  return {
    description:
      `${rows.length} parts in ${fromPackage.size} classes ` +
      `(${byEntrypoint.size} entrypoints), ${documents.length} cards in docs`,
    snapshot: content,
  };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The same choice of format as in `libs/tokens/tokens.snapshot.md` and for the same
 * reason: a markdown table run through prettier pads its columns to the longest cell, so
 * one long name rewrites the WHOLE file and the diff stops showing what really changed.
 */
const renderujSnapshot = (rows) =>
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
    'This file is the list a change is measured against. A drift does not mean „an error" —',
    'it means „a change of public API that is to be visible in review".',
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
 * version read `null.split`, and disarming the „no snapshot" branch as part of the negative
 * control turned the gate into a `TypeError` — the control lost the ability to examine the
 * point it was meant to examine. The same defect as in A4 and A7, found by the same
 * control.
 */
const wierszeSnapshotu = (content) =>
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

const czytajKarte = (file, content) => {
  const naglowek = ENTRYPOINT_HEADING.exec(content);
  const rubryka = PARTS_SECTION.exec(content);
  return {
    file,
    entrypoint: naglowek ? `.${naglowek[1] ?? ''}` : null,
    parts: new Set(
      rubryka
        ? [...rubryka[0].matchAll(/`([^`]+)`/g)]
            .map((m) => m[1])
            .filter((n) => /^[a-z][a-z0-9-]*$/.test(n))
        : [],
    ),
  };
};

/**
 * Definitions from the BUILT package. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's, and the same as in `check-zoneless`.
 *
 * `consts` carries every element's STATIC attributes, as a flat array in which a number
 * opens a section with a different meaning (classes, styles, bindings). So input read only
 * the prefix before the first number — beyond it stand names without values.
 *
 * The name of a BOUND attribute does not reach `consts` at all, only the body of the
 * compiled function (`ɵɵattribute('data-pct-part', ctx.x)`) — measured, not assumed.
 * Hence the second read over the function's text: without it point 3 would have a blind
 * side in the package.
 */
const parujAtrybuty = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i++) {
    if (typeof attrs[i] === 'number') break;
    if (attrs[i] === ATTRIBUTE) out.push(attrs[i + 1]);
    i++;
  }
  return out;
};

const komponentyPakietu = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new PartsError(
      'set',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
    );

  await import('@angular/compiler');
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
    for (const [className, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const def = value['ɵcmp'] ?? value['ɵdir'];
      if (!def) continue;

      const consts =
        typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
      const parts = [
        ...consts.filter(Array.isArray).flatMap(parujAtrybuty),
        ...parujAtrybuty(def.hostAttrs ?? []),
      ];
      const functions = [def.template, def.hostBindings]
        .filter((f) => typeof f === 'function')
        .map((f) => f.toString());

      out.push({
        entrypoint,
        className,
        parts: [...new Set(parts)],
        dynamic: functions.reduce(
          (n, t) => n + countOf(t, new RegExp(ATTRIBUTE, 'g')),
          0,
        ),
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
const jestZrodlem = (p) =>
  p.startsWith(`${PROJECT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const jestSzablonem = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');
const jestKarta = (p) =>
  p.startsWith(`${DOCUMENTS}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

/** An input built from a file list — the same shape for the repo and for a fixture. */
const zbierzWejscie = async (root, files, packageFromDisk) => {
  const { pkg, entrypoints } =
    packageFromDisk ?? (await komponentyPakietu(root));
  return {
    ...czytajZrodla(root, files.filter(jestZrodlem)),
    templates: files
      .filter(jestSzablonem)
      .map((file) => ({ file, content: read(root, file) })),
    pkg,
    entrypoints,
    documents: files
      .filter(jestKarta)
      .map((file) => czytajKarte(file, read(root, file))),
    snapshot: existsSync(join(root, SNAPSHOT)) ? read(root, SNAPSHOT) : null,
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
 * reason. The price is plain: the fixtures do NOT exercise the code that reads `ɵcmp` —
 * they exercise every other parser and the whole arrangement of checks. The package read
 * is exercised instead on every run against the real repository.
 *
 * The sources sit in the repository as `*.ts.txt` and become `*.ts` only here — the same
 * move as in `check-styles` and `check-tokens`: a `.ts` file in `tools/` belongs to no
 * compiler program, so it would fire `check-typecheck` (point 1 — a file with no project).
 * One gate's fixture must not be another's defect.
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
  for (const file of globSync('**/*.ts.txt', { cwd: target }))
    renameSync(join(target, file), join(target, file.replace(/\.txt$/, '')));
  return target;
};

const fixtureInput = (directory) => {
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  return zbierzWejscie(
    directory,
    globSync('**/*.{ts,html,md}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    { pkg: pkg.classes, entrypoints: new Set(pkg.entrypoints) },
  );
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
  const result = checkParts(await zbierzWejscie(ROOT, repoFiles(), null));
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
// because of it rather than its own defect, and every „rejected" would be false — this
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

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name, fx);
  try {
    checkParts(await fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof PartsError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Part inventory gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Parts: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
