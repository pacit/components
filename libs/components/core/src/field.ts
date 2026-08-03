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
 * Czy obudowa ma narysować wokół kontrolki ramkę pola.
 * - `boxed` — pole tekstowe, select, data: ramka jest właściwa,
 * - `bare` — checkbox, grupa radiów: ramka wokół nich wygląda obco, obudowa
 *   dostarcza wyłącznie etykietę, podpowiedź i komunikat błędu.
 */
export type PctFieldAppearance = 'boxed' | 'bare';

/**
 * Kursor nad powierzchnią pola. Ramka jest jednym obszarem klikalnym, więc
 * kursor musi zapowiadać to, co kliknięcie zrobi — na **całej** jej powierzchni,
 * nie tylko nad samą kontrolką:
 * - `text` — klik ustawia karetkę (pole tekstowe, liczbowe),
 * - `pointer` — klik otwiera lub przełącza (select, data),
 * - `default` — kontrolka bez ramki (`bare`) albo neutralna.
 *
 * Zgłasza to kontrolka, a nie arkusz obudowy: inaczej `field.scss` musiałby
 * znać klasy każdej kontrolki z osobna i każda nowa zaczynałaby od tego błędu.
 */
export type PctFieldCursor = 'text' | 'pointer' | 'default';

/**
 * Kontrakt, którym kontrolka przedstawia się obudowie `pct-field`.
 * Obudowa jest prezentacyjna: czyta stan kontrolki i oddaje jej z powrotem
 * identyfikatory opisów (`aria-describedby`).
 */
export interface PctFieldControl {
  /** Id elementu, który ma być celem etykiety / nazwany przez nią. */
  readonly controlId: string;
  readonly labelStrategy: PctLabelStrategy;
  /** Domyślnie `boxed`, jeśli kontrolka nie zgłosi inaczej. */
  readonly fieldAppearance?: PctFieldAppearance;
  /** Domyślnie `default`, jeśli kontrolka nie zgłosi inaczej. */
  readonly fieldCursor?: PctFieldCursor;
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
  /**
   * Uruchamia kontrolkę tak, jak zrobiłoby to kliknięcie w nią samą. Obudowa
   * woła to po kliknięciu w ramkę poza kontrolką — inaczej `cursor: pointer`
   * nad całą ramką selecta obiecywałby otwarcie listy, a klik w padding tylko
   * przenosiłby fokus. Kontrolki tekstowe tego nie implementują: dla nich
   * sam `focus()` jest pełną odpowiedzią na kliknięcie.
   */
  activate?(): void;
  /**
   * Dla `labelStrategy: 'labelledby'` obudowa przekazuje id swojej etykiety —
   * kontrolka-kontener (np. grupa radiów) wystawia je jako `aria-labelledby`,
   * bo `<label for>` nie nazywa grupy elementów.
   */
  setLabelledBy?(id: string | null): void;
}

/** API obudowy widoczne dla kontrolek wewnętrznych. */
export interface PctFieldApi {
  /** Kontrolka rejestruje się w obudowie (wywoływane w jej konstruktorze). */
  attach(control: PctFieldControl): void;
  /**
   * Element ramki pola — powierzchnia, do której kontrolka z własną nakładką
   * (select, a w przyszłości data) wyrównuje panel. Kontrolka w obudowie stoi
   * w kolumnie odsuniętej od ramki o padding i dekoracje, więc panel oparty
   * o nią sam byłby węższy od pola i przesunięty. Krawędź, którą widzi
   * użytkownik, jest ramką obudowy i to ona wyznacza szerokość panelu.
   */
  readonly surface: Signal<HTMLElement | null>;
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
 * poprawka musiała być powtarzana N razy (wym-api-obudowa).
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
