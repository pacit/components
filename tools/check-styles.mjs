#!/usr/bin/env node
/**
 * Style gate: `req-token-logical` (layout in logical properties, so it mirrors under
 * `dir="rtl"`) and `req-token-no-opacity` (no compositing `opacity`). Breaking either
 * gives no red test — an LTR screenshot looks right, and so does `opacity: 0.6`, which
 * quietly undoes `req-token-contrast` ([`lesson-6`](../docs/lessons.md#lesson-6)).
 *
 *  1. the list of stylesheets is not empty (else points 5 and 6 pass over nothing),
 *  2. COMPILER: everything sass EMITS is visible to the source scanner as well,
 *  3. STYLE SOURCE: every `@Component` takes its styles from a sheet this gate reads,
 *  4. exceptions are named, justified and USED,
 *  5. no physical property of the inline axis,
 *  6. no compositing `opacity`.
 *
 * Points 5 and 6 are the rules; 1–3 watch the DENOMINATOR they run over — an unread sheet
 * is to them what a missing file is to coverage ([`lesson-48`](../docs/lessons.md#lesson-48)).
 *
 * Usage: node tools/check-styles.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-styles.fixtures');
const BAZA = '_poprawny';

/**
 * The exception marker. It names a PROPERTY, not „this line": a comment written for
 * `left` must not quietly cover an `opacity` added beside it half a year later.
 *
 *   /* pct-wyjatek left: <uzasadnienie> *\/
 */
const WYJATEK = /pct-wyjatek\s+([-a-zA-Z]+)\s*:\s*([\s\S]*)$/;

/**
 * The minimum length of a justification. A floor against an empty rubber stamp
 * (`/* pct-wyjatek left: because *\/`), not a judge of quality — a machine cannot tell
 * whether a reason is true. Review watches that, and only review; the gate watches that
 * there is something to review and that exceptions can be counted.
 */
const MIN_UZASADNIENIE = 40;

/**
 * Physical properties of the inline axis and their logical counterparts. The BLOCK axis
 * (`top`/`bottom`, `margin-top`, …) is deliberately NOT on the list: `dir="rtl"` mirrors
 * the inline axis alone, and full bidi — that is, vertical writing modes — is an explicit
 * non-goal (`docs/00-axis.md`). A ban on `top` would be noise, and the answer to noise is
 * a rubber-stamp exception on every other rule.
 */
const FIZYCZNE = new Map([
  ['left', 'inset-inline-start'],
  ['right', 'inset-inline-end'],
  ['margin-left', 'margin-inline-start'],
  ['margin-right', 'margin-inline-end'],
  ['padding-left', 'padding-inline-start'],
  ['padding-right', 'padding-inline-end'],
  ['scroll-margin-left', 'scroll-margin-inline-start'],
  ['scroll-margin-right', 'scroll-margin-inline-end'],
  ['scroll-padding-left', 'scroll-padding-inline-start'],
  ['scroll-padding-right', 'scroll-padding-inline-end'],
  ['border-left', 'border-inline-start'],
  ['border-right', 'border-inline-end'],
  ['border-left-width', 'border-inline-start-width'],
  ['border-right-width', 'border-inline-end-width'],
  ['border-left-style', 'border-inline-start-style'],
  ['border-right-style', 'border-inline-end-style'],
  ['border-left-color', 'border-inline-start-color'],
  ['border-right-color', 'border-inline-end-color'],
  ['border-top-left-radius', 'border-start-start-radius'],
  ['border-top-right-radius', 'border-start-end-radius'],
  ['border-bottom-left-radius', 'border-end-start-radius'],
  ['border-bottom-right-radius', 'border-end-end-radius'],
  // `direction` in a component sheet kills the whole promise: however logical the other
  // rules are, this one pins the direction down.
  [
    'direction',
    'kierunek dziedziczony z dokumentu — nie ustawiaj go w komponencie',
  ],
]);

