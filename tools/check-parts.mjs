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
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const DOKUMENTY = 'docs/components';
const SNAPSHOT = `${PROJEKT}/parts.snapshot.md`;
const FIXTURES = join(ROOT, 'tools/check-parts.fixtures');
const BAZA = '_poprawny';

const WRITE = process.argv.includes('--write');
const WRITE_FIXTURE = (() => {
  const kolejny = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && kolejny && !kolejny.startsWith('--') ? kolejny : null;
})();

const ATRYBUT = 'data-pct-part';

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

const posortuj = (zbior) => [...zbior].sort();

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
const DEKORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DEKORATOR_LICZNIK = /^[ \t]*@(?:Component|Directive)\(/gm;

/** `templateUrl: './x.html'` — one occurrence per decorator. */
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
/** `template:` in a decorator — the literal value, to tell an empty one from the rest. */
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** `'data-pct-part': 'nazwa'` w bloku `host`. */
const HOST_STATYCZNY = new RegExp(
  `(['"])${ATRYBUT}\\1\\s*:\\s*(['"])([^'"]*)\\2`,
  'g',
);
/** `'[attr.data-pct-part]': 'expression()'` — a part name from an expression. */
const HOST_DYNAMICZNY = new RegExp(
  `(['"])\\[attr\\.${ATRYBUT}\\]\\1\\s*:`,
  'g',
);

/** `data-pct-part="nazwa"` w szablonie. */
const SZABLON_STATYCZNY = new RegExp(
  `${ATRYBUT}\\s*=\\s*(['"])([^'"]*)\\1`,
  'g',
);
/** `[attr.data-pct-part]="expression"` in a template. */
const SZABLON_DYNAMICZNY = new RegExp(`\\[attr\\.${ATRYBUT}\\]\\s*=`, 'g');
/** An independent counter: EVERY occurrence of the attribute name in a template. */
const SZABLON_LICZNIK = new RegExp(ATRYBUT, 'g');

const ile = (tekst, wzorzec) => (tekst.match(wzorzec) ?? []).length;

/**
 * The entrypoint from the directory layout: `libs/components/select/src/select.ts` →
 * `./select`, and `libs/components/src/index.ts` → `.`. The same shape the keys have in
 * the packed manifest's `exports` map, so point 2 compares membership without translating
 * one convention into another.
 */
const entrypointZeSciezki = (plik) => {
  const segment = plik.slice(`${PROJEKT}/`.length).split('/')[0];
  return segment === 'src' ? '.' : `./${segment}`;
};

/**
 * Decorated classes — `[{ plik, klasa, entrypoint, szablon, inline, czesci, dynamiczne }]`.
 * `czesci` come here from the `host` block alone; the template's parts are added by point
 * 1, because a template is a separate file and a separate denominator — its scan has to
 * hold up first.
 *
 * A `host` block is sometimes composed by spreading somebody else's object (`...fitHost`
 * in `field/src/affix.ts`) and this scanner does not see that — deliberately. A part
 * brought in that way appears in the package read and is missing from the source read,
 * that is, it fires point 2 with the part's name in the message. Exactly the work the
 * second read is there to do.
 */
const czytajZrodla = (root, pliki) => {
  const klasy = [];
  let deklaracji = 0;

  for (const plik of pliki) {
    const tresc = readFileSync(join(root, plik), 'utf8');
    deklaracji += ile(tresc, DEKORATOR_LICZNIK);

    for (const [, rodzaj, cialo, klasa] of tresc.matchAll(DEKORATOR)) {
      const url = TEMPLATE_URL.exec(cialo);
      const inline = TEMPLATE_INLINE.exec(cialo);
      klasy.push({
        plik,
        klasa,
        rodzaj,
        entrypoint: entrypointZeSciezki(plik),
        szablon: url
          ? relative(root, resolve(join(root, dirname(plik)), url[2]))
              .split('\\')
              .join('/')
          : null,
        // An empty template (`template: ''` in `number.ts` and `text.ts`) can bring no
        // part, so it is no hole in the denominator. Any other notation written into the
        // decorator is one.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        czesci: new Set([...cialo.matchAll(HOST_STATYCZNY)].map((m) => m[3])),
        dynamiczne: ile(cialo, HOST_DYNAMICZNY),
      });
    }
  }

  return { klasy, deklaracji };
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
const czytajSzablon = (tresc) => {
  const trafienia = [...tresc.matchAll(SZABLON_STATYCZNY)].map((m) => m[2]);
  const interpolowane = trafienia.filter((w) => w.includes('{{'));
  return {
    czesci: trafienia.filter((w) => !w.includes('{{')),
    dynamiczne: ile(tresc, SZABLON_DYNAMICZNY) + interpolowane.length,
    wystapien: ile(tresc, SZABLON_LICZNIK),
  };
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the five checks — with an identifier, not just a message. The
 * negative control has to verify that a prepared input fired ON ITS OWN point: an input
 * failing for a reason other than the one it declares proves something other than what it
 * declares.
 */
class BladCzesci extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * The full set of checks over a ready input:
 *   `klasy`, `deklaracji` — from the decorators in the sources (read A),
 *   `szablony`   — `[{ plik, tresc }]` of all the project's templates,
 *   `pakiet`     — `[{ wejscie, klasa, czesci, dynamiczne }]` from the built package
 *                  (read B),
 *   `dokumenty`  — `[{ plik, entrypoint, czesci }]` from `docs/components/`,
 *   `entrypointy`— the keys of the packed manifest's `exports` map,
 *   `snapshot`   — the file's contents, or `null`.
 * Throws `BladCzesci` on the first violation and returns `{ opis, snapshot }` — the
 * rendered snapshot comes back from a checking run too, because `--write` is to write
 * exactly what the gate has just counted rather than count a second time down another
 * path.
 */
const sprawdzCzesci = (we) => {
  const { klasy, deklaracji, szablony, pakiet, dokumenty, entrypointy } = we;

  // 1. DENOMINATOR. Before anything is compared, the source read has to be able to say
  //    it saw everything it was meant to see. Without that, point 2 would be comparing
  //    two lists, one of which had quietly shrunk.
  if (!klasy.length)
    throw new BladCzesci(
      'mianownik',
      `no \`@Component\`/\`@Directive\` decorator found in the sources (${PROJEKT}) — ` +
        `the comparison against the counter would then always pass, because zero equals ` +
        `zero (lesson-48).\n    Usual cause: the list of source files stopped returning ` +
        `anything.`,
    );

  if (klasy.length !== deklaracji)
    throw new BladCzesci(
      'mianownik',
      `the parser recognised ${klasy.length} of ${deklaracji} decorators — the rest ` +
        `would drop out of the inventory without a trace. Usual cause: a decorator ` +
        `written otherwise than prettier formats it (\`@Component({\` and \`})\` in ` +
        `column zero).`,
    );

  const inline = klasy.filter((k) => k.inline);
  if (inline.length)
    throw new BladCzesci(
      'mianownik',
      `${inline.length} klas bierze szablon z dekoratora, a nie z pliku:\n` +
        lista(inline.map((k) => `${k.plik}: ${k.klasa}`)) +
        `\n    The source scanner reads templates, not decorators, so parts written ` +
        `there are seen only by the package read — as a drift between two lists rather ` +
        `than as what they are. Move the template out to \`templateUrl\`.`,
    );

  const uzywane = new Map(); // szablon -> [klasy]
  for (const k of klasy)
    if (k.szablon)
      uzywane.set(k.szablon, [...(uzywane.get(k.szablon) ?? []), k]);

  const znane = new Set(szablony.map((s) => s.plik));
  const brakujace = [...uzywane.keys()].filter((s) => !znane.has(s));
  if (brakujace.length)
    throw new BladCzesci(
      'mianownik',
      `${brakujace.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        lista(brakujace) +
        `\n    Their parts will not enter the inventory. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const osierocone = szablony.filter((s) => !uzywane.has(s.plik));
  if (osierocone.length)
    throw new BladCzesci(
      'mianownik',
      `${osierocone.length} templates belong to no decorator:\n` +
        lista(osierocone.map((s) => s.plik)) +
        `\n    The scanner assigns parts to a class through \`templateUrl\`; a template ` +
        `nobody points at is invisible to the inventory — and travels to the browser like ` +
        `every other one.`,
    );

  const skany = new Map(szablony.map((s) => [s.plik, czytajSzablon(s.tresc)]));
  const nierozpoznane = szablony
    .map((s) => ({ plik: s.plik, ...skany.get(s.plik) }))
    .filter((s) => s.czesci.length + s.dynamiczne !== s.wystapien);
  if (nierozpoznane.length)
    throw new BladCzesci(
      'mianownik',
      `${nierozpoznane.length} templates hold \`${ATRYBUT}\` occurrences the scanner did ` +
        `not recognise:\n` +
        lista(
          nierozpoznane.map(
            (s) =>
              `${s.plik}: recognised ${s.czesci.length} static + ` +
              `${s.dynamiczne} bound, and the attribute name appears ${s.wystapien} times`,
          ),
        ) +
        `\n    The counter is independent of the scanner precisely for this: a part ` +
        `written in syntax the regex is blind to is to drop out of the inventory LOUDLY, ` +
        `not quietly.`,
    );

  // Parts from the sources: the `host` block plus the template named by `templateUrl`.
  const zeZrodel = new Map(); // klasa -> { entrypoint, plik, czesci, dynamiczne }
  for (const k of klasy) {
    const zeSzablonu = k.szablon ? skany.get(k.szablon) : null;
    const czesci = new Set([...k.czesci, ...(zeSzablonu?.czesci ?? [])]);
    if (!czesci.size && !k.dynamiczne && !zeSzablonu?.dynamiczne) continue;
    zeZrodel.set(k.klasa, {
      entrypoint: k.entrypoint,
      plik: k.plik,
      czesci,
      dynamiczne: k.dynamiczne + (zeSzablonu?.dynamiczne ?? 0),
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
  const zPakietu = new Map(
    pakiet
      .filter((p) => p.czesci.length || p.dynamiczne)
      .map((p) => [
        p.klasa,
        {
          entrypoint: p.wejscie,
          czesci: new Set(p.czesci),
          dynamiczne: p.dynamiczne,
        },
      ]),
  );

  if (!zeZrodel.size || !zPakietu.size)
    throw new BladCzesci(
      'zbior',
      `an empty set of parts (sources: ${zeZrodel.size} classes, package: ${zPakietu.size}) — ` +
        `every later point would then pass without pronouncing on anything.\n` +
        `    Usual cause: a stale or empty \`${DIST}\` (the gate needs \`dependsOn: ` +
        `build\`), or a file list that stopped returning anything.`,
    );

  const rozjazdy = [];
  for (const klasa of new Set([
    ...zeZrodel.keys(),
    ...zPakietu.keys(),
  ]).values()) {
    const a = zeZrodel.get(klasa);
    const b = zPakietu.get(klasa);
    if (!b) {
      rozjazdy.push(
        `${klasa} (${a.plik}): parts in the sources, and no such class in the package — ` +
          `${posortuj(a.czesci).join(', ')}`,
      );
      continue;
    }
    if (!a) {
      rozjazdy.push(
        `${klasa} (${b.entrypoint}): parts in the package, and the source scanner does not see the class — ` +
          `${posortuj(b.czesci).join(', ')}`,
      );
      continue;
    }
    if (a.entrypoint !== b.entrypoint)
      rozjazdy.push(
        `${klasa}: sits in \`${a.entrypoint}\`, and the package exports it from \`${b.entrypoint}\``,
      );
    const brakWPakiecie = posortuj(a.czesci).filter((c) => !b.czesci.has(c));
    const brakWZrodlach = posortuj(b.czesci).filter((c) => !a.czesci.has(c));
    if (brakWPakiecie.length)
      rozjazdy.push(
        `${klasa}: in the sources and not in the package — ${brakWPakiecie.join(', ')}`,
      );
    if (brakWZrodlach.length)
      rozjazdy.push(
        `${klasa}: in the package and not in the sources — ${brakWZrodlach.join(', ')}`,
      );
  }
  if (rozjazdy.length)
    throw new BladCzesci(
      'zbior',
      `the two reads of the inventory disagree (${rozjazdy.length}):\n` +
        lista(skroc(rozjazdy, 12)) +
        `\n    The first kind is a part that never reached the consumer (a component ` +
        `with no export, or a stale \`dist\`); the second is a part the source scanner ` +
        `cannot see, which would enter the package with no line in the diff.`,
    );

  // 3. STATICNESS. A name composed at runtime can be neither recorded nor frozen: the
  //    inventory and the snapshot would then be green exactly because they have nothing
  //    to see. Measured on both sides — in the sources as `[attr.…]`, in the package as an
  //    occurrence of the attribute name inside the compiled template function (a bound
  //    attribute does not reach `consts`, only the instruction).
  const wiazane = [
    ...[...zeZrodel]
      .filter(([, w]) => w.dynamiczne)
      .map(
        ([klasa, w]) => `${klasa} (${w.plik}): ${w.dynamiczne} in the sources`,
      ),
    ...[...zPakietu]
      .filter(([, w]) => w.dynamiczne)
      .map(
        ([klasa, w]) =>
          `${klasa} (${w.entrypoint}): ${w.dynamiczne} w pakiecie`,
      ),
  ];
  if (wiazane.length)
    throw new BladCzesci(
      'statycznosc',
      `${wiazane.length} places bind a part's name with an expression:\n` +
        lista(wiazane) +
        `\n    A part whose name appears at runtime is no public API — it is a name ` +
        `nobody wrote down and no snapshot can freeze. \`${ATRYBUT}\` is to be a literal ` +
        `in the template or in the \`host\` block.`,
    );

  // 4. SURFACE. The inventory exists to be READ, and today's readable surface is the
  //    cards in `docs/components/`. The **Parts** row is written by hand and lies for
  //    exactly that reason: `field.md` used to list 7 parts out of eleven. The comparison
  //    goes per ENTRYPOINT, because that is how the library is imported, and one card is
  //    sometimes about two classes
  //    (`radio.md`) i jeden entrypoint o trzech kartach (`field`, `number`,
  //    `text`).
  const wgEntrypointu = new Map();
  for (const [, w] of zPakietu) {
    const zbior = wgEntrypointu.get(w.entrypoint) ?? new Set();
    for (const c of w.czesci) zbior.add(c);
    wgEntrypointu.set(w.entrypoint, zbior);
  }

  const nieznaneEntrypointy = dokumenty
    .filter((d) => d.entrypoint === null || !entrypointy.has(d.entrypoint))
    .map(
      (d) =>
        `${d.plik}: ${d.entrypoint === null ? 'no **Entrypoint:** heading' : `\`${d.entrypoint}\` is not an entrypoint of the package`}`,
    );
  if (nieznaneEntrypointy.length)
    throw new BladCzesci(
      'dokumentacja',
      `${nieznaneEntrypointy.length} cards name an entrypoint that is not in the package:\n` +
        lista(nieznaneEntrypointy) +
        `\n    The gate assigns a **Parts** row to an entrypoint by exactly that heading; ` +
        `a card without one stays outside the comparison, that is, outside the inventory.`,
    );

  const problemyDokumentacji = [];
  for (const [entrypoint, czesci] of [...wgEntrypointu].sort()) {
    const karty = dokumenty.filter((d) => d.entrypoint === entrypoint);
    if (!karty.length) {
      problemyDokumentacji.push(
        `\`${entrypoint}\` exposes ${czesci.size} parts and has no card at all ` +
          `w \`${DOKUMENTY}/\``,
      );
      continue;
    }

    const skad = new Map(); // part -> [cards]
    for (const karta of karty)
      for (const c of karta.czesci)
        skad.set(c, [...(skad.get(c) ?? []), karta.plik]);

    const dwaRazy = [...skad]
      .filter(([, gdzie]) => gdzie.length > 1)
      .map(([c, gdzie]) => `\`${c}\` w ${gdzie.join(' i ')}`);
    if (dwaRazy.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: the same part in two cards — ${dwaRazy.join('; ')}`,
      );

    const brakujeWKartach = posortuj(czesci).filter((c) => !skad.has(c));
    const nadmiarowe = [...skad.keys()].filter((c) => !czesci.has(c)).sort();
    if (brakujeWKartach.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: the package exposes what the cards do not list — ` +
          brakujeWKartach.map((c) => `\`${c}\``).join(', '),
      );
    if (nadmiarowe.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: the cards list what the package does not expose — ` +
          nadmiarowe.map((c) => `\`${c}\``).join(', '),
      );
  }
  if (problemyDokumentacji.length)
    throw new BladCzesci(
      'dokumentacja',
      `the **Parts** rows have drifted from the package (${problemyDokumentacji.length}):\n` +
        lista(skroc(problemyDokumentacji, 12)) +
        `\n    A card listing a part that does not exist sends the consumer to a selector ` +
        `matching nothing; a card silent about an existing one undoes the „recorded" ` +
        `promise entirely. ` +
        `Zapis rubryki: \`| **Parts** | \\\`nazwa\\\`, \\\`nazwa\\\` |\`.`,
    );

  // 5. SNAPSHOT — the versioned inventory a change is measured against. It stands LAST,
  // because it fires on every change of a name, including the ones the earlier points can
  // name precisely. The reverse order would answer a part brought in by a binding with
  // „the snapshot has drifted" — a correct diagnosis of a problem that is not there.
  const wiersze = [...zPakietu]
    .flatMap(([klasa, w]) =>
      posortuj(w.czesci).map((c) => [w.entrypoint, klasa, c]),
    )
    .sort((a, b) => (a.join(' ') < b.join(' ') ? -1 : 1));
  const tresc = renderujSnapshot(wiersze);
  const rozjazd = (opis) =>
    Object.assign(new BladCzesci('snapshot', opis), { snapshot: tresc });

  if (we.snapshot === null)
    throw rozjazd(
      `no \`${SNAPSHOT}\` — run \`node tools/check-parts.mjs --write\`.\n` +
        `    Without a snapshot this gate watches that three reads agree, but does not ` +
        `measure CHANGE: renaming a part together with its card in docs then passes ` +
        `without a trace, and breaks a selector at the consumer's.`,
    );
  if (we.snapshot !== tresc) {
    const stare = wierszeSnapshotu(we.snapshot);
    const nowe = wierszeSnapshotu(tresc);
    const usuniete = [...stare].filter((w) => !nowe.has(w));
    const dodane = [...nowe].filter((w) => !stare.has(w));
    throw rozjazd(
      `the inventory snapshot has drifted from the current one:\n` +
        (usuniete.length
          ? `    gone from the API (${usuniete.length}):\n` +
            lista(skroc(usuniete)) +
            '\n'
          : '') +
        (dodane.length
          ? `    added to the API (${dodane.length}):\n` +
            lista(skroc(dodane)) +
            '\n'
          : '') +
        (!usuniete.length && !dodane.length
          ? `    the list of parts is the same — the heading or the row order drifted.\n`
          : '') +
        `    \`${ATRYBUT}\` is the public styling API (decision 0013): a part that has ` +
        `gone takes a consumer's selector with it and gives not one red test, because the ` +
        `template and the sheet change together. If the change is deliberate — ` +
        `\`node tools/check-parts.mjs --write\`.`,
    );
  }

  return {
    opis:
      `${wiersze.length} parts in ${zPakietu.size} classes ` +
      `(${wgEntrypointu.size} entrypoints), ${dokumenty.length} cards in docs`,
    snapshot: tresc,
  };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The same choice of format as in `libs/tokens/tokens.snapshot.md` and for the same
 * reason: a markdown table run through prettier pads its columns to the longest cell, so
 * one long name rewrites the WHOLE file and the diff stops showing what really changed.
 */
const renderujSnapshot = (wiersze) =>
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
    'z **zbudowanego pakietu** (`ɵcmp.consts` i `ɵdir.hostAttrs` po zlinkowaniu), czyli',
    'from what the browser really gets.',
    '',
    '```',
    ...wiersze.map((w) => w.join(' ')),
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
const wierszeSnapshotu = (tresc) =>
  new Set(
    (tresc ?? '').split('\n').filter((w) => /^\.(\/[a-z0-9-]+)?\s/.test(w)),
  );

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

/**
 * A component card: the entrypoint from the heading and the part names from the **Parts**
 * row. `_template.md` and `README.md` are left out — the first is a form to copy (its row
 * describes what to write), the second a table of contents.
 */
const NAGLOWEK_ENTRYPOINT =
  /^\*\*Entrypoint:\*\*\s*`@pacit\/components(\/[a-z-]+)?`/m;
const RUBRYKA_CZESCI = /^\|\s*\*\*Parts\*\*.*$/m;

const czytajKarte = (plik, tresc) => {
  const naglowek = NAGLOWEK_ENTRYPOINT.exec(tresc);
  const rubryka = RUBRYKA_CZESCI.exec(tresc);
  return {
    plik,
    entrypoint: naglowek ? `.${naglowek[1] ?? ''}` : null,
    czesci: new Set(
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
 * opens a section with a different meaning (classes, styles, bindings). So we read only
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
    if (attrs[i] === ATRYBUT) out.push(attrs[i + 1]);
    i++;
  }
  return out;
};

const komponentyPakietu = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new BladCzesci(
      'zbior',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
    );

  await import('@angular/compiler');
  const exports =
    JSON.parse(czytaj(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];
  const entrypointy = new Set();

  for (const [wejscie, cel] of Object.entries(exports)) {
    const plik = typeof cel === 'object' ? cel.default : cel;
    if (typeof plik !== 'string' || !plik.endsWith('.mjs')) continue;
    entrypointy.add(wejscie);

    const modul = await import(
      pathToFileURL(join(dist, plik.replace(/^\.\//, ''))).href
    );
    for (const [klasa, wartosc] of Object.entries(modul)) {
      if (typeof wartosc !== 'function') continue;
      const def = wartosc['ɵcmp'] ?? wartosc['ɵdir'];
      if (!def) continue;

      const consts =
        typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
      const czesci = [
        ...consts.filter(Array.isArray).flatMap(parujAtrybuty),
        ...parujAtrybuty(def.hostAttrs ?? []),
      ];
      const funkcje = [def.template, def.hostBindings]
        .filter((f) => typeof f === 'function')
        .map((f) => f.toString());

      out.push({
        wejscie,
        klasa,
        czesci: [...new Set(czesci)],
        dynamiczne: funkcje.reduce(
          (n, t) => n + ile(t, new RegExp(ATRYBUT, 'g')),
          0,
        ),
      });
    }
  }
  return { pakiet: out, entrypointy };
};

/**
 * The sources searched for decorators. Specs are left out on purpose: they define host
 * components with the template written into the decorator, and those travel nowhere —
 * point 1 would fire on every rendering test.
 */
const jestZrodlem = (p) =>
  p.startsWith(`${PROJEKT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const jestSzablonem = (p) => p.startsWith(`${PROJEKT}/`) && p.endsWith('.html');
const jestKarta = (p) =>
  p.startsWith(`${DOKUMENTY}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

/** An input built from a file list — the same shape for the repo and for a fixture. */
const zbierzWejscie = async (root, pliki, pakietZDysku) => {
  const { pakiet, entrypointy } =
    pakietZDysku ?? (await komponentyPakietu(root));
  return {
    ...czytajZrodla(root, pliki.filter(jestZrodlem)),
    szablony: pliki
      .filter(jestSzablonem)
      .map((plik) => ({ plik, tresc: czytaj(root, plik) })),
    pakiet,
    entrypointy,
    dokumenty: pliki
      .filter(jestKarta)
      .map((plik) => czytajKarte(plik, czytaj(root, plik))),
    snapshot: existsSync(join(root, SNAPSHOT)) ? czytaj(root, SNAPSHOT) : null,
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
const plikiRepozytorium = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT, DOKUMENTY], {
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
 * The package read arrives as DATA (`pakiet.json`) rather than from a real build: building
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
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-parts-'));
  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  if (nazwa !== BAZA)
    cpSync(join(FIXTURES, nazwa), cel, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const sciezka of fx.usun ?? [])
    rmSync(join(cel, sciezka), { recursive: true, force: true });
  for (const plik of globSync('**/*.ts.txt', { cwd: cel }))
    renameSync(join(cel, plik), join(cel, plik.replace(/\.txt$/, '')));
  return cel;
};

const wejscieFixture = (katalog) => {
  const pakiet = JSON.parse(readFileSync(join(katalog, 'pakiet.json'), 'utf8'));
  return zbierzWejscie(
    katalog,
    globSync('**/*.{ts,html,md}', { cwd: katalog })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    { pakiet: pakiet.klasy, entrypointy: new Set(pakiet.entrypointy) },
  );
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

// The maintenance path: rewrite a fixture's snapshot and exit. A fixture has a snapshot of
// its own and has to get it from the same renderer as the repository — otherwise the
// reference input stops passing at the first change to the file's format.
if (WRITE_FIXTURE) {
  const katalog = zlozFixture(WRITE_FIXTURE, {});
  const cel = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    sprawdzCzesci(await wejscieFixture(katalog));
    console.log(`✓ ${WRITE_FIXTURE}: the snapshot was already current.`);
  } catch (blad) {
    if (!(blad instanceof BladCzesci) || blad.kontrola !== 'snapshot')
      throw blad;
    writeFileSync(cel, blad.snapshot);
    console.log(`✓ Rewrote ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const wynik = sprawdzCzesci(
    await zbierzWejscie(ROOT, plikiRepozytorium(), null),
  );
  opis = wynik.opis;
} catch (blad) {
  if (!(blad instanceof BladCzesci)) throw blad;
  // `--write` exists so that a snapshot drift can be accepted with one command. Every
  // other point stays an error under it too: rewriting the snapshot is no answer to a part
  // brought in by a binding.
  if (WRITE && blad.kontrola === 'snapshot') {
    writeFileSync(join(ROOT, SNAPSHOT), blad.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-parts.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every „rejected" would be false — this
// control would become the very thing it stands against.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzCzesci(await wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladCzesci)) throw blad;
    problems.push(
      `${BAZA}: the reference input does NOT pass (${blad.kontrola}) — ` +
        `every prepared case now fires because of it.\n    ${blad.message}`,
    );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

for (const nazwa of przypadki) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, nazwa, 'fixture.json'), 'utf8'),
  );
  const katalog = zlozFixture(nazwa, fx);
  try {
    sprawdzCzesci(await wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladCzesci)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
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
  `✓ Parts: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
