import { DOCUMENT } from '@angular/common';
import {
  afterEveryRender,
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import { PCT_TEXTS, PctAnnouncer } from '@pacit/components/core';
import { PctDataTable, pctHeadersRow } from './data-table';
import { PctTableSelection } from './data-table-selection';
import { PctTableTree } from './data-table-tree';
import type { PctAnyColumn, PctColumns, PctRowId } from './model/columns';
import { pctPlainWriter, pctWriteDelimited } from './model/csv';
import { pctSheetText } from './model/formula';
import {
  type PctGridCellSpan,
  pctGridCellAt,
  pctGridKey,
  type PctGridMap,
  pctGridMove,
  type PctGridMove,
  type PctGridPlace,
} from './model/grid';
import { pctLineKey, type PctTableLine } from './model/lines';

/**
 * A column of the grid the table adds, which has no id of its own: the rows' checkboxes, their
 * disclosures, their numbers, their handles (`#order`, since next), and the trailing column of
 * their menus' buttons (`#actions`, since next).
 *
 * @since 0.3.0
 */
export type PctTableLeadColumn =
  '#select' | '#details' | '#number' | '#order' | '#actions';

/**
 * A cell of the grid: of a row, by its id, or of the header, `null`; in a column, by its id
 * or as a leading one.
 *
 * @since 0.3.0
 */
export interface PctTableGridCell<Id extends string = string> {
  readonly row: PctRowId | null;
  readonly column: Id | PctTableLeadColumn;
}

/**
 * A cell of a row's data: of a row by its id, in a column by its id.
 *
 * @since 0.3.0
 */
export interface PctTableDataCell<Id extends string = string> {
  readonly row: PctRowId;
  readonly column: Id;
}

/**
 * A range of cells: the rectangle between two corners, both included — the rows between them
 * in the order the table draws, and the columns between them.
 *
 * @since 0.3.0
 */
export interface PctTableCellRange<Id extends string = string> {
  readonly from: PctTableDataCell<Id>;
  readonly to: PctTableDataCell<Id>;
}

/** A field whose text is its own to copy and to paste. */
const FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, ' +
  'select, [contenteditable]:not([contenteditable="false"])';

/** What a reader and a key can reach in a cell: a control, with Tab or with a click. */
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), ' +
  'select:not(:disabled), textarea:not(:disabled), [contenteditable]:not([contenteditable="false"])';

/**
 * A control that takes no arrow and no letter: a cell that holds only one gives it the tab
 * stop itself, as the APG's grid does, so a key presses it with no step into the cell.
 */
const LONE = 'button, a[href], input[type="checkbox"], [role="button"]';

/** The leading cells, by the class the table draws them with. */
const LEADS: readonly (readonly [string, PctTableLeadColumn])[] = [
  ['pct-data-table__order', '#order'],
  ['pct-data-table__pick', '#select'],
  ['pct-data-table__disclosure', '#details'],
  ['pct-data-table__number', '#number'],
  ['pct-data-table__menu', '#actions'],
];

/** How many of the columns the table adds stand before the data's: all but a trailing one. */
function leadsOf(ids: readonly string[]): number {
  return (
    ids.filter((id) => id.startsWith('#')).length -
    (ids.at(-1) === '#actions' ? 1 : 0)
  );
}

/** How many renders a stop asked to take the focus waits for its line to be drawn. */
const PATIENCE = 10;

/**
 * Each control's own tab index, before the grid took it out of the tab order: what it is
 * given back in a cell entered, and what tells a control from an element only focusable
 * by a script. Kept by element, of this module, so no attribute of the grid's is left on it.
 */
const OWN = /* @__PURE__ */ new WeakMap<Element, string | null>();

/**
 * The tab index the grid wrote on each control last: one the control holds that is not it
 * is its template's, written since — a widget in a cell that moved its own stop.
 */
const WROTE = /* @__PURE__ */ new WeakMap<Element, string | null>();

/**
 * The grid's lines in order — the header's rows, every line of the table whether drawn or
 * not, the foot's rows — read by index, so a window of a hundred thousand lines costs the
 * lines it drew.
 */
interface Lines {
  readonly length: number;
  /** The line of the header's row of column headers: the rows of header groups stand above. */
  readonly columns: number;
  /** The key a line is held by. */
  key(line: number): string | undefined;
  /** The row a line is drawn in, or `null` while it is not. */
  row(line: number): HTMLTableRowElement | null;
  /** The line a key names, or -1. */
  find(key: string): number;
  /** The line a drawn row stands for, or -1. */
  of(row: HTMLTableRowElement): number;
}

