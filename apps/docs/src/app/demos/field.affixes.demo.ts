import { Component } from '@angular/core';
import {
  PctField,
  PctLabelAux,
  PctMessageAux,
  PctPrefix,
  PctSuffix,
  PctText,
} from '@pacit/components/field';

/**
 * Around the control
 *
 * `pctPrefix` and `pctSuffix` sit inside the row, beside the control; `pctLabelAux` and
 * `pctMessageAux` sit beside the label and the message — a counter, a link, a unit.
 */
@Component({
  selector: 'demo-field-affixes',
  imports: [
    PctField,
    PctLabelAux,
    PctMessageAux,
    PctPrefix,
    PctSuffix,
    PctText,
  ],
  styles:
    ':host { display: grid; gap: 16px; max-inline-size: 24rem; } a { color: var(--pct-primary); }',
  template: `
    <pct-field label="Price" hint="Net, per seat">
      <span pctPrefix>€</span>
      <input pctText inputmode="decimal" value="12.00" />
      <span pctSuffix>/ month</span>
    </pct-field>
    <pct-field label="Handle" hint="Letters and digits">
      <a pctLabelAux href="#rules">Rules</a>
      <span pctPrefix>&#64;</span>
      <input pctText value="ada" />
      <span pctMessageAux>3 / 20</span>
    </pct-field>
  `,
})
export class FieldAffixesDemo {}
