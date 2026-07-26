/** Opcja listy wyboru. Wartości są napisami — spójnie z `PctRadioGroup`. */
export interface PctSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Szerokość rozwijanego panelu:
 * - `'field'` (domyślnie) — dokładnie tyle, co widoczna kontrolka: ramka pola
 *   w obudowie, sam trigger poza nią. Panel jest wtedy przedłużeniem pola,
 *   a nie osobnym obiektem,
 * - `'auto'` — do najdłuższej opcji, ale nie węziej niż kontrolka. Dla list,
 *   w których pełna treść opcji jest ważniejsza niż równa krawędź,
 * - długość CSS (`'320px'`, `'24rem'`) — szerokość wprost.
 *
 * `& {}` zachowuje podpowiedzi edytora dla wariantów nazwanych; bez tego unia
 * z `string` zwija się do samego `string`.
 */
export type PctSelectPanelWidth = 'field' | 'auto' | (string & {});

/**
 * Wyrównanie panelu do kontrolki, gdy panel nie ma jej szerokości (`'auto'`
 * albo szerokość wprost). Przy `panelWidth="field"` wszystkie warianty dają
 * ten sam wynik.
 */
export type PctSelectPanelAlign = 'start' | 'center' | 'end';
