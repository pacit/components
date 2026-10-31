import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
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
  type Signal,
  type TemplateRef,
  type Type,
  type WritableSignal,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  PctAnnouncer,
  type PctInstant,
  pctQuantityFormat,
  pctRelativeFormat,
  type PctTone,
} from '@pacit/components/core';
import { PctButton } from '@pacit/components/button';
import { PctIcon } from '@pacit/components/icon';
import { PctSkeleton } from '@pacit/components/skeleton';
import {
  PctCellTemplate,
  type PctDetailsContext,
  PctDetailsTemplate,
  PctEmptyTemplate,
  PctHeaderCellTemplate,
} from './data-table-slots';
import {
  type PctAnyCellKind,
  type PctAnyColumn,
  pctColumnNumeric,
  type PctColumns,
  pctHideOrder,
  type PctRowId,
} from './model/columns';
import { pctAggregate } from './model/aggregate';
import { pctFit } from './model/fit';
import {
  pctGroupKey,
  pctLineKey,
  pctLines,
  type PctTableLine,
} from './model/lines';
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

/**
 * What a directive on the table adds to it, given once from its constructor: a hard list, one
 * field per feature, so the table's own directives grow it and nothing else does
 * ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 *
 * @since next
 */
export interface PctTableFeature {
  /** The rows' details: which are open, held by the application, and whether any opens. */
  readonly details?: {
    readonly open: WritableSignal<readonly PctRowId[]>;
    readonly disabled: Signal<boolean>;
  };
  /** The groups: the columns the rows are grouped by, the groups collapsed, and whether on. */
  readonly groups?: {
    readonly by: Signal<readonly string[]>;
    readonly collapsed: WritableSignal<readonly string[]>;
    readonly disabled: Signal<boolean>;
  };
  /**
   * The rows picked: the component the table makes for them, out of the paint, and what it
   * draws in the table's places — the header of its column, a row's control, the line under
   * the table — and what the table paints by. The table makes the component in its own view,
   * so a server's rendering of its templates is the one the browser takes over.
   */
  readonly selection?: {
    readonly parts: Type<unknown>;
    readonly head: Signal<TemplateRef<unknown>>;
    readonly cell: Signal<TemplateRef<unknown>>;
    readonly below: Signal<TemplateRef<unknown>>;
    readonly picked: Signal<ReadonlySet<PctRowId>>;
    readonly describedBy: Signal<string | null>;
  };
  /**
   * The window: the lines drawn, `[start, end)`, never a row without its details nor details
   * without their row; the space of the lines above and below them, in pixels; and the scroll
   * that brings a line into the view, which the table calls for a row it has not drawn.
   */
  readonly window?: {
    readonly range: Signal<{ readonly start: number; readonly end: number }>;
    readonly lead: Signal<number>;
    readonly tail: Signal<number>;
    readonly reach: (line: number, align: PctScrollAlign) => void;
  };
  /** The rows given are a page of more: how many stand before it, and how many in all. */
  readonly page?: {
    readonly offset: Signal<number>;
    readonly total: Signal<number>;
  };
  /**
   * The rows come from a remote source, a block at a time: every row of the source, `undefined`
   * where its block has not come, which the table draws as a hole; whether a block is in
   * flight; the failed block a hole stands in, `null` while its block loads; and the retry of
   * one. The source has sorted and filtered them.
   */
  readonly remote?: {
    readonly rows: Signal<readonly unknown[]>;
    readonly loading: Signal<boolean>;
    readonly failed: Signal<(index: number) => number | null>;
    readonly retry: (block: number) => void;
  };
}

/** What a group's heading or the table's foot sums up: a label's span and the columns' sums. */
interface Summary {
  /** The cells the label spans: the leading ones and the first column's. */
  readonly span: number;
  /** The first column's sum, written beside the label. */
  readonly first: string;
  /** The other columns' sums, one cell each. */
  readonly cells: readonly {
    readonly text: string;
    readonly numeric: boolean;
  }[];
}

/** A group's heading. */
interface Heading extends Summary {
  readonly key: string;
  readonly line: number;
  readonly level: number;
  readonly label: string;
  readonly countText: string;
  /** The heading's name for a reader, naming the group it stands in; `null` at the top. */
  readonly name: string | null;
  readonly collapsed: boolean;
}

/** A body of the table: a group's heading and the rows below it, or the rows of no group. */
interface Section<T> {
  readonly key: string;
  readonly group: Heading | null;
  readonly rows: (Row<T> | Hole)[];
}

