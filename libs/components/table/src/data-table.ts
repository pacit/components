import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  signal,
  untracked,
  viewChild,
  type TemplateRef,
} from '@angular/core';
import {
  PCT_TEXTS,
  PctAnnouncer,
  type PctInstant,
  pctQuantityFormat,
  pctRelativeFormat,
  type PctTone,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctSkeleton } from '@pacit/components/skeleton';
import {
  PctCellTemplate,
  PctEmptyTemplate,
  PctHeaderCellTemplate,
} from './data-table-slots';
import {
  type PctAnyCellKind,
  type PctAnyColumn,
  pctColumnNumeric,
  type PctColumns,
  type PctRowId,
} from './model/columns';
import { pctLineKey, pctLines, type PctTableLine } from './model/lines';
import { pctOrderRows } from './model/order';
import {
  pctMatches,
  pctMatchParts,
  pctQuestionWords,
  type PctTextPart,
} from './model/question';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
  PctTableHeader,
  type PctTableSort,
} from './table';

/**
 * The lines in the view, `[start, end)` among the lines drawn, and the ids of the rows among
 * them, in order.
 *
 * @since next
 */
export interface PctTableVisible {
  readonly start: number;
  readonly end: number;
  readonly rows: readonly PctRowId[];
}

/**
 * Where a row the table scrolls to stands in the view: at its top, its centre, its bottom, or
 * wherever is nearest from where the view is — the default.
 *
 * @since next
 */
export type PctScrollAlign = 'start' | 'center' | 'end' | 'nearest';

/**
 * How `scrollTo` scrolls.
 *
 * @since next
 */
export interface PctScrollToOptions {
  /** Where the row stands in the view; `nearest` by default. */
  readonly align?: PctScrollAlign;
}

/** How many placeholder rows stand in for rows that are still coming. */
const PLACEHOLDER_ROWS = [0, 1, 2, 3, 4];

/** A cell of a row line, written once per render rather than once per binding. */
interface Cell<T> {
  readonly column: PctAnyColumn<T>;
  readonly value: unknown;
  readonly text: string;
  readonly numeric: boolean;
  readonly yes: boolean | null;
  readonly slot: TemplateRef<unknown> | null;
  /** The text cut where the quick filter's words stand, or `null` when there is no question to mark. */
  readonly parts: readonly PctTextPart[] | null;
  readonly tone: PctTone | null;
  /** The tooltip a column's function wrote. */
  readonly title: string | null;
  /** The text is kept to one line, and its tooltip is shown when it is cut. */
  readonly clip: boolean;
}

/** A row line with its cells. */
interface Row<T> {
  readonly key: string;
  readonly row: T;
  readonly index: number;
  readonly id: PctRowId;
  readonly tone: PctTone | null;
  /** The row's values, one per column: the array the cache holds, kept while the row is. */
  readonly values: readonly unknown[];
  readonly cells: readonly Cell<T>[];
}

/**
 * Whether a cell's value stayed what it was: a date by its time, anything else as itself. Both
 * read as `Object.is`, so an invalid date is the same invalid date and `NaN` the same `NaN`.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date)
    return Object.is(a.getTime(), b.getTime());
  return Object.is(a, b);
}

/** Writes a value; `now` is handed in at the write, so a relative column counts from the moment the rows were drawn. */
type Writer = (value: unknown, now: PctInstant) => string;

/**
 * How a kind writes a value as text: the text a cell shows and the quick filter searches. An
 * empty value writes nothing.
 */
