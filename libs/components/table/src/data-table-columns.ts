import {
  afterNextRender,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctMenu, PctMenuItem, PctMenuTrigger } from '@pacit/components/menu';
import { PctDataTable } from './data-table';
import type { PctAnyColumn, PctColumns } from './model/columns';
import {
  pctCanMoveColumn,
  pctClampWidth,
  type PctColumnPin,
  pctColumnWidthBounds,
  pctHideColumn,
  pctMoveColumn,
  pctPinColumn,
  pctPlaceColumns,
  type PctPlacedColumn,
  pctResizeColumn,
  type PctTableLayout,
} from './model/layout';

/** A separator's step under an arrow, and under Shift with an arrow, in pixels. */
const STEP = 8;
const LEAP = 32;

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves
 * in, and read the directive's layout and its setters. Kept in a map of this module's own,
 * as the filters' are, so a table that lays out no column carries none of it.
 */
interface Link {
  readonly parts: WritableSignal<PctTableColumnParts | null>;
  readonly layout: () => PctTableLayout;
  readonly placed: () => readonly PctPlacedColumn<unknown>[];
  readonly drawn: () => ReadonlyMap<string, number>;
  readonly write: (layout: PctTableLayout) => void;
  readonly fit: (id?: string) => void;
}

const LINKS = /* @__PURE__ */ new WeakMap<object, Link>();

/**
 * The columns laid out by the user: their widths, their order, the ones hidden and the ones
 * pinned to an edge (0097, D9). Each header gets a separator at its end edge and a menu
 * beside its label, and the table lays its columns out at their widths, `table-layout:
 * fixed`, whatever the rows hold.
 *
 * **A model a user's preferences can hold.** `layout` is `{ order, widths, hidden, pinned }`,
 * typed by the columns' map: saved with `JSON.stringify(layout())` and set back as it was,
 * with no helper between. A layout older than the columns still lays them out — an id of no
 * column is passed over, a column it does not name stands at its own place — so a release
 * that adds a column never throws a user's layout away.
 *
 * **The separator is the APG's window splitter**
 * (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): `role="separator"`, its width
 * in `aria-valuenow`, the arrows move it by 8 px and by 32 with Shift, a pointer drags it,
 * and a double press fits the column to what it draws. The menu is the APG's menu button,
 * keyboard first: it moves the column one place towards either end, pins it to an edge or
 * takes it off, fits it, hides it. A column pinned to an edge stays there while the rest scroll
 * under it, the leading cells with the start's.
 *
 * **The order is the engine's.** The columns reach the cells, the headers, the details and
 * the sums in the layout's order, so a cell template named by its column's id draws where its
 * column went. A hidden column is out of the table: no header, no cell, and the quick filter
 * does not read it, so no row stays for a reason the screen does not show.
 *
 * @example
 * <pct-data-table [pctTableColumns]="columns" [(layout)]="layout" …>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableColumns]',
  exportAs: 'pctTableColumns',
})
export class PctTableColumns<T, M extends Record<string, unknown>> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The table's list of columns, which carries the ids the layout is typed by. Never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableColumns',
  });

  /**
   * How the user laid the columns out: their order, their widths, the ones hidden and the
   * ones pinned. Empty, every column stands as `columns` gives it.
   *
   * @since next
   */
  readonly layout = model<PctTableLayout<keyof M & string>>({});

  /**
   * Every column in its place: the layout read over the table's columns, which the parts and
   * the table read as columns of any row.
   */
  private readonly placed = computed(() =>
    pctPlaceColumns(
      this.table.columns() as readonly PctAnyColumn<unknown>[],
      this.layout(),
    ),
  );

  /** The widths the table drew its columns at, by id: what it writes after each layout. */
  private readonly drawn = signal<ReadonlyMap<string, number>>(new Map());

  constructor() {
    const parts = signal<PctTableColumnParts | null>(null);
    LINKS.set(this, {
      parts,
      layout: this.layout,
      placed: this.placed,
      drawn: this.drawn,
      write: (layout) =>
        this.layout.set(layout as PctTableLayout<keyof M & string>),
      fit: (id) => this.fit(id as (keyof M & string) | undefined),
    });
    this.table.contribute({
      layout: {
        placed: this.placed,
        drawn: this.drawn,
        parts: PctTableColumnParts,
        // Read once the table has made the parts, in the render that draws them.
        head: computed(() => (parts() as PctTableColumnParts).head()),
      },
    });
  }

  /**
   * Fits a column's width to what it draws — its header and the cells drawn, under a window
   * only those — or every column shown when no id is given. Measured in the browser: on the
   * server, nothing.
   *
   * @since next
   */
  fit(column?: keyof M & string): void {
    const table = this.host.nativeElement.querySelector<HTMLTableElement>(
      ':scope > pct-table-frame > table',
    );
    if (table === null) return;
    const heads = Array.from(
      table.querySelectorAll<HTMLElement>(
        ':scope > thead > tr:first-child > th[data-pct-column]',
      ),
    ).filter(
      (head) => column === undefined || head.dataset['pctColumn'] === column,
    );
    if (heads.length === 0) return;
    // Measured with the layout let go: each column at the width its content asks for. The
    // columns' own widths are the bindings', put back as they were before anything renders.
    const cols = Array.from(
      table.querySelectorAll<HTMLElement>(':scope > colgroup > col'),
    );
    const widths = cols.map((col) => col.style.inlineSize);
    for (const col of cols) col.style.inlineSize = '';
    table.setAttribute('data-pct-sizing', '');
    const measured = heads.map((head) => ({
      id: head.dataset['pctColumn'] as string,
      width: Math.ceil(head.getBoundingClientRect().width),
    }));
    table.removeAttribute('data-pct-sizing');
    cols.forEach((col, c) => (col.style.inlineSize = widths[c]));
    const columns = new Map(
      this.placed().map(({ column }) => [column.id, column]),
    );
    this.layout.update((layout) =>
      measured.reduce(
        (next, { id, width }) =>
          pctResizeColumn(
            next,
            id as keyof M & string,
            pctClampWidth(columns.get(id) as PctAnyColumn<unknown>, width),
          ),
        layout,
      ),
    );
  }

  /**
   * Lays the columns out as `columns` gives them: every width, place, pin and hidden column
   * forgotten.
   *
   * @since next
   */
  reset(): void {
    this.layout.set({});
  }
}

