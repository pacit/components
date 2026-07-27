/**
 * Opcja listy wyboru. Wartość jest dowolnego typu `T` — formularze biznesowe
 * wiążą identyfikatory liczbowe, warianty unii i całe encje, a zawężenie do
 * napisu zmuszało każdą aplikację do ręcznego mapowania tam i z powrotem.
 * `T` domyślnie jest napisem, więc listy napisowe pisze się jak dotąd.
 *
 * Etykieta zostaje napisem: to ona jest tekstem widocznym na ekranie i po niej
 * działa wyszukiwanie po pierwszych literach.
 */
export interface PctSelectOption<T = string> {
  readonly value: T;
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
