// Primary entrypoint (@pacit/components) — celowo minimalny (wym-ws-5).
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
 * Wersja biblioteki. Powtarza `version` z `package.json`, bo pakiet nie ma jak
 * jej stamtąd wczytać: import JSON-a wciągnąłby cały manifest do bundla,
 * a generowanie pliku przed buildem dokładałoby krok, który da się pominąć.
 *
 * Rozjazd blokuje bramka pakietu (`check-package.mjs`): sprawdza tę stałą
 * w **zbudowanym** artefakcie wobec wersji z jego `package.json`, więc ręczna
 * edycja jednego miejsca nie przejdzie przez CI.
 */
export const PCT_VERSION = '0.0.1';
