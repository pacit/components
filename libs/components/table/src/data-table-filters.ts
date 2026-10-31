import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  contentChildren,
  Directive,
  inject,
  Injector,
  input,
  isDevMode,
  model,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PCT_TEXTS, pctReportOrphanSlot } from '@pacit/components/core';
import { PctDate, type PctDay } from '@pacit/components/date';
import { PctField, PctNumber, PctText } from '@pacit/components/field';
import { PctIcon } from '@pacit/components/icon';
import { PctPopover, PctPopoverTrigger } from '@pacit/components/popover';
import { PctMultiSelect, type PctSelectOption } from '@pacit/components/select';
import { PctDataTable } from './data-table';
import type { PctAnyColumn, PctColumn, PctColumns } from './model/columns';
import {
  type PctAnyColumnFilter,
  pctColumnFilterTest,
  pctColumnFilterUse,
  type PctColumnFilters,
  type PctColumnFilterUse,
  type PctDayRangeFilter,
  pctColumnValues,
  pctFilterIsEmpty,
  type PctRangeFilter,
} from './model/filters';
import { pctQuestionWords } from './model/question';

/**
 * What a filter template is handed: the state the column holds, and how to change it.
 *
 * @since next
 */
export interface PctFilterContext<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  /** The state the column's filter holds, `undefined` while it holds none — `let-state`. */
  readonly $implicit: unknown;
  /** The column — `let-column="column"`. */
  readonly column: PctColumn<T, M[Id], Id>;
  /** Sets the state; `undefined` or `null` clears it — `let-set="set"`. */
  readonly set: (own: unknown) => void;
  /** Clears the column's filter — `let-clear="clear"`. */
  readonly clear: () => void;
}

/**
 * A column's filter the application draws: the controls of its own state, in the column's
 * panel and in the row of filters, decided by the column's `filterBy`. The table keeps the
 * state and writes it into `columnFilters` as `{ own: state }`; what the state is, is the
 * application's.
 *
 * @example
 * <ng-template [pctFilter]="columns" pctFilterOf="floor" let-state let-set="set">
 *   <button pctButton type="button" [attr.aria-pressed]="state === 0" (click)="set(0)">Ground</button>
 * </ng-template>
 *
 * @since next
 */
@Directive({
  selector: 'ng-template[pctFilter]',
})
export class PctFilterTemplate<
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
    inject<TemplateRef<PctFilterContext<T, M, Id>>>(TemplateRef);

  /**
   * The table's list of columns. It carries the types into the context and is never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({ alias: 'pctFilter' });

  /**
   * The id of the column the template filters, or a list of ids that share it.
   *
   * @since next
   */
  readonly pctFilterOf = input.required<Id | readonly Id[]>();

  /**
   * What the filters' directive calls when its content query finds this template.
   *
   * @since next
   */
  readonly read = pctReportOrphanSlot('pctFilter');

  /** What tells the compiler what the context holds. The body is `true`: the signature is the point. */
  static ngTemplateContextGuard<
    T,
    M extends Record<string, unknown>,
    Id extends keyof M & string,
  >(
    _slot: PctFilterTemplate<T, M, Id>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctFilterContext<T, M, Id> {
    return true;
  }
}

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves
 * in, and read the directive's state and setter. Kept in a map of this module's own, as the
 * selection's are, so a table that filters no column carries none of it.
 */
interface Link {
  readonly parts: WritableSignal<PctTableFilterParts | null>;
  readonly uses: () => ReadonlyMap<string, PctColumnFilterUse>;
  readonly state: () => Readonly<Record<string, PctAnyColumnFilter>>;
  readonly filtered: () => ReadonlySet<string>;
  readonly slots: () => ReadonlyMap<string, TemplateRef<unknown>>;
  readonly set: (id: string, filter: PctAnyColumnFilter | null) => void;
}

const LINKS = /* @__PURE__ */ new WeakMap<object, Link>();

