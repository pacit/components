import { Component, computed, signal } from '@angular/core';
import { PctPagination } from '@pacit/components/pagination';
import { SbxDemo } from '../../ui/demo';

/**
 * Pagination: a control that owns the current page. What is worth looking at here is the
 * folding — one `'ellipsis'` per run of two or more hidden pages, the ends pinned — and that
 * every button is a plain `<button>`, so the keyboard is the platform's.
 */
@Component({
  selector: 'sbx-pagination-view',
  imports: [SbxDemo, PctPagination],
  templateUrl: './pagination-view.html',
  styleUrl: './pagination-view.scss',
})
export class PaginationView {
  /** A short pager — every page fits, so nothing folds. */
  protected readonly few = signal(1);

  /** A long one — the folding is the whole point. */
  protected readonly many = signal(7);

  /** Bound to a rendered list, so the page really changes what is on screen. */
  protected readonly rows = Array.from(
    { length: 47 },
    (_, i) => `Row ${i + 1}`,
  );
  protected readonly pageSize = 10;
  protected readonly listPage = signal(1);
  protected readonly pageCount = computed(() =>
    Math.ceil(this.rows.length / this.pageSize),
  );
  protected readonly visibleRows = computed(() => {
    const start = (this.listPage() - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  });

  /** One page value shared by a pager above and below the same content. */
  protected readonly framed = signal(4);

  protected readonly sized = signal(5);
  protected readonly disabledPage = signal(2);
}
