#!/usr/bin/env node
/**
 * Lekki build tokenów DTCG -> CSS / SCSS / TS.
 *
 * Zasady (zgodne z docs/requirements/tokens.md):
 *  - źródłem prawdy są pliki DTCG ($type/$value, referencje {a.b.c}),
 *  - referencje token -> token są ZACHOWYWANE jako var() w CSS (req-token-references),
 *    dzięki czemu nadpisanie jednej zmiennej w scope kaskaduje samo,
 *  - light -> :root, dark -> [data-theme="dark"] (nadpisania semantyczne),
 *  - light jest emitowany DRUGI RAZ jako [data-theme="light"], żeby motyw dał
 *    się przełączyć w obie strony w zagnieżdżeniu (jasna karta w ciemnej
 *    stronie); bez tego "light" jest tylko brakiem atrybutu (req-token-scoped),
 *  - preferencje systemowe (`prefers-color-scheme`, `prefers-reduced-motion`)
 *    to takie same zestawy nadpisań, tylko w bloku @media zamiast pod
 *    selektorem atrybutu (req-a11y-motion, req-token-skin),
 *  - bramka a11y: walidacja kontrastu par tekst/tło wg WCAG 2.2 AA (req-token-text-pairs).
 *
 * W docelowym projekcie ten transform można zastąpić Style Dictionary —
 * kontrakt (pliki DTCG) pozostaje ten sam.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'src');
const DIST = join(__dirname, 'dist');

// Progi kontrastu WCAG 2.2 (domyślne). Tekst "duży" = >=18pt (24px) lub >=14pt
// bold (~18.66px); SC 1.4.3. UI/non-text (SC 1.4.11) = 3.0 niezależnie od rozmiaru.
const WCAG = {
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
  // SC 1.4.11 — elementy nietekstowe (obramowania, focus ring): 3:1, bez
  // rozróżnienia na rozmiar, stąd oba progi równe.
  UI: { normal: 3.0, large: 3.0, nonText: true },
};

// --- ładowanie / scalanie DTCG ------------------------------------------------
const load = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const isToken = (v) => v && typeof v === 'object' && '$value' in v;

function flatten(tree, prefix = [], out = {}) {
  for (const [key, val] of Object.entries(tree)) {
    const path = [...prefix, key];
    if (isToken(val))
      out[path.join('.')] = { type: val.$type, value: val.$value };
    else if (val && typeof val === 'object') flatten(val, path, out);
  }
  return out;
}

const merge = (...trees) => {
  const acc = {};
  for (const t of trees) Object.assign(acc, flatten(t));
  return acc;
};

const cssVar = (dotPath) => '--' + dotPath.replace(/\./g, '-');
const REF = /^\{([^}]+)\}$/;

// zamiana wartości tokenu na zapis CSS: referencja -> var(), literał -> jak jest
function toCss(value, all) {
  if (typeof value === 'string') {
    const m = value.match(REF);
    if (m) {
      if (!(m[1] in all))
        throw new Error(`Nieznana referencja tokenu: {${m[1]}}`);
      return `var(${cssVar(m[1])})`;
    }
    return value;
  }
  return String(value);
}

// rozwiązanie referencji do literału (do walidacji kontrastu)
function resolve(dotPath, all, seen = new Set()) {
  if (!(dotPath in all)) throw new Error(`Brak tokenu: ${dotPath}`);
  if (seen.has(dotPath)) throw new Error(`Cykl referencji: ${dotPath}`);
  seen.add(dotPath);
  const v = all[dotPath].value;
  if (typeof v === 'string') {
    const m = v.match(REF);
    if (m) return resolve(m[1], all, seen);
  }
  return v;
}

// --- kontrast WCAG ------------------------------------------------------------
function luminance(hex) {
  const h = hex.replace('#', '');
  const n =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(fgHex, bgHex) {
  const a = luminance(fgHex),
    b = luminance(bgHex);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Ocena jednej pary z policy wobec progów WCAG danego poziomu.
function evaluateCheck(check, tree) {
  const ratio = contrast(resolve(check.fg, tree), resolve(check.bg, tree));
  const th = WCAG[check.level] ?? WCAG.AA;
  return {
    ratio,
    th,
    passNormal: ratio >= th.normal,
    passLarge: ratio >= th.large,
  };
}

// Waliduje jeden motyw wobec całej policy; zwraca błędy i ostrzeżenia + drukuje raport.
function checkTheme(themeName, tree, policy) {
  const errors = [];
  const warnings = [];
  console.log(`\nMotyw: ${themeName}`);
  for (const check of policy.checks) {
    const { ratio, th, passNormal, passLarge } = evaluateCheck(check, tree);
    const flag = passNormal
      ? 'OK  '
      : check.severity === 'error'
        ? 'ERR '
        : 'WARN';
    console.log(
      th.nonText
        ? `  [${flag}] ${check.name}: ${ratio.toFixed(2)}:1  ` +
            `UI SC1.4.11(>=${th.normal}) ${passNormal ? 'PASS' : 'FAIL'}`
        : `  [${flag}] ${check.name}: ${ratio.toFixed(2)}:1  ` +
            `normal(${check.level}>=${th.normal}) ${passNormal ? 'PASS' : 'FAIL'} | ` +
            `duzy(>=${th.large}) ${passLarge ? 'PASS' : 'FAIL'}`,
    );
    if (!passNormal) {
      const note = th.nonText
        ? 'element nietekstowy ponizej progu SC 1.4.11'
        : passLarge
          ? 'czytelny dla duzego tekstu, ale nie dla normalnego'
          : 'niewystarczajacy takze dla duzego tekstu';
      const msg = `${themeName} / ${check.name}: ${ratio.toFixed(2)}:1 < ${th.normal} — ${note}`;
      if (check.severity === 'error') errors.push(msg);
      else warnings.push(msg);
    }
  }
  return { errors, warnings };
}

/**
 * Rozszerza zbior nadpisan o wszystkie tokeny, ktore od nich zaleza (domkniecie
 * przechodnie po referencjach). Zachowuje kolejnosc z drzewa bazowego, by
 * referencje w wygenerowanym CSS byly deklarowane przed uzyciem.
 */