/**
 * The layout's parts: the template the table draws beside each header's label — the column's
 * menu and its separator — and the handlers of both. Declared here, rendered there.
 * `pctTableColumns` makes it, so it has no selector: there is no tag to write.
 *
 * @since next
 */
@Component({
  imports: [PctIcon, PctMenu, PctMenuItem, PctMenuTrigger],
  // Its element is the table's child and draws nothing: the template stands where it is put.
  host: { hidden: '' },
  templateUrl: './data-table-columns.html',
  styleUrl: './data-table-columns.scss',
})
export class PctTableColumnParts {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly injector = inject(Injector);
  private readonly table = inject(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly link = LINKS.get(inject(PctTableColumns)) as Link;

  /**
   * What a header holds beside its label: the column's menu and its separator.
   *
   * @since next
   */
  readonly head = viewChild.required<TemplateRef<unknown>>('head');

  constructor() {
    this.link.parts.set(this);
  }

  private columnsGiven(): readonly PctAnyColumn<unknown>[] {
    return this.table.columns() as readonly PctAnyColumn<unknown>[];
  }

  /** The column as the layout places it. */
  private placedOf(column: PctAnyColumn<unknown>): PctPlacedColumn<unknown> {
    return this.link
      .placed()
      .find((one) => one.column.id === column.id) as PctPlacedColumn<unknown>;
  }

  /** The column's menu button's name: its header's. */
  protected menuOf(column: PctAnyColumn<unknown>): string {
    return this.texts().tableColumnMenu.replace(
      '{column}',
      () => column.header,
    );
  }

  /** The separator's name: what it resizes. */
  protected resizeOf(column: PctAnyColumn<unknown>): string {
    return this.texts().tableResize.replace('{column}', () => column.header);
  }

  /** The edge the column is pinned to. */
  protected pinOf(column: PctAnyColumn<unknown>): PctColumnPin | null {
    return this.placedOf(column).pin;
  }

  /** The narrowest and the widest the column may be made. */
  protected boundsOf(column: PctAnyColumn<unknown>): {
    readonly min: number;
    readonly max: number;
  } {
    return pctColumnWidthBounds(column);
  }

  /**
   * The column's width, in whole pixels: the layout's or its own, or the share the table drew
   * it at, read after the table laid it out; its narrowest until then.
   */
  protected widthOf(column: PctAnyColumn<unknown>): number {
    const own = this.placedOf(column).width;
    if (own !== null) return own;
    const drawn = this.link.drawn().get(column.id);
    return drawn === undefined
      ? pctColumnWidthBounds(column).min
      : Math.round(drawn);
  }

  /** Whether the column can move one place towards an end, among the columns shown. */
  protected canMove(column: PctAnyColumn<unknown>, step: -1 | 1): boolean {
    return pctCanMoveColumn(
      this.columnsGiven(),
      this.link.layout(),
      column.id,
      step,
    );
  }

  /** Whether the column is the last one shown, which is never hidden. */
  protected last(): boolean {
    return this.link.placed().filter((one) => !one.hidden).length === 1;
  }

  /**
   * Moves the column one place, and keeps the focus on its menu: the header is put back in the
   * row, and the focus the menu gave back to its button would otherwise be lost.
   */
  protected move(column: PctAnyColumn<unknown>, step: -1 | 1): void {
    this.link.write(
      pctMoveColumn(this.columnsGiven(), this.link.layout(), column.id, step),
    );
    this.focusMenuOf(column.id);
  }

  /** Pins the column to an edge, or takes it off, its menu keeping the focus as a move does. */
  protected pin(column: PctAnyColumn<unknown>, pin: PctColumnPin | null): void {
    this.link.write(pctPinColumn(this.link.layout(), column.id, pin));
    this.focusMenuOf(column.id);
  }

  protected fit(column: PctAnyColumn<unknown>): void {
    this.link.fit(column.id);
  }

  /**
   * Hides the column, and hands the focus to the menu of the column that takes its place —
   * the next shown, or the one before it at the end — since the button the menu would give it
   * back to goes with the column.
   */
  protected hide(column: PctAnyColumn<unknown>): void {
    const shown = this.link
      .placed()
      .filter((one) => !one.hidden)
      .map((one) => one.column.id);
    const at = shown.indexOf(column.id);
    const heir = shown[at + 1] ?? shown[at - 1];
    this.link.write(pctHideColumn(this.link.layout(), column.id, true));
    this.focusMenuOf(heir);
  }

  /** Focuses a column's menu button once the table has drawn the layout just written. */
  private focusMenuOf(id: string): void {
    const table = this.host.nativeElement.parentElement as HTMLElement;
    afterNextRender(
      () =>
        Array.from(
          table.querySelectorAll<HTMLElement>(
            ':scope > pct-table-frame > table > thead > tr > th[data-pct-column]',
          ),
        )
          .find((head) => head.dataset['pctColumn'] === id)
          ?.querySelector<HTMLElement>('[data-pct-part="options"]')
          ?.focus(),
      { injector: this.injector },
    );
  }

  /** Sets the column's width, made to fit its bounds. */
  private resize(column: PctAnyColumn<unknown>, width: number): void {
    this.link.write(
      pctResizeColumn(
        this.link.layout(),
        column.id,
        pctClampWidth(column, width),
      ),
    );
  }

  /** Whether the line runs from right to left where the separator stands. */
  private rtl(element: Element): boolean {
    return getComputedStyle(element).direction === 'rtl';
  }

  /**
   * The separator's keys: the arrow towards the end edge widens the column, the other narrows
   * it — in a right-to-left table the left arrow widens — by 8 px, or 32 with Shift.
   */
  protected key(column: PctAnyColumn<unknown>, event: KeyboardEvent): void {
    const towards =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (towards === 0) return;
    event.preventDefault();
    const way = this.rtl(event.target as Element) ? -towards : towards;
    this.resize(
      column,
      this.widthOf(column) + way * (event.shiftKey ? LEAP : STEP),
    );
  }

  /** Where a drag of a separator started: the pointer's place and the column's width then. */
  private dragged: {
    readonly pointer: number;
    readonly x: number;
    readonly width: number;
    readonly way: number;
  } | null = null;

  /** A press of the main button on a separator starts a drag, the pointer captured. */
  protected grab(column: PctAnyColumn<unknown>, event: PointerEvent): void {
    if (event.button !== 0) return;
    const separator = event.currentTarget as HTMLElement;
    separator.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.dragged = {
      pointer: event.pointerId,
      x: event.clientX,
      width: this.widthOf(column),
      way: this.rtl(separator) ? -1 : 1,
    };
  }

  /** The drag follows the pointer: the column's end edge goes where the pointer goes. */
  protected drag(column: PctAnyColumn<unknown>, event: PointerEvent): void {
    const dragged = this.dragged;
    if (dragged === null || dragged.pointer !== event.pointerId) return;
    this.resize(
      column,
      dragged.width + (event.clientX - dragged.x) * dragged.way,
    );
  }

  /** The drag ends with the press, or with the pointer lost. */
  protected drop(event: PointerEvent): void {
    if (this.dragged?.pointer === event.pointerId) this.dragged = null;
  }
}