/**
 * Each column's own filter, in a panel its header's button opens, and in a row of filters
 * under the headers when `filterRow` is on (0097, D5). The control follows the column:
 * a text field for its words, two number fields for a range, two date fields for the days a
 * column of instants falls on, a multiple select of the values the rows hold, or the
 * application's own template, with a button that clears it.
 *
 * **A model a URL can hold.** `columnFilters` is the state by column id — `{ text }`,
 * `{ from, to }`, `{ since, until }`, `{ values }` or `{ own }` — typed by the columns'
 * map, so a range on a column of names is the compiler's error. A state that went wrong on
 * its way back — a shape the column does not take, a day that is not one, a value that is
 * not a filter at all — lets no row through rather than every row. The quick
 * filter and these are two questions, and a row answers both; `matched()` counts the rows
 * that did. With `clientFilter` off, the table applies none of them and the application
 * reads the model, as a remote source is asked under it.
 *
 * **The button says the state.** A filtered column's button is named so — `Filter Name,
 * filtered` — and its header carries `data-pct-filtered`, so neither a reader nor a sheet
 * needs to open the panel to know. It is a button beside the label, outside the sort's: a
 * button inside a button would be two controls a reader cannot tell apart. The panel is a
 * popover, a dialog named by the column's header, Escape closes it and the focus goes back
 * to the button.
 *
 * @example
 * <pct-data-table [pctTableColumnFilters]="columns" [(columnFilters)]="filters" filterRow …>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableColumnFilters]',
  exportAs: 'pctTableColumnFilters',
})
export class PctTableColumnFilters<T, M extends Record<string, unknown>> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);

  /**
   * The table's list of columns, which carries the ids and the values' types the filters'
   * state is typed by. Never read.
   *
   * @since next
   */
  readonly columns = input.required<PctColumns<T, M>>({
    alias: 'pctTableColumnFilters',
  });

  /**
   * The filters of the columns, by id: what each one lets through. A column that holds none
   * is not filtered, nor is one whose filter is empty.
   *
   * @since next
   */
  readonly columnFilters = model<PctColumnFilters<M>>({});

  /**
   * A row of filters under the headers: each column's control where the column stands, the
   * same as its panel's, holding the same state.
   *
   * @since next
   */
  readonly filterRow = input(false, { transform: booleanAttribute });

  private readonly slots = contentChildren(PctFilterTemplate);

  /** The templates of the columns filtered by the application's own state, by column id. */
  private readonly templates = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const slot of this.slots()) {
      slot.read();
      const ids = slot.pctFilterOf();
      for (const id of typeof ids === 'string' ? [ids] : ids)
        if (!map.has(id)) map.set(id, slot.template as TemplateRef<unknown>);
    }
    return map;
  });

  /** The state as the table reads it: by id, of no column's type in particular. */
  private readonly state = computed(
    () => this.columnFilters() as Readonly<Record<string, PctAnyColumnFilter>>,
  );

  /**
   * How each column offered a filter is filtered: every column the table has whose kind or
   * `columnFilter` says so, and of those filtered by the application's own state, the ones
   * with a template to draw it.
   */
  private readonly uses = computed(() => {
    const templates = this.templates();
    const uses = new Map<string, PctColumnFilterUse>();
    for (const column of this.table.columns() as readonly PctAnyColumn<T>[]) {
      const use = pctColumnFilterUse(column);
      if (use === null) continue;
      if (use === 'own' && !templates.has(column.id)) {
        if (isDevMode()) this.warnUndrawn(column.id);
        continue;
      }
      uses.set(column.id, use);
    }
    return uses;
  });

  /** The ids of the columns a filter stands on that lets some row out. */
  private readonly filtered = computed(() => {
    const state = this.state();
    const ids = new Set<string>();
    for (const id of this.uses().keys()) {
      const filter = state[id];
      if (filter && !pctFilterIsEmpty(filter)) ids.add(id);
    }
    return ids;
  });

  constructor() {
    const parts = signal<PctTableFilterParts | null>(null);
    LINKS.set(this, {
      parts,
      uses: this.uses,
      state: this.state,
      filtered: this.filtered,
      slots: this.templates,
      set: (id, filter) => this.set(id, filter),
    });
    const columns = computed(
      () =>
        new Map(
          (this.table.columns() as readonly PctAnyColumn<T>[]).map((column) => [
            column.id,
            column,
          ]),
        ),
    );
    this.table.contribute({
      filters: {
        state: this.state,
        offered: computed(() => new Set(this.uses().keys())),
        filtered: this.filtered,
        test: computed(() => {
          const state = this.state();
          const all = columns();
          const tests = [...this.filtered()].map((id) => ({
            column: all.get(id) as PctAnyColumn<unknown>,
            filter: state[id] as PctAnyColumnFilter,
          }));
          if (tests.length === 0) return null;
          return (text) => {
            const each = tests.map(
              ({ column, filter }) =>
                pctColumnFilterTest(column, filter, (row) =>
                  text(column, row),
                ) as (row: unknown) => boolean,
            );
            return (row) => each.every((test) => test(row));
          };
        }),
        words: computed(() => {
          const state = this.state();
          const uses = this.uses();
          const words = new Map<string, readonly string[]>();
          for (const id of this.filtered()) {
            // Read with no trust in the type: the state may have come back from a URL.
            const text = (state[id] as { readonly text?: unknown }).text;
            if (uses.get(id) === 'text' && typeof text === 'string')
              words.set(id, pctQuestionWords(text));
          }
          return words;
        }),
        row: this.filterRow,
        parts: PctTableFilterParts,
        // Read once the table has made the parts, in the render that draws them.
        head: computed(() => (parts() as PctTableFilterParts).head()),
        cell: computed(() => (parts() as PctTableFilterParts).cell()),
      },
    });
  }

  private readonly warned = new Set<string>();

  /** A column filtered by the application's own state, with no template to draw the state. */
  private warnUndrawn(id: string): void {
    if (this.warned.has(id)) return;
    this.warned.add(id);
    untracked(() =>
      console.warn(
        `[pct-data-table] pctTableColumnFilters: the column "${id}" is filtered by a state ` +
          `of the application's own, and no <ng-template pctFilter> draws it: the column ` +
          `has no filter.`,
      ),
    );
  }

  /** Sets a column's filter, or takes it away: an empty one stays while it is being typed. */
  private set(id: string, filter: PctAnyColumnFilter | null): void {
    this.columnFilters.update((filters) => {
      const next = { ...filters } as Record<string, unknown>;
      if (filter === null) delete next[id];
      else next[id] = filter;
      return next as PctColumnFilters<M>;
    });
  }

  /**
   * Clears a column's filter, or every column's when no id is given.
   *
   * @since next
   */
  clear(column?: keyof M & string): void {
    if (column === undefined) this.columnFilters.set({});
    else this.set(column, null);
  }
}

