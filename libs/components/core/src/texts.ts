import {
  computed,
  InjectionToken,
  Provider,
  Signal,
  signal,
} from '@angular/core';

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

/**
 * Token niesie **sygnał**, a nie gotowy obiekt, bo zmiana języka bez
 * przeładowania strony jest wzorcem, nie egzotyką — a wartość wstrzyknięta raz
 * przy konstrukcji komponentu jest z definicji tą sprzed zmiany
 * ([0014](../../../../docs/decisions/0014-texts-as-signal.md)).
 *
 * Konsekwencja dla komponentu: napis czyta się **przy renderowaniu**
 * (`texts().selectEmpty`), a nie przy konstrukcji. Wartość domyślna wejścia to
 * odczyt przy konstrukcji, więc napis biblioteki nigdy nie może nią być —
 * pilnuje tego bramka `check-texts` (punkt „kanał w TS").
 */
export const PCT_TEXTS = new InjectionToken<Signal<PctTexts>>('PCT_TEXTS', {
  factory: () => signal(PCT_DEFAULT_TEXTS).asReadonly(),
});

/**
 * Rejestruje teksty biblioteki (wzorzec provideX, req-api-config). Podane pola
 * nadpisują domyślne, pozostałe zostają — dzięki temu nowy tekst dodany
 * w bibliotece nie wywraca aplikacji, która tłumaczy tylko część.
 *
 * Sygnał w argumencie jest drogą dla aplikacji przełączającej język w runtime:
 * scalanie z domyślnymi biegnie wtedy przy każdym odczycie, a nie raz.
 *
 * @example
 * bootstrapApplication(App, {
 *   providers: [providePctTexts({ selectPlaceholder: 'Wybierz…' })],
 * });
 *
 * @example
 * // Zmiana języka bez przeładowania: teksty idą z sygnału.
 * providePctTexts(computed(() => SLOWNIKI[jezyk()]));
 *
 * @example
 * // Zasięg lokalny: sekcja w innym języku niż reszta aplikacji.
 * @Component({ providers: [providePctTexts({ selectEmpty: 'Keine Optionen' })] })
 */
export function providePctTexts(
  texts: Partial<PctTexts> | Signal<Partial<PctTexts>>,
): Provider {
  // Scalanie z domyślnymi zawsze wobec `PCT_DEFAULT_TEXTS`, a nie wobec tekstów
  // z injektora nadrzędnego: poddrzewo deklaruje język, a nie różnicę wobec
  // sąsiada — inaczej ten sam `providePctTexts` znaczyłby co innego zależnie od
  // miejsca w drzewie.
  const wartosc: Signal<PctTexts> =
    typeof texts === 'function'
      ? computed(() => ({ ...PCT_DEFAULT_TEXTS, ...texts() }))
      : signal({ ...PCT_DEFAULT_TEXTS, ...texts }).asReadonly();

  return { provide: PCT_TEXTS, useValue: wartosc };
}
