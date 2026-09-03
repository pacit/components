import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * Sizes
 *
 * Three heights — 28, 36 and 44 px — shared with every field, so a button and an input on
 * the same row line up to the pixel. The default comes from `providePctConfig`, not from the
 * template.
 */
@Component({
  selector: 'demo-button-sizes',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <button pctButton size="sm">Small</button>
    <button pctButton>Medium</button>
    <button pctButton size="lg">Large</button>
  `,
})
export class ButtonSizesDemo {}
