import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
} from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PCT_TEXTS } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctMenu, PctMenuItem, PctMenuTrigger } from '@pacit/components/menu';
import type { PctAnyColumn, PctColumns } from './model/columns';
import {
  pctCanMoveColumn,
  type PctColumnPin,
  pctHideColumn,
  pctMoveColumn,
  pctPinColumn,
  pctPlaceColumns,
  type PctPlacedColumn,
  type PctTableLayout,
} from './model/layout';

/**
 * The columns of a data table as a list to lay them out by: a checkbox for each that shows it
 * or hides it, two buttons that move it up and down its list — Alt with an arrow does the
 * same from any control of its row — and a menu that pins it to an edge. It holds the same
 * `layout` as the table's `pctTableColumns`, so one model binds both, and the list stands
 * wherever the application keeps such things: a dialog, a drawer
 * ([0057](../../../../docs/decisions/0057-layout-is-three-entrypoints-not-a-framework.md)).
 *
 * The list is in the order the table draws, the columns pinned to the start first and those
 * pinned to the end last; a column moves along its own edge, the hidden ones among them. The
 * last column shown cannot be hidden: a table of no column is not a table.
 *
 * @example
 * <pct-table-column-chooser [columns]="columns" [(layout)]="layout" />
 *
 * @since next
 */
@Component({
  selector: 'pct-table-column-chooser',
  exportAs: 'pctTableColumnChooser',
  imports: [
    PctButton,
    PctCheckbox,
    PctIcon,
    PctMenu,
    PctMenuItem,
    PctMenuTrigger,
  ],
  templateUrl: './column-chooser.html',
  styleUrl: './column-chooser.scss',
  host: { class: 'pct-table-column-chooser' },
})
export class PctTableColumnChooser<T, M extends Record<string, unknown>> {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The table's list of columns: the ones listed, and the ids the layout is typed by.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>();

  /**
   * How the user laid the columns out — the table's `layout`, bound to the same model.
   *
   * @since next
   */
  readonly layout = model<PctTableLayout<keyof M & string>>({});

  /**
   * The id of an element that names the list, a heading above it most often.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * The list's name in words, for a list with no element on the page to name it.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

  private readonly given = computed(
    () => this.columns() as readonly PctAnyColumn<unknown>[],
  );

  /** Every column in its place, the hidden ones too. */
  protected readonly placed = computed(() =>
    pctPlaceColumns(this.given(), this.layout()),
  );

  /** Only one column is shown, and its checkbox is the one that cannot be cleared. */
  protected readonly one = computed(
    () => this.placed().filter((placed) => !placed.hidden).length === 1,
  );

  /** A name with the column's header in it. */
  protected nameOf(text: string, placed: PctPlacedColumn<unknown>): string {
    return text.replace('{column}', () => placed.column.header);
  }

  protected canMove(placed: PctPlacedColumn<unknown>, step: -1 | 1): boolean {
    return pctCanMoveColumn(
      this.given(),
      this.layout(),
      placed.column.id,
      step,
      'all',
    );
  }

  /** The layout written back, typed by the columns' ids. */
  private write(layout: PctTableLayout): void {
    this.layout.set(layout as PctTableLayout<keyof M & string>);
  }

  protected show(placed: PctPlacedColumn<unknown>, shown: boolean): void {
    this.write(pctHideColumn(this.layout(), placed.column.id, !shown));
  }

  /**
   * Pins the column to an edge, or takes it off, and keeps the focus on its row's menu: a row
   * pinned is put back in the list, and the focus the menu gave back would otherwise be lost.
   */
  protected pin(
    placed: PctPlacedColumn<unknown>,
    pin: PctColumnPin | null,
  ): void {
    const id = placed.column.id;
    this.write(pctPinColumn(this.layout(), id, pin));
    afterNextRender(
      () =>
        this.rowOf(id)
          ?.querySelector<HTMLElement>('[aria-haspopup="menu"]')
          ?.focus(),
      { injector: this.injector },
    );
  }

  /** A column's row in the list. */
  private rowOf(id: string): HTMLElement | undefined {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '[data-pct-part="item"]',
      ),
    ).find((item) => item.dataset['pctColumn'] === id);
  }

  /** A press of a button that moves the column. */
  protected press(
    placed: PctPlacedColumn<unknown>,
    step: -1 | 1,
    event: Event,
  ): void {
    this.move(placed, step, event.currentTarget as HTMLElement);
  }

  /**
   * Moves the column along its edge, and keeps the focus in its row: on the control that
   * moved it while that can move it again, on the other button when it has reached the end,
   * and on its checkbox when it can go neither way. A row that moves is put back in the list,
   * and the focus it held would otherwise be lost.
   */
  private move(
    placed: PctPlacedColumn<unknown>,
    step: -1 | 1,
    from: HTMLElement,
  ): void {
    const id = placed.column.id;
    this.write(pctMoveColumn(this.given(), this.layout(), id, step, 'all'));
    afterNextRender(
      () => {
        const row = this.rowOf(id) as HTMLElement;
        const usable = (element: HTMLElement | null) =>
          element !== null &&
          !(element as HTMLButtonElement).disabled &&
          element.isConnected;
        const back = row.querySelector<HTMLElement>(
          step < 0 ? '[data-pct-move="down"]' : '[data-pct-move="up"]',
        );
        const target = usable(from)
          ? from
          : usable(back) && from.matches('[data-pct-move]')
            ? back
            : row.querySelector<HTMLElement>('input');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Alt with an arrow up or down moves the row's column, from any of its controls. */
  protected key(placed: PctPlacedColumn<unknown>, event: KeyboardEvent): void {
    if (!event.altKey) return;
    const step =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    if (this.canMove(placed, step))
      this.move(placed, step, event.target as HTMLElement);
  }
}
