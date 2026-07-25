import { Directive } from '@angular/core';

/**
 * Dekoracja przed kontrolką, wewnątrz ramki pola (np. jednostka waluty, ikona).
 * Treść dekoracyjna powinna być ukryta przed czytnikiem (`aria-hidden`) albo
 * mieć własną nazwę dostępną, jeśli jest interaktywna.
 */
@Directive({
  selector: '[pctPrefix]',
  host: { class: 'pct-affix', 'data-pct-part': 'field-prefix-item' },
})
export class PctPrefix {}

/** Dekoracja po kontrolce, wewnątrz ramki pola (np. przycisk czyszczenia). */
@Directive({
  selector: '[pctSuffix]',
  host: { class: 'pct-affix', 'data-pct-part': 'field-suffix-item' },
})
export class PctSuffix {}
