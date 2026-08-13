#!/usr/bin/env node
/**
 * Token gate: names, tiers, pairs — `req-token-names`, `req-token-tiers` and
 * `req-token-text-pairs` in one pass, because all three rest on THE SAME denominator: the
 * list of tokens. A token the gate does not see is unguessable, outside the tiers and
 * unmeasured at once, and each of the three rules alone would look green beside it.
 *
 *  1. SET: the names in `dist/pct.css` match an independent walk of the DTCG sources,
 *  2. SURFACE: `dist/tokens.ts` and `_tokens.scss` carry exactly the names they should,
 *  3. SCHEMA: every name parses against the dictionary; a component in it is an entrypoint,
 *  4. DICTIONARY: every declared word is used,
 *  5. SNAPSHOT: the versioned list of names matches the current one,
 *  6. TIERS: references point downwards — component → semantic → primitive → literal,
 *  7. PAIRS: every colour the library REALLY paints stands in the contrast policy.
 *
 * Point 5 stands before 6 and 7: a snapshot fires on every change of a name, including one
 * point 3 can name precisely. Point 7 reads `libs/components` stylesheets through sass.
 *
 * Usage: node tools/check-tokens.mjs [--write [<fixture>]]
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENY = 'libs/tokens';
const KOMPONENTY = 'libs/components';
const SNAPSHOT = `${TOKENY}/tokens.snapshot.md`;
const POLITYKA = `${TOKENY}/src/nazwy.policy.json`;
const POZIOMY = `${TOKENY}/src/poziomy.policy.json`;
const KONTRAST = `${TOKENY}/src/contrast.policy.json`;
const FIXTURES = join(ROOT, 'tools/check-tokens.fixtures');
const BAZA = '_poprawny';

const WRITE = process.argv.includes('--write');
const WRITE_FIXTURE = (() => {
  const kolejny = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && kolejny && !kolejny.startsWith('--') ? kolejny : null;
})();

const cssVar = (sciezka) => '--' + sciezka.replace(/\./g, '-');
const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

/** The first `ile` entries plus how many are left — a message has to stay readable. */
const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

// ── the dictionary ───────────────────────────────────────────────────────────────────

/**
 * Matches of a word at the START of the text, longest first. The order matters for nested
 * words: `group-label-fg` has to see the part `group-label` and not `label` — the latter
 * does not start the text anyway — but `font-size-sm` has to see the property `font-size`
 * and not `font`, and there the order does decide.
 */
const przedrostki = (slowa, tekst) =>
  slowa
    .filter((s) => tekst === s || tekst.startsWith(`${s}-`))
    .sort((a, b) => b.length - a.length);

/**
 * `[{part}-]{property}[-{variant}]`. A search with backtracking, because a greedy match
 * can take a word needed later: a name starting with a part that is also a prefix of a
 * property has two readings, and the one that closes completely is the one to take.
 */
const parsujKomponentowy = (reszta, polityka) => {
  const { czesci, wlasciwosci, stany, wielkosci } = polityka.komponentowe;
  const warianty = new Set([...stany, ...wielkosci.lista]);

  for (const czesc of [null, ...przedrostki(czesci, reszta)]) {
    const poCzesci = czesc === null ? reszta : reszta.slice(czesc.length + 1);
    if (!poCzesci) continue; // a part with no property is not a name
    for (const wlasciwosc of przedrostki(wlasciwosci, poCzesci)) {
      const ogon =
        poCzesci === wlasciwosc ? '' : poCzesci.slice(wlasciwosc.length + 1);
      if (ogon === '') return { czesc, wlasciwosc, wariant: null };
      if (warianty.has(ogon)) return { czesc, wlasciwosc, wariant: ogon };
    }
  }
  return null;
};

