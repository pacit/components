import { Directive, inject, input, numberAttribute } from '@angular/core';
import { PctDataTable } from './data-table';

/**
 * The rows the table is given are a page of more: `rowOffset` of them stand before it and
 * `rowTotal` there are in all, so a reader is told "row 43 of 1,001", not "row 3 of 21".
 *
 * A page from a server is the application's to load: the table's `sort` and `filter` are
 * models the request reads, `clientSort` and `clientFilter` off leave the order and the
 * matches to the server, and `loading` stands for the request in flight. The directive adds
 * what only the table can write — `aria-rowcount` on the table and `aria-rowindex` on each
 * row, counted among all the rows, the header's row first and the foot's last
 * ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 * A row's details and a group's heading are lines of the page: the count adds the page's.
 *
 * @example
 * <pct-data-table pctTablePage [rowOffset]="(page() - 1) * 20" [rowTotal]="total()" [clientSort]="false" [clientFilter]="false" [(sort)]="sort" [rows]="rows()" [columns]="columns" [rowId]="byId" />
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTablePage]',
  exportAs: 'pctTablePage',
})
export class PctTablePage {
  /**
   * How many rows stand before the page's first.
   *
   * @since next
   */
  readonly rowOffset = input(0, { transform: numberAttribute });

  /**
   * How many rows there are in all, the page's among them.
   *
   * @since next
   */
  readonly rowTotal = input.required<number, unknown>({
    transform: numberAttribute,
  });

  constructor() {
    inject(PctDataTable).contribute({
      page: { offset: this.rowOffset, total: this.rowTotal },
    });
  }
}
