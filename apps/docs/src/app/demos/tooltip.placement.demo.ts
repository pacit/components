import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';
import { PctTooltip } from '@pacit/components/tooltip';
import { RefreshCw } from 'lucide';

/**
 * Placement, and what the sentence is
 *
 * `pctTooltipPlacement` asks for a side — logical, so `end` is the right in this page and the
 * left in an Arabic one. `pctTooltipAs="name"` makes the sentence the control's accessible
 * name instead of its description — for an icon-only button that has no text of its own.
 */
@Component({
  selector: 'demo-tooltip-placement',
  imports: [PctButton, PctIcon, PctTooltip],
  providers: [providePctIcons(svgIcons({ refresh: RefreshCw }))],
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
      <pct-icon icon="refresh" />
    </button>
  `,
})
export class TooltipPlacementDemo {}
