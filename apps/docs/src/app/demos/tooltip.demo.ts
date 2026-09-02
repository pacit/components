import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTooltip } from '@pacit/components/tooltip';

/** A hint on hover and focus alike, described — never the only place a name lives. */
@Component({
  selector: 'demo-tooltip',
  imports: [PctButton, PctTooltip],
  template: `
    <button
      pctButton
      variant="outline"
      pctTooltip="Runs every check before publishing"
    >
      Verify
    </button>
  `,
})
export class TooltipDemo {}
