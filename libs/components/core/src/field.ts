import { computed, InjectionToken, Signal } from '@angular/core';

/** Minimalny, strukturalny kształt błędu walidacji — bez wiązania `core` z API formularzy. */
export interface PctValidationError {
  readonly message?: string;
}

/**
 * Sposób powiązania etykiety z kontrolką:
 * - `for` — etykieta wskazuje pojedynczy element (`<label for>`): pole tekstowe, select, data,
 * - `labelledby` — etykieta nazywa kontener (`aria-labelledby`): grupa radiów, zestaw pól.
 */
export type PctLabelStrategy = 'for' | 'labelledby';

/**
 * Kontrakt, którym kontrolka przedstawia się obudowie `pct-field`.
 * Obudowa jest prezentacyjna: czyta stan kontrolki i oddaje jej z powrotem
 * identyfikatory opisów (`aria-describedby`).
 */
export interface PctFieldControl {
  /** Id elementu, który ma być celem etykiety / nazwany przez nią. */
  readonly controlId: string;
  readonly labelStrategy: PctLabelStrategy;
  readonly invalid: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly errors: Signal<readonly PctValidationError[]>;
  /** Obudowa przekazuje id podpowiedzi i błędu; kontrolka wystawia je na sobie. */
  setDescribedBy(ids: string | null): void;
  /**
   * Fokusuje kontrolkę. Obudowa wywołuje to, gdy użytkownik kliknie w obszar
   * pola poza samą kontrolką (padding ramki, odstęp między dekoracjami) —
   * inaczej powstaje „martwa strefa", w której kliknięcie nic nie robi.
   */
  focus?(options?: FocusOptions): void;
}

/** API obudowy widoczne dla kontrolek wewnętrznych. */
export interface PctFieldApi {
  /** Kontrolka rejestruje się w obudowie (wywoływane w jej konstruktorze). */
  attach(control: PctFieldControl): void;
}

/**
 * Token dostarczany przez `pct-field`. Kontrolki wstrzykują go **opcjonalnie**:
 * jego obecność oznacza „jestem w obudowie, oddaję etykietę i komunikaty".
 * Dzięki temu kontrolki z własnym układem (checkbox, radiogroup) działają
 * zarówno samodzielnie, jak i wewnątrz `pct-field`.
 */
export const PCT_FIELD = new InjectionToken<PctFieldApi>('PCT_FIELD');

/**
 * Wspólna logika komunikatów: tekst pierwszego błędu i bramkowanie widoczności
 * na `touched`. Wydzielona, bo była kopiowana do każdej kontrolki osobno —
 * poprawka musiała być powtarzana N razy (wym-api-13).
 */
export function pctFieldMessages(src: {
  invalid: Signal<boolean>;
  touched: Signal<boolean>;
  errors: Signal<readonly PctValidationError[]>;
}) {
  const errorText = computed(() => src.errors()?.[0]?.message ?? '');
  /** Błąd sygnalizujemy dopiero po dotknięciu — pusty formularz nie świeci na czerwono. */
  const showInvalid = computed(() => src.invalid() && src.touched());
  const showError = computed(() => showInvalid() && errorText() !== '');
  return { errorText, showInvalid, showError };
}

/** Składa `aria-describedby` z identyfikatorów, pomijając nieaktywne. */
export function pctDescribedBy(
  parts: readonly (readonly [id: string, active: boolean])[],
): string | null {
  const ids = parts.filter(([, active]) => active).map(([id]) => id);
  return ids.length > 0 ? ids.join(' ') : null;
}