function writerOf(
  kind: PctAnyCellKind | undefined,
  locale: string,
  words: { readonly yes: string; readonly no: string },
): Writer {
  // `Number.isFinite` takes no string for a number, so it is the whole test of a value to write.
  const finite = (value: unknown): value is number => Number.isFinite(value);
  if (kind === 'boolean')
    return (value) =>
      value === true ? words.yes : value === false ? words.no : '';
  if (typeof kind === 'object' && kind.number) {
    const quantity = pctQuantityFormat(locale, kind.number);
    return (value) => (finite(value) ? quantity.format(value) : '');
  }
  if (typeof kind === 'object' && kind.instant) {
    const { relative, timeZone, format } = kind.instant;
    if (relative) {
      // Spreading `true` spreads nothing, so the options of `relative: true` are the defaults.
      const words = pctRelativeFormat(locale, {
        ...(relative as object),
        timeZone,
      });
      return (value, now) => (finite(value) ? words.format(value, now) : '');
    }
    const clock = new Intl.DateTimeFormat(locale, { timeZone, ...format });
    return (value) => (finite(value) ? clock.format(value) : '');
  }
  return (value) =>
    value === null || value === undefined ? '' : String(value);
}

/**
 * A table built from data: typed columns, sorting by one key or several, a quick filter, and
 * the empty and loading states, rendered as the first layer's `<table pctTable>` so the two
 * look the same ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 *
 * **A table, not a grid.** The element is the platform's `<table>` with no role of its own:
 * a caption, header cells with `scope`, `aria-sort` on the header of the first sort key, and
 * the controls in its cells reached with Tab. The APG's sortable table
 * (https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) is the pattern.
 *
 * **The rows are the application's, and the table orders a copy.** `rows` is never changed.
 * By default the table filters and sorts in the client; `clientFilter` and `clientSort` turn
 * either off for rows a server has already answered for, and `filter` and `sort` are then
 * the question to send it.
 *
 * **What is written is what is searched.** A column's `kind` writes its value — a number with
 * its unit in the table's locale, an instant as a wall clock or relative to `now`, a boolean
 * as a word — and the quick filter searches that text, so a value copied off the screen finds
 * its row. A cell template draws anything, and the filter still reads the kind's text.
 *
 * @example
 * <pct-data-table [rows]="rules()" [columns]="columns" [rowId]="byId" caption="Rules" [(filter)]="question">
 *   <ng-template [pctCell]="columns" pctCellOf="enabled" let-rule>
 *     <pct-switch [checked]="rule.enabled" (checkedChange)="toggle(rule, $event)" ariaLabel="Enabled" />
 *   </ng-template>
 * </pct-data-table>
 *
 * @since next
 */
@Component({
  selector: 'pct-data-table',
  exportAs: 'pctDataTable',
  imports: [
    NgTemplateOutlet,
    PctIcon,
    PctSkeleton,
    PctTable,
    PctTableCaption,
    PctTableCell,
    PctTableFrame,
    PctTableHeader,
  ],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: {
    class: 'pct-data-table',
    '[attr.data-pct-sticky]': 'stickyHeader() ? "" : null',
    '[attr.data-pct-striped]': 'striped() ? "" : null',
  },
})
export class PctDataTable<
  T,
  M extends Record<string, unknown> = Record<string, unknown>,
