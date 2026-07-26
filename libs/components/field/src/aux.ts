import { Directive } from '@angular/core';

/**
 * Dodatek etykiety — treść w wierszu etykiety, wyrównana do prawej (np. ikona
 * „i" z podpowiedzią o polu, odnośnik pomocy). Leży **poza** ramką pola, więc
 * nie miesza się do obszaru dotyku kontrolki. Jeśli jest interaktywny (przycisk,
 * link), musi mieć własną nazwę dostępną.
 *
 * @example
 * <pct-field label="Login">
 *   <button pctLabelAux type="button" aria-label="Co to jest login?">ⓘ</button>
 *   <input pctText [(value)]="login" />
 * </pct-field>
 */
@Directive({
  selector: '[pctLabelAux]',
  host: { 'data-pct-part': 'field-label-aux-item' },
})
export class PctLabelAux {}

/**
 * Dodatek linii komunikatu — treść w wierszu pod polem, wyrównana do prawej
 * (np. licznik znaków). Dzieli wiersz z podpowiedzią albo błędem: obudowa
 * pokazuje pod polem tylko jeden z komunikatów, a ten slot stoi obok niego
 * niezależnie od tego, który akurat świeci.
 *
 * @example
 * <pct-field label="Opis" hint="Krótko o sobie">
 *   <textarea pctText [(value)]="bio"></textarea>
 *   <span pctMessageAux aria-hidden="true">{{ bio().length }}/120</span>
 * </pct-field>
 */
@Directive({
  selector: '[pctMessageAux]',
  host: { 'data-pct-part': 'field-message-aux-item' },
})
export class PctMessageAux {}