/** A row a remote source has not delivered: loading, or of a block that failed. */
interface Hole {
  readonly kind: 'hole';
  readonly key: string;
  readonly index: number;
  readonly line: number;
  /** The failed block the hole stands in, or `null` while its block loads. */
  readonly failed: number | null;
  /** The first hole drawn of its failed block, which says so and offers the retry. */
  readonly first: boolean;
}

/** How much wider than where it hid a column the frame grows before the column comes back. */
const HYSTERESIS = 8;

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
  readonly kind: 'row';
  readonly key: string;
  readonly row: T;
  readonly index: number;
  readonly id: PctRowId;
  /** The row's position among the lines drawn: its details, when open, are the next one. */
  readonly line: number;
  /** How deep the row stands: in its groups, and in a tree. */
  readonly level: number;
  readonly tone: PctTone | null;
  /** The row's values, one per column: the array the cache holds, kept while the row is. */
  readonly values: readonly unknown[];
  /** The cells of the columns shown. */
  readonly cells: readonly Cell<T>[];
  /** The cells of the columns a narrow table hid, listed in the row's details. */
  readonly hidden: readonly Cell<T>[];
  /** Those columns, as the details template is handed them. */
  readonly hiddenColumns: PctDetailsContext<
    unknown,
    Record<string, unknown>
  >['hidden'];
  /** The row's details are open below it. */
  readonly open: boolean;
  /** The id of the row's details, which its disclosure controls. */
  readonly detailsId: string;
  /** The id of the row's first cell of text, which names its checkbox. */
  readonly nameId: string;
  /** Which of the cells shown is that one: the first with no template or check mark, or the first. */
  readonly nameAt: number;
  /** The row is picked. */
  readonly selected: boolean;
}

/**
 * `read`, asked once for each row and answered from then on with what it gave. Asked outside
 * the reactive context: the first to ask for a row would otherwise be the only one to depend
 * on what `read` reads, so what depends on the answers names its signals itself.
 */