> {
  private readonly appLocale = inject(LOCALE_ID);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly announcer = inject(PctAnnouncer);

  /**
   * The rows. They are read and never changed: the table filters and orders a copy.
   *
   * @since next
   */
  readonly rows = input<readonly T[]>([]);

  /**
   * The columns, built with `pctColumnsOf<T>()` so every cell template is checked against
   * their ids and their values' types.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>();

  /**
   * What names a row across renders: `@for` tracks it, so a row keeps its element, its focus
   * and its scroll position when the application hands the table a new list with the same
   * ids. Unique across the rows.
   *
   * @since next
   */
  readonly rowId = input.required<(row: T) => PctRowId>();

  /**
   * The table's name, drawn as its `<caption>`. A table needs a name: this, or
   * `ariaLabelledby`.
   *
   * @since next
   */
  readonly caption = input<string>('');

  /**
   * The id of an element that names the table, for a table whose name stands elsewhere on the
   * page. It names the frame too when the frame scrolls.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * The order of the rows: a list of keys, the first deciding first. A press on a sortable
   * header makes that column the only key, ascending, and turns it the other way on the next;
   * with Shift held it adds the column as the last key, or turns it where it stands.
   *
   * @since next
   */
  readonly sort = model<readonly PctTableSort<keyof M & string>[]>([]);

  /**
   * A third press on a descending column takes it out of the order, so the rows can go back
   * to the order they came in. `false` by default, as the APG's sortable table toggles.
   *
   * @since next
   */
  readonly unsortable = input(false, { transform: booleanAttribute });

  /**
   * Whether the table orders the rows by `sort` itself. `false` for rows a server has already
   * ordered: the headers still write `sort`, and the application asks the server.
   *
   * @since next
   */
  readonly clientSort = input(true, { transform: booleanAttribute });

  /**
   * The quick filter's question: every word in it must be found in some column of a row.
   * A question, not a value: the table never writes it.
   *
   * @since next
   */
  readonly filter = model<string>('');

  /**
   * Whether the table filters the rows by `filter` itself. `false` for rows a server has
   * already filtered.
   *
   * @since next
   */
  readonly clientFilter = input(true, { transform: booleanAttribute });

  /**
   * A predicate in place of the quick filter's own, asked for every row with the question as
   * it was typed, empty included, so it can answer other filters of the application's too.
   *
   * @since next
   */
  readonly filterWith = input<((row: T, question: string) => boolean) | null>(
    null,
  );

  /**
   * Rows are coming. The body is `aria-busy`, and with no row yet the table draws placeholder
   * rows and says it is loading
   * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
   *
   * @since next
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * The locale the values are written and the text ordered in; the application's `LOCALE_ID`
   * when empty.
   *
   * @since next
   */
  readonly locale = input<string>('');

  /**
   * The instant a relative column counts from. Unset, it is the clock's when the cells are
   * written; an application that wants `in 5 minutes` to tick binds a clock of its own.
   *
   * @since next
   */
  readonly now = input<PctInstant | null>(null);

  /**
   * The header row stays at the top while the rows scroll under it. It needs a frame that
   * scrolls, so it holds when the table is given a height, and `true` by default.
   *
   * @since next
   */
  readonly stickyHeader = input(true, { transform: booleanAttribute });

  /**
   * Every other row on a tint, so a wide row is easier to follow across.
   *
   * @since next
   */
  readonly striped = input(false, { transform: booleanAttribute });

  /**
   * A leading column numbering the rows as they stand, from 1: the row a user names when they
   * say "row 12". A cell of data, not the row's header: the row's name is its data.
   *
   * @since next
   */
  readonly rowNumbers = input(false, { transform: booleanAttribute });

  /**
   * The tone a row wears: a tint behind the whole row. Like a column's tone, it repeats what a
   * cell of the row says and never says it alone.
   *
   * @since next
   */
  readonly rowTone = input<((row: T) => PctTone | null) | null>(null);

  /**
   * The words the quick filter found are marked in the cells it read, so the eye sees why a
   * row stayed. Only where the table's own filter decided: not with `filterWith`, nor with
   * `clientFilter` off, where what matched is not the table's to say.
   *
   * @since next
   */
  readonly highlightMatches = input(true, { transform: booleanAttribute });

  /**
   * A cell whose value changed flashes for a moment, so a value that moved in a table of live
   * readings is seen moving. A value is compared as itself, a date by its time: the clock
   * moving a relative instant on is no change, and a value that is a new object at every
   * poll flashes at every poll. The flash is a motion token's, so a user who asked for less
   * motion sees none.
   *
   * @since next
   */
  readonly highlightChanges = input(false, { transform: booleanAttribute });

  private readonly cellSlots = contentChildren(PctCellTemplate);
  private readonly headerSlots = contentChildren(PctHeaderCellTemplate);
  protected readonly emptySlot = contentChild(PctEmptyTemplate);
  private readonly table = viewChild.required(PctTable);
  private readonly tableElement = viewChild.required(PctTable, {
    read: ElementRef,
  });
  private readonly scrolledTo = signal(0);
  private readonly seen = signal<PctTableVisible>({
    start: 0,
    end: 0,
    rows: [],
  });
  private readonly frame = viewChild.required(PctTableFrame, {
    read: ElementRef,
  });

  private readonly resolvedLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly collator = computed(
    () =>
      new Intl.Collator(this.resolvedLocale(), {
        numeric: true,
        sensitivity: 'base',
      }),
  );

  /**
   * One writer per column, made when the columns, the locale or the words change: a formatter
   * costs far more to make than to call.
   */
  private readonly writers = computed(() => {
    const locale = this.resolvedLocale();
    const words = { yes: this.texts().tableYes, no: this.texts().tableNo };
    return new Map<string, Writer>(
      this.columns().map((column) => [
        column.id,
        writerOf(column.kind, locale, words),
      ]),
    );
  });

  /** The instant a relative column counts from, read with the rows it writes. */
  private moment(): PctInstant {
    return this.now() ?? Date.now();
  }

  /**
   * Every row's values, one per column, read once when the rows or the columns change: the
   * filter, the order of the body and the flash read the same values, and a locale or a clock
   * that changes the texts reads none of them again.
   */
  private readonly values = computed(() => {
    const columns = this.columns();
    const map = new Map<T, readonly unknown[]>();
    for (const row of this.rows())
      map.set(
        row,
        columns.map((column) => column.value(row)),
      );
    return map;
  });

  /**
   * Every row's texts, written once when the values, the words or the moment change: the
   * filter searches the texts the body draws, not a second writing of them.
   */
  private readonly written = computed(() => {
    const writers = this.writers();
    const now = this.moment();
    const write = this.columns().map(
      (column) => writers.get(column.id) as Writer,
    );
    const map = new Map<T, readonly string[]>();
    for (const [row, values] of this.values())
      map.set(
        row,
        values.map((value, c) => write[c](value, now)),
      );
    return map;
  });

  private readonly filtered = computed(() => {
    const rows = this.rows();
    if (!this.clientFilter()) return rows;
    const question = this.filter();
    const own = this.filterWith();
    if (own) return rows.filter((row) => own(row, question));
    const words = pctQuestionWords(question);
    const columns = this.columns();
    const written = this.written();
    const place = new Map(columns.map((column, c) => [column, c]));
    const text = (column: PctAnyColumn<T>, row: T) =>
      (written.get(row) as readonly string[])[place.get(column) as number];
    return rows.filter((row) => pctMatches(row, columns, text, words));
  });

  /**
   * The words to mark: the quick filter's, where the table's own filter decided, or `null`
   * where there is nothing to mark — then no cell's text is cut at all.
   */
  private readonly marked = computed(() => {
    if (!this.highlightMatches() || !this.clientFilter() || this.filterWith())
      return null;
    const words = pctQuestionWords(this.filter());
    return words.length > 0 ? words : null;
  });

  /**
   * How many rows the filter let through: the application writes `12 of 900` from this and
   * the length of its own rows.
   *
   * @since next
   */
  readonly matched = computed(() => this.filtered().length);

  private readonly ordered = computed(() => {
    const rows = this.filtered();
    if (!this.clientSort()) return rows;
    const columns = new Map<string, PctAnyColumn<T>>(
      this.columns().map((column) => [column.id, column]),
    );
    const keys = this.sort().flatMap(({ key, direction }) => {
      const column = columns.get(key);
      return column ? [{ column, direction }] : [];
    });
    return pctOrderRows(rows, keys, this.collator());
  });

  /**
   * What the table draws, in order: the application's data, so a list of the rows in view or
   * a count of them is read from here rather than from the DOM.
   *
   * @since next
   */
  readonly lines = computed<readonly PctTableLine<T>[]>(() => {
    const id = this.rowId();
    const lines = pctLines(this.ordered(), id);
    if (isDevMode()) this.warnOnTwins(lines);
    return lines;
  });

  private warnedTwins = false;

  /** Two rows with one id are one row to `@for`, and that is a bug in the rows, said once. */
  private warnOnTwins(lines: readonly PctTableLine<T>[]): void {
    if (this.warnedTwins) return;
    const seen = new Set<unknown>();
    for (const line of lines) {
      if (!seen.has(line.key)) {
        seen.add(line.key);
        continue;
      }
      this.warnedTwins = true;
      console.warn(
        `[pct-data-table] Two rows share the id ${JSON.stringify(line.key)}: rowId must name ` +
          `each row once, or the table cannot tell them apart.`,
      );
      return;
    }
  }

  private readonly cellTemplates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const slot of this.cellSlots()) {
      slot.read();
      const ids = slot.pctCellOf();
      for (const id of typeof ids === 'string' ? [ids] : ids)
        if (!map.has(id)) map.set(id, slot.template as TemplateRef<unknown>);
    }
    return map;
  });

  private readonly headerTemplates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const slot of this.headerSlots()) {
      slot.read();
      const ids = slot.pctHeaderCellOf();
      for (const id of typeof ids === 'string' ? [ids] : ids)
        if (!map.has(id)) map.set(id, slot.template as TemplateRef<unknown>);
    }
    return map;
  });

  /** The header row: each column with its sort state and its template. */
  protected readonly heads = computed(() => {
    const sort = this.sort();
    const templates = this.headerTemplates();
    return this.columns().map((column) => {
      const position = sort.findIndex((key) => key.key === column.id);
      const later = position > 0 ? sort[position] : null;
      return {
        column,
        sortKey: column.sort === false ? null : column.id,
        numeric: pctColumnNumeric(column),
        direction: position < 0 ? null : sort[position].direction,
        // The first key is `aria-sort`; the rest carry their place and way to the eye, and to a
        // reader as the description of the header's button.
        place: later ? position + 1 : null,
        arrow: later?.direction === 'descending' ? '▼' : '▲',
        said: later
          ? `${this.texts().tableSortKey} ${position + 1}, ${
              later.direction === 'descending'
                ? this.texts().tableSortDescending
                : this.texts().tableSortAscending
            }`
          : '',
        slot: templates.get(column.id) ?? null,
      };
    });
  });

  /** The body: each row line with its cells written. */
  protected readonly body = computed<readonly Row<T>[]>(() => {
    const cache = this.values();
    const written = this.written();
    const templates = this.cellTemplates();
    const words = this.marked();
    const rowTone = this.rowTone();
    // The engine's view of the columns: a tone takes the value it is handed, of any type.
    const columns: readonly PctAnyColumn<T>[] = this.columns();
    const cells = columns.map((column) => {
      const slot = templates.get(column.id) ?? null;
      const boolean = column.kind === 'boolean';
      const filter = column.filter;
      return {
        column,
        numeric: pctColumnNumeric(column),
        boolean,
        slot,
        // A word is marked only in the text it was found in: a column the filter reads by its
        // text. A template or a check mark draws in its place, and the template reads which
        // first.
        marking:
          words !== null && filter !== false && typeof filter !== 'function',
      };
    });
    // The base draws rows and nothing else: details, groups and holes are lines that the
    // features contributing them draw.
    return (
      this.lines() as readonly Extract<PctTableLine<T>, { kind: 'row' }>[]
    ).map((line) => {
      const values = cache.get(line.row) as readonly unknown[];
      const texts = written.get(line.row) as readonly string[];
      return {
        key: pctLineKey(line),
        row: line.row,
        index: line.index,
        id: line.key,
        tone: rowTone?.(line.row) ?? null,
        values,
        cells: cells.map(({ column, numeric, boolean, slot, marking }, c) => {
          const value = values[c];
          const text = texts[c];
          const yes = boolean && typeof value === 'boolean' ? value : null;
          const parts = marking
            ? pctMatchParts(text, words as readonly string[])
            : null;
          const tooltip = column.tooltip;
          return {
            column,
            value,
            text,
            numeric,
            yes,
            slot,
            parts,
            tone: column.tone?.(value, line.row) ?? null,
            title: typeof tooltip === 'function' ? tooltip(line.row) : null,
            clip: tooltip === true && slot === null && yes === null,
          };
        }),
      };
    });
  });

  protected readonly primary = computed(() => this.sort()[0] ?? null);

  protected readonly placeholders = computed(() =>
    this.loading() && this.rows().length === 0 ? PLACEHOLDER_ROWS : [],
  );

  /**
   * The sentence beside an empty table: still loading, nothing there, or nothing answering
   * the question — three facts, three sentences, as the select says them.
   */
  private readonly emptiness = computed(() => {
    if (this.lines().length > 0) return null;
    if (this.loading()) return 'loading';
    return pctQuestionWords(this.filter()).length > 0 || this.rows().length > 0
      ? 'no-matches'
      : 'empty';
  });

  protected readonly message = computed(() => {
    const emptiness = this.emptiness();
    if (emptiness === 'loading') return this.texts().tableLoading;
    if (emptiness === 'no-matches') return this.texts().tableNoMatches;
    return emptiness === 'empty' ? this.texts().tableEmpty : '';
  });

  /**
   * How far the frame is scrolled, in pixels: written by the frame's own listener, so a
   * scroll does not run change detection on every frame of it.
   *
   * @since next
   */
  readonly scrolled = this.scrolledTo.asReadonly();

  /**
   * The lines in the view, and the ids of their rows: what an application loads more data for,
   * or writes `rows 120–160 of 900` from. Read by an `IntersectionObserver`, so it is empty
   * until the browser has laid the table out, and under SSR.
   *
   * @since next
   */
  readonly visible = this.seen.asReadonly();

  private readonly pending = signal<{
    readonly id: PctRowId;
    readonly align: PctScrollAlign;
  } | null>(null);

  constructor() {
    // A filter that emptied the table is answered aloud, as the select answers it; a table
    // with no rows, or rows still coming, is the page's to describe, not a change to announce.
    let announced = '';
    const say = (message: string): void => {
      this.announcer.retract(announced);
      this.announcer.announce(message);
      announced = message;
    };
    effect(() =>
      say(this.emptiness() === 'no-matches' ? this.texts().tableNoMatches : ''),
    );
    // An empty template is read whenever it stands, so a dev build does not call it an orphan.
    effect(() => this.emptySlot()?.read());
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => say(''));

    effect(() => {
      const unnamed = this.caption() === '' && this.ariaLabelledby() === '';
      if (unnamed && isDevMode()) this.warnOnNoName();
    });
    effect(() => {
      const columns = this.columns();
      if (isDevMode()) this.warnOnTwinColumns(columns);
    });

    // The header's height, kept clear at the frame's top, so a row scrolled to stands below a
    // sticky header rather than under it.
    afterRenderEffect(() => {
      const sticky = this.stickyHeader();
      const frame = this.frame().nativeElement as HTMLElement;
      const head = this.ownTable().tHead as HTMLElement;
      frame.style.scrollPaddingBlockStart = sticky
        ? `${head.getBoundingClientRect().height}px`
        : '';
    });

    afterNextRender(() => {
      const frame = this.frame().nativeElement as HTMLElement;
      // The press's Shift, read where the press starts: a listener of the header row's own,
      // since the row is no control and its template carries no handler. The row is this
      // component's element and goes with it, listeners and all.
      const table = this.ownTable();
      const head = table.tHead as HTMLElement;
      const onKey = (event: KeyboardEvent) => this.noteKey(event);
      const onPointer = (event: MouseEvent) => this.notePointer(event);
      head.addEventListener('keydown', onKey);
      // `mousedown` and not `pointerdown`: both carry Shift from a real pointer, and only the
      // first carries it from the CDK's harness, which sends `pointerdown` bare.
      head.addEventListener('mousedown', onPointer);
      const onScroll = () => this.scrolledTo.set(frame.scrollTop);
      frame.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => frame.removeEventListener('scroll', onScroll));
      // A cut cell's tooltip, written when the pointer comes to it and taken off when it goes:
      // whether the text is cut is known only once it is laid out, and measuring every cell on
      // every render to learn it would cost far more than measuring the one under the pointer.
      // The body is this component's element too.
      const body = table.tBodies[0];
      body.addEventListener('pointerover', (event) => this.noteCut(event));
      body.addEventListener('pointerout', (event) => this.leaveCut(event));
      body.addEventListener('animationend', (event) =>
        (event.target as HTMLElement).removeAttribute('data-pct-changed'),
      );
    });

    this.watchVisible(destroyRef);
    this.watchChanges();

    afterRenderEffect(() => {
      const target = this.pending();
      if (target === null) return;
      const index = this.body().findIndex((row) => row.id === target.id);
      // A row not in the lines yet is waited for: the call made before the rows arrived is
      // carried out by the render that brings them.
      if (index < 0) return;
      this.ownTable().tBodies[0].rows[index].scrollIntoView({
        block: target.align,
      });
      untracked(() => this.pending.set(null));
    });
  }

  private warnedName = false;

  private warnedColumns = false;

  /** Two columns with one id are one column to every lookup by id: said once. */
  private warnOnTwinColumns(columns: readonly PctAnyColumn<T>[]): void {
    if (this.warnedColumns) return;
    const twin = columns.find(
      (column, c) => columns.findIndex((other) => other.id === column.id) !== c,
    );
    if (!twin) return;
    this.warnedColumns = true;
    console.warn(
      `[pct-data-table] Two columns share the id ${JSON.stringify(twin.id)}: a cell ` +
        `template, the sort and the filter name a column by its id, so each needs its own.`,
    );
  }

  /** The `<table>` this component draws: its own, not one a cell template nests in it. */
  private ownTable(): HTMLTableElement {
    return this.tableElement().nativeElement as HTMLTableElement;
  }

  /** The cell whose tooltip the pointer wrote, so the tooltip leaves with the pointer. */
  private titled: Element | null = null;

  /** Writes the tooltip of the cut cell under the pointer, and none on one that is not cut. */
  private noteCut(event: Event): void {
    const cell = (event.target as Element).closest('td[data-pct-tooltip]');
    if (!cell || cell === this.titled) return;
    const clip = cell.firstElementChild as HTMLElement;
    if (clip.scrollWidth <= clip.clientWidth) return;
    cell.setAttribute('title', clip.textContent as string);
    this.titled = cell;
  }

  /**
   * Takes the tooltip off when the pointer leaves its cell, so a text that changed or a column
   * that stopped cutting never keeps an old one.
   */
  private leaveCut(event: PointerEvent): void {
    const cell = this.titled;
    if (!cell || cell.contains(event.relatedTarget as Node | null)) return;
    cell.removeAttribute('title');
    this.titled = null;
  }

  /**
   * Flashes the cells whose values changed since the last render. A row is followed by its key
   * and a cell by its column's place, so a row that moved is compared with itself; a row that
   * was not there before, and every row when the columns change, has nothing to differ from.
   */
  private watchChanges(): void {
    let ids: readonly string[] | null = null;
    let before = new Map<string, readonly unknown[]>();
    afterRenderEffect(() => {
      const body = this.body();
      const columns = this.columns().map((column) => column.id);
      // Columns that changed are new columns, and the old values say nothing about them; a
      // column taken off the end leaves the rest where they were.
      const same =
        ids !== null && columns.every((id, c) => id === (ids as string[])[c]);
      ids = columns;
      if (!this.highlightChanges()) {
        before = new Map();
        return;
      }
      if (!same) before = new Map();
      const offset = this.rowNumbers() ? 1 : 0;
      const rows = this.ownTable().tBodies[0].rows;
      const now = new Map<string, readonly unknown[]>();
      const changed: Element[] = [];
      body.forEach((row, index) => {
        const was = before.get(row.key);
        now.set(row.key, row.values);
        if (!was) return;
        row.values.forEach((value, c) => {
          if (!sameValue(was[c], value))
            changed.push(rows[index].cells[c + offset]);
        });
      });
      before = now;
      if (changed.length === 0) return;
      // Taken off, laid out once, and put back, so a cell that changes again while it still
      // flashes starts its flash again rather than finishing the first — and a poll that moved
      // five hundred values lays the table out once, not five hundred times.
      for (const cell of changed) cell.removeAttribute('data-pct-changed');
      this.ownTable().getBoundingClientRect();
      for (const cell of changed) cell.setAttribute('data-pct-changed', '');
    });
  }

  private warnOnNoName(): void {
    if (this.warnedName) return;
    this.warnedName = true;
    console.warn(
      `[pct-data-table] The table has no name: give it a caption, or the id of the element ` +
        `that names it in ariaLabelledby.`,
    );
  }

  /** Follows the rows in the view, re-observed whenever the rows drawn change. */
  private watchVisible(destroyRef: DestroyRef): void {
    let observer: IntersectionObserver | null = null;
    destroyRef.onDestroy(() => observer?.disconnect());
    afterRenderEffect(() => {
      const body = this.body();
      if (typeof IntersectionObserver === 'undefined') return;
      observer?.disconnect();
      // A list with no rows has none in view, and an observer of nothing never says so.
      if (body.length === 0) {
        untracked(() => this.seen.set({ start: 0, end: 0, rows: [] }));
        observer = null;
        return;
      }
      // Each observer counts its own rows against its own body, so a report an old one had
      // queued before it was let go writes nothing into the new one's count.
      const inView = new Set<number>();
      const current = new IntersectionObserver((entries) => {
        if (current !== observer) return;
        for (const entry of entries) {
          const index = Number(
            (entry.target as HTMLElement).dataset['pctIndex'],
          );
          if (entry.isIntersecting) inView.add(index);
          else inView.delete(index);
        }
        const indices = [...inView].sort((a, b) => a - b);
        this.seen.set({
          start: indices[0] ?? 0,
          end: indices.length === 0 ? 0 : (indices.at(-1) as number) + 1,
          rows: indices.map((index) => body[index].id),
        });
      });
      observer = current;
      // With a row to draw there is no placeholder: every row of the body is a row of data.
      for (const row of Array.from(this.ownTable().tBodies[0].rows))
        current.observe(row);
    });
  }

  /**
   * Scrolls the row with `id` into view, once it is drawn: called before the rows arrive, it
   * waits for them, so a position is restored by naming the row right after binding the rows.
   * A sticky header is not drawn over it: the frame keeps the header's height clear.
   *
   * @since next
   */
  scrollTo(id: PctRowId, options: PctScrollToOptions = {}): void {
    this.pending.set({ id, align: options.align ?? 'nearest' });
  }

  /**
   * Shows the row with `id`: opens what hides it and scrolls it into view. With nothing that
   * can hide a row yet, it is `scrollTo`.
   *
   * @since next
   */
  reveal(id: PctRowId): void {
    this.scrollTo(id);
  }

  /** The shift key's state at the press that is about to write `sort`. */
  private shift = false;

  /** A press by the pointer: its Shift is the press's. */
  private notePointer(event: MouseEvent): void {
    this.shift = event.shiftKey;
  }

  /**
   * A press by a key: only Enter and Space press a button, so Shift+Tab between the headers
   * says nothing about the press that may follow without a key of its own — a screen reader's
   * browse-mode Enter.
   */
  private noteKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') this.shift = event.shiftKey;
  }

  /**
   * The first layer's header proposes one key; the order is a list, so the proposal is read
   * as "this column was pressed" and the list is written from it.
   */
  protected pressed(proposal: PctTableSort | null): void {
    // The first layer's model echoes what this method writes back into it.
    if (proposal === this.primary()) return;
    const shift = this.shift;
    this.shift = false;
    const list = this.sort();
    const key = (proposal as PctTableSort).key as keyof M & string;
    const at = list.findIndex((entry) => entry.key === key);
    const current = at < 0 ? null : list[at];
    const remove =
      current !== null &&
      current.direction === 'descending' &&
      this.unsortable();
    const entry: PctTableSort<keyof M & string> = {
      key,
      direction:
        current?.direction === 'ascending' ? 'descending' : 'ascending',
    };
    // Without Shift the first key turns, or goes; any other column becomes the only key,
    // ascending, as its hint promised.
    const next = !shift
      ? at !== 0
        ? [{ key, direction: 'ascending' as const }]
        : remove
          ? []
          : [entry]
      : remove
        ? list.filter((_, i) => i !== at)
        : at < 0
          ? [...list, entry]
          : list.map((other, i) => (i === at ? entry : other));
    this.sort.set(next);
    this.table().sort.set(next[0] ?? null);
  }
}