/** `[on-]{rola}[-{wariant}]`. */
const parsujSemantyczny = (reszta, polityka) => {
  const { role, warianty } = polityka.semantyczne;
  const para = reszta.startsWith('on-');
  const bezPary = para ? reszta.slice(3) : reszta;

  for (const rola of przedrostki(role, bezPary)) {
    const ogon = bezPary === rola ? '' : bezPary.slice(rola.length + 1);
    if (ogon === '') return { rola, wariant: null, para };
    if (warianty.includes(ogon)) return { rola, wariant: ogon, para };
  }
  return null;
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the seven checks — with an identifier, not just a message. The
 * negative control has to verify that a prepared input fired ON ITS OWN point: an input
 * failing for a reason other than the one it declares proves something other than what it
 * declares.
 *
 * The third parameter — `regula` — is the answer to `lesson-50`. A gate's point is not one
 * sentence: point 6 carries nine rules, point 7 six. Comparing the point's identifier alone
 * lets through a case that fired on a NEIGHBOURING rule of the same point — proving
 * something other than what it declares while looking like proof. Measured: disarming five
 * of those rules moves their cases onto neighbouring rules of the same point, and without
 * this field all those runs would be green. A `fixture.json` may therefore add `regula`,
 * and then that has to match too. The field is optional: the cases of points 1–5, whose
 * rules were not split, have nothing to narrow down.
 */
class BladTokenu extends Error {
  constructor(kontrola, opis, regula = null) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

/**
 * The full set of checks over a ready input. Throws `BladTokenu` on the first violation and
 * returns `{ opis, snapshot }` — the rendered snapshot comes back even from a checking run,
 * because `--write` has to write exactly what the gate has just counted rather than count a
 * second time down another path.
 */
const sprawdzTokeny = (we) => {
  const {
    polityka,
    poziomy,
    kontrast,
    zrodla,
    arkusze,
    css,
    ts,
    scss,
    snapshot,
    entrypointy,
  } = we;

  // 1. SET — two independent reads of the same list.
  //
  //    Read A reads the TEXT of the generated CSS, that is, what the browser really gets.
  //    Read B walks the DTCG trees in the sources. The independence is the whole value:
  //    were the list to come from the sources alone, a generator losing a token would not
  //    change it by a jot; from the CSS alone, a source file the build does not load would
  //    be invisible.
  //
  //    Hence also the rule „DTCG is a file with a `pct` root" rather than a repetition of
  //    the generator's `component.*.json` pattern: a repeated pattern would stop being a
  //    second sentence about the same thing.
  const zCss = new Set(
    [...css.matchAll(/^\s*(--pct-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
  );
  const zeZrodel = new Map(); // cssVar -> { sciezka, typy, pliki, wartosci }
  for (const { plik, drzewo } of zrodla)
    for (const [sciezka, typ, wartosc] of liscie(drzewo)) {
      const nazwa = cssVar(sciezka);
      const wpis = zeZrodel.get(nazwa) ?? {
        sciezka,
        typy: new Set(),
        pliki: [],
        wartosci: [],
      };
      wpis.typy.add(typ);
      wpis.pliki.push(plik);
      // Values are collected PER FILE, not one per token: `semantic.dark.json`
      // nadpisuje `semantic.light.json`, a `motion.reduced.json` — prymitywy osi
      // axis. Point 6 has to look at each of them separately, because a dark theme may
      // point elsewhere than a light one — and that is precisely where a broken tier would
      // be least visible.
      wpis.wartosci.push({ plik, wartosc });
      zeZrodel.set(nazwa, wpis);
    }

  if (!zCss.size || !zeZrodel.size)
    throw new BladTokenu(
      'zbior',
      `an empty set of names (CSS: ${zCss.size}, DTCG sources: ${zeZrodel.size}) — ` +
        `every later point would then pass without pronouncing on anything.\n` +
        `    Usual cause: a stale or empty \`${TOKENY}/dist\` (the gate needs ` +
        `\`dependsOn: build\`), or a file list that stopped returning anything.`,
    );

  const brakWCss = [...zeZrodel.keys()].filter((n) => !zCss.has(n)).sort();
  const brakWZrodlach = [...zCss].filter((n) => !zeZrodel.has(n)).sort();
  if (brakWCss.length || brakWZrodlach.length)
    throw new BladTokenu(
      'zbior',
      `the two reads of the same list disagree:\n` +
        (brakWCss.length
          ? `    in the DTCG sources, not in \`dist/pct.css\` (${brakWCss.length}):\n` +
            lista(skroc(brakWCss)) +
            '\n'
          : '') +
        (brakWZrodlach.length
          ? `    in \`dist/pct.css\`, not in the DTCG sources (${brakWZrodlach.length}):\n` +
            lista(skroc(brakWZrodlach)) +
            '\n'
          : '') +
        `    The first kind is a token the generator does not emit, or a stale \`dist\`; ` +
        `the second is a source file the generator does not load. Either way, this gate's ` +
        `list of names is not the package's list of names.`,
    );

  const niejednoznaczne = [...zeZrodel]
    .filter(([, w]) => w.typy.size > 1)
    .map(
      ([n, w]) =>
        `${n}: ${[...w.typy].sort().join(' vs ')} (${w.pliki.join(', ')})`,
    );
  if (niejednoznaczne.length)
    throw new BladTokenu(
      'zbior',
      `${niejednoznaczne.length} tokens have more than one \`$type\` in the sources:\n` +
        lista(niejednoznaczne) +
        `\n    The type travels to the consumer in the snapshot and in \`tokens.ts\`; ` +
        `with two values there is nothing to write there.`,
    );

  // A tier comes from the SOURCE FILE, not from the shape of a name. The other way round
  // would infer the tier from the very thing this gate is meant to watch.
  const nazwy = [...zeZrodel]
    .map(([nazwa, w]) => ({
      nazwa,
      sciezka: w.sciezka,
      typ: [...w.typy][0],
      wartosci: w.wartosci,
      ...warstwa(w.pliki),
    }))
    .sort((a, b) => (a.nazwa < b.nazwa ? -1 : a.nazwa > b.nazwa ? 1 : 0));

  const bezWarstwy = nazwy.filter((n) => n.warstwa === null);
  if (bezWarstwy.length)
    throw new BladTokenu(
      'zbior',
      `${bezWarstwy.length} tokens cannot be assigned to a tier:\n` +
        lista(skroc(bezWarstwy.map((n) => `${n.nazwa} (${n.powod})`))) +
        `\n    A tier comes from the source file's name (\`primitive\`, \`semantic.*\`, ` +
        `\`component.<name>\`, \`motion.*\`). A file named otherwise carries tokens nobody ` +
        `knows the kind of — and point 3 asks about the schema PROPER TO A TIER.`,
    );

  // 2. POWIERZCHNIA — co z tej listy widzi konsument.
  //
  //    `_tokens.scss` carries everything, `tokens.ts` everything outside the prefixes
  //    declared private. The prefixes are read from the policy and not from the generator,
  //    or the gate would only be confirming that the generator
  //    robi to, co robi.
  const prywatny = (sciezka) =>
    polityka.prywatne.prefiksy.some((p) => sciezka.startsWith(p));

  const nieuzytePrefiksy = polityka.prywatne.prefiksy.filter(
    (p) => !nazwy.some((n) => n.sciezka.startsWith(p)),
  );
  if (nieuzytePrefiksy.length)
    throw new BladTokenu(
      'powierzchnia',
      `${nieuzytePrefiksy.length} private prefixes cover no token at all: ` +
        nieuzytePrefiksy.map((p) => `\`${p}\``).join(', ') +
        `\n    A dead prefix is not harmless: in the policy it looks like a reach that ` +
        `does not exist, and at the next rename it will stop protecting what it was meant ` +
        `to protect — quietly.`,
    );

  porownajPowierzchnie(
    'dist/_tokens.scss',
    new Set(
      [...scss.matchAll(/^\$[a-z0-9-]+:\s*var\((--pct-[a-z0-9-]+)\)/gm)].map(
        (m) => m[1],
      ),
    ),
    new Set(nazwy.map((n) => n.nazwa)),
    'wszystkie tokeny',
  );

  const publiczne = new Set(
    nazwy.filter((n) => !prywatny(n.sciezka)).map((n) => n.nazwa),
  );
  porownajPowierzchnie(
    'dist/tokens.ts (unia PctCssVar)',
    new Set(
      [...ts.matchAll(/^\s*\|\s*'(--pct-[a-z0-9-]+)'/gm)].map((m) => m[1]),
    ),
    publiczne,
    'tokens outside the private prefixes',
  );
  porownajPowierzchnie(
    'dist/tokens.ts (the pctTokens constant)',
    new Set(
      [...ts.matchAll(/^\s*'([a-z0-9.-]+)':/gm)].map((m) => cssVar(m[1])),
    ),
    publiczne,
    'tokens outside the private prefixes',
  );

  // 3. SCHEMA — can a name be guessed?
  const zle = [];
  for (const n of nazwy) {
    const segmenty = n.sciezka.split('.');
    if (segmenty[0] !== 'pct') {
      zle.push(`${n.nazwa}: the path does not start with \`pct\``);
      continue;
    }

    if (n.warstwa === 'prymitywny') {
      const [, os, ...krok] = segmenty;
      if (!polityka.prymitywne.osie.includes(os))
        zle.push(
          `${n.nazwa}: the axis \`${os}\` is not declared ` +
            `(${polityka.prymitywne.osie.join(', ')})`,
        );
      else if (!krok.length)
        zle.push(
          `${n.nazwa}: an axis with no step — an axis alone is not a token`,
        );
      continue;
    }

    if (n.warstwa === 'semantyczny') {
      if (segmenty.length !== 2)
        zle.push(
          `${n.nazwa}: the semantic tier is FLAT, and this path has ` +
            `${segmenty.length} segments`,
        );
      else if (!parsujSemantyczny(segmenty[1], polityka))
        zle.push(
          `${n.nazwa}: does not compose into \`[on-]{role}[-{variant}]\` from the dictionary`,
        );
      continue;
    }

    // komponentowy
    if (segmenty.length !== 3) {
      zle.push(
        `${n.nazwa}: a component token has the path \`pct.{component}.{rest}\`, and this ` +
          `one has ${segmenty.length} segments — the nesting disappears in the custom ` +
          `property's name and stops being visible`,
      );
      continue;
    }
    const [, komponent, reszta] = segmenty;
    if (komponent !== n.komponent)
      zle.push(
        `${n.nazwa}: sits in \`component.${n.komponent}.json\` and is named after ` +
          `\`${komponent}\` — the file name and the token's prefix have to be one word`,
      );
    else if (!entrypointy.has(komponent))
      zle.push(
        `${n.nazwa}: \`${komponent}\` is not an entrypoint of the package ` +
          `(\`${KOMPONENTY}/${komponent}/ng-package.json\` does not exist)`,
      );
    else if (!parsujKomponentowy(reszta, polityka))
      zle.push(
        `${n.nazwa}: \`${reszta}\` does not compose into ` +
          `\`[{part}-]{property}[-{variant}]\` from the dictionary`,
      );
  }
  if (zle.length)
    throw new BladTokenu(
      'schemat',
      `${zle.length} nazw poza schematem (req-token-names):\n` +
        lista(skroc(zle, 12)) +
        `\n    A name outside the dictionary breaks nothing today — it breaks the promise ` +
        `that a sibling name can be guessed without opening the documentation. If the word ` +
        `is genuinely new, add it to \`${POLITYKA}\`: it is to be a line in the diff.`,
    );

  // 4. DICTIONARY — is every declared word used?
  //
  //    Point 3 closes on itself in a circle: a name outside the schema stops being one as
  //    soon as its word is added to the dictionary. A machine cannot settle that and this
  //    point does not pretend to — it watches a narrower thing: the dictionary is to be a
  //    record of words USED, not a dump where one more entry changes nothing because
  //    nobody looks there anyway.
  //
  //    A name that does NOT parse is skipped here rather than assumed impossible. In a
  //    normal run point 3 has already rejected it and this loop will not see it — but the
  //    negative control disarms the points one by one, and then it will. The first version
  //    read `p.czesc` directly, trusting the previous point: switching point 3 off turned
  //    the gate into a `TypeError`, and the negative control lost the ability to examine
  //    the point it was meant to examine. Exactly the defect of `check-typecheck` (A7) — a
  //    dependency between points is normal, writing it so that breaking it produces no
  //    sentence is not.
  const uzycia = new Map();
  const zapisz = (kategoria, slowo) => {
    if (slowo === null || slowo === undefined) return;
    uzycia.set(kategoria, (uzycia.get(kategoria) ?? new Set()).add(slowo));
  };
  for (const n of nazwy) {
    const segmenty = n.sciezka.split('.');
    if (n.warstwa === 'prymitywny') zapisz('prymitywne.osie', segmenty[1]);
    else if (n.warstwa === 'semantyczny') {
      const p = parsujSemantyczny(segmenty[1], polityka);
      if (!p) continue;
      zapisz('semantyczne.role', p.rola);
      zapisz('semantyczne.warianty', p.wariant);
    } else {
      const p =
        segmenty.length === 3 && parsujKomponentowy(segmenty[2], polityka);
      if (!p) continue;
      zapisz('komponentowe.czesci', p.czesc);
      zapisz('komponentowe.wlasciwosci', p.wlasciwosc);
      if (p.wariant !== null)
        zapisz(
          polityka.komponentowe.stany.includes(p.wariant)
            ? 'komponentowe.stany'
            : 'komponentowe.wielkosci',
          p.wariant,
        );
    }
  }
  const zadeklarowane = {
    'prymitywne.osie': polityka.prymitywne.osie,
    'semantyczne.role': polityka.semantyczne.role,
    'semantyczne.warianty': polityka.semantyczne.warianty,
    'komponentowe.czesci': polityka.komponentowe.czesci,
    'komponentowe.wlasciwosci': polityka.komponentowe.wlasciwosci,
    'komponentowe.stany': polityka.komponentowe.stany,
    'komponentowe.wielkosci': polityka.komponentowe.wielkosci.lista,
  };
  const martwe = Object.entries(zadeklarowane).flatMap(([kategoria, slowa]) =>
    slowa
      .filter((s) => !(uzycia.get(kategoria)?.has(s) ?? false))
      .map((s) => `${kategoria}: \`${s}\``),
  );
  if (martwe.length)
    throw new BladTokenu(
      'slownik',
      `${martwe.length} declared words are used by no token:\n` +
        lista(skroc(martwe, 12)) +
        `\n    An unused word is either a reserve for the future — and then the future ` +
        `will add it itself, visibly — or the trace of a token that is gone. Either way it ` +
        `widens the set of names point 3 lets through without widening the set of names ` +
        `anybody has seen.`,
    );

  // 5. SNAPSHOT — the versioned list a change is measured against. The rendered snapshot
  // travels ON THE ERROR rather than being computed a second time by `--write`. A second
  // path computing the same thing is a second sentence about it — and two such sentences
  // drift apart exactly when nobody is looking.
  const tresc = renderujSnapshot(nazwy, prywatny);
  const rozjazd = (opis) =>
    Object.assign(new BladTokenu('snapshot', opis), { snapshot: tresc });

  if (snapshot === null)
    throw rozjazd(
      `no \`${SNAPSHOT}\` — run \`node tools/check-tokens.mjs --write\`.\n` +
        `    Without a snapshot this gate measures the schema but not CHANGE: renaming a ` +
        `token to another valid name then passes without a trace and breaks the ` +
        `consumer's skin.`,
    );
  if (snapshot !== tresc) {
    const stare = wierszeSnapshotu(snapshot);
    const nowe = wierszeSnapshotu(tresc);
    const usuniete = [...stare].filter((w) => !nowe.has(w));
    const dodane = [...nowe].filter((w) => !stare.has(w));
    throw rozjazd(
      `the snapshot of token names has drifted from the generated ones:\n` +
        (usuniete.length
          ? `    gone from the skin (${usuniete.length}):\n` +
            lista(skroc(usuniete)) +
            '\n'
          : '') +
        (dodane.length
          ? `    added to the skin (${dodane.length}):\n` +
            lista(skroc(dodane)) +
            '\n'
          : '') +
        (!usuniete.length && !dodane.length
          ? `    the list of names is the same — the heading or the row order drifted.\n`
          : '') +
        `    A token's name is the theme's public API: a token that has gone takes the ` +
        `consumer's override with it and gives not one red test. If the change is ` +
        `deliberate — \`node tools/check-tokens.mjs --write\`.`,
    );
  }

  // 6. TIERS — the reference graph points downwards (req-token-tiers).
  //
  //    The promise is not order for order's sake but the theme author's LEVER: the
  //    semantic tier is the only one they have to know, so a component token reaching
  //    below it takes their control away quietly — the skin still builds, the tests are
  //    still green, and overriding `--pct-primary` simply does not work on one button.
  //
  //    Colour has NOT ONE exception here: above it the semantic tier exists and is
  //    complete. The exception concerns the dimension axes, above which there is no
  //    semantics, and it is narrowed from both sides at once (see `poziomy.policy.json`):
  //    an axis has to be declared, has to be used and must carry no colour token. The last
  //    of these matters most — without it, adding `blue` to the list would disarm the very
  //    rule the point exists for, and look like a single word in the diff.
  const zleP = [];
  const wgSciezki = new Map(nazwy.map((n) => [n.sciezka, n]));
  const osPrymitywu = (sciezka) => sciezka.split('.')[1];

  const osieWspolne = poziomy['osie-wspolne'].osie;
  const osieKolorowe = osieWspolne.filter((os) =>
    nazwy.some(
      (n) =>
        n.warstwa === 'prymitywny' &&
        n.typ === 'color' &&
        osPrymitywu(n.sciezka) === os,
    ),
  );
  if (osieKolorowe.length)
    throw new BladTokenu(
      'poziomy',
      `${osieKolorowe.length} axes declared as shared carry colour tokens: ` +
        osieKolorowe.map((o) => `\`${o}\``).join(', ') +
        `\n    The exception for shared axes exists because there is no semantic tier ` +
        `above a dimension. Above colour there is one, and it is mandatory. A colour axis ` +
        `on this list does not widen the exception — it deletes the rule point 6 exists for.`,
      'os-kolorowa',
    );

  const uzyteOsie = new Set();
  for (const n of nazwy)
    if (n.warstwa === 'komponentowy')
      for (const { wartosc } of n.wartosci) {
        const cel = odwolanie(wartosc);
        const docelowy = cel === null ? null : wgSciezki.get(cel);
        if (docelowy?.warstwa === 'prymitywny') uzyteOsie.add(osPrymitywu(cel));
      }
  const osieMartwe = osieWspolne.filter((os) => !uzyteOsie.has(os));
  if (osieMartwe.length)
    throw new BladTokenu(
      'poziomy',
      `${osieMartwe.length} axes declared as shared are used by no component token: ` +
        osieMartwe.map((o) => `\`${o}\``).join(', ') +
        `\n    The same construction as a dead word in the name dictionary (point 4): an ` +
        `unused axis widens the set of references point 6 lets through without widening the ` +
        `set of references anybody wrote. An axis absent from the sources altogether looks ` +
        `the same — and fires here the same way.`,
      'os-martwa',
    );

  for (const n of nazwy)
    for (const { plik, wartosc } of n.wartosci) {
      const gdzie = `${n.nazwa} (${plik.split('/').pop()})`;
      const cel = odwolanie(wartosc);

      if (cel === null) {
        // A literal. For a dimension that is fine — the component token IS the lever
        // then (`--pct-checkbox-size: 18px` is overridden directly). For a colour it is
        // not: a colour typed in bypasses the ramp and the semantic tier at once, so
        // nothing but the token itself can re-theme it.
        if (n.typ === 'color' && n.warstwa !== 'prymitywny')
          zleP.push({
            regula: 'literal-koloru',
            opis:
              `${gdzie}: a colour written inline (${JSON.stringify(wartosc)}) ` +
              `in the \`${n.warstwa}\` tier — it bypasses the ramp and the semantics at once`,
          });
        continue;
      }

      const docelowy = wgSciezki.get(cel);
      if (!docelowy) {
        // Unreachable with a green build (the generator throws „Unknown reference"), but
        // reading `docelowy.warstwa` directly would give a `TypeError` here instead of a
        // sentence — the defect this repository has caught four times already (A3, A4, A7,
        // A8), each time in a gate written in awareness of the previous one.
        zleP.push({
          regula: 'referencja-donikad',
          opis: `${gdzie}: points at a token that does not exist, \`${cel}\``,
        });
        continue;
      }

      if (n.warstwa === 'prymitywny') {
        zleP.push({
          regula: 'prymityw-nie-literal',
          opis:
            `${gdzie}: the primitive tier is the FLOOR and has to be a literal, ` +
            `and this token points at \`${cel}\` (${docelowy.warstwa})`,
        });
        continue;
      }

      if (n.warstwa === 'semantyczny') {
        // A semantic alias (`surface-disabled` -> `surface-100`) is fine: both sides
        // belong to the tier a theme author knows in full anyway.
        if (docelowy.warstwa === 'komponentowy')
          zleP.push({
            regula: 'odwolanie-w-gore',
            opis:
              `${gdzie}: the semantic tier points UPWARDS, at the component token ` +
              `\`${cel}\` — overriding one component's token then re-themes the whole skin`,
          });
        continue;
      }

      // komponentowy
      if (docelowy.warstwa === 'komponentowy') {
        zleP.push({
          regula: 'odwolanie-w-bok',
          opis:
            `${gdzie}: points at ANOTHER component's token \`${cel}\` — overriding one ` +
            `component would then change the other (req-token-override promises exactly ` +
            `the opposite)`,
        });
        continue;
      }
      if (docelowy.warstwa !== 'prymitywny') continue; // semantic — as it should be

      if (n.typ === 'color')
        zleP.push({
          regula: 'kolor-pod-semantyka',
          opis:
            `${gdzie}: a component colour points straight at the primitive \`${cel}\` — ` +
            `the semantic tier above colour exists and has no exception`,
        });
      else if (!osieWspolne.includes(osPrymitywu(cel)))
        zleP.push({
          regula: 'os-niezadeklarowana',
          opis:
            `${gdzie}: points at a primitive of the axis \`${osPrymitywu(cel)}\`, which ` +
            `\`${POZIOMY}\` does not declare as shared (today: ${osieWspolne.join(', ')})`,
        });
    }
  if (zleP.length)
    throw new BladTokenu(
      'poziomy',
      `${zleP.length} references outside the tier model (req-token-tiers):\n` +
        lista(
          skroc(
            zleP.map((z) => `[${z.regula}] ${z.opis}`),
            12,
          ),
        ) +
        `\n    The model has three floors and one direction: component → semantic → ` +
        `primitive → literal. Breaking it breaks nothing in this repository — it breaks a ` +
        `theme built from outside, and quietly, because the skin still builds.`,
      // The error's rule is the rule of the FIRST violation — with one defect (that is,
      // in every fixture) it is the only violation, and with many one has to start
      // somewhere anyway.
      zleP[0].regula,
    );

  // 7. PAIRS — every colour the library PAINTS is measured (req-token-text-pairs).
  //
  //    The denominator is not the list of names ending in `-bg` and `-fg` but what the
  //    stylesheets really paint. The difference is measurable, not theoretical: a button in
  //    the outline variant paints its background with `var(--pct-surface-100)` and its
  //    label with `var(--pct-primary)` — two SEMANTIC tokens no rule based on component
  //    token names would see. Until A12 both stood outside the policy, and that is exactly
  //    the shape of `lesson-33`: a contrast gate examines only what somebody wrote into it.
  //
  //    The `on-*` rule works the other way round: it reads NAMES, because a pair declared
  //    and never painted leaves no trace in a stylesheet. Two reads, two different
  //    blindnesses.
  const { malowane, przypisania } = malowaneKolory(arkusze);

  // Point 7's denominator is measured on the RESULT, not on the input. The first version
  // asked only about the number of stylesheets — and passed green, printing „0 colours
  // painted in 7 stylesheets": the declaration pattern required a leading dash, so it saw
  // custom properties alone and not `background:`. That is `lesson-48` inside a point
  // written so as not to repeat it, and the same mistake as in A5: the non-emptiness check
  // stood on the INPUT's side while the MEASUREMENT was empty. Zero pairs to check is
  // always zero violations.
  if (!arkusze.length || !malowane.size || !kontrast.checks?.length)
    throw new BladTokenu(
      'pary',
      `pusty mianownik punktu 7 (arkusze: ${arkusze.length}, ` +
        `kolory malowane: ${malowane.size}, ` +
        `policy entries: ${kontrast.checks?.length ?? 0}) — without any of these three ` +
        `this point passes without pronouncing on anything.\n` +
        `    Usual causes: a list of stylesheets that stopped returning anything ` +
        `(lesson-48 — a git pathspec is not a shell glob), or a declaration scanner that ` +
        `stopped recognising them.`,
      'mianownik',
    );

  const wPolicy = new Set(
    kontrast.checks.flatMap((c) => [cssVar(c.fg), cssVar(c.bg)]),
  );
  const wgNazwy = new Map(nazwy.map((n) => [n.nazwa, n]));

  const zleU = [];
  for (const [token, role] of [...malowane].sort()) {
    const n = wgNazwy.get(token);
    const role_ = [...role].sort().join(', ');
    // Each of the three rules reads its OWN precondition (`!n`, `n?.typ`) instead of
    // trusting the previous one. The dependency between them is natural — a token outside
    // the skin has no type — but written with a bare `continue` it turned disarming the
    // first rule into a `TypeError` instead of a message, and the negative control lost
    // the ability to examine the other two. The same defect as in A3, A4, A7 and A8; the
    // fifth time, and the second time INSIDE one point.
    if (!n)
      zleU.push({
        regula: 'token-spoza-skorki',
        opis:
          `${token}: painted (${role_}) and absent from the skin's tokens — ` +
          `there is nothing to measure`,
      });
    if (n && n.typ !== 'color')
      zleU.push({
        regula: 'nie-kolor',
        opis: `${token}: malowany jako kolor (${role_}), a w DTCG ma \`$type: ${n.typ}\``,
      });
    if (n && n.typ === 'color' && !wPolicy.has(token))
      zleU.push({
        regula: 'niezmierzony',
        opis: `${token}: painted (${role_}) and stands in no pair of the policy`,
      });
  }
  if (zleU.length)
    throw new BladTokenu(
      'pary',
      `${zleU.length} colours are painted with no entry in \`${KONTRAST}\`:\n` +
        lista(
          skroc(
            zleU.map((z) => `[${z.regula}] ${z.opis}`),
            12,
          ),
        ) +
        `\n    A pair with no entry is not counted, so a colour outside the policy is a ` +
        `colour the contrast gate HAS NO OPINION about — and that looks exactly like a ` +
        `green run (lesson-33). Choosing the partner stays a human decision: the machine ` +
        `sees that a colour is unmeasured, it does not see what it lies on.` +
        (przypisania
          ? `\n    Note: a stylesheet can also bring a token in by assigning to another ` +
            `custom property — those are expanded, so \`--pct-x: var(--pct-y)\` gives ` +
            `\`y\` the role of \`x\`.`
          : ''),
      zleU[0].regula,
    );

  // The `on-*` rule reads NAMES rather than stylesheets — and that is its whole value: a
  // pair declared and never painted leaves no trace in a stylesheet, so the previous
  // rule's measurement is blind to it by construction.
  const bezPowierzchni = [];
  const martwe_ = [];
  const referowane = new Set(
    nazwy.flatMap((n) => n.wartosci.map(({ wartosc }) => odwolanie(wartosc))),
  );
  for (const n of nazwy) {
    if (n.warstwa !== 'semantyczny') continue;
    if (!n.sciezka.startsWith('pct.on-')) continue;
    const rola = n.sciezka.slice('pct.on-'.length);
    if (!wgSciezki.has(`pct.${rola}`))
      bezPowierzchni.push(
        `${n.nazwa}: a pair for a \`--pct-${rola}\` that does not exist — the \`on-\` ` +
          `prefix promises text FOR a surface, and that surface is not there`,
      );
    else if (!referowane.has(n.sciezka) && !malowane.has(n.nazwa))
      martwe_.push(
        `${n.nazwa}: used by no token and no stylesheet — a declared pair with no ` +
          `surface for anything to stand on`,
      );
  }
  const bladPary = (wpisy, regula, ogon) =>
    new BladTokenu(
      'pary',
      `${wpisy.length} par \`on-*\` nie trzyma swojej strony umowy:\n` +
        lista(skroc(wpisy)) +
        `\n    The \`on-\` prefix is no ornament: it is the only place where the skin ` +
        `declares a text/background pair outright. ${ogon}`,
      regula,
    );
  if (bezPowierzchni.length)
    throw bladPary(
      bezPowierzchni,
      'on-bez-powierzchni',
      `Text for a surface that does not exist is a name promising a pair where not even ` +
        `one side is there.`,
    );
  if (martwe_.length)
    throw bladPary(
      martwe_,
      'on-martwa',
      `A dead pair looks like coverage and is not — exactly like a dead word in the ` +
        `dictionary (point 4).`,
    );

  const publicznych = publiczne.size;
  return {
    opis:
      `${nazwy.length} tokens (${publicznych} public, ` +
      `${nazwy.length - publicznych} private), ` +
      `${entrypointy.size} entrypoints, ` +
      `${malowane.size} colours painted across ${arkusze.length} stylesheets, ` +
      `${kontrast.checks.length} pairs in the policy`,
    snapshot: tresc,
  };
};

/**
 * What the stylesheets REALLY paint with which token — from sass's output, not from the
 * source text (the same reason as point 2 in `check-styles`: a property composed by a mixin
 * or an interpolation reaches the browser without standing in the text anywhere).
 *
 * There are three roles because WCAG has three thresholds: background and text (SC 1.4.3)
 * and outline (SC 1.4.11). A property outside that list brings no colour into a contrast
 * judgement — `transition: background-color …` names a property rather than painting with it.
 *
 * Assignments to another custom property (`--pct-button-height: var(--pct-button-height-sm)`
 * — the size axis pattern) are EXPANDED to a fixed point: the token on the right inherits
 * the roles of the token on the left. Without that, `--pct-button-bg: var(--pct-surface-100)`
 * in a stylesheet would hide the surface from the denominator, and it would look like no
 * problem at all. Measured, not assumed: today that pattern concerns the size axes alone,
 * that is, dimension tokens, so it brings in not one colour role.
 */
const malowaneKolory = (arkusze) => {
  const ROLE = [
    [/^background(-color)?$/, 'background'],
    [/^(color|fill|stroke|caret-color|-webkit-text-fill-color)$/, 'text'],
    [
      /^border(-(block|inline)(-(start|end))?)?(-color)?$|^outline(-color)?$/,
      'obrys',
    ],
  ];
  const bezposrednie = new Map(); // token -> Set(role)
  const przypisania = new Map(); // target token -> Set(tokens on the right)

  for (const { css } of arkusze)
    for (const [, wlasciwosc, wartosc] of css.matchAll(
      /^\s*(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gm,
    )) {
      const uzyte = [...wartosc.matchAll(/var\(\s*(--pct-[a-z0-9-]+)/g)].map(
        (m) => m[1],
      );
      if (!uzyte.length) continue;
      if (wlasciwosc.startsWith('--')) {
        const wpis = przypisania.get(wlasciwosc) ?? new Set();
        for (const t of uzyte) wpis.add(t);
        przypisania.set(wlasciwosc, wpis);
        continue;
      }
      const rola = ROLE.find(([wzorzec]) => wzorzec.test(wlasciwosc))?.[1];
      if (!rola) continue;
      for (const t of uzyte)
        bezposrednie.set(t, (bezposrednie.get(t) ?? new Set()).add(rola));
    }

  const malowane = new Map([...bezposrednie].map(([t, r]) => [t, new Set(r)]));
  for (let zmiana = true; zmiana;) {
    zmiana = false;
    for (const [cel, zrodla] of przypisania) {
      const role = malowane.get(cel);
      if (!role) continue;
      for (const t of zrodla) {
        const dotychczas = malowane.get(t) ?? new Set();
        const przed = dotychczas.size;
        for (const r of role) dotychczas.add(r);
        malowane.set(t, dotychczas);
        if (dotychczas.size !== przed) zmiana = true;
      }
    }
  }
  return { malowane, przypisania: przypisania.size > 0 };
};

/** One surface compared against the list it is meant to carry. */
const porownajPowierzchnie = (gdzie, ma, powinna, czym) => {
  const brakuje = [...powinna].filter((n) => !ma.has(n)).sort();
  const nadmiar = [...ma].filter((n) => !powinna.has(n)).sort();
  if (!brakuje.length && !nadmiar.length) return;
  throw new BladTokenu(
    'powierzchnia',
    `${gdzie} does not carry what it should (${czym}):\n` +
      (brakuje.length
        ? `    brakuje (${brakuje.length}):\n` + lista(skroc(brakuje)) + '\n'
        : '') +
      (nadmiar.length
        ? `    nadmiarowe (${nadmiar.length}):\n` + lista(skroc(nadmiar)) + '\n'
        : '') +
      `    A consumer sees the tokens through these artifacts, not through the DTCG ` +
      `sources. A token with no entry in \`tokens.ts\` is not protected from a typo in ` +
      `\`getPropertyValue\` (lesson-43), and a surplus token promises a declaration the ` +
      `skin does not hold.`,
  );
};

/** DTCG leaves: `[path, $type, $value]` for every node carrying a `$value`. */
function* liscie(drzewo, prefiks = []) {
  for (const [klucz, wartosc] of Object.entries(drzewo)) {
    if (klucz.startsWith('$')) continue;
    if (!wartosc || typeof wartosc !== 'object') continue;
    const sciezka = [...prefiks, klucz];
    if ('$value' in wartosc)
      yield [sciezka.join('.'), wartosc.$type, wartosc.$value];
    else yield* liscie(wartosc, sciezka);
  }
}

/** The DTCG path a `{a.b.c}` value points at — or `null` for a literal. */
const odwolanie = (wartosc) =>
  typeof wartosc === 'string'
    ? (wartosc.match(/^\{([^}]+)\}$/)?.[1] ?? null)
    : null;

/**
 * A token's tier from the names of the files it stands in. `motion.reduced.json` overrides
 * the primitives of the motion axis and `semantic.dark.json` the semantics, so a token is
 * sometimes in two files; one tier has to come out of them.
 */
const warstwa = (pliki) => {
  const nazwy = pliki.map((p) =>
    p
      .split('/')
      .pop()
      .replace(/\.json$/, ''),
  );
  const znalezione = new Set();
  let komponent = null;
  for (const nazwa of nazwy) {
    if (nazwa === 'primitive' || nazwa.startsWith('motion.'))
      znalezione.add('prymitywny');
    else if (nazwa.startsWith('semantic.')) znalezione.add('semantyczny');
    else if (nazwa.startsWith('component.')) {
      znalezione.add('komponentowy');
      komponent = nazwa.slice('component.'.length);
    } else znalezione.add(`?${nazwa}`);
  }
  if (znalezione.size !== 1 || [...znalezione][0].startsWith('?'))
    return {
      warstwa: null,
      komponent: null,
      powod:
        znalezione.size > 1
          ? `dwie warstwy naraz: ${pliki.join(', ')}`
          : `nierozpoznany plik: ${pliki.join(', ')}`,
    };
  return { warstwa: [...znalezione][0], komponent, powod: null };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The snapshot is markdown, but its content is a code block with no column padding. Not
 * aesthetics: a markdown table run through prettier pads its columns to the longest cell,
 * so one long token rewrites the WHOLE file and the diff stops showing what really changed
 * — losing the only function this file exists for.
 */
const renderujSnapshot = (nazwy, prywatny) =>
  [
    '# Token name snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-tokens.mjs --write`. The `check-tokens` gate rejects a drift.',
    '',
    "A token's name is the theme's public API exactly as an input's name is a component's",
    'public API — with the difference that changing it gives not one red test, because the',
    'library renames both sides at once: the token and the stylesheet using it. The consumer',
    'is left with an override pointing nowhere.',
    '',
    'This file is the list a change is measured against. A drift does not mean „an error" —',
    'it means „a change of public API that is to be visible in review".',
    '',
    'Kolumny: nazwa custom property · `$type` z DTCG · warstwa · czy jest w publicznej',
    'unii `PctCssVar` (patrz `prywatne.prefiksy` w',
    '[`src/nazwy.policy.json`](src/nazwy.policy.json)).',
    '',
    '```',
    ...nazwy.map((n) =>
      [
        n.nazwa,
        n.typ,
        n.warstwa,
        prywatny(n.sciezka) ? 'prywatny' : 'publiczny',
      ].join(' '),
    ),
    '```',
    '',
  ].join('\n');

/** The data rows alone — for computing the difference, with no heading. */
const wierszeSnapshotu = (tresc) =>
  new Set(tresc.split('\n').filter((w) => w.startsWith('--pct-')));

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

/**
 * An input built from a file list — the same shape for the repository and for a fixture.
 * `dist/` is read outside that list, because it is gitignored: for the repository it
 * comes from `dependsOn: build`, for a fixture from a run of that same `build.mjs`.
 */
const zbierzWejscie = (root, pliki) => {
  const dist = join(root, TOKENY, 'dist');
  for (const plik of ['pct.css', 'tokens.ts', '_tokens.scss'])
    if (!existsSync(join(dist, plik)))
      throw new BladTokenu(
        'zbior',
        `no \`${TOKENY}/dist/${plik}\` — this gate reads artifacts, not the sources ` +
          `alone.\n    The target needs a \`dependsOn\` on the token build.`,
      );

  const zrodla = pliki
    .filter((p) => p.startsWith(`${TOKENY}/src/`) && p.endsWith('.json'))
    .map((plik) => ({ plik, drzewo: JSON.parse(czytaj(root, plik)) }))
    // DTCG is recognised by the `pct` ROOT and not by a file-name pattern repeated from
    // the generator — see the comment at point 1.
    .filter(
      ({ drzewo }) => drzewo && typeof drzewo === 'object' && 'pct' in drzewo,
    );

  // The library's stylesheets — `libs/components` alone, and only those written by hand:
  // `libs/components/themes/` carries the GENERATED token artifacts (`_tokens.scss` is a
  // list of `$variable: var(--pct-…)`), so counting them as painting would add every skin
  // token to the denominator at once and point 7 would demand a pair for the whole
  // primitive ramp.
  const arkusze = pliki
    .filter(
      (p) =>
        p.startsWith(`${KOMPONENTY}/`) &&
        p.endsWith('.scss') &&
        !p.startsWith(`${KOMPONENTY}/themes/`),
    )
    .map((plik) => ({
      plik,
      css: sass.compile(join(root, plik), { style: 'expanded' }).css,
    }));

  return {
    polityka: JSON.parse(czytaj(root, POLITYKA)),
    poziomy: JSON.parse(czytaj(root, POZIOMY)),
    kontrast: JSON.parse(czytaj(root, KONTRAST)),
    zrodla,
    arkusze,
    css: czytaj(root, `${TOKENY}/dist/pct.css`),
    ts: czytaj(root, `${TOKENY}/dist/tokens.ts`),
    scss: czytaj(root, `${TOKENY}/dist/_tokens.scss`),
    snapshot: existsSync(join(root, SNAPSHOT)) ? czytaj(root, SNAPSHOT) : null,
    entrypointy: new Set(
      pliki
        .filter((p) =>
          new RegExp(`^${KOMPONENTY}/[^/]+/ng-package\\.json$`).test(p),
        )
        .map((p) => p.split('/')[2]),
    ),
  };
};

/**
 * Files from the GIT INDEX, not from a glob over the disk — the same reason as in
 * `check-styles`, `check-zoneless` and `check-typecheck`: the index is an independent record
 * of what the repository really carries, and it cuts out the generated things by itself.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS: a git pathspec is not a shell
 * glob, and without `:(glob)` a star crosses `/`, so a pattern with a star can return ZERO
 * files rather than an error (lesson-48).
 */
const plikiRepozytorium = () =>
  execFileSync('git', ['ls-files', '-z', TOKENY, KOMPONENTY], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, the deletions from
 * `fixture.json`, then the REAL `build.mjs` from the repository — and finally the case's
 * files once more, so that a case can replace the artifact in `dist/` too.
 *
 * That last layer is the only way to have a negative control for points 1 and 2: were a
 * fixture always given a `dist/` generated from its own sources, the artifact would agree
 * with them by definition and neither point could fire. The generator we run is the
 * repository's and not a copy of it in the fixtures — otherwise the control would be
 * checking a stale sentence about what the build does.
 *
 * A prepared `tokens.ts` sits in the repository as `tokens.ts.txt` and becomes
 * `.ts` dopiero tutaj — ten sam ruch co w `check-styles` i z tego samego powodu:
 * a `.ts` file in `tools/` belongs to no compiler program, so it would fire
 * `check-typecheck` (point 1 — a file with no project). One gate's fixture must not be
 * another's defect. Measured, not foreseen: the typecheck gate fired on
 * nim przy pierwszym przebiegu po dodaniu pliku do indeksu gita.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-tokens-'));
  const overlay = () =>
    cpSync(join(FIXTURES, nazwa), cel, {
      recursive: true,
      filter: (src) => !src.endsWith('fixture.json'),
    });

  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  if (nazwa !== BAZA) overlay();
  for (const sciezka of fx.usun ?? [])
    rmSync(join(cel, sciezka), { recursive: true, force: true });

  cpSync(join(ROOT, TOKENY, 'build.mjs'), join(cel, TOKENY, 'build.mjs'));
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: join(cel, TOKENY),
    stdio: 'pipe',
  });
  if (nazwa !== BAZA) overlay();
  for (const plik of globSync('**/*.ts.txt', { cwd: cel }))
    renameSync(join(cel, plik), join(cel, plik.replace(/\.txt$/, '')));
  return cel;
};

const wejscieFixture = (katalog) =>
  zbierzWejscie(
    katalog,
    globSync('**/*.{json,scss}', { cwd: katalog })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

// The maintenance path: rewrite a fixture's snapshot and exit. It does not mix with a
// checking run, because it is not checking — it is composing the reference input from the
// same renderer the repository is measured with.
if (WRITE_FIXTURE) {
  const katalog = zlozFixture(WRITE_FIXTURE, {});
  const cel = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    sprawdzTokeny(wejscieFixture(katalog));
    console.log(`✓ ${WRITE_FIXTURE}: the snapshot was already current.`);
  } catch (blad) {
    if (!(blad instanceof BladTokenu) || blad.kontrola !== 'snapshot')
      throw blad;
    writeFileSync(cel, blad.snapshot);
    console.log(`✓ Rewrote ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const wynik = sprawdzTokeny(zbierzWejscie(ROOT, plikiRepozytorium()));
  opis = wynik.opis;
} catch (blad) {
  if (!(blad instanceof BladTokenu)) throw blad;
  // `--write` exists so that a snapshot drift can be accepted with one command. Every
  // other point stays an error under it too: rewriting the snapshot is no answer to a name
  // from outside the schema.
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
    `tools/check-tokens.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every „rejected" would be false — this
// control would become the very thing it stands against.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzTokeny(wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladTokenu)) throw blad;
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
    sprawdzTokeny(wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTokenu)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
    // A point is not one sentence (lesson-50). A case declaring a rule has to fire on
    // THAT rule and not on a neighbouring rule of the same point — otherwise the point's
    // identifier confirms nothing but itself.
    else if (fx.regula && blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: w punkcie ${fx.punkt} rule \`${blad.regula}\` fired, and \`${fx.regula}\` — ten sam punkt, inne zdanie`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Token gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Tokens: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