/**
 * The table as a grid: one tab stop, moved over its cells by the keys of the APG's data grid
 * (https://www.w3.org/WAI/ARIA/apg/patterns/grid/), `role="grid"` on the `<table>` it
 * stays (0097, D4). Tab reaches the grid once and leaves it on the next press.
 *
 * **The keys.** The arrows move to the next cell, turned in a right-to-left table; Home and
 * End to the ends of the line, with Ctrl or ⌘ to the grid's first and last cell; Page Up and
 * Page Down by what the frame shows. Shift with a move stretches `range` from where it began,
 * a rectangle of data cells. Ctrl+A or ⌘+A, with `pctTableSelection`, picks every row the
 * filter left.
 *
 * **A control in a cell.** A cell whose only control is a button, a checkbox, a switch or a
 * link gives that control the stop: the key moves onto it and Space or Enter presses it. A
 * cell with more, or with a field, takes the stop itself; Enter or F2 steps into it, Tab moves
 * among its controls, and Escape or F2 steps back. Every other control of the table is out
 * of the tab order, given back to a cell stepped into.
 *
 * **The stop stays.** It is held by its row's id and its column, so it survives new rows,
 * a sort and a filter that keeps the row, and a window that drew another part of the table.
 * A row taken away hands it to the line that stands in its place. Under a window, a stop
 * the scroll left behind waits: the next key brings its row back and the move goes on.
 *
 * @example
 * <pct-data-table [pctTableGrid]="columns" [(focused)]="cell" …>
 *
 * @since 0.3.0
 */
