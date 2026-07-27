#!/usr/bin/env node
/**
 * Przepisuje `version` z manifestu pakietu do stałej `PCT_VERSION` w kodzie.
 *
 * Powód istnienia: wersja musi być w dwóch miejscach naraz, bo pakiet nie ma
 * jak wczytać własnego manifestu w runtime — import JSON-a wciągnąłby cały
 * plik do bundla. Dopóki drugie miejsce wypełniał człowiek, rozjazd był
 * kwestią czasu: `nx release version` podbija **wyłącznie** manifest, więc
 * pierwsze wydanie wypuściłoby pakiet, który kłamie o samym sobie.
 *
 * Stąd podział ról: manifest jest źródłem prawdy, ten skrypt jedynym autorem
 * stałej, a `check-package.mjs` bramką na wypadek, gdyby ktoś podbił wersję
 * i nie uruchomił skryptu. Bramka bada **zbudowany** artefakt, więc nie da się
 * jej ominąć edytując tylko źródła.
 *
 * Użycie:
 *   node libs/components/stamp-version.mjs           # zapisz
 *   node libs/components/stamp-version.mjs --check   # tylko sprawdź (kod 1 przy rozjeździe)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, 'package.json');
const TARGET = join(HERE, 'src/version.ts');

const { version } = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (!version) {
  console.error('X Brak pola `version` w libs/components/package.json.');
  process.exit(1);
}

const render = (
  v,
) => `// AUTOGENEROWANE przez libs/components/stamp-version.mjs — nie edytuj ręcznie.
// Źródłem prawdy jest pole \`version\` w libs/components/package.json; tutaj
// trafia tylko jego kopia, żeby pakiet mógł podać swoją wersję w runtime bez
// wciągania manifestu do bundla. Rozjazd blokuje bramka \`check-package\`.

/** Wersja biblioteki — ta sama, którą niesie manifest pakietu. */
export const PCT_VERSION = '${v}';
`;

const expected = render(version);
const current = (() => {
  try {
    return readFileSync(TARGET, 'utf8');
  } catch {
    return null;
  }
})();

if (process.argv.includes('--check')) {
  if (current === expected) {
    console.log(`✓ PCT_VERSION zgodne z manifestem (${version}).`);
    process.exit(0);
  }
  console.error(
    `X src/version.ts nie odpowiada manifestowi (${version}).\n` +
      `  Uruchom: npx nx stamp-version components`,
  );
  process.exit(1);
}

if (current === expected) {
  console.log(`✓ PCT_VERSION już aktualne (${version}) — bez zmian.`);
} else {
  writeFileSync(TARGET, expected);
  console.log(`✓ Zapisano PCT_VERSION = ${version} do src/version.ts.`);
}
