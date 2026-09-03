import { Component } from '@angular/core';
import { PctField, PctText } from '@pacit/components/field';

/**
 * Read-only and disabled are two states
 *
 * Read-only keeps the value in the tab order and lets it be copied; disabled takes it out.
 * Both are the input's native attributes, so the platform announces them itself.
 */
@Component({
  selector: 'demo-text-states',
  imports: [PctField, PctText],
  styles: ':host { display: grid; gap: 16px; max-inline-size: 24rem; }',
  template: `
    <pct-field label="Account id" hint="Copy it; it cannot change">
      <input pctText value="acct_8f3k2" readonly />
    </pct-field>
    <pct-field label="Legacy key" hint="Retired with version 2">
      <input pctText value="••••••••" disabled />
    </pct-field>
  `,
})
export class TextStatesDemo {}