/** Properties where it is the VALUE that is physical, not the name. */
const FIZYCZNA_WARTOSC = new Map([
  ['text-align', { zle: new Set(['left', 'right']), zamiast: 'start / end' }],
  [
    'float',
    { zle: new Set(['left', 'right']), zamiast: 'inline-start / inline-end' },
  ],
  [
    'clear',
    { zle: new Set(['left', 'right']), zamiast: 'inline-start / inline-end' },
  ],
]);

/**
 * The `opacity` family. The SVG variants are here for the same reason as `opacity`:
 * `fill-opacity` on a checkbox tick composites in exactly the same way, it just does not
 * carry the name the requirement uses.
 */
const OPACITY = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
]);

// ── skaner arkusza ────────────────────────────────────────────────────────────

/**
 * The scanner: turns a stylesheet's text into a list of declarations and comments, each
 * with a line number. It is not a CSS parser and need not be — the gate asks only about
 * `property: value` pairs and about the comments that carry exceptions.
 *
 * postcss is deliberately NOT used here, though it is among the dependencies: its default
 * parser falls over on SCSS syntax (`//`, a `$variable` outside a rule), and `postcss-scss`
 * would be a new dependency taken on to read seven files written in plain CSS. Something
 * else matters more, though: a scanner of one's own fails the way it was designed to fail,
 * and what it cannot see is caught by point 2 — the comparison against what sass, a real
 * parser, prints from the same sheet.
 *
 * Brackets are counted separately, so that a `;` inside `url(data:…;base64,…)` does not
 * cut a declaration in half.
 */
