import { Component, computed, input } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';

/**
 * A cell of the humidity column, drawn by the column's own component: the value as a badge,
 * toned once the air turns damp. What a column of an application's data would carry where
 * the template that draws it is not the application's to write.
 */
@Component({
  selector: 'sbx-humidity-cell',
  imports: [PctBadge],
  template: `
    @if (value() !== null) {
      <pct-badge [tone]="tone()">{{ value() }} %</pct-badge>
    } @else {
      No reading
    }
  `,
})
export class SbxHumidityCell {
  readonly value = input.required<number | null>();
  protected readonly tone = computed(() => {
    const value = this.value();
    return value !== null && value > 60 ? 'warning' : null;
  });
}
