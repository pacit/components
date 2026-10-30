import { Directive, inject, input, TemplateRef } from '@angular/core';
import { pctReportOrphanSlot } from '@pacit/components/core';
import type { PctColumn, PctColumns } from './model/columns';
import type { PctSortDirection } from './model/order';

/**
 * What a cell template is handed.
 *
 * @since next
 */
export interface PctCellContext<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /** The row — `let-row`. */
  readonly $implicit: T;
  /** The column's value for the row, of the column's own type — `let-value="value"`. */
  readonly value: M[Id];
  /** The column — `let-column="column"`. */
  readonly column: PctColumn<T, M[Id], Id>;
  /** The row's position among the rows drawn, counting from 0 — `let-index="index"`. */
  readonly index: number;
}

/**
 * A cell the consumer draws for one column, or for several that share a look.
 *
 * The template is a slot and a component is what goes in it: a switch, a badge, a chart of
 * the consumer's own, with the consumer's handlers and signals in reach, because the template
 * is written where they are ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 * The cell element, its alignment and its place in the row stay the table's.
 *
 * **Two inputs, because the template's type check sees only its own directive's.** The list
 * carries every id and every value's type, the id names the column, and together they give
 * `let-value` the column's type: a misspelt id, or a value read as the wrong type, is the
 * compiler's error.
 *
 * @example
 * <ng-template [pctCell]="columns" pctCellOf="enabled" let-rule>
 *   <pct-switch [checked]="rule.enabled" (checkedChange)="toggle(rule, $event)" ariaLabel="Enabled" />
 * </ng-template>
 *
 * @since next
 */
@Directive({
  selector: 'ng-template[pctCell]',
})
export class PctCellTemplate<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /**
   * The template itself.
   *
   * @since next
   */
  readonly template =
    inject<TemplateRef<PctCellContext<T, M, Id>>>(TemplateRef);

  /**
   * The table's list of columns. It carries the types into the context and is never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({ alias: 'pctCell' });

  /**
   * The id of the column the template draws, or a list of ids that share it.
   *
   * @since next
   */
  readonly pctCellOf = input.required<Id | readonly Id[]>();

  /**
   * What the table calls when its content query finds this template.
   *
   * @since next
   */
  readonly read = pctReportOrphanSlot('pctCell');

  /**
   * What tells the compiler what `let-value` is. The body is `true`: the signature is the
   * point.
   */
  static ngTemplateContextGuard<
    T,
    M extends Record<string, unknown>,
    Id extends keyof M & string,
  >(
    _slot: PctCellTemplate<T, M, Id>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctCellContext<T, M, Id> {
    return true;
  }
}

/**
 * What a header template is handed.
 *
 * @since next
 */
export interface PctHeaderCellContext<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /** The column — `let-column`. */
  readonly $implicit: PctColumn<T, M[Id], Id>;
  /** Which way the rows stand sorted by the column, or `null` — `let-direction="direction"`. */
  readonly direction: PctSortDirection | null;
}

/**
 * What a header shows in place of the column's `header` text.
 *
 * It replaces the label and nothing around it: on a sortable column the template stands
 * inside the sort button, which keeps its role, its name from the template's text, its
 * chevron and its keys, as a slot replaces what is inside and never the role
 * ([0027](../../../../docs/decisions/0027-a-slot-is-a-directive.md)).
 *
 * @since next
 */
@Directive({
  selector: 'ng-template[pctHeaderCell]',
})
export class PctHeaderCellTemplate<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /**
   * The template itself.
   *
   * @since next
   */
  readonly template =
    inject<TemplateRef<PctHeaderCellContext<T, M, Id>>>(TemplateRef);

  /**
   * The table's list of columns, carrying the types into the context.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctHeaderCell',
  });

  /**
   * The id of the column whose header the template draws, or a list of ids.
   *
   * @since next
   */
  readonly pctHeaderCellOf = input.required<Id | readonly Id[]>();

  /**
   * What the table calls when its content query finds this template.
   *
   * @since next
   */
  readonly read = pctReportOrphanSlot('pctHeaderCell');

  /** What tells the compiler what `let-column` is. */
  static ngTemplateContextGuard<
    T,
    M extends Record<string, unknown>,
    Id extends keyof M & string,
  >(
    _slot: PctHeaderCellTemplate<T, M, Id>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctHeaderCellContext<T, M, Id> {
    return true;
  }
}

/**
 * What the empty-state template is handed.
 *
 * @since next
 */
export interface PctEmptyContext {
  /** The quick filter's question; empty when no question has emptied the table — `let-question`. */
  readonly $implicit: string;
  /** Whether rows are still coming — `let-loading="loading"`. */
  readonly loading: boolean;
}

/**
 * What the table shows beside itself when it has no row to show, in place of its sentence.
 *
 * @since next
 */
@Directive({
  selector: 'ng-template[pctEmpty]',
})
export class PctEmptyTemplate {
  /**
   * The template itself.
   *
   * @since next
   */
  readonly template = inject<TemplateRef<PctEmptyContext>>(TemplateRef);

  /**
   * What the table calls when its content query finds this template.
   *
   * @since next
   */
  readonly read = pctReportOrphanSlot('pctEmpty');

  /** What tells the compiler what `let-question` is. */
  static ngTemplateContextGuard(
    _slot: PctEmptyTemplate,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctEmptyContext {
    return true;
  }
}

/**
 * What a details template is handed.
 *
 * @since next
 */
export interface PctDetailsContext<T, M extends Record<string, unknown>> {
  /** The row whose details are open — `let-row`. */
  readonly $implicit: T;
  /**
   * The columns a narrow table has hidden, whose values the details list above the template
   * — `let-hidden="hidden"`.
   */
  readonly hidden: readonly PctColumns<T, M>[number][];
}

/**
 * What stands in a row's details, below the values of the columns a narrow table hid: a
 * chart of the row's history, a form, anything the row has room for only when it is open.
 * The row that opens and the button that opens it are the table's
 * ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 *
 * @example
 * <ng-template [pctDetails]="columns" let-rule>
 *   <app-rule-history [rule]="rule" />
 * </ng-template>
 *
 * @since next
 */
@Directive({
  selector: 'ng-template[pctDetails]',
})
export class PctDetailsTemplate<T, M extends Record<string, unknown>> {
  /**
   * The template itself.
   *
   * @since next
   */
  readonly template = inject<TemplateRef<PctDetailsContext<T, M>>>(TemplateRef);

  /**
   * The table's list of columns, carrying the row's type into the context.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({ alias: 'pctDetails' });

  /**
   * What the table calls when its content query finds this template.
   *
   * @since next
   */
  readonly read = pctReportOrphanSlot('pctDetails');

  /** What tells the compiler what `let-row` is. */
  static ngTemplateContextGuard<T, M extends Record<string, unknown>>(
    _slot: PctDetailsTemplate<T, M>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctDetailsContext<T, M> {
    return true;
  }
}