const skanuj = (tresc) => {
  const deklaracje = [];
  const komentarze = [];
  let bufor = '';
  let liniaBufora = 0;
  let linia = 1;
  let nawiasy = 0;
  let i = 0;

  const dodaj = (znak) => {
    if (bufor.trim() === '' && znak.trim() !== '') liniaBufora = linia;
    bufor += znak;
  };

  /** Closes the buffer: if it looks like a declaration, it lands on the list. */
  const domknij = () => {
    const m = /^\s*(-{0,2}[A-Za-z_][-\w]*)\s*:\s*([\s\S]*)$/.exec(bufor);
    if (m)
      deklaracje.push({
        wlasciwosc: m[1].toLowerCase(),
        wartosc: m[2].trim().replace(/\s+/g, ' '),
        linia: liniaBufora,
      });
    bufor = '';
  };

  while (i < tresc.length) {
    const znak = tresc[i];
    const nastepny = tresc[i + 1];

    if (znak === '/' && nastepny === '*') {
      const start = linia;
      const koniec = tresc.indexOf('*/', i + 2);
      const kres = koniec === -1 ? tresc.length : koniec;
      const tekst = tresc.slice(i + 2, kres);
      linia += (tekst.match(/\n/g) ?? []).length;
      komentarze.push({ tekst, linia: start, koniec: linia });
      i = kres + 2;
      continue;
    }

    // An SCSS line comment. It carries no exceptions (sass does not emit it, so point 2
    // would have nothing to compare), but it has to leave the stream.
    if (znak === '/' && nastepny === '/') {
      const koniec = tresc.indexOf('\n', i);
      i = koniec === -1 ? tresc.length : koniec;
      continue;
    }

    if (znak === '"' || znak === "'") {
      let j = i + 1;
      while (j < tresc.length && tresc[j] !== znak) {
        if (tresc[j] === '\\') j++;
        if (tresc[j] === '\n') linia++;
        j++;
      }
      dodaj(tresc.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    if (znak === '\n') {
      linia++;
      dodaj(' ');
      i++;
      continue;
    }

    if (znak === '(') nawiasy++;
    if (znak === ')') nawiasy = Math.max(0, nawiasy - 1);

    if (nawiasy === 0) {
      // A rule prelude (a selector, an at-rule prelude) is not a declaration.
      if (znak === '{') {
        bufor = '';
        i++;
        continue;
      }
      // `}` also closes a declaration with no semicolon at the end of a block.
      if (znak === '}' || znak === ';') {
        domknij();
        i++;
        continue;
      }
    }

    dodaj(znak);
    i++;
  }

  return { deklaracje, komentarze };
};

/**
 * The key of a declaration RELEVANT to either promise — or `null`. The same key is
 * computed for the source and for sass's output, so point 2 compares those two views
 * without looking at the rest of the sheet.
 */
const kluczIstotny = (d) => {
  const wartosc = d.wartosc.toLowerCase();
  if (FIZYCZNE.has(d.wlasciwosc)) return `${d.wlasciwosc}:${wartosc}`;
  const wartosciowa = FIZYCZNA_WARTOSC.get(d.wlasciwosc);
  if (wartosciowa?.zle.has(wartosc.split(/\s+/)[0]))
    return `${d.wlasciwosc}:${wartosc}`;
  if (OPACITY.has(d.wlasciwosc) && !przezroczystoscBinarna(wartosc))
    return `${d.wlasciwosc}:${wartosc}`;
  // `inset` is physical only with several values: `inset: 0` is symmetric and behaves
  // identically in RTL, and a ban covering it too would produce contentless exceptions.
  if (d.wlasciwosc === 'inset' && wartosc.split(/\s+/).length > 1)
    return `${d.wlasciwosc}:${wartosc}`;
  return null;
};

/**
 * `opacity` is allowed ONLY as a visibility switch: `0` (the element takes no part in the
 * image, so there is no contrast to promise) and `1` (the neutral value, usually undoing a
 * state). Everything in between COMPOSITES with the background, moving the real contrast
 * outside the contrast gate's result (`lesson-6`).
 *
 * A non-literal value (`var(...)`, `calc(...)`) is not binary by definition: the gate does
 * not know what will arrive at runtime, and guessing in the author's favour would be
 * exactly the silence this rule stands against.
 *
 * Deliberately allowed: `transition: opacity …` and a 0 → 1 transition. A transient state
 * is not what `req-token-contrast` speaks about, and a ban covering animations would take
 * away the one standard way of bringing an overlay in.
 */
const przezroczystoscBinarna = (wartosc) => {
  const m = /^(\d*\.?\d+)(%?)$/.exec(wartosc.trim());
  if (!m) return false;
  const liczba = Number(m[1]) / (m[2] === '%' ? 100 : 1);
  return liczba === 0 || liczba === 1;
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the six checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a sheet failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class BladStylu extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

/**
 * The full set of checks over a ready input:
 *   `arkusze`     — `[{ plik, tresc, css }]`, where `css` is sass's output,
 *   `komponenty`  — `[{ plik, klasa, arkusze, inline }]` from the decorators,
 *   `deklaracji`  — the number of `@Component(` occurrences in the sources (the parser's
 *                   denominator).
 * Throws `BladStylu` on the first violation: the checks run from the denominator to the
 * rules, so a rule after a collapsed denominator would have nothing to examine anyway.
 */
const sprawdzStyle = ({ arkusze, komponenty, deklaracji }) => {
  // 1. The list of stylesheets is not empty.
  if (!arkusze.length)
    throw new BladStylu(
      'arkusze',
      `no stylesheet found (${PROJEKT}/**/*.scss) — points 5 and 6 would then always ` +
        `pass, having nothing to read`,
    );

  const skany = new Map(arkusze.map((a) => [a.plik, skanuj(a.tresc)]));

  // 2. The compiler: sass emits nothing relevant that the scanner cannot see in the
  //    source. This is the scanner's own denominator — a declaration produced by a mixin,
  //    an interpolation or a nested property reaches the browser without standing in the
  //    source text, so the rules would pass over it without a trace.
  for (const arkusz of arkusze) {
    const wZrodle = new Set(
      skany
        .get(arkusz.plik)
        .deklaracje.map(kluczIstotny)
        .filter((k) => k !== null),
    );
    const ukryte = [
      ...new Set(
        skanuj(arkusz.css)
          .deklaracje.map(kluczIstotny)
          .filter((k) => k !== null && !wZrodle.has(k)),
      ),
    ];
    if (ukryte.length)
      throw new BladStylu(
        'kompilator',
        `${arkusz.plik}: sass emits declarations absent from the source text:\n` +
          lista(ukryte) +
          `\n    They reach the browser, and the rules of points 5 and 6 pass over them ` +
          `without a trace. Usual cause: a mixin, an interpolation (\`padding-#{$x}\`) or ` +
          `a nested property. Write them out — or teach the scanner to read them.`,
      );
  }

  // 3. Style source: every `@Component` is styled by a sheet this gate reads.
  //
  //    A non-empty set first — for the same reason as point 1, only on the other side of
  //    the comparison. Comparing numbers (`recognised N of M`) is blind to zero: with both
  //    sides empty they are equal, and the point passes having said nothing. The first
  //    version of this gate passed exactly that way — the git pathspec returned zero
  //    sources and the result read „0 components" (`lesson-48`).
  if (!komponenty.length)
    throw new BladStylu(
      'zrodlo-stylow',
      `no \`@Component\` found in the sources (${PROJEKT}) — the comparison against the ` +
        `decorator count would then always pass, because zero equals zero.\n` +
        `    Usual cause: the list of source files stopped returning anything.`,
    );

  if (komponenty.length !== deklaracji)
    throw new BladStylu(
      'zrodlo-stylow',
      `the parser recognised ${komponenty.length} of ${deklaracji} \`@Component\` ` +
        `decorators — the rest would drop out of the measurement without a trace. Usual ` +
        `cause: a decorator written otherwise than prettier formats it (\`@Component({\` ` +
        `and \`})\` in column zero).`,
    );

  const znane = new Set(arkusze.map((a) => a.plik));
  const bezArkusza = komponenty.flatMap((k) => {
    if (k.inline)
      return [
        `${k.plik}: ${k.klasa} has \`styles: […]\` in its decorator — this gate reads sheets, not decorators`,
      ];
    return k.arkusze
      .filter((a) => !znane.has(a))
      .map(
        (a) =>
          `${k.plik}: ${k.klasa} takes its styles from \`${a}\`, outside the sheet list`,
      );
  });
  if (bezArkusza.length)
    throw new BladStylu(
      'zrodlo-stylow',
      `${bezArkusza.length} components take their styles from beyond this gate's reach:\n` +
        lista(bezArkusza) +
        `\n    Those styles travel to the consumer like every other, and points 5 and 6 ` +
        `pronounce them „clean" only because they cannot see them.`,
    );

  // 4. Exceptions: named, justified, used.
  //
  //    An exception holds ONLY for an adjacent declaration — on the same line, or on the
  //    line directly below the comment. Without that, a reason describing one rule would
  //    spread over a whole block, and moving code would leave a valid exception standing
  //    above something else entirely.
  const usprawiedliwione = new Set();
  const problemyWyjatkow = [];
  for (const arkusz of arkusze) {
    const { deklaracje, komentarze } = skany.get(arkusz.plik);
    for (const komentarz of komentarze) {
      const m = WYJATEK.exec(komentarz.tekst);
      if (!m) continue;
      const [, wlasciwosc, uzasadnienieSurowe] = m;
      const uzasadnienie = uzasadnienieSurowe.replace(/\*+\s*$/, '').trim();
      if (uzasadnienie.length < MIN_UZASADNIENIE) {
        problemyWyjatkow.push(
          `${arkusz.plik}:${komentarz.linia}: an exception for \`${wlasciwosc}\` with no ` +
            `justification (${uzasadnienie.length} of ${MIN_UZASADNIENIE} characters) — ` +
            `a rubber stamp, not a reason`,
        );
        continue;
      }
      const trafione = deklaracje.filter(
        (d) =>
          d.wlasciwosc === wlasciwosc.toLowerCase() &&
          (d.linia === komentarz.linia || d.linia === komentarz.koniec + 1),
      );
      if (!trafione.length) {
        problemyWyjatkow.push(
          `${arkusz.plik}:${komentarz.linia}: an exception for \`${wlasciwosc}\` is ` +
            `adjacent to no declaration of that property — either the code moved and the ` +
            `exception was left behind, or the property named is not the one below`,
        );
        continue;
      }
      for (const d of trafione)
        usprawiedliwione.add(`${arkusz.plik}:${d.linia}`);
    }
  }
  if (problemyWyjatkow.length)
    throw new BladStylu(
      'wyjatek',
      `${problemyWyjatkow.length} exceptions are not exceptions:\n` +
        lista(problemyWyjatkow) +
        `\n    Notation: /* pct-wyjatek <property>: <why it is safe exactly here> */`,
    );

  // 5. Logical properties (`req-token-logical`).
  const fizyczne = [];
  // 6. No compositing `opacity` (`req-token-no-opacity`).
  const przezroczyste = [];

  for (const arkusz of arkusze)
    for (const d of skany.get(arkusz.plik).deklaracje) {
      if (usprawiedliwione.has(`${arkusz.plik}:${d.linia}`)) continue;
      const gdzie = `${arkusz.plik}:${d.linia}`;

      const logiczna = FIZYCZNE.get(d.wlasciwosc);
      if (logiczna) {
        fizyczne.push(`${gdzie}: \`${d.wlasciwosc}\` — use \`${logiczna}\``);
        continue;
      }
      const wartosciowa = FIZYCZNA_WARTOSC.get(d.wlasciwosc);
      const pierwsza = d.wartosc.toLowerCase().split(/\s+/)[0];
      if (wartosciowa?.zle.has(pierwsza)) {
        fizyczne.push(
          `${gdzie}: \`${d.wlasciwosc}: ${pierwsza}\` — use \`${wartosciowa.zamiast}\``,
        );
        continue;
      }
      if (d.wlasciwosc === 'inset' && d.wartosc.split(/\s+/).length > 1) {
        fizyczne.push(
          `${gdzie}: \`inset: ${d.wartosc}\` — several values set the inline axis ` +
            `physically; use \`inset-block-*\` / \`inset-inline-*\``,
        );
        continue;
      }
      if (OPACITY.has(d.wlasciwosc) && !przezroczystoscBinarna(d.wartosc))
        przezroczyste.push(`${gdzie}: \`${d.wlasciwosc}: ${d.wartosc}\``);
    }

  if (fizyczne.length)
    throw new BladStylu(
      'logiczne',
      `${fizyczne.length} physical properties of the inline axis (req-token-logical):\n` +
        lista(fizyczne) +
        `\n    A physically described layout does NOT mirror under \`dir="rtl"\`, and no ` +
        `LTR screenshot shows it. If this one is safe, say why: ` +
        `/* pct-wyjatek <property>: <reason> */`,
    );

  if (przezroczyste.length)
    throw new BladStylu(
      'opacity',
      `${przezroczyste.length} \`opacity\` declarations compositing with the background (req-token-no-opacity):\n` +
        lista(przezroczyste) +
        `\n    The contrast gate computes on the palette's values, so it cannot see the ` +
        `compositing — this is the way back to before lesson-6. Express the state with a ` +
        `colour token of its own. Only \`0\` and \`1\` are allowed (a visibility switch).`,
    );

  const wyjatkow = usprawiedliwione.size;
  return (
    `${arkusze.length} stylesheets, ${komponenty.length} components, ` +
    `${wyjatkow} justified ${wyjatkow === 1 ? 'exception' : 'exceptions'}`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * The component decorator. The parser anchors in column zero, because that is the
 * formatting `nx format:check` enforces, and the counter watches that a drift from that
 * assumption stays visible — a component the parser does not recognise is to drop out of
 * the measurement LOUDLY, not quietly.
 *
 * So the counter must NOT repeat the parser's anchor, and that is the whole point here.
 * The first version had `/^@Component\(/gm` in both places: moving a decorator by one
 * space put out the parser and the counter at once, both sides agreed on seven and the
 * gate ended green, having stopped measuring a whole component (`lesson-48`). Indentation
 * is therefore allowed here, and only occurrences in comments are filtered out —
 * `core/src/texts.ts` has `@Component(` in a JSDoc example, that is, on a line starting
 * with an asterisk.
 */
const KOMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const KOMPONENT_LICZNIK = /^[ \t]*@Component\(/gm;

const czytajKomponenty = (root, pliki) => {
  const komponenty = [];
  let deklaracji = 0;
  for (const plik of pliki) {
    const tresc = readFileSync(join(root, plik), 'utf8');
    deklaracji += (tresc.match(KOMPONENT_LICZNIK) ?? []).length;
    for (const [, cialo, klasa] of tresc.matchAll(KOMPONENT)) {
      const arkusze = [
        ...cialo.matchAll(
          /styleUrls?\s*:\s*(?:\[([^\]]*)\]|(['"])([^'"]*)\2)/g,
        ),
      ].flatMap(([, tablica, , pojedynczy]) =>
        pojedynczy !== undefined
          ? [pojedynczy]
          : [...tablica.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]),
      );
      komponenty.push({
        plik,
        klasa,
        inline: /^\s*styles\s*:/m.test(cialo),
        arkusze: arkusze.map((a) =>
          relative(root, resolve(join(root, dirname(plik)), a))
            .split('\\')
            .join('/'),
        ),
      });
    }
  }
  return { komponenty, deklaracji };
};

/** An input built from a file list — the same shape for the repo and for a fixture. */
const zbierzWejscie = (root, arkuszeSciezki, zrodlaSciezki) => ({
  arkusze: arkuszeSciezki.map((plik) => ({
    plik,
    tresc: readFileSync(join(root, plik), 'utf8'),
    // Sass's output, that is, what the browser really gets. The `expanded` style keeps
    // `/* */` comments, so point 2's comparison looks at the same material on both sides.
    css: sass.compile(join(root, plik), { style: 'expanded' }).css,
  })),
  ...czytajKomponenty(root, zrodlaSciezki),
});

/**
 * All the project's files from the GIT INDEX, not from a glob over the disk. The reason is
 * the same as in `check-zoneless` and `check-typecheck`: the index is an independent
 * record of what the repository really carries, and it cuts out generated things by itself
 * — `libs/components/themes/_tokens.scss` is produced from the tokens on every build and
 * is gitignored, so there is nothing here to exclude it with.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS. Not a matter of taste: a git
 * pathspec is not a shell glob — without `:(glob)` a star crosses `/`, so
 * `libs/components/*​/src/**​/*.ts` asks for one directory too many and does not match
 * `button/src/button.ts`. It then returns ZERO files rather than an error. The first
 * version of this gate passed green with such a pattern, measuring zero components
 * (`lesson-48`).
 */
const plikiProjektu = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * The sources searched for `@Component`. Specs are left out on purpose: they define host
 * components with a template and styles written into the decorator, and those travel
 * nowhere — point 3 would fire on every rendering test.
 */
const jestZrodlem = (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts');

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, the deletions
 * from `fixture.json` last. The case directory then holds NOTHING BUT the defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * Component sources sit in the repository as `*.ts.txt` and become `*.ts` only here. The
 * reason is hard and already written down in `tsconfig.root.json`: a `.ts` file in `tools/`
 * belongs to no compiler program, so it would fire `check-typecheck` (point 1 — a file
 * with no project). One gate's fixture must not be another's defect. The composition goes
 * to a temporary directory OUTSIDE the repository, so no gate ever sees the intermediate
 * material.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-styles-'));
  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
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

const pliki = (katalog, wzorzec) =>
  globSync(wzorzec, { cwd: katalog })
    .map((p) => p.split('\\').join('/'))
    .sort();

const wejscieFixture = (katalog) =>
  zbierzWejscie(
    katalog,
    pliki(katalog, '**/*.scss'),
    pliki(katalog, '**/*.ts').filter(jestZrodlem),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const pliki = plikiProjektu();
  opis = sprawdzStyle(
    zbierzWejscie(
      ROOT,
      pliki.filter((p) => p.endsWith('.scss')),
      pliki.filter(jestZrodlem),
    ),
  );
} catch (blad) {
  if (!(blad instanceof BladStylu)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-styles.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were the base defective itself, every case would
// fire because of it and not because of its own defect — every „rejected" would be
// false, and this control would become the very thing it stands against.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzStyle(wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladStylu)) throw blad;
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
    sprawdzStyle(wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladStylu)) throw blad;
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
  console.error(`X Style gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Styles: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
