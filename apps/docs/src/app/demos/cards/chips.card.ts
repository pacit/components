import { Component, signal } from '@angular/core';
import { PctChip, PctChips } from '@pacit/components/chips';

/**
 * Four chosen values at rest: three carry the cross that takes them back, and the one the
 * view is scoped by carries none. Only the labels are cut — shortened to what the card is
 * wide; the row fills the stage instead of shrink-wrapping to its content, so the line
 * breaks where the component says it does, between pills and never inside one.
 */
@Component({
  selector: 'demo-chips-card',
  imports: [PctChip, PctChips],
  // The row takes the stage's width rather than its own content's, which is what makes the
  // wrap the component's decision and not the scene's (lesson-146).
  styles: ':host { display: block; inline-size: 100%; }',
  template: `
    <pct-chips ariaLabel="Active filters">
      <pct-chip>Team: Core</pct-chip>
      @for (filter of filters(); track filter) {
        <pct-chip removable (removed)="drop(filter)">{{ filter }}</pct-chip>
      }
    </pct-chips>
  `,
})
export class ChipsCardScene {
  readonly filters = signal(['Open', 'Bug', 'This week']);

  protected drop(filter: string): void {
    this.filters.update((all) => all.filter((kept) => kept !== filter));
  }
}
