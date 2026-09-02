import { Component, signal } from '@angular/core';
import { PctChip, PctChips } from '@pacit/components/chips';

/** Removal is an announcement — the application answers by shortening its own array. */
@Component({
  selector: 'demo-chips',
  imports: [PctChip, PctChips],
  template: `
    <pct-chips ariaLabel="Active filters">
      @for (filter of filters(); track filter) {
        <pct-chip removable (removed)="drop(filter)">{{ filter }}</pct-chip>
      }
    </pct-chips>
  `,
})
export class ChipsDemo {
  readonly filters = signal(['status: open', 'assignee: me', 'label: bug']);

  drop(filter: string): void {
    this.filters.update((all) => all.filter((kept) => kept !== filter));
  }
}
