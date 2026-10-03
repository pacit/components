import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTooltip } from '@pacit/components/tooltip';

/**
 * Placement, and what the sentence is
 *
 * `pctTooltipPlacement` asks for a side — logical, so `end` is the right in this page and the
 * left in an Arabic one. `pctTooltipAs="name"` makes the sentence the control's accessible
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
      pctTooltipPlacement="bottom"
    >
      Below
    </button>
    <button
      pctButton
      variant="outline"
      pctTooltip="Opens beside"
      pctTooltipPlacement="end"
    >
      Beside
    </button>
    <button
      pctButton
      iconOnly
      variant="outline"
      pctTooltip="Refresh the list"
      pctTooltipAs="name"
    >
      ↻
    </button>
  `,
})
export class TooltipPlacementDemo {}
