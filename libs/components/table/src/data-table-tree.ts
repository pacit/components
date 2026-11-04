import {
  booleanAttribute,
  Directive,
  inject,
  input,
  model,
  type Signal,
} from '@angular/core';
import { PctDataTable } from './data-table';
import type { PctColumns, PctRowId } from './model/columns';
import { pctTree, pctTreeAbove } from './model/tree';

/**
 * The rows as a tree: each row's children below it, one level deeper, behind a button in its
 * first cell ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md), D12;
 * [0112](../../../../docs/decisions/0112-a-tree-is-pruned-to-the-matches-and-their-ancestors-and-its-semantics-come-with-the-grid.md)).
 *
 * **The filter keeps the way to a match.** A row the filter matches is kept with every row
 * above it — kept, not opened: a closed branch stays closed — those marked `data-pct-muted`
 * when they matched nothing themselves; a branch with no match below it goes. The sort orders
 * each list of siblings, the roots too. `matchedRows` and `matched` count every row kept, open
 * or not.
 *
 * **The semantics come with the grid.** Alone, the tree is a table whose first cells hold a
 * button with `aria-expanded`, since `aria-level` and `aria-expanded` on a row mean nothing
 * outside a treegrid. With `pctTableGrid`, the table is a `treegrid`
 * (https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/): each row says its level, its place
 * among its siblings and whether it is open, and on the first cell the arrow into the line
 * opens a closed branch, the arrow out of it closes an open one or moves to the parent.
 *
 * **Typed by the columns.** The list is the directive's own input, as a cell template's is,
 * so `children` reads the rows of the table's type.
 *
 * @example
 * <pct-data-table [pctTableTree]="columns" [children]="kidsOf" [(expanded)]="open" …>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableTree]',
  exportAs: 'pctTableTree',
})
export class PctTableTree<T, M extends Record<string, unknown>> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);

  /**
   * The table's list of columns, which carries the type of the rows. Never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableTree',
  });

  /**
   * A row's children; `undefined` or an empty list for a leaf. Read once per row each time
   * the rows, the filter or the sort change, so a function that builds the list is fine.
   *
   * @since next
   */
  readonly children = input.required<(row: T) => readonly T[] | undefined>();

  /**
   * The ids of the rows whose children are shown. A row not among them is closed, so a new
   * list of rows keeps the branches open by their ids.
   *
   * @since next
   */
  readonly expanded = model<readonly PctRowId[]>([]);

  /**
   * The rows stand flat, whatever `children` says, and every row is a root.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  constructor() {
    this.table.contribute({
      tree: {
        children: this.children as Signal<
          (row: never) => readonly unknown[] | undefined
        >,
        expanded: this.expanded,
        disabled: this.disabled,
        read: pctTree,
        above: pctTreeAbove,
      },
    });
  }

  /**
   * Opens a closed row's children, or closes an open row's.
   *
   * @since next
   */
  toggle(id: PctRowId): void {
    this.expanded.update((open) =>
      open.includes(id) ? open.filter((other) => other !== id) : [...open, id],
    );
  }

  /**
   * Opens every branch the filter kept: a row whose children the filter dropped is a leaf, and
   * none to open.
   *
   * @since next
   */
  expandAll(): void {
    this.expanded.set(this.table.branchIds());
  }

  /**
   * Closes every branch.
   *
   * @since next
   */
  collapseAll(): void {
    this.expanded.set([]);
  }
}
