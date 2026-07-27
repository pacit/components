#!/usr/bin/env node
/**
 * Bramka pakietu: sprawdza, czy `dist/libs/components` da się zainstalować
 * i użyć — czyli czy wozi skórkę, a nie tylko kod.
 *
 * Powód istnienia (wym-real-17 w wersji dla dystrybucji): build biblioteki
 * kończy się SUKCESEM także wtedy, gdy w pakiecie nie ma ani jednej definicji
 * tokenu. Komponenty odwołują się wtedy do `var(--pct-*)`, których nikt nie
 * deklaruje — przeglądarka po cichu bierze wartość początkową (`background`
 * przezroczyste, `border-color` = currentColor) i konsument dostaje kontrolki
 * bez wyglądu. Żaden test jednostkowy ani e2e tego nie widzi, bo one działają
 * na źródłach i na sandboxie, nie na spakowanym artefakcie.
 *
 * Sprawdzane są cztery rzeczy:
 *  1. skórka jest w pakiecie (`themes/pct.css`, niepusta),
 *  2. jest osiągalna importem (`exports` w package.json),
 *  3. domknięcie tokenów: każdy `var(--pct-*)` użyty gdziekolwiek w pakiecie
 *     ma w tym pakiecie swoją deklarację,
 *  4. `PCT_VERSION` w kodzie zgadza się z `version` z manifestu.
 *
 * Punkt 3 jest tym, który faktycznie łapie regresję — warunki 1 i 2 spełni
 * też pusty plik albo skórka, z której ktoś usunął warstwę komponentową.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../dist/libs/components',
);
const THEME = 'themes/pct.css';

// Skanujemy tekstowe wyjścia pakietu. Style komponentów są w bundlach jako
// łańcuchy znaków, więc definicje z .scss trafiają tu razem z kodem.
const TEXT = new Set(['.css', '.scss', '.js', '.mjs', '.ts', '.json']);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (TEXT.has(extname(name)) && !name.endsWith('.map')) out.push(path);
  }
  return out;
};

const fail = (msg) => {
  console.error(`X Bramka pakietu — BLAD: ${msg}`);
  process.exit(1);
};

let files;
try {
  files = walk(ROOT);
} catch {
  fail(
    `brak zbudowanego pakietu w ${ROOT} — uruchom najpierw \`nx build components\``,
  );
}

// 1. skórka jest w pakiecie
const themePath = join(ROOT, THEME);
let theme = '';
try {
  theme = readFileSync(themePath, 'utf8');
} catch {
  fail(
    `pakiet nie zawiera ${THEME} — konsument dostanie komponenty bez ani jednego tokenu.\n` +
      `  Sprawdz \`assets\` w libs/components/ng-package.json oraz to, czy tokens:build wykonal sie przed build.`,
  );
}
if (!theme.includes('--pct-'))
  fail(`${THEME} nie zawiera zadnej definicji tokenu`);

// 2. skórka jest osiągalna importem. Mapa `exports` jest zamknięta: plik obecny
// w pakiecie, ale bez wpisu, jest dla konsumenta niewidoczny
// (ERR_PACKAGE_PATH_NOT_EXPORTED). Wpis może być dosłowny albo z gwiazdką.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const exposed = Object.keys(pkg.exports ?? {});
const themeKey = './' + THEME;
const covers = (pattern) => {
  const star = pattern.indexOf('*');
  if (star === -1) return pattern === themeKey;
  return (
    themeKey.startsWith(pattern.slice(0, star)) &&
    themeKey.endsWith(pattern.slice(star + 1))
  );
};
if (!exposed.some(covers)) {
  fail(
    `${THEME} jest w pakiecie, ale nie w mapie \`exports\` — \`import '@pacit/components/${THEME}'\`\n` +
      `  poleci ERR_PACKAGE_PATH_NOT_EXPORTED. Widoczne wejscia: ${exposed.join(', ')}`,
  );
}

// 3. domknięcie tokenów: użycie ⊆ deklaracje
const USED = /var\(\s*(--pct-[a-z0-9-]+)/gi;
const DEFINED = /(--pct-[a-z0-9-]+)\s*:/g;

const used = new Map(); // token -> pliki, w których go użyto
const defined = new Set();

for (const path of files) {
  const text = readFileSync(path, 'utf8');
  const where = relative(ROOT, path);
  for (const [, name] of text.matchAll(USED)) {
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(where);
  }
  for (const [, name] of text.matchAll(DEFINED)) defined.add(name);
}

const missing = [...used.keys()].filter((t) => !defined.has(t)).sort();
if (missing.length) {
  fail(
    `${missing.length} tokenow jest uzywanych, ale nigdzie w pakiecie niezadeklarowanych.\n` +
      `  Przegladarka podstawi za nie wartosc poczatkowa — komponent wyrenderuje sie bez wygladu.\n` +
      missing
        .map(
          (t) => `  - ${t}  (uzyty w: ${[...used.get(t)].sort().join(', ')})`,
        )
        .join('\n'),
  );
}

// 4. wersja w kodzie == wersja w manifeście. `PCT_VERSION` jest stałą wpisaną
// ręcznie (patrz komentarz przy niej), a `nx release` podbija tylko manifest —
// bez tej kontroli obie liczby rozjeżdżają się przy pierwszym wydaniu i to
// pakiet zaczyna kłamać o samym sobie. Brak stałej jest błędem tak samo jak
// zła wartość: znaczy, że zmienił się kształt wyjścia i kontrola przestała
// cokolwiek sprawdzać.
const VERSION_CONST = /PCT_VERSION\s*=\s*['"]([^'"]+)['"]/;
const stamped = files
  .map((path) => readFileSync(path, 'utf8').match(VERSION_CONST)?.[1])
  .filter((v) => v !== undefined);

if (stamped.length === 0) {
  fail(
    `nie znaleziono stalej PCT_VERSION w zbudowanym pakiecie — kontrola wersji przestala dzialac.\n` +
      `  Sprawdz, czy stala nadal jest eksportowana z libs/components/src/index.ts.`,
  );
}
const wrong = [...new Set(stamped)].filter((v) => v !== pkg.version);
if (wrong.length) {
  fail(
    `PCT_VERSION (${wrong.join(', ')}) nie zgadza sie z wersja pakietu (${pkg.version}).\n` +
      `  Zaktualizuj stala w libs/components/src/index.ts.`,
  );
}

console.log(
  `✓ Pakiet kompletny: ${THEME} obecny i wyeksportowany, ` +
    `${used.size} uzytych tokenow ma pokrycie w ${defined.size} deklaracjach, ` +
    `PCT_VERSION = ${pkg.version}.`,
);