function kept<T, V>(read: (row: T) => V): (row: T) => V {
  const answers = new Map<T, V>();
  return (row) => {
    if (answers.has(row)) return answers.get(row) as V;
    const answer = untracked(() => read(row));
    answers.set(row, answer);
    return answer;
  };
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
    NgComponentOutlet,
    NgTemplateOutlet,
    PctButton,
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
   * The table's name in words, for a table with no caption and no element on the page to name
   * it. It names the frame too when the frame scrolls.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

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
  // The table's own: a data table nested in a cell template brings templates of its own.
  protected readonly detailsSlot = contentChild(PctDetailsTemplate, {
    descendants: false,
  });
  private readonly headerSlots = contentChildren(PctHeaderCellTemplate);
  protected readonly emptySlot = contentChild(PctEmptyTemplate, {
    descendants: false,
  });
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

  /** What the table's directive added: the details directive is the one there is yet. */
  private readonly contributed = signal<PctTableFeature>({});

  /** The open details when no directive holds them: a narrow table opens rows on its own. */
  private readonly ownDetails = signal<readonly PctRowId[]>([]);

  private readonly openDetails = computed(
    () => this.contributed().details?.open ?? this.ownDetails,
  );

  private readonly detailsOff = computed(
    () => this.contributed().details?.disabled() ?? false,
  );

  /** The prefix of every details row's id. */
  private readonly uid = nextPctId('pct-data-table');

  /** The selection directive's state, while there is one. */
  protected readonly selection = computed(
    () => this.contributed().selection ?? null,
  );

  /** The ids picked, to look up. */
  private readonly picked = computed(
    () => this.selection()?.picked() ?? new Set<PctRowId>(),
  );

  /**
   * The columns that may give way, in order. None while the details are disabled: a hidden
   * column's value would then be in no row at all, and a frame that scrolls keeps it reachable.
   */
  private readonly hideOrder = computed(() =>
    this.detailsOff() ? [] : pctHideOrder(this.columns()),
  );

  /** How many columns of the hide order the frame has no room for. */
  private readonly hiddenCount = signal(0);

  /** A new value at each resize of the frame or the table, so each renders the fit again. */
  private readonly resized = signal<object>({});

  /**
   * Where the focus last stood in the table's body: its element, its line, and the row or the
   * group that line was, so the focus can be handed on when its element goes.
   */
  private focusAt: {
    readonly element: Element;
    readonly line: number;
    readonly row: PctRowId | null;
  } | null = null;

  /** A number for each row, made once and kept while the table lives: its ids are made of it. */
  private readonly lineIds = new Map<string, number>();

  /**
   * The columns a narrow table hid, by id, in the order it hid them: the application writes
   * `2 columns in the details` from this. Their values stand in each row's details.
   *
   * @since next
   */
  readonly hiddenColumns = computed(
    () =>
      this.hideOrder().slice(0, this.hiddenCount()) as readonly (keyof M &
        string)[],
  );

  /** Rows open: on a table that hid a column or has a details template, unless disabled. */
  protected readonly disclosure = computed(
    () =>
      !this.detailsOff() &&
      (this.hiddenColumns().length > 0 || this.detailsSlot() !== undefined),
  );

  /** The cells a details row spans: every column shown, and the leading ones. */
  protected readonly span = computed(
    () => this.columns().length - this.hiddenColumns().length + this.lead(),
  );

  /** The cells before a row's data: its checkbox, its disclosure and its number. */
  private readonly lead = computed(
    () =>
      (this.selection() ? 1 : 0) +
      (this.disclosure() ? 1 : 0) +
      (this.rowNumbers() ? 1 : 0),
  );

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
   * A row's values, one per column, read the first time something asks and kept while the
   * rows and the columns stay: the filter, the order of the body and the flash read the same
   * values, and a locale or a clock that changes the texts reads none of them again. Read when
   * asked, so a window over a million rows that nothing filters reads the rows it draws.
   */
  private readonly values = computed(() => {
    const columns = this.columns();
    // A new list is new rows: what the old one read is not kept for it.
    this.given();
    return kept((row: T) => columns.map((column) => column.value(row)));
  });

  /**
   * A row's texts, written the first time something asks and kept while the values, the words
   * and the moment stay: the filter searches the texts the body draws, not a second writing of
   * them.
   */
  private readonly written = computed(() => {
    const writers = this.writers();
    const now = this.moment();
    const write = this.columns().map(
      (column) => writers.get(column.id) as Writer,
    );
    const values = this.values();
    return kept((row: T) =>
      values(row).map((value, c) => write[c](value, now)),
    );
  });

  /** The rows to draw: the application's, or a remote source's, holes and all. */
  private readonly given = computed(
    () =>
      (this.remote()?.rows() as readonly (T | undefined)[] | undefined) ??
      this.rows(),
  );

  /** The remote source the rows come from, while a directive gives one. */
  private readonly remote = computed(() => this.contributed().remote ?? null);

  /** Rows are coming: the application says so, or a remote source has a block in flight. */
  protected readonly busy = computed(
    () => this.loading() || (this.remote()?.loading() ?? false),
  );

  private readonly filtered = computed(() => {
    const remote = this.remote();
    // A remote source filtered its rows itself: those it delivered are what matched.
    if (remote)
      return (remote.rows() as readonly (T | undefined)[]).filter(
        (row): row is T => row !== undefined,
      );
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
      written(row)[place.get(column) as number];
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
   * the length of its own rows. From a remote source, every row it counts.
   *
   * @since next
   */
  readonly matched = computed(() =>
    this.remote() ? this.given().length : this.filtered().length,
  );

  /**
   * The ids of the rows the filter let through, in the rows' order: what a selection's
   * `selectAll` picks. From a remote source, those of the rows it has delivered.
   *
   * @since next
   */
  readonly matchedIds = computed(() => {
    const id = this.rowId();
    return this.filtered().map((row) => id(row));
  });

  private readonly ordered = computed(() => {
    const rows = this.filtered();
    if (!this.clientSort() || this.remote()) return rows;
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
    const remote = this.remote();
    const rows = remote ? this.given() : this.ordered();
    const lines = pctLines(rows, id, {
      details: this.disclosure() ? new Set(this.openDetails()()) : undefined,
      groups: this.grouping(),
      collapsed: new Set(this.contributed().groups?.collapsed()),
    });
    if (isDevMode()) this.warnOnTwins(lines);
    return lines;
  });

  /**
   * The levels the rows are grouped by: the groups directive's columns, while it is on. A
   * group is headed by the text its column writes for the group's first row.
   */
  private readonly grouping = computed(() => {
    const groups = this.contributed().groups;
    if (!groups || groups.disabled()) return [];
    // A remote source's groups are the source's to make, and it makes none yet: its rows stay
    // in the order it gave them.
    if (this.remote()) {
      if (isDevMode()) this.warnOnRemoteGroups();
      return [];
    }
    const columns: readonly PctAnyColumn<T>[] = this.columns();
    const values = this.values();
    const written = this.written();
    const empty = this.texts().tableGroupEmpty;
    return groups.by().flatMap((id) => {
      const c = columns.findIndex((column) => column.id === id);
      return c < 0
        ? []
        : [
            {
              value: (row: T) => values(row)[c],
              // A group of no value is named all the same: its button needs a name.
              label: (row: T) => written(row)[c] || empty,
            },
          ];
    });
  });

  /** The columns shown, each with its place among all the columns. */
  private readonly shown = computed(() => {
    const hidden = new Set<string>(this.hiddenColumns());
    return (this.columns() as readonly PctAnyColumn<T>[])
      .map((column, c) => ({ column, c }))
      .filter(({ column }) => !hidden.has(column.id));
  });

  /** How a set of rows is summed up under the columns shown. */
  private readonly summarize = computed(() => {
    const writers = this.writers();
    const now = this.moment();
    const values = this.values();
    const count = new Intl.NumberFormat(this.resolvedLocale());
    const shown = this.shown();
    const span = this.lead() + 1;
    const sum = (rows: readonly T[], column: PctAnyColumn<T>, c: number) => {
      const aggregate = column.aggregate;
      if (aggregate === undefined) return '';
      const result = pctAggregate(
        rows.map((row) => values(row)[c]),
        aggregate,
      );
      // No result is written as nothing by every kind.
      // A count is a count whatever the column holds, and a number summed from a column with
      // no number kind is written in the locale's digits, not as JavaScript prints it.
      return aggregate === 'count' ||
        (typeof result === 'number' && typeof column.kind !== 'object')
        ? count.format(result as number)
        : (writers.get(column.id) as Writer)(result, now);
    };
    return (rows: readonly T[]): Summary => {
      const [first, ...rest] = shown;
      return {
        span,
        first: first ? sum(rows, first.column, first.c) : '',
        cells: rest.map(({ column, c }) => ({
          text: sum(rows, column, c),
          numeric: pctColumnNumeric(column),
        })),
      };
    };
  });

  /**
   * Every group's heading, by its line, and for each line the line of the heading whose body
   * it stands in, or -1: written when the lines change, so a window that moves reads them and
   * walks only the lines it draws.
   */
  private readonly outline = computed(() => {
    const lines = this.lines();
    const summarize = this.summarize();
    const count = new Intl.NumberFormat(this.resolvedLocale());
    const said = this.texts().tableGroupCount;
    const within = this.texts().tableGroupWithin;
    const labels = new Map<number, string>();
    const headings = new Map<number, Heading>();
    const owner = new Int32Array(lines.length);
    let current = -1;
    for (let at = 0; at < lines.length; at++) {
      const line = lines[at];
      if (line.kind === 'group') {
        current = at;
        labels.set(line.level, line.label);
        const countText = said.replace('{count}', count.format(line.count));
        headings.set(at, {
          ...summarize(line.rows),
          key: line.key,
          line: at,
          level: line.level,
          label: line.label,
          countText,
          name:
            line.level === 0
              ? null
              : within
                  .replace('{group}', `${line.label} ${countText}`)
                  .replace('{outer}', labels.get(line.level - 1) as string),
          collapsed: line.collapsed,
        });
      }
      owner[at] = current;
    }
    return { headings, owner };
  });

  /**
   * The body in its bodies: a section per group heading, with the rows it heads. A body whose
   * heading the window has not drawn keeps the heading's key, so it stays the element it was.
   */
  protected readonly sections = computed(() => {
    const rows = new Map(this.body().map((row) => [row.line, row]));
    const lines = this.lines();
    const { headings, owner } = this.outline();
    const { start, end } = this.drawn();
    const failed = this.remote()?.failed();
    const sections: Section<T>[] = [];
    let current: Section<T> | null = null;
    let before: number | null = null;
    for (let at = start; at < end; at++) {
      const heading = headings.get(at);
      if (heading !== undefined) {
        current = { key: pctLineKey(lines[at]), group: heading, rows: [] };
        sections.push(current);
        continue;
      }
      const line = lines[at];
      let row: Row<T> | Hole | undefined;
      if (line.kind === 'hole') {
        // Only a remote source writes a hole, and it says which have failed.
        const block = (failed as (index: number) => number | null)(line.index);
        row = {
          kind: 'hole',
          key: pctLineKey(line),
          index: line.index,
          line: at,
          failed: block,
          first: block !== null && block !== before,
        };
        before = block;
      } else {
        row = rows.get(at);
        before = null;
      }
      // A row's details are drawn with the row.
      if (row === undefined) continue;
      if (current === null) {
        const head = owner[at];
        current = {
          key: head < 0 ? 'rows' : pctLineKey(lines[head]),
          group: null,
          rows: [],
        };
        sections.push(current);
      }
      current.rows.push(row);
    }
    return sections;
  });

  /**
   * The table's foot: every row in view summed up, when a column shown sums at all. The rows
   * the filter left, not all the application holds: the foot sums what the table shows.
   */
  protected readonly totals = computed(() =>
    // A remote source's sums are the source's to give: the rows here are only those it sent.
    this.remote() === null &&
    this.ordered().length > 0 &&
    this.shown().some(({ column }) => column.aggregate !== undefined)
      ? this.summarize()(this.ordered() as readonly T[])
      : null,
  );

  /** Collapses a group, or opens it. */
  protected toggleGroup(key: string): void {
    // Only a heading calls this, and headings stand only while the groups do.
    (
      this.contributed().groups as NonNullable<PctTableFeature['groups']>
    ).collapsed.update((collapsed) =>
      collapsed.includes(key)
        ? collapsed.filter((other) => other !== key)
        : [...collapsed, key],
    );
  }

  /**
   * Every group's key, those inside a collapsed group too: what the groups directive's
   * `collapseAll` collapses.
   *
   * @since next
   */
  groupKeys(): readonly string[] {
    return pctLines(this.ordered(), this.rowId(), {
      groups: this.grouping(),
    }).flatMap((line) => (line.kind === 'group' ? [line.key] : []));
  }

  private warnedTwins = false;

  /** Two rows with one id are one row to `@for`, and that is a bug in the rows, said once. */
  private warnOnTwins(lines: readonly PctTableLine<T>[]): void {
    if (this.warnedTwins) return;
    const seen = new Set<unknown>();
    for (const line of lines) {
      // A row's details carry the row's key; only rows can be twins.
      if (line.kind !== 'row') continue;
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
    const sentence = this.texts().tableSortLater;
    const templates = this.headerTemplates();
    const hidden = new Set<string>(this.hiddenColumns());
    return this.columns()
      .filter((column) => !hidden.has(column.id))
      .map((column) => {
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
            ? sentence
                .replace('{place}', String(position + 1))
                .replace(
                  '{way}',
                  later.direction === 'descending'
                    ? this.texts().tableSortDescending
                    : this.texts().tableSortAscending,
                )
            : '',
          slot: templates.get(column.id) ?? null,
        };
      });
  });

  /** The window, while the window directive draws one. */
  protected readonly window = computed(() => this.contributed().window ?? null);

  /** The lines drawn, `[start, end)`: the window's, or every line. */
  private readonly drawn = computed(
    () => {
      const count = this.lines().length;
      const range = this.window()?.range() ?? { start: 0, end: count };
      return {
        start: Math.min(range.start, count),
        end: Math.min(range.end, count),
      };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  /**
   * The number a reader is told a line stands at, from 1, the header's row first; and how many
   * there are, the foot's row too. Written only in a window or on a page, where the rows drawn
   * are not all the rows there are (0098).
   */
  protected readonly rowIndex = computed(() => {
    const page = this.contributed().page;
    if (page) {
      const offset = page.offset();
      return (line: number) => line + 2 + offset;
    }
    return this.window() ? (line: number) => line + 2 : () => null;
  });

  protected readonly rowCount = computed(() => {
    const page = this.contributed().page;
    const lines = this.lines();
    // A page's total counts rows: its details and headings are lines on top of them.
    const rows = page
      ? page.total() + lines.filter((line) => line.kind !== 'row').length
      : this.window()
        ? lines.length
        : null;
    return rows === null ? null : rows + 1 + (this.totals() === null ? 0 : 1);
  });

  /** The body: each row line drawn, with its cells written. */
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
    const hidden = new Set<string>(this.hiddenColumns());
    // The template's context is typed by the template's own list, which the table cannot name.
    const hiddenColumns = columns.filter((column) =>
      hidden.has(column.id),
    ) as unknown as Row<T>['hiddenColumns'];
    const lines = this.lines();
    const picked = this.picked();
    const { start, end } = this.drawn();
    // The base draws rows and their details: groups and holes are lines that the features
    // contributing them draw.
    type RowLine = Extract<PctTableLine<T>, { kind: 'row' }>;
    const drawn: { line: RowLine; at: number }[] = [];
    for (let at = start; at < end; at++) {
      const line = lines[at];
      if (line.kind === 'row') drawn.push({ line, at });
    }
    return drawn.map(({ line, at }): Row<T> => {
      const number = this.lineIdOf(pctLineKey(line));
      const values = cache(line.row);
      const texts = written(line.row);
      const all = cells.map(
        ({ column, numeric, boolean, slot, marking }, c) => {
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
        },
      );
      const shown = all.filter((cell) => !hidden.has(cell.column.id));
      return {
        kind: 'row',
        key: pctLineKey(line),
        row: line.row,
        index: line.index,
        id: line.key,
        line: at,
        level: line.level,
        tone: rowTone?.(line.row) ?? null,
        values,
        cells: shown,
        hidden: all.filter((cell) => hidden.has(cell.column.id)),
        hiddenColumns,
        open: lines[at + 1]?.kind === 'details',
        detailsId: `${this.uid}-details-${number}`,
        nameId: `${this.uid}-name-${number}`,
        nameAt: Math.max(
          0,
          shown.findIndex((cell) => cell.slot === null && cell.yes === null),
        ),
        selected: picked.has(line.key),
      };
    });
  });

  /** The number a row's ids are made of: the same however the rows above it change. */
  private lineIdOf(key: string): number {
    let id = this.lineIds.get(key);
    if (id === undefined) {
      id = this.lineIds.size + 1;
      this.lineIds.set(key, id);
    }
    return id;
  }

  /** Asks the remote source for a block that failed, again. */
  protected retry(block: number): void {
    (this.remote() as NonNullable<PctTableFeature['remote']>).retry(block);
  }

  private warnedRemoteGroups = false;

  private warnOnRemoteGroups(): void {
    if (this.warnedRemoteGroups) return;
    this.warnedRemoteGroups = true;
    console.warn(
      `[pct-data-table] pctTableGroups does not group the rows of pctTableRemote: a group ` +
        `of rows the source has not sent cannot be counted or summed here, so the rows stay ` +
        `in the order the source gave them.`,
    );
  }

  /** Opens the row's details, or closes them. */
  protected toggleDetails(id: PctRowId): void {
    this.openDetails().update((open) =>
      open.includes(id) ? open.filter((other) => other !== id) : [...open, id],
    );
  }

  protected readonly primary = computed(() => this.sort()[0] ?? null);

  protected readonly placeholders = computed(() =>
    this.busy() && this.given().length === 0 ? PLACEHOLDER_ROWS : [],
  );

  /**
   * The sentence beside an empty table: still loading, nothing there, or nothing answering
   * the question — three facts, three sentences, as the select says them.
   */
  private readonly emptiness = computed(() => {
    if (this.lines().length > 0) return null;
    if (this.busy()) return 'loading';
    return pctQuestionWords(this.filter()).length > 0 || this.given().length > 0
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
   * The lines in the view, and the ids of their rows: what an application loads more data for.
   * `start` and `end` count lines, an open row's details among them, so a count of rows in view
   * is `rows.length`. Read by an `IntersectionObserver`, so it is empty until the browser has
   * laid the table out, and under SSR.
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
    effect(() => this.detailsSlot()?.read());
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => say(''));

    effect(() => {
      const unnamed =
        this.caption() === '' &&
        this.ariaLabelledby() === '' &&
        this.ariaLabel() === '';
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
      // Measured again whenever the header or the bodies render, or the table resizes: a late
      // font or a wrapped label changes the header's height.
      this.heads();
      this.sections();
      this.resized();
      const frame = this.frame().nativeElement as HTMLElement;
      const table = this.ownTable();
      const height = sticky
        ? `${(table.tHead as HTMLElement).getBoundingClientRect().height}px`
        : '';
      frame.style.scrollPaddingBlockStart = height;
      // A group's heading sticks below the header and below the headings of the groups it
      // stands in, a heading's height for each level above it.
      frame.style.setProperty('--_head', height);
      const heading = table.querySelector('tr[data-pct-part="group"]');
      frame.style.setProperty(
        '--_group',
        `${heading?.getBoundingClientRect().height ?? 0}px`,
      );
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
      table.addEventListener('focusin', (event) =>
        this.noteFocus(event.target as Element),
      );
      table.addEventListener('pointerover', (event) => this.noteCut(event));
      table.addEventListener('pointerout', (event) => this.leaveCut(event));
      table.addEventListener('animationend', (event) =>
        (event.target as HTMLElement).removeAttribute('data-pct-changed'),
      );
    });

    this.watchVisible(destroyRef);
    this.watchChanges();
    this.watchFit(destroyRef);
    this.watchFocus();

    afterRenderEffect(() => {
      const target = this.pending();
      if (target === null) return;
      const line = this.lines().findIndex(
        (other) => other.kind === 'row' && other.key === target.id,
      );
      // A row not in the lines yet is waited for: the call made before the rows arrived is
      // carried out by the render that brings them.
      if (line < 0) return;
      const window = this.window();
      // A window scrolls to a line it may not have drawn: its own sums know where it stands.
      if (window) window.reach(line, target.align);
      else
        (this.rowOf(line) as HTMLTableRowElement).scrollIntoView({
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

  /** The rows the table draws, a line each, across its bodies. */
  private lineRows(): readonly HTMLTableRowElement[] {
    return Array.from(this.ownTable().tBodies).flatMap((body) =>
      Array.from(body.rows),
    );
  }

  /** The row of line `line`, while it is drawn. */
  private rowOf(line: number): HTMLTableRowElement | undefined {
    return this.lineRows()[line - this.drawn().start];
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
      // The shown columns' values are drawn in each row after the leading cells; a hidden
      // column's stands in the details, and does not flash.
      const hidden = new Set<string>(this.hiddenColumns());
      const shown = columns.flatMap((id, c) => (hidden.has(id) ? [] : [c]));
      const lead = this.lead();
      const rows = this.lineRows();
      const start = this.drawn().start;
      const now = new Map<string, readonly unknown[]>();
      const changed: Element[] = [];
      for (const row of body) {
        const was = before.get(row.key);
        now.set(row.key, row.values);
        if (!was) continue;
        shown.forEach((c, place) => {
          if (!sameValue(was[c], row.values[c]))
            changed.push(rows[row.line - start].cells[lead + place]);
        });
      }
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

  /**
   * Hides the columns a narrow frame has no room for, in the hide order, and shows them again
   * as it widens. Widths are read off the table drawn, not computed, because the cells' content
   * decides them.
   *
   * When the table overflows, as many columns go at once as the widths of their headers cover,
   * so a dozen columns hide in one render, not one per render. Each keeps the width the table
   * needed while it was shown, and comes back once the frame is that wide and `HYSTERESIS`
   * more, so a frame resized across the line does not make it come and go. The frame and the
   * table are both watched: a table that grows inside a frame that does not — a font that
   * arrives late, a template that fills in — is fitted again too.
   */
  private watchFit(destroyRef: DestroyRef): void {
    let observer: ResizeObserver | null = null;
    destroyRef.onDestroy(() => observer?.disconnect());
    let order: string | null = null;
    let needed: readonly number[] = [];
    afterRenderEffect(() => {
      const next = this.hideOrder();
      const heads = this.heads();
      this.body();
      this.resized();
      const count = this.hiddenCount();
      const table = this.ownTable();
      // A new order of columns starts with every column shown.
      const key = JSON.stringify(next);
      if (key !== order) {
        order = key;
        if (count > 0) {
          this.change(0);
          return;
        }
      }
      if (next.length === 0) return;
      const frame = this.frame().nativeElement as HTMLElement;
      // Only where a column may hide: the frame needs an observer of its own anyway, and a
      // table with nothing to hide reads no width at all.
      if (observer === null) {
        observer = new ResizeObserver(() => this.resized.set({}));
        observer.observe(frame);
        observer.observe(table);
      }
      // The shown columns' header cells are the row's last ones, after the leading cells.
      const cells = Array.from(
        (table.tHead as HTMLTableSectionElement).rows[0].cells,
      ).slice(-heads.length);
      const fit = pctFit(
        {
          width: frame.clientWidth,
          total: table.scrollWidth,
          order: next,
          count,
          widthOf: (id) =>
            cells[
              heads.findIndex((head) => head.column.id === id)
            ].getBoundingClientRect().width,
          needed,
        },
        HYSTERESIS,
      );
      needed = fit.needed;
      // The same count again is no change to a signal.
      this.change(fit.count);
    });
  }

  /** Writes how many columns are hidden. */
  private change(count: number): void {
    untracked(() => this.hiddenCount.set(count));
  }

  /** Notes where the focus stands, when it stands in a line of this table's body. */
  private noteFocus(target: Element): void {
    const tr = target.closest<HTMLElement>('tbody > tr[data-pct-index]');
    // A row of a table nested in a cell is that table's to look after.
    if (tr?.closest('table') !== this.ownTable()) {
      this.focusAt = null;
      return;
    }
    const line = Number(tr.dataset['pctIndex']);
    const found = this.lines()[line];
    this.focusAt = {
      element: target,
      line,
      // A heading's key is a JSON path no row's id is: its focus goes to the line that takes
      // its place.
      row: found.key,
    };
  }

  /**
   * Hands the focus on when its element went — with a column, a collapsed group, a row the
   * application took away — rather than leaving it to the page: to its row's first control
   * if the row is still drawn, to the heading of the group that hides it if not, to the
   * group's own heading, or to the line that now stands where it stood. A line a window
   * does not draw hands it to the frame, which scrolls with the keys, so the focus stays in
   * the table rather than going to the page.
   */
  private watchFocus(): void {
    // After every render, not on a signal: a write inside another render hook reruns effects
    // before the view has drawn it, and the element would still be there to find.
    afterEveryRender(() => {
      const at = this.focusAt;
      if (at === null || at.element.isConnected) return;
      this.focusAt = null;
      untracked(() => this.handFocus(at));
    });
  }

  /** Focuses the line that takes over from the focus that was at `at`. */
  private handFocus(at: NonNullable<PctDataTable<T, M>['focusAt']>): void {
    const lines = this.lines();
    const rowId = this.rowId();
    // A row's line stands before its details', which carry its key too.
    let line = lines.findIndex(
      (other) => other.kind !== 'hole' && other.key === at.row,
    );
    // The deepest heading in view whose group holds the row: a collapsed group hides it.
    for (let back = lines.length - 1; back >= 0 && line === -1; back--) {
      const other = lines[back];
      if (
        other.kind === 'group' &&
        other.rows.some((row) => rowId(row) === at.row)
      )
        line = back;
    }
    if (line < 0) line = Math.min(at.line, lines.length - 1);
    const row = this.rowOf(line);
    if (row === undefined && this.window() !== null) {
      this.frame().nativeElement.focus({ preventScroll: true });
      return;
    }
    row
      ?.querySelector<HTMLElement>(
        '[data-pct-part="disclosure"], button, a[href], input, select, textarea, [tabindex]',
      )
      ?.focus();
  }

  /**
   * What a directive on the table adds to it. Called from the directive's constructor, before
   * the table has drawn anything, and never taken back: a directive on the host lives as long
   * as the table does.
   *
   * @since next
   */
  contribute(feature: PctTableFeature): void {
    this.contributed.update((features) => ({ ...features, ...feature }));
  }

  private warnOnNoName(): void {
    if (this.warnedName) return;
    this.warnedName = true;
    console.warn(
      `[pct-data-table] The table has no name: give it a caption, the id of the element ` +
        `that names it in ariaLabelledby, or a name in ariaLabel.`,
    );
  }

  /** Follows the rows in the view, re-observed whenever the rows drawn change. */
  private watchVisible(destroyRef: DestroyRef): void {
    let observer: IntersectionObserver | null = null;
    destroyRef.onDestroy(() => observer?.disconnect());
    afterRenderEffect(() => {
      const lines = this.lines();
      // A window that moved drew other rows.
      this.drawn();
      if (typeof IntersectionObserver === 'undefined') return;
      observer?.disconnect();
      // A list with no rows has none in view, and an observer of nothing never says so.
      if (lines.length === 0) {
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
          rows: indices.flatMap((index) => {
            const line = lines[index];
            return line.kind === 'row' ? [line.key] : [];
          }),
        });
      });
      observer = current;
      // With a line to draw there is no placeholder: every row of the body is a line.
      for (const row of this.lineRows()) current.observe(row);
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
    const groups = this.contributed().groups;
    const grouping = this.grouping();
    const rowId = this.rowId();
    const row = (this.ordered() as readonly T[]).find(
      (other) => rowId(other) === id,
    );
    // Every group above the row opens: the path of its values, one level at a time.
    if (groups && row !== undefined) {
      const path: unknown[] = [];
      const above = new Set(
        grouping.map((level) => {
          path.push(level.value(row));
          return pctGroupKey(path);
        }),
      );
      groups.collapsed.update((collapsed) =>
        collapsed.filter((key) => !above.has(key)),
      );
    }
    this.scrollTo(id);
  }

  /** The shift key's state at the press that is about to write `sort`. */
  private shift = false;

  /**
   * A press by the pointer: its Shift is the press's. Only the main button presses: a middle
   * button or a drag that ends elsewhere sends no click, and must leave no Shift behind for a
   * reader's click that comes later.
   */
  private notePointer(event: MouseEvent): void {
    this.shift = event.button === 0 && event.shiftKey;
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
