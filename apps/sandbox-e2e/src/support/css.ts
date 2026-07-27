import type { Locator, Page } from '@playwright/test';
import type { PctCssVar } from '@pacit/tokens';

/**
 * Odczyt wartości WYLICZONYCH przez przeglądarkę.
 *
 * Testy preferencji systemowych (`prefers-reduced-motion`, `prefers-color-scheme`,
 * `forced-colors`) nie mogą sprawdzać tego, co stoi w arkuszu — arkusz zawsze
 * zawiera obie gałęzie. Znaczenie ma dopiero to, którą z nich przeglądarka
 * faktycznie zastosowała, więc każde ustalenie w tych plikach jest pomiarem
 * `getComputedStyle`, nie lekturą źródła.
 *
 * Plik celowo nie ma w nazwie `.spec.`, więc Playwright go nie zbiera.
 */

/** Wartość wyliczona danej właściwości CSS. */
export function styleOf(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
    property,
  );
}

/**
 * Wartość custom property odziedziczona w miejscu danego elementu.
 *
 * Nazwa tokenu jest typowana (`PctCssVar` z generowanego `tokens.ts`), a nie
 * dowolnym łańcuchem, bo `getPropertyValue` na nieistniejącej właściwości
 * zwraca **pusty łańcuch, nie błąd**. Test porównujący dwa takie odczyty
 * przechodzi wtedy na `'' === ''` i milczy o tym, że nie zmierzył niczego —
 * ta sama klasa cichej wady co `wym-real-38`, tylko wywołana literówką.
 */
export function tokenOf(locator: Locator, token: PctCssVar): Promise<string> {
  return styleOf(locator, token);
}

/** Wartość custom property na `:root` — punkt odniesienia dla motywu strony. */
export function rootToken(page: Page, token: PctCssVar): Promise<string> {
  return page.evaluate(
    (t) =>
      getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

/**
 * Czas CSS w milisekundach. Przeglądarka normalizuje `150ms` do `0.15s`,
 * a `0.01ms` do `0.00001s`, więc porównywanie łańcuchów jest kruche —
 * interesuje nas liczba.
 */
export function msOf(cssTime: string): number {
  const value = parseFloat(cssTime);
  if (Number.isNaN(value)) {
    throw new Error(`Nie umiem odczytać czasu CSS z "${cssTime}".`);
  }
  return cssTime.trim().endsWith('ms') ? value : value * 1000;
}

/** Czas pierwszej wartości z listy (np. `transition-duration` dla kilku właściwości). */
export async function firstDurationMs(
  locator: Locator,
  property: 'transition-duration' | 'animation-duration',
): Promise<number> {
  const raw = await styleOf(locator, property);
  return msOf(raw.split(',')[0]);
}

/** Nazwy kolorów systemowych używane przez bibliotekę w trybie forced-colors. */
export const SYSTEM_COLORS = [
  'Canvas',
  'CanvasText',
  'Field',
  'FieldText',
  'GrayText',
  'Highlight',
  'SelectedItem',
  'SelectedItemText',
] as const;

export type SystemColor = (typeof SYSTEM_COLORS)[number];

/**
 * Rozwiązuje słowa kluczowe palety systemowej do konkretnych `rgb(...)`.
 *
 * Paleta zależy od motywu wysokiego kontrastu wybranego przez użytkownika, więc
 * test nie może zakładać żadnej wartości — musi ją odczytać z tej samej
 * przeglądarki, w której mierzy komponenty.
 */
export async function systemColors(
  page: Page,
): Promise<Record<SystemColor, string>> {
  return page.evaluate(
    (names) => {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.append(probe);
      const out = {} as Record<string, string>;
      for (const name of names) {
        probe.style.color = name;
        out[name] = getComputedStyle(probe).color;
      }
      probe.remove();
      return out;
    },
    SYSTEM_COLORS as readonly string[],
  ) as Promise<Record<SystemColor, string>>;
}
