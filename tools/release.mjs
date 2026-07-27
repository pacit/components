#!/usr/bin/env node
/**
 * Wydanie `@pacit/components`.
 *
 * Dlaczego skrypt, a nie samo `nx release`: pakiet trzeba zbudować **po**
 * podbiciu wersji, a `nx release` na to nie pozwala. Ma tylko `preVersionCommand`,
 * czyli hak przed podbiciem — zbudowany wtedy artefakt niesie starą stałą
 * `PCT_VERSION`. Obejście z `manifestRootsToUpdate` poprawia w dist wyłącznie
 * `package.json`, więc pakiet zgadza się sam ze sobą w manifeście i kłamie
 * w bundlu. Programistyczne API (`nx/release`) pozwala wejść między kroki.
 *
 * Kolejność jest więc taka:
 *   1. `releaseVersion` — podbija libs/components/package.json (bez commita i taga),
 *   2. `stamp-version`  — przepisuje nową wersję do stałej w kodzie,
 *   3. `build` + `check-package` — artefakt powstaje z już podbitych źródeł,
 *      a bramka potwierdza, że wozi skórkę i że wersje się zgadzają,
 *   4. `releaseChangelog` — CHANGELOG, commit, tag, wpis GitHub Release,
 *   5. `releasePublish` — publikacja (provenance włącza NPM_CONFIG_PROVENANCE
 *      ustawione w workflow, npm dokłada je wtedy samo).
 *
 * Krok 3 jest tu bramką, nie formalnością: gdy pakiet wyjdzie niekompletny,
 * proces staje PRZED commitem, tagiem i publikacją — czyli przed wszystkim,
 * co trzeba by potem odkręcać.
 *
 * Użycie:
 *   node tools/release.mjs --dry-run                 # nic nie zapisuje, nic nie publikuje
 *   node tools/release.mjs --specifier=minor
 *   node tools/release.mjs --first-release           # pierwsze wydanie (brak poprzedniego taga)
 */
import { execFileSync } from 'node:child_process';
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release';

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

const dryRun = flag('dry-run');
const verbose = flag('verbose');
const firstRelease = flag('first-release');
const specifier = arg('specifier');

const run = (args) => {
  console.log(`\n> npx ${args.join(' ')}`);
  execFileSync('npx', args, { stdio: 'inherit' });
};

if (dryRun) {
  console.log(
    '\n=== PRÓBA (--dry-run): nic nie zostanie zapisane, otagowane ani opublikowane ===',
  );
}

// 1. Wersja. Commit i tag świadomie odłożone — mają objąć także CHANGELOG
//    i przepisaną stałą, a te powstają dopiero w krokach 2 i 4.
const { workspaceVersion, projectsVersionData } = await releaseVersion({
  specifier,
  dryRun,
  verbose,
  firstRelease,
  gitCommit: false,
  gitTag: false,
  stageChanges: false,
});

// 2. Stała w kodzie idzie za manifestem. W próbie manifest nie został ruszony,
//    więc stempel jest tu operacją pustą i artefakt pozostaje spójny.
run(['nx', 'stamp-version', 'components']);

// 3. Dopiero teraz build — źródła mają już nową wersję. Wołamy `schematics`,
//    bo ten target zależy od `build` i dokłada do dist jeszcze `ng add`
//    oraz kolekcję migracji. Bramka idzie tu wprost,
//    a nie przez target nx, bo `--release` zaostrza ją o metadane wymagane przez
//    npm (m.in. `repository`, bez którego nie ma provenance). Na co dzień ten
//    warunek tylko ostrzega: brak zdalnego repozytorium nie jest błędem kodu.
run(['nx', 'schematics', 'components']);
console.log('\n> node libs/components/check-package.mjs --release');
execFileSync('node', ['libs/components/check-package.mjs', '--release'], {
  stdio: 'inherit',
});

// 4. CHANGELOG z konwencjonalnych commitów + commit + tag + GitHub Release.
await releaseChangelog({
  versionData: projectsVersionData,
  version: workspaceVersion,
  dryRun,
  verbose,
  firstRelease,
  // Tag musi być na zdalnym repozytorium, zanim powstanie GitHub Release —
  // ten drugi jest tworzony przez API i wskazuje na istniejący tag.
  gitPush: true,
});

// 5. Publikacja. `nx-release-publish` wskazuje na dist/libs/components,
//    a nie na katalog źródłowy.
const result = await releasePublish({ dryRun, verbose, firstRelease });

// Kod wyjścia jest sumą wyników per projekt — bez tego nieudana publikacja
// kończyłaby workflow na zielono.
process.exit(Object.values(result).every((r) => r.code === 0) ? 0 : 1);
