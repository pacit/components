import {
  booleanAttribute,
  Directive,
  inject,
  input,
  model,
} from '@angular/core';
import { PctDataTable } from './data-table';
import type { PctColumns } from './model/columns';

/**
 * The rows in groups by the values of one column or several, each group a body of the table
 * headed by a row: its label, how many rows it holds, the sums of the columns that sum up,
 * and a button that collapses it ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md), D8).
 *
 * **A body per group.** Each group is its own `<tbody>`, headed by a `th scope="rowgroup"`,
 * because a rowgroup header names the rest of its body: in one shared body, the first heading
 * would name the cells of every group after it. A group stands where its first row stood, so
 * the order sorts the rows inside the groups, and the groups by their first rows.
 *
 * **Typed by the columns.** The list is the directive's own input, as a cell template's is,
 * so `groupBy` takes only the ids the columns hold.
 *
 * @example
 * <pct-data-table [pctTableGroups]="columns" [groupBy]="['room']" [(collapsed)]="closed" …>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableGroups]',
  exportAs: 'pctTableGroups',
})
export class PctTableGroups<T, M extends Record<string, unknown>> {
  private readonly table = inject(PctDataTable);

  /**
   * The table's list of columns, which carries the ids `groupBy` may name. Never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableGroups',
  });

  /**
   * The columns the rows are grouped by, outermost first. Empty, the rows stand in no group.
   *
   * @since next
   */
  readonly groupBy = input<readonly (keyof M & string)[]>([]);

  /**
   * The keys of the groups whose rows are hidden: a group's key is the path of its values as
   * JSON, `[0,"Hall"]` for the hall of the ground floor, so it stays the same across new rows.
   *
   * @since next
   */
  readonly collapsed = model<readonly string[]>([]);

  /**
   * The rows stand in no group, whatever `groupBy` names.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  constructor() {
    this.table.contribute({
      groups: {
        by: this.groupBy,
        collapsed: this.collapsed,
        disabled: this.disabled,
      },
    });
  }

  /**
   * Opens every group.
   *
   * @since next
   */
  expandAll(): void {
    this.collapsed.set([]);
  }

  /**
   * Collapses every group, those inside others too.
   *
   * @since next
   */
  collapseAll(): void {
    this.collapsed.set(this.table.groupKeys());
  }
}