/**
 * The filters' parts: templates the table draws in its places — a header's button and its
 * panel, a column's cell in the row of filters — and the handlers of the controls in them.
 * Declared here, rendered there: the bindings are read in this component, the elements stand
 * in the table. `pctTableColumnFilters` makes it, so it has no selector: there is no tag to
 * write.
 *
 * @since next
 */
@Component({
  imports: [
    NgTemplateOutlet,
    PctButton,
    PctDate,
    PctField,
    PctIcon,
    PctMultiSelect,
    PctNumber,
    PctPopover,
    PctPopoverTrigger,
    PctText,
  ],
  // Its element is the table's child and draws nothing: the templates stand where they are put.
  host: { hidden: '' },
  templateUrl: './data-table-filters.html',
  styleUrl: './data-table-filters.scss',
})
export class PctTableFilterParts {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly injector = inject(Injector);
  private readonly table = inject(PctDataTable);
  private readonly link = LINKS.get(inject(PctTableColumnFilters)) as Link;

  /**
   * What a header holds beside its label: the column's filter button and its panel.
   *
   * @since next
   */
  readonly head = viewChild.required<TemplateRef<unknown>>('head');

  /**
   * What a column's cell holds in the row of filters: its control.
   *
   * @since next
   */
  readonly cell = viewChild.required<TemplateRef<unknown>>('cell');

