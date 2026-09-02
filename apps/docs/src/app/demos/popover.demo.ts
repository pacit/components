import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctPopover, PctPopoverTrigger } from '@pacit/components/popover';

/** A light panel anchored to its button — not modal, the page stays alive behind it. */
@Component({
  selector: 'demo-popover',
  imports: [PctButton, PctPopover, PctPopoverTrigger],
  template: `
    <button pctButton variant="outline" [pctPopoverTrigger]="filters">
      Filters
    </button>

    <pct-popover #filters heading="Filters">
      <p>Anything can live here — a form, a list, a calendar.</p>
    </pct-popover>
  `,
})
export class PopoverDemo {}
