import { Directive, inject, input } from '@angular/core';
import { PctDataTable } from './data-table';

/**
 * Rows pinned above the rows and below them: drawn in bodies of their own, with the columns
 * and the slots of the rows, outside the sort, the filter and the window. A row pinned above
 * sticks under the header while the rows scroll, a row pinned below at the frame's end. A
 * pinned row is not among `rows` — a sum, a row being added, a row kept in sight are what
 * goes here — and it is drawn where it is pinned and nowhere else: not among the matches, the
 * exports or the stops of the grid
 * ([0115](../../../../docs/decisions/0115-pinned-rows-stand-outside-the-lines-and-a-move-is-the-applications.md)).
 *
 * @example
 * <pct-data-table pctTablePinnedRows [pinnedTop]="[total()]" [rows]="rules()" [columns]="columns" [rowId]="byId" />
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTablePinnedRows]',
  exportAs: 'pctTablePinnedRows',
})
export class PctTablePinnedRows<T> {
  /**
   * The rows drawn above the rows, under the header, in the order given.
   *
   * @since next
   */
  readonly pinnedTop = input<readonly T[]>([]);

  /**
   * The rows drawn below the rows, above the foot, in the order given.
   *
   * @since next
   */
  readonly pinnedBottom = input<readonly T[]>([]);

  constructor() {
    inject(PctDataTable).contribute({
      pinned: { top: this.pinnedTop, bottom: this.pinnedBottom },
    });
  }
}
