// Primary entrypoint (@pacit/components) — celowo minimalny (req-project-tree-shaking).
// Komponenty importuje się przez secondary entrypoints, np. @pacit/components/button.
export {
  providePctConfig,
  providePctTexts,
  PCT_CONFIG,
  PCT_DEFAULT_CONFIG,
  PCT_DEFAULT_TEXTS,
  PCT_TEXTS,
} from '@pacit/components/core';
export type { PctConfig, PctSize, PctTexts } from '@pacit/components/core';

/**
 * Wersja biblioteki. Stała jest **generowana** z `version` w `package.json`
 * przez `nx stamp-version components` — nikt jej nie wpisuje ręcznie, bo
 * `nx release version` podbija wyłącznie manifest i drugie miejsce zostawałoby
 * w tyle. Rozjazd blokuje bramka pakietu (`check-package.mjs`), która czyta
 * **zbudowany** artefakt, więc nie da się jej ominąć edytując same źródła.
 */
export { PCT_VERSION } from './version';
