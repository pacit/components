#!/usr/bin/env node
/**
 * Lekki build tokenów DTCG -> CSS / SCSS / TS.
 *
 * Zasady (zgodne z opis.md, sekcja "Architektura design tokens"):
 *  - źródłem prawdy są pliki DTCG ($type/$value, referencje {a.b.c}),
 *  - referencje token -> token są ZACHOWYWANE jako var() w CSS (wym-token-4),
 *    dzięki czemu nadpisanie jednej zmiennej w scope kaskaduje samo,
 *  - light -> :root, dark -> [data-theme="dark"] (nadpisania semantyczne),
 *  - bramka a11y: walidacja kontrastu par tekst/tło wg WCAG 2.2 AA (wym-token-6).
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

function run() {
  const primitive = load('primitive.json');
  const semanticLight = load('semantic.light.json');
  const semanticDark = load('semantic.dark.json');
  // Tokeny komponentowe: auto-odkrywanie `component.*.json` — dodanie nowego
  // komponentu nie wymaga zmian w tym pliku.
  const componentFiles = readdirSync(SRC)
    .filter((f) => f.startsWith('component.') && f.endsWith('.json'))
    .sort();
  const components = componentFiles.map(load);

  const policy = JSON.parse(
    readFileSync(join(SRC, 'contrast.policy.json'), 'utf8'),
  );

  const lightTree = merge(primitive, semanticLight, ...components); // :root
  const darkTree = merge(primitive, semanticLight, ...components, semanticDark); // dark nakladany na base
  // Custom properties sa podstawiane w MIEJSCU DEKLARACJI, nie uzycia: token
  // `--a: var(--b)` zadeklarowany w :root dziedziczy juz rozwinieta wartosc,
  // wiec nadpisanie `--b` w zageszczonym scope go nie zmieni. Do bloku motywu
  // musi trafic domkniecie przechodnie: nadpisania + wszystko, co je uzywa
  // (bezposrednio lub przez lancuch). Inaczej scoped theme dziala tylko na
  // warstwie semantycznej (wym-theme-4, wym-real-17).
  const darkOverrides = withDependents(flatten(semanticDark), darkTree);

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
    '/* AUTOGENEROWANE z libs/tokens/src/*.json — nie edytuj ręcznie. */\n' +
    emitCssBlock(':root', base, base) +
    '\n\n' +
    emitCssBlock('[data-theme="dark"]', darkOverrides, darkTree) +
    '\n';
  writeFileSync(join(DIST, 'pct.css'), css);

  // SCSS (zmienne wskazujące na CSS custom properties — do użytku wewnętrznego)
  const scss =
    '// AUTOGENEROWANE — zmienne SCSS wskazujące na CSS custom properties.\n' +
    Object.keys(base)
      .map((path) => `$${path.replace(/\./g, '-')}: var(${cssVar(path)});`)
      .join('\n') +
    '\n';
  writeFileSync(join(DIST, '_tokens.scss'), scss);

  // TS (typowane nazwy tokenów semantycznych i komponentowych)
  const publicPaths = Object.keys(base).filter(
    (p) => !p.startsWith('pct.blue.') && !p.startsWith('pct.slate.'),
  );
  const tsEntries = publicPaths
    .map((p) => `  '${p}': 'var(${cssVar(p)})',`)
    .join('\n');
  const ts =
    '// AUTOGENEROWANE z libs/tokens/src/*.json — nie edytuj ręcznie.\n' +
    `export const pctTokens = {\n${tsEntries}\n} as const;\n\n` +
    'export type PctTokenName = keyof typeof pctTokens;\n';
  writeFileSync(join(DIST, 'tokens.ts'), ts);

  console.log(
    `\n✓ Zbudowano ${Object.keys(base).length} tokenów (+${Object.keys(darkOverrides).length} dark) -> dist/{pct.css,_tokens.scss,tokens.ts}`,
  );
}

run();
