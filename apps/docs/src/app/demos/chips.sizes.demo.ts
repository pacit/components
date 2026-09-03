import { Component, signal } from '@angular/core';
import { PctChip, PctChips } from '@pacit/components/chips';

/**
 * Sizes, and chips that stay
 *
 * `size` rides the shared axis. A chip without `removable` is a plain word — a tag the
 * reader cannot take back — and never draws the button it would not act on.
 */
@Component({
  selector: 'demo-chips-sizes',
  imports: [PctChip, PctChips],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-chips ariaLabel="Topics" size="sm">
      <pct-chip>Angular</pct-chip>
      <pct-chip>Signals</pct-chip>
      <pct-chip>Tokens</pct-chip>
    </pct-chips>
    <pct-chips ariaLabel="Filters" size="lg">
      @for (filter of filters(); track filter) {
        <pct-chip removable (removed)="drop(filter)">{{ filter }}</pct-chip>
      }
    </pct-chips>
  `,
})
export class ChipsSizesDemo {
  readonly filters = signal(['Open', 'Assigned to me', 'This week']);

  protected drop(filter: string): void {
    this.filters.update((all) => all.filter((f) => f !== filter));
  }
}