  /** The two ends of a range, and of a range of days with the name each end is read by. */
  protected readonly ends = ['from', 'to'] as const;
  protected readonly days = [
    { day: 'since', end: 'from' },
    { day: 'until', end: 'to' },
  ] as const;

  constructor() {
    this.link.parts.set(this);
  }

  /** How the column is filtered. */
  protected useOf(column: PctAnyColumn<unknown>): PctColumnFilterUse {
    return this.link.uses().get(column.id) as PctColumnFilterUse;
  }

  /** Whether the column's filter lets some row out. */
  protected filteredBy(column: PctAnyColumn<unknown>): boolean {
    return this.link.filtered().has(column.id);
  }

  /** Whether the column holds a filter at all, one of spaces among them: Clear's to take. */
  protected holds(column: PctAnyColumn<unknown>): boolean {
    return this.stateOf(column) !== undefined;
  }

  /**
   * The column's filter, or `undefined`. Read as it stands at every render, so one set from
   * outside — a URL read back — shows in the controls: nothing here holds a copy.
   */
  private stateOf(column: PctAnyColumn<unknown>): unknown {
    return this.link.state()[column.id];
  }

  /** What the column's button is named: its header, and whether it filters. */
  protected nameOf(column: PctAnyColumn<unknown>): string {
    return (
      this.filteredBy(column)
        ? this.texts().tableFiltered
        : this.texts().tableFilter
    ).replace('{column}', () => column.header);
  }

  /** The panel's heading: the column's filter, by its header. */
  protected headingOf(column: PctAnyColumn<unknown>): string {
    return this.texts().tableFilter.replace('{column}', () => column.header);
  }

  /** The name of an end of a range: `{column} from`, `{column} to`. */
  protected endOf(column: PctAnyColumn<unknown>, end: 'from' | 'to'): string {
    return (
      end === 'from' ? this.texts().tableFrom : this.texts().tableTo
    ).replace('{column}', () => column.header);
  }

  /** The words the column's text filter holds, as typed. */
  protected textOf(column: PctAnyColumn<unknown>): string {
    const filter = this.stateOf(column) as { text?: unknown } | undefined;
    return typeof filter?.text === 'string' ? filter.text : '';
  }

  /** An end of the column's range. */
  protected rangeOf(
    column: PctAnyColumn<unknown>,
    end: 'from' | 'to',
  ): number | null {
    const filter = this.stateOf(column) as Partial<PctRangeFilter> | undefined;
    const value = filter?.[end];
    return typeof value === 'number' ? value : null;
  }

  /** An end of the column's range of days. */
  protected dayOf(
    column: PctAnyColumn<unknown>,
    end: 'since' | 'until',
  ): PctDay | null {
    const filter = this.stateOf(column) as
      Partial<PctDayRangeFilter> | undefined;
    const value = filter?.[end];
    return typeof value === 'string' ? value : null;
  }

  /**
   * The values each column's filter lets through, one list per state: a list made at every
   * render would be a new value for the select at every render.
   */
  private readonly picked = computed(() => {
    const picked = new Map<string, unknown[]>();
    for (const [id, filter] of Object.entries(this.link.state())) {
      const values = (filter as { values?: unknown } | null)?.values;
      if (Array.isArray(values)) picked.set(id, [...values]);
    }
    return picked;
  });

  private readonly none: unknown[] = [];

