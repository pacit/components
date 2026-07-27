import { InjectionToken, Provider } from '@angular/core';

/**
 * Teksty, które biblioteka wypisuje sama — bez nich komponent nie ma czego
 * pokazać, a nie da się ich podać inputem, bo nie należą do żadnej konkretnej
 * instancji (pusta lista opcji jest stanem, nie treścią autora widoku).
 *
 * Trzymane osobno od `PctConfig`, a nie jako jej pole, bo podmienia się je
 * w innym rytmie i w innym zasięgu: konfigurację ustawia się raz przy starcie
 * aplikacji, a teksty potrafią różnić się w obrębie jednego drzewa (sekcja
 * w innym języku, podgląd tłumaczenia). Osobny token pozwala nadpisać same
 * napisy w dowolnym poddrzewie, nie powtarzając reszty konfiguracji.
 *
 * Wartości domyślne są angielskie — to język, w którym biblioteka jest
 * publikowana. Aplikacja podmienia je przez `providePctTexts()`.
 */
export interface PctTexts {
  /** Lista wyboru: gdy nic nie wybrano. */
  readonly selectPlaceholder: string;
  /** Lista wyboru: gdy nie ma ani jednej opcji. */
  readonly selectEmpty: string;
}

export const PCT_DEFAULT_TEXTS: PctTexts = {
  selectPlaceholder: 'Select…',
  selectEmpty: 'No options',
};

export const PCT_TEXTS = new InjectionToken<PctTexts>('PCT_TEXTS', {
  factory: () => PCT_DEFAULT_TEXTS,
});

/**
 * Rejestruje teksty biblioteki (wzorzec provideX, wym-api-8). Podane pola
 * nadpisują domyślne, pozostałe zostają — dzięki temu nowy tekst dodany
 * w bibliotece nie wywraca aplikacji, która tłumaczy tylko część.
 *
 * @example
 * bootstrapApplication(App, {
 *   providers: [providePctTexts({ selectPlaceholder: 'Wybierz…' })],
 * });
 *
 * @example
 * // Zasięg lokalny: sekcja w innym języku niż reszta aplikacji.
 * @Component({ providers: [providePctTexts({ selectEmpty: 'Keine Optionen' })] })
 */
export function providePctTexts(texts: Partial<PctTexts>): Provider {
  return {
    provide: PCT_TEXTS,
    useValue: { ...PCT_DEFAULT_TEXTS, ...texts },
  };
}
