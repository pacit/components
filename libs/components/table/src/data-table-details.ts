import {
  booleanAttribute,
  Directive,
  inject,
  input,
  model,
} from '@angular/core';
import { PctDataTable } from './data-table';
import type { PctRowId } from './model/columns';

/**
 * The rows whose details are open, as the application's state: `[(details)]` binds the list
 * of their ids, so a row opened in one view is open in the next, and `disabled` takes the
 * disclosure away.
 *
 * The details row and its button are the table's own: a narrow table opens rows to show the
 * columns it hid with no directive at all, and holds which are open by itself. The directive
 * hands that list to the application ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 * `details` and not `expanded`: the second word is a tree's.
 *
 * @example
 * <pct-data-table pctTableDetails [(details)]="open" [rows]="rules()" [columns]="columns" [rowId]="byId">
 *   <ng-template [pctDetails]="columns" let-rule>…</ng-template>
 * </pct-data-table>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableDetails]',
  exportAs: 'pctTableDetails',
})
export class PctTableDetails {
  /**
   * The ids of the rows whose details are open.
   *
   * @since next
   */
  readonly details = model<readonly PctRowId[]>([]);

  /**
   * No row opens: the disclosure column goes, and the hidden columns stay hidden.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  constructor() {
    // Called here, where the table is already made and has drawn nothing yet: what it draws
    // first already reads the application's list.
    inject(PctDataTable).contribute({
      details: { open: this.details, disabled: this.disabled },
    });
  }
}