@Directive({
  selector: 'pct-data-table[pctTableGrid]',
  exportAs: 'pctTableGrid',
  host: {
    '(keydown)': 'key($event)',
    '(focusin)': 'entered($event)',
    '(focusout)': 'left($event)',
    '(pointerdown)': 'pointed($event)',
  },
})
export class PctTableGrid<T, M extends Record<string, unknown>> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly selection = inject(PctTableSelection, {
    optional: true,
    self: true,
  });
  private readonly tree = inject(PctTableTree, { optional: true, self: true });

  /**
   * The table's list of columns, which carries the ids the cells are typed by. Never read.
   *
   * @since 0.3.0
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableGrid',
  });

  /**
   * The cell that holds the tab stop: of a row, or of the header. `null` until a cell is
   * moved to, while the first cell of the first row holds it, and while the stop is on a
   * line of no cell of its own — a group's heading, a row's details, the row of filters, the
   * foot. Set, the stop goes there, and the focus with it while it is in the grid.
   *
   * @since 0.3.0
   */
  readonly focused = model<PctTableGridCell<keyof M & string> | null>(null);

  /**
   * The cells Shift with a move stretched over, from the cell the move began at to the one it
   * reached; `null` when a move without Shift let it go. The table marks them, and a reader
   * hears them selected.
   *
   * @since 0.3.0
   */
  readonly range = model<PctTableCellRange<keyof M & string> | null>(null);

  /** The stop: the line, by its key, where it stood last, and the column it was asked for. */
  private place: {
    readonly key: string;
    readonly line: number;
    readonly column: number;
  } | null = null;

  /** The cell stepped into, whose controls are in the tab order. */
  private editing: HTMLTableCellElement | null = null;

  /** The element in the grid that had the focus last, while the focus is in the grid. */
  private last: HTMLElement | null = null;

  /** While the focus leaves an element, the page holds it for a moment: nothing is lost yet. */
  private leaving = false;

  /**
   * The stop is to take the focus once its line is drawn: `scroll` when a key moved it there,
   * so its row is scrolled to; `stay` when the line it stood in went, so the focus waits on the
   * table rather than pulling the view back.
   */
  private pending: { readonly kind: 'scroll' | 'stay'; left: number } | null =
    null;

  /** The model as the grid last wrote it: another value is the application's. */
  private written: PctTableGridCell | null = null;

  /** The keys of the table's lines, built once for each list of them. */
  private keys: {
    readonly of: readonly PctTableLine<T>[];
    readonly list: readonly string[];
    readonly index: ReadonlyMap<string, number>;
  } | null = null;

  /**
   * What the table drew since the last paint: rows and controls come and go, a row is picked,
   * a template moves a control's tab index. With none of it, and none of the grid's own state
   * changed, a render elsewhere on the page costs the grid nothing.
   */
  private observer: MutationObserver | null = null;
  private observed: HTMLTableElement | null = null;
  private seen: readonly unknown[] = [];

  private readonly document = inject(DOCUMENT);
  private readonly announcer = inject(PctAnnouncer);
  private readonly texts = inject(PCT_TEXTS);

  /** A copy heard on the document: Firefox sends it to the body, not to the cell focused. */
  private readonly copied = (event: Event) =>
    this.copy(event as ClipboardEvent);

  constructor() {
    this.table.contribute({ grid: {} });
    afterEveryRender({ write: () => this.paint() });
    // In the browser only: a server has no clipboard.
    afterNextRender(() => this.document.addEventListener('copy', this.copied));
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.document.removeEventListener('copy', this.copied);
    });
  }

  /**
   * Ctrl+C or ⌘+C on the grid, or a menu's Copy: the range, else the rows picked, else the
   * cell of the stop, as tab-separated values a sheet pastes into its cells — each value
   * written as another program reads it (`pctPlainWriter`), so a number is a number there,
   * and a text as the cell shows it, after an apostrophe where a sheet would run it as a
   * formula. Text the user selected in the table, a field's own text, an editor and a cell
   * stepped into copy as the platform copies them; so does a table nested in a cell's details.
   */
  private copy(event: ClipboardEvent): void {
    const table = this.own();
    const active = this.document.activeElement;
    if (
      event.defaultPrevented ||
      event.clipboardData === null ||
      table === null ||
      active === null ||
      active.closest('table') !== table ||
      (this.editing !== null && this.editing.contains(active)) ||
      active.matches(FIELD) ||
      active.closest('[data-pct-part="editor"]') !== null ||
      this.selected(table)
    )
      return;
    const cells = this.copiedCells();
    if (cells.length === 0) return;
    // The last line has no break after it, so a copy of one cell pastes into a field as its text.
    const text = pctWriteDelimited(cells, '\t').replace(/\r\n$/, '');
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    const count = cells.reduce((sum, line) => sum + line.length, 0);
    // Each copy is said, the same count again too: the region is cleared before it is filled.
    const message = this.texts().tableCopied.replace('{count}', String(count));
    this.announcer.retract(message);
    this.announcer.announce(message);
  }

  /** Whether the user selected text in the table, which is theirs to copy. */
  private selected(table: HTMLTableElement): boolean {
    const selection = this.document.getSelection();
    if (selection === null || selection.isCollapsed) return false;
    for (let i = 0; i < selection.rangeCount; i++)
      if (selection.getRangeAt(i).intersectsNode(table)) return true;
    return false;
  }

  /** The cells a copy takes: of the range, of the rows picked, or of the stop; none else. */
  private copiedCells(): string[][] {
    const columns = new Map(
      (this.table.columns() as readonly PctAnyColumn<T>[]).map((column) => [
        column.id,
        column,
      ]),
    );
    const drawn = (this.table.shownColumns() as readonly string[]).map(
      (id) => columns.get(id) as PctAnyColumn<T>,
    );
    const locale = this.table.resolvedLocale();
    const writers = new Map(
      drawn.map((column) => {
        const kind = column.kind;
        const plain =
          kind === undefined || kind === 'text'
            ? null
            : pctPlainWriter(kind, locale);
        return [
          column.id,
          (row: T) =>
            plain === null
              ? pctSheetText(this.table.textOf(row, column.id))
              : plain(column.value(row)),
        ] as const;
      }),
    );
    const write = (rows: readonly T[], of: readonly PctAnyColumn<T>[]) =>
      rows.map((row) =>
        of.map((column) => (writers.get(column.id) as (row: T) => string)(row)),
      );
    const lines = this.table.lines().filter((line) => line.kind === 'row');
    const range = this.range();
    if (range !== null) {
      const ids = drawn.map((column) => column.id);
      const keys = lines.map((line) => line.key);
      const a = keys.indexOf(range.from.row);
      const b = keys.indexOf(range.to.row);
      const c = ids.indexOf(range.from.column);
      const d = ids.indexOf(range.to.column);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0)
        return write(
          lines
            .slice(Math.min(a, b), Math.max(a, b) + 1)
            .map((line) => line.row),
          drawn.slice(Math.min(c, d), Math.max(c, d) + 1),
        );
    }
    const picked = new Set(this.selection?.value() ?? []);
    if (picked.size > 0) {
      const id = this.table.rowId();
      return write(
        this.table.matchedRows().filter((row) => picked.has(id(row))),
        drawn,
      );
    }
    const focused = this.focused();
    const line = lines.find((one) => one.key === focused?.row);
    const column = columns.get(focused?.column as string);
    return line === undefined || column === undefined
      ? []
      : write([line.row], [column]);
  }

  /** The table the data table drew. */
  private own(): HTMLTableElement | null {
    return this.host.nativeElement.querySelector<HTMLTableElement>(
      ':scope > pct-table-frame > table',
    );
  }

  /** The grid's lines as the table stands now. */
  private lines(table: HTMLTableElement): Lines {
    const all = this.table.lines();
    if (this.keys?.of !== all) {
      const list = all.map((line) => pctLineKey(line));
      this.keys = {
        of: all,
        list,
        index: new Map(list.map((key, at) => [key, at])),
      };
    }
    const { list, index } = this.keys;
    const head = Array.from(table.tHead?.rows ?? []);
    const foot = Array.from(table.tFoot?.rows ?? []);
    const drawn = new Map<number, HTMLTableRowElement>();
    for (const body of Array.from(table.tBodies))
      for (const row of Array.from(body.rows)) {
        const at = row.dataset['pctIndex'];
        if (at !== undefined) drawn.set(Number(at), row);
      }
    const body = head.length;
    const end = body + list.length;
    return {
      length: end + foot.length,
      columns: Math.max(
        0,
        head.findIndex((row) => row === pctHeadersRow(table)),
      ),
      key: (line) =>
        line < 0
          ? undefined
          : line < body
            ? `head:${line}`
            : line < end
              ? list[line - body]
              : line < end + foot.length
                ? `foot:${line - end}`
                : undefined,
      row: (line) =>
        line < body
          ? (head[line] ?? null)
          : line < end
            ? (drawn.get(line - body) ?? null)
            : (foot[line - end] ?? null),
      find: (key) => {
        const h = head.findIndex((_, r) => `head:${r}` === key);
        if (h >= 0) return h;
        const at = index.get(key);
        if (at !== undefined) return body + at;
        const f = foot.findIndex((_, r) => `foot:${r}` === key);
        return f >= 0 ? end + f : -1;
      },
      of: (row) => {
        const h = head.indexOf(row);
        if (h >= 0) return h;
        const f = foot.indexOf(row);
        if (f >= 0) return end + f;
        const at = row.dataset['pctIndex'];
        return at !== undefined && drawn.get(Number(at)) === row
          ? body + Number(at)
          : -1;
      },
    };
  }

  /** The cells of a row, each by the first column it covers. */
  private spans(row: HTMLTableRowElement): readonly PctGridCellSpan[] {
    let start = 0;
    return Array.from(row.cells, (cell) => {
      const span = { start, span: cell.colSpan };
      start += cell.colSpan;
      return span;
    });
  }

  /** Each column of the grid by its id, a leading one by its name: read off the header. */
  private ids(table: HTMLTableElement): readonly string[] {
    const head = pctHeadersRow(table);
    return Array.from(
      head?.cells ?? [],
      (cell) =>
        cell.dataset['pctColumn'] ??
        LEADS.find(([name]) => cell.classList.contains(name))?.[1] ??
        '',
    );
  }

  /** The controls of a cell, as they stand outside the grid. */
  private controls(cell: HTMLTableCellElement): readonly HTMLElement[] {
    // FOCUSABLE, and any element of a tab index: one written in the selector a query is
    // handed, which the conformance gate reads.
    return Array.from(
      cell.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable]:not([contenteditable="false"]), [tabindex]',
      ),
    ).filter((element) => {
      const now = element.getAttribute('tabindex');
      if (!OWN.has(element) || WROTE.get(element) !== now)
        OWN.set(element, now);
      const own = OWN.get(element) as string | null;
      return own === null ? element.matches(FOCUSABLE) : Number(own) >= 0;
    });
  }

  /** The control a cell gives its stop, when it holds that one alone. */
  private lone(cell: HTMLTableCellElement): HTMLElement | null {
    const controls = this.controls(cell);
    return controls.length === 1 && controls[0].matches(LONE)
      ? controls[0]
      : null;
  }

  /** The cell of this table an element stands in. */
  private cellOf(element: Element | null): HTMLTableCellElement | null {
    const cell = element?.closest('td, th') ?? null;
    return cell !== null && cell.closest('table') === this.own()
      ? (cell as HTMLTableCellElement)
      : null;
  }

  /** The stop's cell, or the first cell of the first line when nothing moved it yet. */
  private stop(lines: Lines): HTMLTableCellElement | null {
    const place = this.resolved(lines);
    const row = lines.row(place.line);
    if (!row) return null;
    const spans = this.spans(row);
    return row.cells[pctGridCellAt(spans, place.column)] ?? null;
  }

  /**
   * Where the stop stands among the lines as they are now: its line found by its key, or the
   * line at its place when its own went, or the first line of the body.
   */
  private resolved(lines: Lines): PctGridPlace {
    const head = this.table.lines().length > 0 ? this.headCount() : 0;
    const place = this.place;
    if (place === null) return { line: head, column: 0 };
    const at = lines.find(place.key);
    return {
      line: at >= 0 ? at : Math.min(place.line, lines.length - 1),
      column: place.column,
    };
  }

  private headCount(): number {
    return this.own()?.tHead?.rows.length ?? 0;
  }

  /** The grid's lines and cells, as a move reads them. */
  private map(table: HTMLTableElement, lines: Lines): PctGridMap {
    const frame = table.parentElement as HTMLElement;
    const view = Math.min(
      frame.clientHeight || window.innerHeight,
      window.innerHeight,
    );
    // A line's height: the stop's row, or, while a window's scroll left it undrawn, any row
    // drawn — a page is never the frame counted in pixels.
    const row =
      this.stop(lines)?.parentElement ??
      table.querySelector('tbody > tr[data-pct-index]');
    const height = row?.getBoundingClientRect().height || 1;
    const header = table.tHead?.getBoundingClientRect().height ?? 0;
    return {
      lines: lines.length,
      cellsOf: (line) => {
        const row = lines.row(line);
        return row ? this.spans(row) : null;
      },
      page: Math.max(1, Math.floor((view - header) / height)),
    };
  }

  /** Where in the grid a cell stands, keeping the column asked for while the cell covers it. */
  private placeOf(cell: HTMLTableCellElement, lines: Lines): PctGridPlace {
    const row = cell.parentElement as HTMLTableRowElement;
    const line = lines.of(row);
    const { start, span } = this.spans(row)[cell.cellIndex];
    const asked = this.place?.column;
    const kept =
      this.place !== null &&
      this.place.key === lines.key(line) &&
      asked !== undefined &&
      asked >= start &&
      asked < start + span;
    return { line, column: kept ? (asked as number) : start };
  }

  /** The cell a model names, as a place of the grid. */
  private placeFor(
    cell: PctTableGridCell,
    lines: Lines,
    ids: readonly string[],
  ): PctGridPlace | null {
    const key =
      cell.row === null
        ? `head:${lines.columns}`
        : pctLineKey({ kind: 'row', key: cell.row } as PctTableLine<T>);
    const line = lines.find(key);
    const column = ids.indexOf(cell.column);
    return line < 0 || column < 0 ? null : { line, column };
  }

  /** The model of a place: a cell of a row or of the header, or `null` on any other line. */
  private cellAt(
    place: PctGridPlace,
    lines: Lines,
    ids: readonly string[],
  ): PctTableGridCell | null {
    const key = lines.key(place.line);
    const column = ids[Math.min(place.column, ids.length - 1)];
    if (key === `head:${lines.columns}`) return { row: null, column };
    const line = this.table.lines()[place.line - this.headCount()];
    if (line?.kind !== 'row') return null;
    // A cell that spans is named by the first column it covers, whichever the stop keeps.
    const row = lines.row(place.line);
    const cells = row ? this.spans(row) : [];
    const at = cells[pctGridCellAt(cells, place.column)];
    return { row: line.key, column: at ? ids[at.start] : column };
  }

  /** Moves the stop, and the focus with it when asked. */
  private go(
    to: PctGridPlace,
    lines: Lines,
    ids: readonly string[],
    focus: boolean,
  ): void {
    this.place = {
      key: lines.key(to.line) as string,
      line: to.line,
      column: to.column,
    };
    const cell = this.cellAt(to, lines, ids);
    this.written = cell;
    this.focused.set(cell as PctTableGridCell<keyof M & string> | null);
    if (focus) this.pending = { kind: 'scroll', left: PATIENCE };
    this.paint();
  }

  /** The element that takes the stop: the cell's lone control, or the cell. */
  private target(cell: HTMLTableCellElement): HTMLElement {
    return this.lone(cell) ?? cell;
  }

  /**
   * Writes the grid onto the cells drawn: the one tab stop, every other cell and control out
   * of the tab order, where each cell stands when columns are hidden, the rows picked, the
   * range. Then the focus, where a move or a line taken away asked for it.
   */
  private paint(): void {
    const table = this.own();
    if (table === null) return;
    if (!this.changed(table)) return;
    if (!table.hasAttribute('tabindex')) table.tabIndex = -1;
    const lines = this.lines(table);
    const ids = this.ids(table);
    // The role comes with the keys, not before them: a server's table, not yet run in the
    // browser, is a table to its reader, since nothing there would move a stop yet. A range
    // holds several cells, so the grid is one of many selected.
    // A tree's rows say their level and place, which mean something in a treegrid alone.
    set(table, 'role', this.treeOn() ? 'treegrid' : 'grid');
    set(table, 'aria-multiselectable', 'true');
    const order = this.table.columnOrder();
    const leads = leadsOf(ids);
    const trails = ids.at(-1) === '#actions' ? 1 : 0;
    set(table, 'aria-colcount', String(leads + order.length + trails));
    this.follow(lines, ids);
    this.rehome(lines, ids);
    const stop = this.stop(lines);
    const hidden = ids.length - leads - trails < order.length;
    // Where each drawn column stands among all of them, the hidden ones in their places.
    const among = ids.map((id, c) =>
      id === '#actions'
        ? leads + order.length + 1
        : id.startsWith('#')
          ? c + 1
          : leads + order.indexOf(id as keyof M & string) + 1,
    );
    const picks = table.tHead?.querySelector('.pct-data-table__pick') !== null;
    const range = this.rect(lines, ids);
    for (const row of Array.from(table.rows)) {
      if (row.getAttribute('aria-hidden') === 'true') continue;
      const body = row.parentElement?.tagName === 'TBODY';
      // A pinned row stands outside the grid: its controls keep their own place in the Tab's
      // order, and the arrows pass it over.
      if (
        body &&
        (row.parentElement as HTMLElement).dataset['pctPinned'] !== undefined
      )
        continue;
      const line = Number(row.dataset['pctIndex']);
      const data = body && !row.hasAttribute('data-pct-part');
      if (data && picks)
        set(
          row,
          'aria-selected',
          row.hasAttribute('data-pct-selected') ? 'true' : 'false',
        );
      for (const [c, { start }] of this.spans(row).entries()) {
        const cell = row.cells[c];
        set(cell, 'aria-colindex', hidden ? String(among[start]) : null);
        const inRange =
          data &&
          range !== null &&
          line >= range.top &&
          line <= range.bottom &&
          start >= range.left &&
          start <= range.right;
        set(cell, 'data-pct-in-range', inRange ? '' : null);
        set(cell, 'aria-selected', inRange ? 'true' : null);
        const lone = cell === stop ? this.lone(cell) : null;
        const stops = cell === stop && lone === null;
        if (cell.getAttribute('tabindex') !== (stops ? '0' : '-1'))
          cell.setAttribute('tabindex', stops ? '0' : '-1');
        for (const control of this.controls(cell)) {
          if (cell === this.editing) {
            own(control);
            continue;
          }
          const lead = control === lone;
          if (control.getAttribute('tabindex') !== (lead ? '0' : '-1'))
            control.setAttribute('tabindex', lead ? '0' : '-1');
          WROTE.set(control, lead ? '0' : '-1');
        }
      }
    }
    this.land(table, lines, stop);
    // The grid's own writes are no change of the table's.
    this.observer?.takeRecords();
  }

  /**
   * Whether the paint has anything to do: the table drew something since the last one, the
   * grid's own state moved, or the focus waits for a stop.
   */
  private changed(table: HTMLTableElement): boolean {
    if (this.observed !== table) {
      this.observer ??= new MutationObserver(() => undefined);
      this.observer.disconnect();
      this.observer.observe(table, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      this.observed = table;
      this.seen = [];
    }
    const seen = [
      this.table.lines(),
      this.table.columnOrder(),
      this.place,
      this.editing,
      this.range(),
      this.focused(),
    ];
    const drawn = (this.observer?.takeRecords().length ?? 0) > 0;
    const moved = seen.some((one, at) => one !== this.seen[at]);
    this.seen = seen;
    const active = document.activeElement;
    const lost =
      this.last !== null && (active === null || active === document.body);
    return drawn || moved || lost || this.pending !== null;
  }

  /**
   * Keeps the stop's place current: its line moves as rows come before it, and when its line
   * is gone the stop is the line's in its place, which the model then names.
   */
  private rehome(lines: Lines, ids: readonly string[]): void {
    const place = this.place;
    if (place === null) return;
    const at = this.resolved(lines);
    const key = lines.key(at.line);
    if (key === undefined) return;
    if (key === place.key && at.line === place.line) return;
    this.place = { key, line: at.line, column: place.column };
    if (key === place.key) return;
    const cell = this.cellAt(at, lines, ids);
    this.written = cell;
    this.focused.set(cell as PctTableGridCell<keyof M & string> | null);
  }

  /** The model the application set, followed: the stop goes to the cell it names. */
  private follow(lines: Lines, ids: readonly string[]): void {
    const cell = this.focused();
    if (cell === this.written) return;
    this.written = cell;
    if (cell === null) return;
    const place = this.placeFor(cell, lines, ids);
    if (place === null) return;
    this.place = { key: lines.key(place.line) as string, ...place };
    if (this.host.nativeElement.contains(document.activeElement))
      this.pending = { kind: 'scroll', left: PATIENCE };
  }

  /** The focus, where it was asked for or where the line that had it went. */
  private land(
    table: HTMLTableElement,
    lines: Lines,
    stop: HTMLTableCellElement | null,
  ): void {
    const active = document.activeElement;
    if (
      this.last !== null &&
      !this.leaving &&
      (active === null || active === document.body)
    ) {
      this.last = null;
      this.pending = { kind: 'stay', left: PATIENCE };
    }
    const pending = this.pending;
    if (pending === null) return;
    if (stop !== null) {
      this.pending = null;
      this.target(stop).focus();
      return;
    }
    if (pending.kind === 'stay') {
      // The line went out of the window: the table keeps the focus, and the keys.
      this.pending = null;
      table.focus({ preventScroll: true });
      return;
    }
    if (pending.left-- === PATIENCE) this.reach(lines);
    if (pending.left === 0) this.pending = null;
  }

  /** Scrolls the stop's line into view: by its row, or the row after it or before it. */
  private reach(lines: Lines): void {
    const at = this.resolved(lines).line - this.headCount();
    const all = this.table.lines();
    const row =
      all
        .slice(at)
        .find((line) => line.kind !== 'hole' && line.kind !== 'group') ??
      all
        .slice(0, at)
        .reverse()
        .find((line) => line.kind !== 'hole' && line.kind !== 'group');
    if (row) this.table.scrollTo(row.key as PctRowId);
  }

  /** The range as lines and columns of the grid, both ends included; `null` with none. */
  private rect(
    lines: Lines,
    ids: readonly string[],
  ): {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  } | null {
    const range = this.range();
    if (range === null) return null;
    const head = this.headCount();
    const lineOf = (row: PctRowId) =>
      lines.find(pctLineKey({ kind: 'row', key: row } as PctTableLine<T>)) -
      head;
    const a = lineOf(range.from.row);
    const b = lineOf(range.to.row);
    const c = ids.indexOf(range.from.column);
    const d = ids.indexOf(range.to.column);
    if (a < 0 || b < 0 || c < 0 || d < 0) return null;
    return {
      top: Math.min(a, b),
      bottom: Math.max(a, b),
      left: Math.min(c, d),
      right: Math.max(c, d),
    };
  }

  /** A key on the grid: a move, a step into a cell or out of it, or Ctrl+A. */
  protected key(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const table = this.own();
    if (table === null) return;
    const target = event.target as HTMLElement;
    const cell = this.cellOf(target);
    if (cell === null && target !== table) return;
    if (cell !== null && cell === this.editing) {
      if (event.key !== 'Escape' && event.key !== 'F2') return;
      // A control's own popup closes first: the next Escape leaves the cell.
      if (target.closest('[aria-expanded="true"]') !== null) return;
      event.preventDefault();
      this.editing = null;
      this.paint();
      cell.focus();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a' &&
      this.selection !== null &&
      !this.selection.disabled() &&
      !this.selection.readonly()
    ) {
      event.preventDefault();
      this.selection.selectAll();
      return;
    }
    if (cell !== null && target === cell) {
      if (event.key === 'Enter' || event.key === 'F2') {
        const controls = this.controls(cell);
        if (controls.length === 0) return;
        event.preventDefault();
        this.editing = cell;
        this.paint();
        controls[0].focus();
        return;
      }
    }
    // A control the cell does not give its stop keeps its keys: a field clicked into.
    if (cell !== null && target !== cell && target !== this.lone(cell)) return;
    const rtl = getComputedStyle(table).direction === 'rtl';
    const step = pctGridKey(event, rtl);
    if (step === null) return;
    event.preventDefault();
    const lines = this.lines(table);
    const ids = this.ids(table);
    const from =
      cell === null ? this.resolved(lines) : this.placeOf(cell, lines);
    if (!step.extend && this.branch(from, step.move, lines, ids)) return;
    const to = pctGridMove(this.map(table, lines), from, step.move);
    this.stretch(from, to, step.extend, lines, ids);
    this.go(to, lines, ids, true);
  }

  /** The tree directive is on this table and on. */
  private treeOn(): boolean {
    return this.tree !== null && !this.tree.disabled();
  }

  /**
   * The treegrid's two keys on a row's first cell
   * (https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/): the arrow into the line opens a
   * closed branch, the arrow out of it closes an open one, or moves to the parent of a leaf
   * or a closed branch. True when the key was one of them, and the stop moves no further.
   */
  private branch(
    from: PctGridPlace,
    move: PctGridMove,
    lines: Lines,
    ids: readonly string[],
  ): boolean {
    if (!this.treeOn() || (move !== 'next' && move !== 'previous'))
      return false;
    const leads = leadsOf(ids);
    if (from.column !== leads) return false;
    // The grid's lines count the header's first: the table's line is found by its key.
    const all = this.table.lines();
    const at = this.keys?.index.get(lines.key(from.line) as string);
    const line = at === undefined ? undefined : all[at];
    if (line?.kind !== 'row') return false;
    const tree = this.tree as PctTableTree<T, M>;
    if (move === 'next') {
      if (line.expanded !== false) return false;
      tree.toggle(line.key);
      return true;
    }
    if (line.expanded === true) {
      tree.toggle(line.key);
      return true;
    }
    // The parent is the nearest row above that stands one level up; a root has none, and
    // the rows of a group, which is no row, stand on their own.
    for (let up = (at as number) - 1; up >= 0; up--) {
      const above = all[up];
      if (above.kind !== 'row' || above.level >= line.level) continue;
      if (above.level !== line.level - 1) break;
      this.go(
        { line: lines.find(pctLineKey(above)), column: leads },
        lines,
        ids,
        true,
      );
      return true;
    }
    return false;
  }

  /** A move with Shift stretches the range over data cells; one without lets it go. */
  private stretch(
    from: PctGridPlace,
    to: PctGridPlace,
    extend: boolean,
    lines: Lines,
    ids: readonly string[],
  ): void {
    if (!extend) {
      if (this.range() !== null) this.range.set(null);
      return;
    }
    const a = this.dataCell(from, lines, ids);
    const b = this.dataCell(to, lines, ids);
    if (a === null || b === null) return;
    this.range.set({ from: this.range()?.from ?? a, to: b });
  }

  /** A place as a cell of a row's data, or `null` for any other cell. */
  private dataCell(
    place: PctGridPlace,
    lines: Lines,
    ids: readonly string[],
  ): PctTableDataCell<keyof M & string> | null {
    const cell = this.cellAt(place, lines, ids);
    return cell === null || cell.row === null || cell.column.startsWith('#')
      ? null
      : (cell as PctTableDataCell<keyof M & string>);
  }

  /**
   * The focus came into a cell, by a key, a click or a reader: the stop follows it. A cell
   * whose lone control has the stop hands the focus on to it, and a control of a cell with
   * more is the cell stepped into.
   */
  protected entered(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const cell = this.cellOf(target);
    if (cell === null) return;
    this.last = target;
    const table = this.own() as HTMLTableElement;
    const lines = this.lines(table);
    const place = this.placeOf(cell, lines);
    const lone = this.lone(cell);
    if (target !== cell && target !== lone) this.editing = cell;
    // The focus back on a cell stepped into, by a script or a click beside its controls: the
    // cell is left, and the keys move the stop again.
    else if (this.editing === cell) {
      this.editing = null;
      this.paint();
    }
    if (
      this.place?.key !== lines.key(place.line) ||
      this.place?.column !== place.column
    )
      this.go(place, lines, this.ids(table), false);
    if (target === cell && lone !== null) lone.focus();
  }

  /** The focus left a cell: a cell stepped into is left, and a grid left keeps no element. */
  protected left(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (
      this.editing !== null &&
      !(next !== null && this.editing.contains(next))
    ) {
      this.editing = null;
      this.leaving = true;
      this.paint();
      this.leaving = false;
    }
    // Out of the table — to the page, or to the host's own button or frame: the grid is left.
    if (next !== null && !this.own()?.contains(next)) this.last = null;
    // Nowhere: the page or another window took the focus, and the element stays. One the
    // table took away, or moved, does not, and its line's cell takes the focus back.
    if (next === null) {
      const was = event.target as HTMLElement;
      queueMicrotask(() => {
        if (was.isConnected && this.last === was) this.last = null;
      });
    }
  }

  /** Shift with a press on a data cell stretches the range there from the stop. */
  protected pointed(event: PointerEvent): void {
    if (!event.shiftKey) return;
    const cell = this.cellOf(event.target as Element);
    const table = this.own();
    if (cell === null || table === null) return;
    const lines = this.lines(table);
    const ids = this.ids(table);
    const to = this.placeOf(cell, lines);
    const from = this.resolved(lines);
    if (this.dataCell(to, lines, ids) === null) return;
    event.preventDefault();
    this.stretch(from, to, true, lines, ids);
    this.go(to, lines, ids, true);
  }
}

/**
 * Gives a control its place in the tab order back: none written, where it had none, and `0`
 * where its template wrote one — `controls` keeps only the ones in the order, and one above
 * zero would put the cell's control before the page's.
 */
function own(control: HTMLElement): void {
  if (OWN.get(control) == null) {
    control.removeAttribute('tabindex');
    WROTE.set(control, null);
    return;
  }
  if (control.getAttribute('tabindex') !== '0')
    control.setAttribute('tabindex', '0');
  WROTE.set(control, '0');
}

/** Writes an attribute only when it changes; `null` takes it away. */
function set(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}
