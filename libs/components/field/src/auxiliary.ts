import { Directive } from '@angular/core';

/*
 * The file is `auxiliary.ts` and NOT `aux.ts`, which is what it was called until 2026-09-15.
 * That name is one of the device names Windows reserves, so git refuses to create the file
 * and the checkout fails outright — no contributor on Windows can clone this repository at
 * all. It went unseen for months and was found by the first job ever run on a Windows runner
 * (`lesson-212`). The exported names and the selectors are unchanged: they are the public
 * API, and the file name never was.
 */

/**
 * A label add-on — content in the label row, aligned to the end (an "i" icon with a hint about
 * the field, a help link). It lies **outside** the field border, so it does not interfere with
 * the control's touch area. If it is interactive (a button, a link) it needs an accessible
 * name of its own.
 *
 * @example
 * <pct-field label="Login">
 *   <button pctLabelAux type="button" aria-label="What is a login?">ⓘ</button>
 *   <input pctText [(value)]="login" />
 * </pct-field>
 */
@Directive({
  selector: '[pctLabelAux]',
  host: { 'data-pct-part': 'field-label-aux-item' },
})
export class PctLabelAux {}

/**
 * A message-line add-on — content in the row below the field, aligned to the end (a character
 * counter, say). It shares the row with the hint or the error: the chrome shows only one of
 * those messages below the field, and this slot stands beside it whichever one is lit.
 *
 * @example
 * <pct-field label="About" hint="A few words about yourself">
 *   <textarea pctText [(value)]="bio"></textarea>
 *   <span pctMessageAux aria-hidden="true">{{ bio().length }}/120</span>
 * </pct-field>
 */
@Directive({
  selector: '[pctMessageAux]',
  host: { 'data-pct-part': 'field-message-aux-item' },
})
export class PctMessageAux {}
