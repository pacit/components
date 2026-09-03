import { Component, signal } from '@angular/core';
import { PctPagination } from '@pacit/components/pagination';

/**
 * Sizes
 *
 * The same three heights as every control — 28, 36 and 44 px — so a pagination under a
 * table lines up with the table's own toolbar. The smallest still clears the touch-target
 * floor.
 */
@Component({
  selector: 'demo-pagination-sizes',
  imports: [PctPagination],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-pagination [(page)]="page" [count]="9" size="sm" ariaLabel="Small" />
    <pct-pagination [(page)]="page" [count]="9" ariaLabel="Medium" />
    <pct-pagination [(page)]="page" [count]="9" size="lg" ariaLabel="Large" />
  `,
})
export class PaginationSizesDemo {
  readonly page = signal(4);
}
