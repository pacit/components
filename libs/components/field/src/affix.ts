import { Directive, input } from '@angular/core';

/**
 * Jak dekoracja siedzi w swoim slocie:
 *
 * - `inset` (domyślnie) — leży **na powierzchni pola**: jest wpisana w padding
 *   ramki, dziedziczy jej kursor, a klik w nią fokusuje kontrolkę. Tak zachowuje
 *   się jednostka („PLN") czy ikona rodzaju pola;
 * - `fill` — jest **własną powierzchnią**: bierze cały slot, od krawędzi ramki po
 *   odstęp kontrolki i na pełną wysokość, ma własny kursor i sama przyjmuje
 *   kliknięcie. Tak zachowuje się kafelek z tłem czy przycisk wspawany w róg pola.
 *
 * Wybiera to autor pola, nie arkusz obudowy: wcześniej decydowała tu obecność
 * elementu interaktywnego w slocie, więc przycisk **nie mógł** być mniejszy od
 * swojego slotu, a dekoracja bierna nie mogła być większa (`lesson-34`).
 *
 * Przycisk `inset` bierz o stopień mniejszy od pola: wysokości obu są w tej
 * samej wielkości równe (`req-api-size`), więc przycisk tej samej wielkości nie
 * zmieści się w ramce i rozepchnie wiersz o jej grubość.
 */
export type PctAffixFit = 'inset' | 'fill';

/** Sam atrybut, bez wartości (`pctPrefix`), daje `''` — czytamy je jako `inset`. */
function affixFit(value: PctAffixFit | ''): PctAffixFit {
  return value || 'inset';
}

/**
 * Dekoracja `fill` bierze wysokość ze slotu, nie z siebie. Bez tego przycisk
 * w slocie wnosiłby własną wysokość minimalną (`--pct-button-height`), a że
 * jest ona równa wysokości pola tej samej wielkości (`req-api-size`), rząd rósłby
 * o grubość swojej ramki — pole z wspawanym przyciskiem byłoby o 2 px wyższe
 * od pola bez niego. Wysokość i tak daje `align-items: stretch` na slocie.
 *
 * To musi być wiązanie hosta, nie reguła w `field.scss`: dekoracja jest treścią
 * rzutowaną, więc arkusz obudowy do niej nie sięga, a dyrektywa nie może mieć
 * własnego arkusza.
 */
const fitHost = {
  '[attr.data-pct-fit]': 'fit()',
  '[style.min-height]': "fit() === 'fill' ? '0' : null",
};

/**
 * Dekoracja przed kontrolką, wewnątrz ramki pola (np. jednostka waluty, ikona).
 * Treść dekoracyjna powinna być ukryta przed czytnikiem (`aria-hidden`) albo
 * mieć własną nazwę dostępną, jeśli jest interaktywna.
 *
 * @example
 * <span pctPrefix aria-hidden="true">PLN</span>
 * <span pctPrefix="fill" aria-hidden="true">https://</span>
 */
@Directive({
  selector: '[pctPrefix]',
  host: {
    class: 'pct-affix',
    'data-pct-part': 'field-prefix-item',
    ...fitHost,
  },
})
export class PctPrefix {
  readonly fit = input<PctAffixFit, PctAffixFit | ''>('inset', {
    alias: 'pctPrefix',
    transform: affixFit,
  });
}

/**
 * Dekoracja po kontrolce, wewnątrz ramki pola (np. przycisk czyszczenia).
 *
 * @example
 * <button pctSuffix pctButton size="sm" aria-label="Wyczyść">×</button>
 * <button pctSuffix="fill" pctButton>Szukaj</button>
 */
@Directive({
  selector: '[pctSuffix]',
  host: {
    class: 'pct-affix',
    'data-pct-part': 'field-suffix-item',
    ...fitHost,
  },
})
export class PctSuffix {
  readonly fit = input<PctAffixFit, PctAffixFit | ''>('inset', {
    alias: 'pctSuffix',
    transform: affixFit,
  });
}
