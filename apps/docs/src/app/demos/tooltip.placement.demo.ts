import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTooltip } from '@pacit/components/tooltip';

/**
 * Placement, and what the sentence is
 *
 * `placement` asks for a side. `as="label"` makes the sentence the control's accessible
 * name instead of its description — for an icon-only button that has no text of its own.
 */
@Component({
  selector: 'demo-tooltip-placement',
  imports: [PctButton, PctTooltip],
  styles: ':host { display: flex; gap: 8px; flex-wrap: wrap; }',
  template: `
    <button
      pctButton
      variant="outline"
      pctTooltip="Opens below"
      placement="bottom"
    >
      Below
    </button>
    <button
      pctButton
      variant="outline"
      pctTooltip="Opens beside"
      placement="right"
    >
      Beside
    </button>
    <button
      pctButton
      variant="outline"
      pctTooltip="Refresh the list"
      as="label"
    >
      ↻
    </button>
  `,
})
export class TooltipPlacementDemo {}