function withDependents(overrides, tree) {
  const affected = new Set(Object.keys(overrides));
  let grew = true;
  while (grew) {
    grew = false;
    for (const [path, tok] of Object.entries(tree)) {
      if (affected.has(path)) continue;
      const m = typeof tok.value === 'string' ? tok.value.match(REF) : null;
      if (m && affected.has(m[1])) {
        affected.add(path);
        grew = true;
      }
    }
  }
  // Wynik w kolejnosci drzewa: nadpisania biora wartosc z motywu, pozostale
  // zachowuja swoja referencje (ktora teraz wskaze na przethemowany token).
  const out = {};
  for (const [path, tok] of Object.entries(tree)) {
    if (affected.has(path)) out[path] = overrides[path] ?? tok;
  }
  return out;
}

// --- generowanie --------------------------------------------------------------
function emitCssBlock(selector, entries, all) {
  const lines = Object.entries(entries).map(
    ([path, tok]) => `  ${cssVar(path)}: ${toCss(tok.value, all)};`,
  );
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/** Blok warunkowy — ten sam zestaw nadpisań, tylko pod media query. */
function emitMedia(condition, block, comment) {
  const body = block
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  const head = comment ? `${comment}\n` : '';
  return `${head}@media ${condition} {\n${body}\n}`;
}

function run() {
  const primitive = load('primitive.json');
  const semanticLight = load('semantic.light.json');
  const semanticDark = load('semantic.dark.json');
  const motionReduced = load('motion.reduced.json');
  // Tokeny komponentowe: auto-odkrywanie `component.*.json` — dodanie nowego
  // komponentu nie wymaga zmian w tym pliku.
  const componentFiles = readdirSync(SRC)
    .filter((f) => f.startsWith('component.') && f.endsWith('.json'))
    .sort();
  const components = componentFiles.map(load);

  const policy = JSON.parse(
    readFileSync(join(SRC, 'contrast.policy.json'), 'utf8'),
  );
  // Słownik nazw. Buildowi potrzebna jest z niego jedna rzecz — lista prefiksów
  // wyłączonych z publicznej unii TS — ale stoi ona TAM, a nie tutaj, żeby
  // `check-tokens` mogła ją przeczytać zamiast zgadywać, co ten filtr znaczy.
  const nazwy = JSON.parse(
    readFileSync(join(SRC, 'nazwy.policy.json'), 'utf8'),
  );

  const lightTree = merge(primitive, semanticLight, ...components); // :root
  const darkTree = merge(primitive, semanticLight, ...components, semanticDark); // dark nakladany na base
  // Custom properties sa podstawiane w MIEJSCU DEKLARACJI, nie uzycia: token
  // `--a: var(--b)` zadeklarowany w :root dziedziczy juz rozwinieta wartosc,
  // wiec nadpisanie `--b` w zageszczonym scope go nie zmieni. Do bloku motywu
  // musi trafic domkniecie przechodnie: nadpisania + wszystko, co je uzywa
  // (bezposrednio lub przez lancuch). Inaczej scoped theme dziala tylko na
  // warstwie semantycznej (req-token-scoped, lesson-17).
  const darkOverrides = withDependents(flatten(semanticDark), darkTree);
  // Ten sam zbiór tokenów co w dark, ale z wartościami jasnymi: `light` musi
  // być czynnym motywem, a nie samym brakiem atrybutu — inaczej jasna karta
  // wewnątrz ciemnej strony dziedziczy ciemne wartości i nie ma czym ich cofnąć.
  const lightOverrides = Object.fromEntries(
    Object.keys(darkOverrides).map((path) => [path, lightTree[path]]),
  );

  // Redukcja ruchu jest ortogonalna do motywu — nadpisuje tylko oś `motion`,
  // więc nie wchodzi w konflikt z blokami `[data-theme]`. Domknięcie
  // przechodnie liczymy tą samą funkcją co dla motywu: dziś oś nie ma
  // zależnych, ale gdy komponent dorobi własny token czasu (`--pct-x-duration:
  // var(--pct-motion-transition-duration)`), zadziała bez zmian w buildzie.
  const reducedTree = merge(
    primitive,
    semanticLight,
    ...components,
    motionReduced,
  );
  const reducedOverrides = withDependents(flatten(motionReduced), reducedTree);

  // Bramka a11y wg policy skorki (progi WCAG 2.2), per motyw.
  console.log('Walidacja kontrastu skorki (policy, progi WCAG 2.2):');
  const results = [
    checkTheme('light', lightTree, policy),
    checkTheme('dark', darkTree, policy),
  ];
  const warnings = results.flatMap((r) => r.warnings);
  const errors = results.flatMap((r) => r.errors);
  if (warnings.length) {
    console.warn(
      `\n! Ostrzezenia kontrastu (${warnings.length}):\n  - ` +
        warnings.join('\n  - '),
    );
  }
  if (errors.length) {
    console.error(
      `\nX Bramka a11y — BLAD (${errors.length} par ponizej wymogu):\n  - ` +
        errors.join('\n  - '),
    );
    process.exit(1);
  }

  mkdirSync(DIST, { recursive: true });
  const base = lightTree; // dalsze generowanie CSS/SCSS/TS jak dotychczas

  // CSS
  const css =
    [
      '/* GENERATED from libs/tokens/src/*.json — do not edit by hand. */',
      emitCssBlock(':root', base, base),
      emitCssBlock('[data-theme="light"]', lightOverrides, lightTree),
      emitCssBlock('[data-theme="dark"]', darkOverrides, darkTree),
      // Automatyczny tryb ciemny (req-token-skin). `:not([data-theme])` sprawia,
      // że preferencja systemu jest tylko WARTOŚCIĄ DOMYŚLNĄ: strona, która
      // deklaruje motyw wprost, wygrywa w obie strony (`data-theme="light"` na
      // <html> jest wyłącznikiem). Zagnieżdżone motywy działają dalej, bo blok
      // `[data-theme="light"]` niesie pełne przeciwnadpisania — to ten sam
      // powód, dla którego "light" jest tu czynnym motywem, a nie brakiem
      // atrybutu.
      emitMedia(
        '(prefers-color-scheme: dark)',
        emitCssBlock(':root:not([data-theme])', darkOverrides, darkTree),
      ),
      // Redukcja ruchu (req-a11y-motion) — jedna reguła dla całej biblioteki.
      emitMedia(
        '(prefers-reduced-motion: reduce)',
        emitCssBlock(':root', reducedOverrides, reducedTree),
      ),
    ].join('\n\n') + '\n';
  writeFileSync(join(DIST, 'pct.css'), css);

  // SCSS (zmienne wskazujące na CSS custom properties — do użytku wewnętrznego)
  const scss =
    '// GENERATED — SCSS variables pointing at CSS custom properties.\n' +
    Object.keys(base)
      .map((path) => `$${path.replace(/\./g, '-')}: var(${cssVar(path)});`)
      .join('\n') +
    '\n';
  writeFileSync(join(DIST, '_tokens.scss'), scss);

  // TS (typowane nazwy tokenów semantycznych i komponentowych)
  const publicPaths = Object.keys(base).filter(
    (p) => !nazwy.prywatne.prefiksy.some((prefiks) => p.startsWith(prefiks)),
  );
  const tsEntries = publicPaths
    .map((p) => `  '${p}': 'var(${cssVar(p)})',`)
    .join('\n');
  // Dwa różne kształty tej samej wiedzy, bo używa się jej na dwa sposoby.
  // `PctTokenName` to ścieżka DTCG (`pct.surface`) — nią adresuje się token
  // w źródłach. `PctCssVar` to nazwa custom property (`--pct-surface`) — nią
  // odpytuje się przeglądarkę w testach i w kodzie budującym motyw. Bez tego
  // drugiego typu literówka w `getPropertyValue('--pct-surfce')` zwraca pusty
  // łańcuch, a test porównujący dwa puste łańcuchy przechodzi.
  const cssVarUnion = publicPaths.map((p) => `  | '${cssVar(p)}'`).join('\n');
  const ts =
    '// GENERATED from libs/tokens/src/*.json — do not edit by hand.\n' +
    `export const pctTokens = {\n${tsEntries}\n} as const;\n\n` +
    'export type PctTokenName = keyof typeof pctTokens;\n\n' +
    "/** A token's custom-property name — the way the browser is asked for it. */\n" +
    `export type PctCssVar =\n${cssVarUnion};\n`;
  writeFileSync(join(DIST, 'tokens.ts'), ts);

  console.log(
    `\n✓ Zbudowano ${Object.keys(base).length} tokenów ` +
      `(+${Object.keys(darkOverrides).length} dark, ` +
      `+${Object.keys(reducedOverrides).length} reduced-motion) ` +
      `-> dist/{pct.css,_tokens.scss,tokens.ts}`,
  );
}

run();
