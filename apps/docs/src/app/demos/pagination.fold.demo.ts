import { Component, signal } from '@angular/core';
import { PctPagination } from '@pacit/components/pagination';

/**
 * A long list, folded
 *
 * Two hundred pages do not fit on a line. `siblingCount` says how many neighbours the
 * current page keeps, `boundaryCount` how many pages stay pinned at each end, and the fold
 * between them is an ellipsis the keyboard never stops on.
 */
@Component({
  selector: 'demo-pagination-fold',
  imports: [PctPagination],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-pagination
      [(page)]="page"
      [count]="200"
      [siblingCount]="2"
      [boundaryCount]="1"
      ariaLabel="Search results"
    />
    <p>Page {{ page() }} of 200.</p>
  `,
})
export class PaginationFoldDemo {
  readonly page = signal(37);
}
