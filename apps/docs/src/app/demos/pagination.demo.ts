import { Component, signal } from '@angular/core';
import { PctPagination } from '@pacit/components/pagination';

/** One number in, a fair map out — first, last, and a window around where you stand. */
@Component({
  selector: 'demo-pagination',
  imports: [PctPagination],
  template: `
    <pct-pagination [(page)]="page" [count]="20" />
    <p>Reading page {{ page() }} of 20.</p>
  `,
})
export class PaginationDemo {
  readonly page = signal(7);
}