  /** The values the column's filter lets through. */
  protected valuesOf(column: PctAnyColumn<unknown>): unknown[] {
    return this.picked().get(column.id) ?? this.none;
  }

  /** The values the column's rows hold, each with the text the table writes for it. */
  private readonly options = computed(() => {
    const rows = this.table.rows() as readonly unknown[];
    const empty = this.texts().tableGroupEmpty;
    const options = new Map<string, readonly PctSelectOption<unknown>[]>();
    for (const [id, use] of this.link.uses()) {
      if (use !== 'values') continue;
      const column = (
        this.table.columns() as readonly PctAnyColumn<unknown>[]
      ).find((one) => one.id === id) as PctAnyColumn<unknown>;
      options.set(
        id,
        pctColumnValues(column, rows).map(({ value, row }) => ({
          value,
          label: value === null ? empty : this.table.textOf(row, id),
        })),
      );
    }
    return options;
  });

  /** The options of the column's filter by values. */
  protected optionsOf(
    column: PctAnyColumn<unknown>,
  ): readonly PctSelectOption<unknown>[] {
    return this.options().get(column.id) ?? [];
  }

  /** The application's template of the column's filter. */
  protected slotOf(column: PctAnyColumn<unknown>): TemplateRef<unknown> | null {
    return this.link.slots().get(column.id) ?? null;
  }

  /** The contexts handed to the application's templates, one per column, kept across renders. */
  private readonly owned = new Map<
    string,
    PctFilterContext<unknown, Record<string, unknown>, string>
  >();

  /**
   * What the application's template of the column's filter is handed: the same object at
   * every render, its state read as it stands.
   */
  protected ownOf(
    column: PctAnyColumn<unknown>,
  ): PctFilterContext<unknown, Record<string, unknown>, string> {
    const kept = this.owned.get(column.id);
    if (kept?.column === column) return kept;
    const link = this.link;
    const context = {
      get $implicit(): unknown {
        return (link.state()[column.id] as { own?: unknown } | undefined)?.own;
      },
      column,
      set: (own: unknown) =>
        link.set(column.id, own === undefined || own === null ? null : { own }),
      clear: () => link.set(column.id, null),
    };
    this.owned.set(column.id, context);
    return context;
  }

  protected setText(column: PctAnyColumn<unknown>, text: string): void {
    this.link.set(column.id, text === '' ? null : { text });
  }

  protected setRange(
    column: PctAnyColumn<unknown>,
    end: 'from' | 'to',
    value: number | null,
  ): void {
    const range: PctRangeFilter = {
      from: end === 'from' ? value : this.rangeOf(column, 'from'),
      to: end === 'to' ? value : this.rangeOf(column, 'to'),
    };
    this.link.set(
      column.id,
      range.from === null && range.to === null ? null : range,
    );
  }

  protected setDay(
    column: PctAnyColumn<unknown>,
    end: 'since' | 'until',
    day: PctDay | null,
  ): void {
    const range: PctDayRangeFilter = {
      since: end === 'since' ? day : this.dayOf(column, 'since'),
      until: end === 'until' ? day : this.dayOf(column, 'until'),
    };
    this.link.set(
      column.id,
      range.since === null && range.until === null ? null : range,
    );
  }

  protected setValues(column: PctAnyColumn<unknown>, values: unknown[]): void {
    this.link.set(
      column.id,
      values.length === 0 ? null : ({ values } as PctAnyColumnFilter),
    );
  }

  /**
   * Clears the column, and puts the focus in the panel's first control: the button pressed
   * is disabled by the press, and the focus would otherwise fall to the page.
   */
  protected clear(column: PctAnyColumn<unknown>, panel: HTMLElement): void {
    this.link.set(column.id, null);
    afterNextRender(
      () =>
        panel
          .querySelector<HTMLElement>(
            'input, [role="combobox"], button:not([disabled])',
          )
          ?.focus(),
      { injector: this.injector },
    );
  }
}
