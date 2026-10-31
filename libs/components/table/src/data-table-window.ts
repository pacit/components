import {
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  isDevMode,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { PctDataTable, type PctScrollAlign } from './data-table';
import type { PctTableLine } from './model/lines';
import {
  PctLineHeights,
  pctWindow,
  pctWindowScroll,
  type PctWindow,
} from './model/window';

/** How many lines are drawn past each edge of the view. */
const OVERSCAN = 8;

/**
 * The tallest the space of the lines grows: Firefox collapses a block past 17,895,697 px, and
 * the header, the foot and the estimates' error need room under it (0098).
 */
const LIMIT = 16_000_000;

/** What a line counts at before one is measured, and the view before the frame is laid out. */
const FIRST_ESTIMATE = 40;
const FIRST_VIEW = 600;

/** Two heights closer than a sixty-fourth of a pixel are one: the engines' own unit. */
const TOLERANCE = 1 / 64;

/** The median of a list of numbers that is not empty. */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Heights by line: by its kind, then by its key as it is — a row id `1` and `'1'` stay two —
 * so a list of a million lines is read against them without a key written out for each.
 */
class LineHeights {
  private readonly kinds = new Map<string, Map<unknown, number>>();

  /** No line has a height yet. */
  empty(): boolean {
    return this.kinds.size === 0;
  }

  get(line: PctTableLine<unknown>): number | undefined {
    return this.kinds.get(line.kind)?.get(line.key);
  }

  set(line: PctTableLine<unknown>, height: number): void {
    let heights = this.kinds.get(line.kind);
    if (heights === undefined) {
      heights = new Map();
      this.kinds.set(line.kind, heights);
    }
    heights.set(line.key, height);
  }
}

/**
 * Draws only the lines in the table's view, and the space of the rest: a list of a hundred
 * thousand rows lays out the forty a frame shows
 * ([0098](../../../../docs/decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)).
 *
 * Opt-in, because a table without it is a table: every row in the DOM, found by find-in-page
 * and counted by a reader. Past about 8,000 cells a table draws its first frame slowly, and
 * that is where the window pays. The table needs a height of its own, since the window draws
 * what its frame shows: a frame as tall as its lines shows them all.
 *
 * - **Heights are measured.** Each drawn line's height is read and kept by its key, so a row
 *   measured once counts at its height wherever a sort takes it; a line never drawn counts at
 *   the median of the first lines measured. A line above the one the reader is at that turns
 *   out taller or shorter than it was counted moves the scroll, so what is on screen stays where
 *   it is, in a scaled space too. A focused row the window scrolls away hands the focus to the
 *   frame, which keeps the keys.
 * - **Columns keep their widths.** The widths of the first frame are fixed on the header's
 *   cells, so a longer text further down wraps in its column rather than moving the columns
 *   while the user reads; a new set of columns or a resized frame measures them again.
 * - **Readers are told the count.** The table carries `aria-rowcount`, and each row it draws
 *   `aria-rowindex`, the header's row first and the foot's last, so a reader says "row 902 of
 *   100,002" of the row in view.
 * - **Past 16,000,000 px the space is scaled**, under Firefox's ceiling: a pixel of scroll then
 *   moves the lines by more than a pixel, in proportion, so the first view shows the first line
 *   and the last the last.
 *
 * `scrollTo` and `reveal` reach a row the window has not drawn: its place is the sum of the
 * heights above it. Find-in-page finds only the lines drawn, which is the price of the window.
 *
 * @example
 * <pct-data-table pctTableWindow [rows]="history()" [columns]="columns" [rowId]="byId" style="block-size: 30rem" />
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableWindow]',
  exportAs: 'pctTableWindow',
})
export class PctTableWindow {
  private readonly table = inject(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Each line's height as last measured, by its key: kept when the lines are sorted or
   * filtered, so a line measured once counts at its height wherever it goes.
   */
  private readonly measured = new LineHeights();

  /** The height a line not measured counts at: the median of the first rows measured. */
  private readonly estimate = signal(FIRST_ESTIMATE);
  private estimated = false;

  /** A new number at each measurement written into the heights, which change in place. */
  private readonly version = signal(0);

  /**
   * Where the lines start in the frame's scroll, less what of the view a sticky header covers,
   * and how tall the view of the lines is.
   */
  private readonly geometry = signal(
    { offset: 0, view: FIRST_VIEW },
    { equal: (a, b) => a.offset === b.offset && a.view === b.view },
  );

  /** The lines' heights, made again when the lines or the estimate change. */
  private readonly heights = computed(() => {
    const lines = this.table.lines();
    const heights = new PctLineHeights(lines.length, this.estimate());
    // A plain map, not a signal: a measurement writes the heights in place.
    if (!this.measured.empty())
      lines.forEach((line, index) => {
        const height = this.measured.get(line);
        if (height !== undefined) heights.set(index, height);
      });
    return heights;
  });

  /**
   * How far the frame is scrolled: the table's reading of its scroll, and what the window
   * wrote there itself until the browser's event says so, so the window drawn after a
   * correction is the one at the scroll it wrote.
   */
  private readonly scrolled = linkedSignal(() => this.table.scrolled());

  /** The window where the frame stands, its row and details always together. */
  private readonly current = computed(() => {
    this.version();
    const heights = this.heights();
    const { offset, view } = this.geometry();
    return this.paired(
      pctWindow({
        heights,
        scrollTop: this.scrolled() - offset,
        viewport: view,
        overscan: OVERSCAN,
        limit: LIMIT,
      }),
      heights,
    );
  });

  /**
   * The lines drawn, `[start, end)`: those in the view and a few past each edge, a row and
   * its details always together. Known as soon as the window is, before the browser lays the
   * lines out — what a source that loads the rows a scroll reaches asks for.
   *
   * @since next
   */
  readonly drawn = computed(() => {
    const { start, end } = this.current();
    return { start, end };
  });

  /**
   * The line at the view's top: the first a reader sees, under a sticky header. 0 for a
   * list of no lines.
   *
   * @since next
   */
  readonly first = computed(() => this.heights().indexAt(this.current().top));

  /**
   * The row the table asked to scroll to, until its own row has been drawn and measured: of
   * the lines it was asked among, so other lines drop it.
   */
  private reaching: {
    readonly line: number;
    readonly align: PctScrollAlign;
    readonly lines: readonly unknown[];
  } | null = null;

  /** The lines the rows observed were drawn for: a report on other lines' rows is stale. */
  private observed: readonly unknown[] | null = null;

  /** What the header's cells were last measured for: the columns and the frame's width. */
  private pinned = '';

  private warned = false;

  constructor() {
    this.table.contribute({
      window: {
        range: this.current,
        lead: computed(() => this.current().lead),
        first: this.first,
        tail: computed(() => this.current().tail),
        reach: (line, align) => {
          const reaching = { line, align, lines: untracked(this.table.lines) };
          const was = this.frame().scrollTop;
          this.scrollToLine(reaching);
          // A row where it was asked for already — so in view, and drawn: no scroll comes, nor
          // a measurement to finish on, and a later one would pull the reader back to it.
          this.reaching = this.frame().scrollTop === was ? null : reaching;
        },
      },
    });
    let rows: ResizeObserver | null = null;
    let frame: ResizeObserver | null = null;
    inject(DestroyRef).onDestroy(() => {
      rows?.disconnect();
      frame?.disconnect();
    });
    afterRenderEffect(() => {
      // Each render of other lines or other columns: the rows drawn are observed afresh, and an
      // observer reports each row it starts on, so every render is measured.
      this.current();
      const columns = this.table.columns().map((column) => column.id);
      const hidden = this.table.hiddenColumns();
      const element = this.frame();
      if (rows === null) {
        // Its own anchoring corrects nothing under a sticky header, and adds to the window's.
        element.style.overflowAnchor = 'none';
        // Its own reading too: an event that brings the scroll back to where the table last
        // read it changes nothing there, and would leave the scroll the window wrote standing.
        element.addEventListener('scroll', () =>
          this.scrolled.set(element.scrollTop),
        );
        rows = new ResizeObserver((entries) => this.measure(entries));
        // A frame of another width lays the columns out again, as other columns do.
        frame = new ResizeObserver(() => this.fit(element));
        frame.observe(element);
      }
      untracked(() => this.fit(element, columns, hidden));
      rows.disconnect();
      this.observed = untracked(this.table.lines);
      // Lines, not the placeholders that stand in for rows still coming.
      for (const row of Array.from(
        this.tableOf(element).querySelectorAll(
          ':scope > tbody > tr[data-pct-index]',
        ),
      ))
        rows.observe(row);
    });
  }

  /** Pins the header's cells for the columns and the frame's width, and reads the view. */
  private fit(
    element: HTMLElement,
    columns: readonly string[] = this.table
      .columns()
      .map((column) => column.id),
    hidden: unknown = this.table.hiddenColumns(),
  ): void {
    this.pin(JSON.stringify([element.clientWidth, columns, hidden]));
    this.place();
  }

  /** The table's frame: the host's own, not one a cell template nests in it. */
  private frame(): HTMLElement {
    return this.host.nativeElement.querySelector(
      ':scope > pct-table-frame',
    ) as HTMLElement;
  }

  private tableOf(frame: HTMLElement): HTMLTableElement {
    return frame.querySelector(':scope > table') as HTMLTableElement;
  }

  /**
   * The window moved off a details row's edge: a row is drawn with its details and details with
   * their row, and the space gives up what the line added takes.
   */
  private paired(window: PctWindow, heights: PctLineHeights): PctWindow {
    const lines = this.table.lines();
    const start =
      lines[window.start]?.kind === 'details' ? window.start - 1 : window.start;
    const end =
      lines[window.end]?.kind === 'details' ? window.end + 1 : window.end;
    if (start === window.start && end === window.end) return window;
    const lead = Math.max(
      0,
      window.lead - (heights.offsetOf(window.start) - heights.offsetOf(start)),
    );
    const drawn = heights.offsetOf(end) - heights.offsetOf(start);
    return {
      ...window,
      start,
      end,
      lead,
      tail: Math.max(0, window.space - lead - drawn),
    };
  }

  /**
   * Writes the heights the observer read into the sums and keeps the line the view's top is
   * in where it was, as far into it as it was; then finishes a scroll to a row, now that its
   * row is drawn and measured.
   */
  private measure(entries: readonly ResizeObserverEntry[]): void {
    const lines = this.table.lines();
    // Rows drawn for lines since gone: the render of the new ones observes its rows afresh.
    if (lines !== this.observed || lines.length === 0) return;
    const before = this.heights();
    const frame = this.frame();
    const { offset, view } = this.geometry();
    const scrollTop = frame.scrollTop - offset;
    // Where the top stands among the lines, in the sums before the heights read.
    const { top, space } = pctWindow({
      heights: before,
      scrollTop,
      viewport: view,
      overscan: 0,
      limit: LIMIT,
    });
    const anchor = Math.min(lines.length - 1, before.indexAt(top));
    const within = top - before.offsetOf(anchor);
    // What of the scroll is not the lines': a caption above them, a foot below.
    const beside = scrollTop - Math.max(0, Math.min(scrollTop, space - view));
    const reaching = this.reaching?.lines === lines ? this.reaching : null;
    const rows: number[] = [];
    let changed = false;
    let reached = false;
    for (const entry of entries) {
      const row = entry.target as HTMLElement;
      if (!row.isConnected) continue;
      const index = Number(row.dataset['pctIndex']);
      const line = lines[index];
      const height = entry.borderBoxSize[0].blockSize;
      if (line.kind === 'row') rows.push(height);
      if (index === reaching?.line) reached = true;
      if (Math.abs((this.measured.get(line) ?? -1) - height) < TOLERANCE)
        continue;
      this.measured.set(line, height);
      before.set(index, height);
      changed = true;
    }
    if (!this.estimated && rows.length > 0) {
      // The first rows measured set what every row not drawn counts at, once: the sums are
      // made again with it.
      this.estimated = true;
      this.estimate.set(median(rows));
    }
    if (changed) {
      // One path for a space scaled or not: the top the line and the pixels into it map to,
      // no further into the line than it now is tall.
      const after = this.heights();
      this.scrollFrame(
        frame,
        pctWindowScroll({
          heights: after,
          scrollTop,
          viewport: view,
          overscan: OVERSCAN,
          limit: LIMIT,
          index: anchor,
          align: 'start',
          within: Math.min(within, after.heightOf(anchor)),
        }) +
          offset +
          beside,
      );
      this.version.update((version) => version + 1);
    }
    if (reaching === null) this.reaching = null;
    else if (reached) {
      this.reaching = null;
      this.scrollToLine(reaching);
    }
  }

  /** Scrolls to the line the table asked for, through the window's own sums. */
  private scrollToLine(at: {
    readonly line: number;
    readonly align: PctScrollAlign;
  }): void {
    const frame = this.frame();
    const { offset, view } = untracked(this.geometry);
    // The browser's event brings the window there: a scroll the reader asked for is drawn
    // from it, as the reader's own would be.
    frame.scrollTop =
      pctWindowScroll({
        heights: untracked(this.heights),
        scrollTop: frame.scrollTop - offset,
        viewport: view,
        overscan: OVERSCAN,
        limit: LIMIT,
        index: at.line,
        align: at.align,
      }) + offset;
  }

  /**
   * Writes the frame's scroll, and reads back where the browser put it: the window drawn next
   * is the one at it, not at the scroll before, which a scaled space would draw elsewhere.
   */
  private scrollFrame(frame: HTMLElement, top: number): void {
    frame.scrollTop = top;
    this.scrolled.set(frame.scrollTop);
  }

  /**
   * Reads where the lines start in the frame's scroll and how much of the frame shows them. A
   * frame taller than the page's view is one with no height of its own, and its view is the
   * page's: the window then draws a page of lines, not every line.
   */
  private place(): void {
    const frame = this.frame();
    const table = this.tableOf(frame);
    const covered = this.table.stickyHeader()
      ? (table.tHead as HTMLElement).getBoundingClientRect().height
      : 0;
    const top =
      (table.tBodies[0] as HTMLElement).getBoundingClientRect().top -
      frame.getBoundingClientRect().top -
      frame.clientTop +
      frame.scrollTop;
    const page = frame.ownerDocument.documentElement.clientHeight;
    if (frame.clientHeight > page && isDevMode()) this.warnOnNoHeight();
    this.geometry.set({
      offset: top - covered,
      view: Math.max(0, Math.min(frame.clientHeight, page) - covered),
    });
  }

  /**
   * Fixes the header's cells at the widths the automatic layout gives them, measured again for
   * a new set of columns or a frame of another width.
   */
  private pin(key: string): void {
    if (key === this.pinned) return;
    this.pinned = key;
    const table = this.tableOf(this.frame());
    const cells = Array.from(
      (table.tHead as HTMLTableSectionElement).rows[0].cells,
    );
    table.style.tableLayout = '';
    for (const cell of cells) cell.style.inlineSize = '';
    const widths = cells.map((cell) => cell.getBoundingClientRect().width);
    cells.forEach((cell, c) => {
      cell.style.boxSizing = 'border-box';
      cell.style.inlineSize = `${widths[c]}px`;
    });
    table.style.tableLayout = 'fixed';
  }

  private warnOnNoHeight(): void {
    if (this.warned) return;
    this.warned = true;
    console.warn(
      `[pct-data-table] pctTableWindow draws the lines the table's frame shows, and the ` +
        `frame is taller than the page: give the table a height, such as block-size, so the ` +
        `frame scrolls the lines. Without one the window draws a page of lines and no more.`,
    );
  }
}
