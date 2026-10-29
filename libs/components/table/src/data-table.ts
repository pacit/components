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
import { pctMatches, pctQuestionWords } from './model/question';
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
}

/** A row line with its cells. */
interface Row<T> {
  readonly key: string;
  readonly row: T;
  readonly index: number;
  readonly id: PctRowId;
  readonly cells: readonly Cell<T>[];
}

type Writer = (value: unknown) => string;

/**
 * How a kind writes a value as text: the text a cell shows and the quick filter searches. An
 * empty value writes nothing.
 */
function writerOf(
  kind: PctAnyCellKind | undefined,
  locale: string,
  words: { readonly yes: string; readonly no: string },
  now: PctInstant,
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
      return (value) => (finite(value) ? words.format(value, now) : '');
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

  private readonly cellSlots = contentChildren(PctCellTemplate);
  private readonly headerSlots = contentChildren(PctHeaderCellTemplate);
  protected readonly emptySlot = contentChild(PctEmptyTemplate);
  private readonly table = viewChild.required(PctTable);
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

  /** One writer per column, made when the columns, the locale, the words or `now` change. */
  private readonly writers = computed(() => {
    const locale = this.resolvedLocale();
    const words = { yes: this.texts().tableYes, no: this.texts().tableNo };
    const now = this.now() ?? Date.now();
    return new Map<string, Writer>(
      this.columns().map((column) => [
        column.id,
        writerOf(column.kind, locale, words, now),
      ]),
    );
  });

  private readonly textOf = computed(() => {
    const writers = this.writers();
    return (column: PctAnyColumn<T>, row: T) =>
      (writers.get(column.id) as Writer)(column.value(row));
  });

  private readonly filtered = computed(() => {
    const rows = this.rows();
    if (!this.clientFilter()) return rows;
    const question = this.filter();
    const own = this.filterWith();
    if (own) return rows.filter((row) => own(row, question));
    const words = pctQuestionWords(question);
    const columns = this.columns();
    const text = this.textOf();
    return rows.filter((row) => pctMatches(row, columns, text, words));
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
      const ids = slot.of();
      for (const id of typeof ids === 'string' ? [ids] : ids)
        if (!map.has(id)) map.set(id, slot.template as TemplateRef<unknown>);
    }
    return map;
  });

  private readonly headerTemplates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const slot of this.headerSlots()) {
      slot.read();
      const ids = slot.of();
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
      return {
        column,
        sortKey: column.sort === false ? null : column.id,
        numeric: pctColumnNumeric(column),
        direction: position < 0 ? null : sort[position].direction,
        // The first key is `aria-sort`; the rest carry their place in the order to the eye.
        place: position > 0 ? position + 1 : null,
        slot: templates.get(column.id) ?? null,
      };
    });
  });

  /** The body: each row line with its cells written. */
  protected readonly body = computed<readonly Row<T>[]>(() => {
    const columns = this.columns();
    const writers = this.writers();
    const templates = this.cellTemplates();
    const cells = columns.map((column) => ({
      column,
      writer: writers.get(column.id) as Writer,
      numeric: pctColumnNumeric(column),
      boolean: column.kind === 'boolean',
      slot: templates.get(column.id) ?? null,
    }));
    // The base draws rows and nothing else: details, groups and holes are lines that the
    // features contributing them draw.
    return (
      this.lines() as readonly Extract<PctTableLine<T>, { kind: 'row' }>[]
    ).map((line) => ({
      key: pctLineKey(line),
      row: line.row,
      index: line.index,
      id: line.key,
      cells: cells.map(({ column, writer, numeric, boolean, slot }) => {
        const value = column.value(line.row);
        return {
          column,
          value,
          text: writer(value),
          numeric,
          yes: boolean && typeof value === 'boolean' ? value : null,
          slot,
        };
      }),
    }));
  });

  protected readonly primary = computed(() => this.sort()[0] ?? null);

  protected readonly placeholders = computed(() =>
    this.loading() && this.rows().length === 0 ? PLACEHOLDER_ROWS : [],
  );

  /**
   * The sentence beside an empty table: still loading, nothing there, or nothing answering
   * the question — three facts, three sentences, as the select says them.
   */
  protected readonly message = computed(() => {
    if (this.lines().length > 0) return '';
    if (this.loading()) return this.texts().tableLoading;
    return this.filter() !== '' || this.rows().length > 0
      ? this.texts().tableNoMatches
      : this.texts().tableEmpty;
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
    // The question that emptied the table is answered aloud, as the select answers it; an
    // empty table on arrival is the page's to describe, not a change to announce.
    let announced = '';
    const say = (message: string): void => {
      this.announcer.retract(announced);
      this.announcer.announce(message);
      announced = message;
    };
    effect(() => say(this.filter() === '' ? '' : this.message()));
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => say(''));

    effect(() => {
      const unnamed = this.caption() === '' && this.ariaLabelledby() === '';
      if (unnamed && isDevMode()) this.warnOnNoName();
    });

    afterNextRender(() => {
      const frame = this.frame().nativeElement as HTMLElement;
      const onScroll = () => this.scrolledTo.set(frame.scrollTop);
      frame.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => frame.removeEventListener('scroll', onScroll));
    });

    this.watchVisible(destroyRef);

    afterRenderEffect(() => {
      const target = this.pending();
      if (target === null) return;
      const index = this.body().findIndex((row) => row.id === target.id);
      // A row not in the lines yet is waited for: the call made before the rows arrived is
      // carried out by the render that brings them.
      if (index < 0) return;
      const frame = this.frame().nativeElement as HTMLElement;
      const row = frame.querySelector(`tbody > tr[data-pct-index="${index}"]`);
      (row as HTMLElement).scrollIntoView({ block: target.align });
      untracked(() => this.pending.set(null));
    });
  }

  private warnedName = false;

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
    const inView = new Set<number>();
    destroyRef.onDestroy(() => observer?.disconnect());
    afterRenderEffect(() => {
      const body = this.body();
      if (typeof IntersectionObserver === 'undefined') return;
      const frame = this.frame().nativeElement as HTMLElement;
      observer?.disconnect();
      inView.clear();
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const index = Number(
            (entry.target as HTMLElement).dataset['pctIndex'],
          );
          if (entry.isIntersecting) inView.add(index);
          else inView.delete(index);
        }
        const indices = [...inView].sort((a, b) => a - b);
        const start = indices[0] ?? 0;
        const end = indices.length === 0 ? 0 : (indices.at(-1) as number) + 1;
        this.seen.set({
          start,
          end,
          rows: indices.map((index) => body[index].id),
        });
      });
      for (const row of Array.from(
        frame.querySelectorAll<HTMLElement>('tbody > tr[data-pct-index]'),
      ))
        observer.observe(row);
    });
  }

  /**
   * Scrolls the row with `id` into view, once it is drawn: called before the rows arrive, it
   * waits for them, so a position is restored by naming the row right after binding the rows.
   *
   * @since next
   */
  scrollTo(id: PctRowId, align: PctScrollAlign = 'nearest'): void {
    this.pending.set({ id, align });
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

  protected noteShift(event: KeyboardEvent | PointerEvent): void {
    this.shift = event.shiftKey;
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
    const next = !shift
      ? remove
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
