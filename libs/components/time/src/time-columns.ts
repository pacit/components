import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  untracked,
  viewChildren,
} from '@angular/core';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_TEXTS,
  pctListNavigation,
  PctListNavigation,
  PctSize,
} from '@pacit/components/core';

import {
  pctLattice,
  pctNearest,
  pctSecondsOf,
  pctUnbounded,
  pctWrite,
} from './lattice';
import { pctTimeFormat, PctTimeField } from './locale';
import { isPctTimeOfDay, isPctTimeStep, pctNow, PctTimeOfDay } from './time';

/**
 * One row of a column, with everything the template and the walk need already decided.
 *
 * @since next
 */
export interface PctTimeRow {
  /**
   * The number the row stands for — an hour on a 24-hour clock, an hour of the half-day on a
   * 12-hour one, a minute, a second, or `0` and `1` for the two halves of the day.
   */
  readonly value: number;
  /** What the eye reads, in the digits and the words the field is written in. */
  readonly label: string;
  /** What typeahead matches — the label with ASCII digits, so a keyboard anywhere reaches it. */
  readonly key: string;
  /**
   * The number the row writes — `12` for the first hour on `h12`, `24` on `h24` — which a typed
   * number is read against; `null` for a half of the day, which is a word.
   */
  readonly shown: number | null;
  /** No time on the step inside the bounds has this row's value, given the other columns. */
  readonly disabled: boolean;
  /** The value's own field is this row. */
  readonly chosen: boolean;
}

/**
 * One column — one field of the time, one `role="listbox"`, one tab stop.
 *
 * @since next
 */
export interface PctTimeColumn {
  /** Which field of the time the column holds. */
  readonly field: PctTimeField;
  /** The column's accessible name, from `PCT_TEXTS`. */
  readonly name: string;
  readonly rows: readonly PctTimeRow[];
  /** Where the walk stands in this column — the row `aria-activedescendant` names. */
  readonly active: number;
}

/** A time input written as an attribute is a string; one bound from a model may be anything. */
function optionalTime(value: unknown): PctTimeOfDay | undefined {
  return isPctTimeOfDay(value) ? value : undefined;
}

/** The seconds in half a day, an hour and a minute — the widths of the four kinds of row. */
const HALF = 43_200;
const HOUR = 3600;
const MINUTE = 60;

/**
 * Time columns — one `role="listbox"` per field of a time, side by side: hours and minutes,
 * seconds where the step has them, and the two halves of the day where the clock has twelve
 * hours ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §4).
 *
 * It is a component of its own rather than a private half of `<pct-time>` for the reason
 * `PctCalendar` is one: the datetime field's panel is one dialog holding a calendar and these
 * columns, so they are the part it composes, and a panel that lived only inside the time field
 * would be built twice.
 *
 * **A column is a field, not a cursor over a list.** Each column is a listbox that points at its
 * active row (`aria-activedescendant`, [0032](../../../../docs/decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)),
 * and the row the walk stands on IS that field of the value — the selection follows it, as the
 * native element's own segments change the value under the arrow keys (0086, A13). Minute `59`
 * comes round to `00` and leaves the hour where it was: the walk wraps, because a column is a
 * ring, and it is a field rather than an arithmetic. `Enter` says the time is the one wanted, and
 * that — not the value moving — is `timePicked`.
 *
 * **The step decides which rows exist and the bounds which of them can be taken.** A row no time
 * on the step reaches is not drawn (`step="900"` lists the minutes `00 15 30 45`, counted from
 * `min`); a row the bounds refuse is drawn, disabled, and skipped by the walk. A movement onto a
 * row lands on the time inside the bounds nearest to the one composed from it and the other
 * columns, so the other columns may move to meet it — the hour stepped back to `09` under
 * `min="09:30"` takes the minutes to `30` with it.
 *
 * The digits, the day-period words and the order of the columns are the locale's, off the
 * formatter the field writes with (`pctTimeFormat`), so the panel and the field never disagree.
 *
 * @example
 * <pct-time-columns [(value)]="time" step="900" min="09:00" max="17:00" />
 *
 * @since next
 */
@Component({
  selector: 'pct-time-columns',
  templateUrl: './time-columns.html',
  styleUrl: './time-columns.scss',
  host: {
    class: 'pct-time-columns',
    role: 'group',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctTimeColumns {
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);

  /**
   * The chosen time, or `null`. Every movement in a column writes it.
   *
   * @since next
   */
  readonly value = model<PctTimeOfDay | null>(null);

  /**
   * The earliest time a row may stand for; absent means no bound on that side. Later than `max`, the two are a window across midnight.
   *
   * @since next
   */
  readonly min = input(undefined, { transform: optionalTime });

  /**
   * The latest time a row may stand for; absent means no bound on that side — the other half of `min`.
   *
   * @since next
   */
  readonly max = input(undefined, { transform: optionalTime });

  /**
   * The step in seconds, counted from `min` — 60 by default, as the native attribute's. A step the columns cannot list (one that does not divide a minute, an hour or a day) is refused with a dev-mode warning and read as 60.
   *
   * @since next
   */
  readonly step = input(60, { transform: numberAttribute });

  /**
   * Freezes the columns: no row can be taken, the walk stops, and `aria-disabled` says so.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Overrides the application's `LOCALE_ID`, as on `<pct-time>` — the clock, the digits and the day-period words follow it.
   *
   * @since next
   */
  readonly locale = input<string>('');

  /**
   * Scales the rows with the field sizes, so a panel matches the field it opens from; from `providePctConfig` by default (req-api-config).
   *
   * @since next
   */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * The accessible name of the group the columns stand in; a panel that owns them names itself instead.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * A time was chosen **by the user** — `Enter` or `Space` in a column — which is not the same event as `value` changing: every movement changes the value, and only this closes a panel.
   *
   * @since next
   */
  readonly timePicked = output<PctTimeOfDay>();

  private readonly lists = viewChildren<ElementRef<HTMLElement>>('column');

  private readonly uid = nextPctId('pct-time-columns');

  protected readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly format = computed(() => pctTimeFormat(this.activeLocale()));

  /** A step the columns can list, or the default one in its place. */
  private readonly validStep = computed(() => {
    const step = this.step();
    return isPctTimeStep(step) ? step : 60;
  });

  private readonly lattice = computed(() =>
    pctLattice(this.validStep(), this.min(), this.max()),
  );

  /**
   * The moment the columns were made, read once — a column left open across a minute does not
   * move under the user, which is the calendar's reading of today.
   */
  private readonly madeAt = new Date();

  /**
   * Where the walk stands, in seconds since midnight: the value, or — while there is none — the
   * time now; held on the step and inside the bounds either way, because a walk has to start on
   * a row that exists. A value the step does not list is not rewritten by this: it is where the
   * walk STARTS, and the value moves only when the user does.
   */
  protected readonly cursor = computed(() => {
    const value = this.value();
    const lattice = this.lattice();
    // Some time is always inside: the base is `min`, which the bounds always let through, or
    // midnight, which a lone `max` does too.
    if (value !== null && isPctTimeOfDay(value))
      return pctNearest(
        lattice,
        pctSecondsOf(value),
        0,
        HALF * 2 - 1,
      ) as number;
    // Now, as a wall clock shows it — the minute it is until it ticks, to the second only where
    // the step counts seconds — and on the step it is IN: the last time on the step at or before
    // now, never the next one. Where the bounds leave none before now, the nearest after.
    const now = pctSecondsOf(pctNow(this.madeAt, lattice.seconds));
    return (pctNearest(lattice, now, 0, now) ??
      pctNearest(lattice, now, 0, HALF * 2 - 1)) as number;
  });

  /** The value's own fields in seconds, or `null` — what `aria-selected` reads. */
  private readonly chosenAt = computed(() => {
    const value = this.value();
    return value !== null && isPctTimeOfDay(value) ? pctSecondsOf(value) : null;
  });

  /** Whether this language counts twelve hours and names the two halves of the day. */
  private readonly twelve = computed(() => this.format().dayPeriods !== null);

  /**
   * How many digits the field writes the hour in — read off the field's own format hint, so the
   * column and the field cannot part: one on most twelve-hour clocks (`1:05 PM`), two on a
   * twenty-four-hour one and on the twelve-hour clocks that pad (`hr-HR-u-hc-h12` writes
   * `01:05 AM`). The hint has a mark per digit of the hour and nothing else carries that mark.
   */
  private readonly hourWidth = computed(
    () =>
      this.format().hint({ hour: '#', minute: '', second: '' }).split('#')
        .length - 1,
  );

  /**
   * The columns in the order this language writes the fields — the period before the hour in
   * Korean, after it in English — with seconds only where the step has them.
   */
  protected readonly columns = computed<readonly PctTimeColumn[]>(() => {
    const seconds = this.lattice().seconds;
    const twelve = this.twelve();
    return this.format()
      .order.filter(
        (field) =>
          (field !== 'second' || seconds) && (field !== 'dayPeriod' || twelve),
      )
      .map((field) => this.columnOf(field));
  });

  /** The walk of each column, by field — the core list machinery over that column's rows. */
  private readonly walks = new Map<PctTimeField, PctListNavigation>(
    (['hour', 'minute', 'second', 'dayPeriod'] as const).map((field) => [
      field,
      pctListNavigation<PctTimeRow>({
        items: computed(
          () =>
            this.columns().find((column) => column.field === field)?.rows ?? [],
        ),
        isDisabled: (row) => row.disabled,
        label: (row) => row.key,
        sameItem: (a, b) => a.value === b.value,
        // A column is a ring: `ArrowDown` from the last row is the first (0086 §4).
        wrap: true,
      }),
    ]),
  );

  /** Whether the next scroll is the first one — the panel opening centres the rows it opens on. */
  private placed = false;

  /**
   * The digits typed into one column so far, and which column: `1` then `3` within the
   * typeahead's half a second is thirteen, the way a person types a number.
   */
  private typed = { field: null as PctTimeField | null, digits: '' };
  private typedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // The active row is kept in view after the render that moved it, because the walk REWRITES
    // the rows (their disabled state follows the other columns) and a hook running before the
    // render would be measuring the rows being replaced.
    afterRenderEffect(() => {
      this.columns();
      untracked(() => this.keepInView());
    });

    inject(DestroyRef).onDestroy(() => this.forget());

    if (isDevMode()) this.warnOnUnsupportedStep();
  }

  /**
   * Focuses the hour column — what a panel calls the moment it opens. The hour is where a time is
   * changed first, wherever the language writes it; the other columns are a Tab away.
   *
   * @since next
   */
  focusCursor(): void {
    const lists = this.lists().map((ref) => ref.nativeElement);
    const hour = lists.find((list) => list.dataset['pctField'] === 'hour');
    hour?.focus();
  }

  protected columnId(field: PctTimeField): string {
    return `${this.uid}-${field}`;
  }

  protected rowId(field: PctTimeField, row: PctTimeRow): string {
    return `${this.uid}-${field}-${row.value}`;
  }

  protected activeId(column: PctTimeColumn): string | null {
    const row = column.rows[column.active];
    return row === undefined ? null : this.rowId(column.field, row);
  }

  /**
   * The column's key map. A key MOVES the value only when it moves the walk: an arrow at a row
   * with nowhere else to go, or a key that matches no row, leaves the value as it was — a miss is
   * not an instruction (`pctListNavigation`'s reading of typeahead).
   */
  protected onKeydown(drawn: PctTimeColumn, event: KeyboardEvent): void {
    if (this.disabled()) return;
    // The column as it stands NOW, not as the last render drew it: two keys can arrive before a
    // render — a busy page queues input ahead of change detection — and a walk that started the
    // second from the row the first one left would lose a row, or read a digit that moved the
    // column as one that did not.
    const column =
      this.columns().find((live) => live.field === drawn.field) ?? drawn;
    const walk = this.walks.get(column.field) as PctListNavigation;
    walk.setActive(column.active);
    const digit = /^[0-9]$/.test(event.key);
    // Any key but a digit ends the number being typed — `1`, an arrow, `3` is three.
    if (!digit) this.forget();
    let answered = true;
    switch (event.key) {
      case 'ArrowDown':
        walk.move(1);
        break;
      case 'ArrowUp':
        walk.move(-1);
        break;
      case 'Home':
        walk.first();
        break;
      case 'End':
        walk.last();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        return this.take();
      default:
        if (
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        // A number is read as a number: the core walk matches a label's PREFIX, which in a
        // column of hours written `12, 1, 2 … 11` takes `1` to twelve and never reaches one,
        // and in one written `09` never answers `9` at all. A word — the day period — is the
        // walk's own typeahead.
        if (digit) {
          const found = this.seek(column, event.key);
          answered = found !== -1;
          if (answered) walk.setActive(found);
        } else {
          walk.typeahead(event.key);
          const here = column.rows[walk.activeIndex()];
          answered =
            here !== undefined &&
            here.key.toLowerCase().startsWith(event.key.toLowerCase());
        }
    }
    // A key the column answered is the column's, even when the answer is the row it stands on;
    // one it did not answer — a letter or a digit no row begins with — is left to the page.
    if (!answered) return;
    event.preventDefault();
    const row = column.rows[walk.activeIndex()];
    if (row !== undefined && walk.activeIndex() !== column.active)
      this.moveTo(column.field, row);
  }

  /** Ends the number being typed. */
  private forget(): void {
    clearTimeout(this.typedTimer);
    this.typed = { field: null, digits: '' };
  }

  /**
   * The row a typed digit takes the column to: the digits typed into it so far read as a number
   * and matched against the number each row writes, then — where none writes it — against the
   * start of a row's text, so `4` in a column of quarter hours is `45`. A row the bounds refuse is
   * never the answer; with none, `-1`.
   */
  private seek(column: PctTimeColumn, digit: string): number {
    clearTimeout(this.typedTimer);
    const digits =
      (this.typed.field === column.field ? this.typed.digits : '') + digit;
    this.typed = { field: column.field, digits };
    this.typedTimer = setTimeout(() => this.forget(), 500);
    const open = column.rows.filter((row) => !row.disabled);
    const found =
      open.find((row) => row.shown === Number(digits)) ??
      open.find((row) => row.key.startsWith(digits));
    return found === undefined ? -1 : column.rows.indexOf(found);
  }

  /** A press lands on a ROW, and a row is a field: the value moves and the panel stays. */
  protected pick(column: PctTimeColumn, row: PctTimeRow): void {
    if (this.disabled() || row.disabled) return;
    this.moveTo(column.field, row);
  }

  /** The cursor's time taken as the value, and said to be the one wanted. */
  private take(): void {
    const time = pctWrite(this.lattice(), this.cursor());
    this.value.set(time);
    this.timePicked.emit(time);
  }

  /** One field set to a row, the rest held where they were — and the whole kept on the step. */
  private moveTo(field: PctTimeField, row: PctTimeRow): void {
    const [from, to, at] = this.spanOf(field, row.value, this.cursor());
    const landed = pctNearest(this.lattice(), at, from, to);
    if (landed === null) return;
    this.value.set(pctWrite(this.lattice(), landed));
  }

  /**
   * The seconds a row of a column covers, given where the other columns stand — and the time
   * composed from the row and the rest of the cursor, which is where a movement onto it aims.
   */
  private spanOf(
    field: PctTimeField,
    value: number,
    cursor: number,
  ): readonly [from: number, to: number, at: number] {
    const hour = Math.floor(cursor / HOUR);
    const inHour = cursor % HOUR;
    const inMinute = cursor % MINUTE;
    switch (field) {
      case 'dayPeriod': {
        const from = value * HALF;
        return [from, from + HALF - 1, from + (cursor % HALF)];
      }
      case 'hour': {
        // On a twelve-hour clock the row is an hour of the half the cursor stands in.
        const start =
          (this.twelve() ? value + (hour >= 12 ? 12 : 0) : value) * HOUR;
        return [start, start + HOUR - 1, start + inHour];
      }
      case 'minute': {
        const start = hour * HOUR + value * MINUTE;
        return [start, start + MINUTE - 1, start + inMinute];
      }
      case 'second': {
        const at = cursor - inMinute + value;
        return [at, at, at];
      }
    }
  }

  private columnOf(field: PctTimeField): PctTimeColumn {
    const lattice = this.lattice();
    const all = pctUnbounded(lattice);
    const cursor = this.cursor();
    const chosen = this.chosenAt();
    const rows: PctTimeRow[] = [];
    let active = -1;
    for (const value of this.valuesOf(field)) {
      const [from, to] = this.spanOf(field, value, cursor);
      // A row the step never reaches is not drawn; a row the bounds refuse is drawn disabled.
      if (pctNearest(all, from, from, to) === null) continue;
      // The row the walk stands on, and the row the value is in, are both read as the row
      // whose seconds hold that time — so a value the bounds refuse, which the walk starts
      // from somewhere else, marks no row of a half, an hour or a minute it is not in.
      if (from <= cursor && cursor <= to) active = rows.length;
      rows.push({
        value,
        label: this.labelOf(field, value),
        key: this.keyOf(field, value),
        shown: field === 'dayPeriod' ? null : this.shownOf(field, value),
        disabled: pctNearest(lattice, from, from, to) === null,
        chosen: chosen !== null && from <= chosen && chosen <= to,
      });
    }
    return { field, name: this.nameOf(field), rows, active };
  }

  /** Every value a column could list, in the order it lists them. */
  private valuesOf(field: PctTimeField): readonly number[] {
    const count =
      field === 'dayPeriod'
        ? 2
        : field === 'hour'
          ? this.twelve()
            ? 12
            : 24
          : 60;
    return Array.from({ length: count }, (_, i) => i);
  }

  /**
   * How the row is written: the hour as the clock writes its first one — `12` on `h12`, `24` on
   * `h24` — as wide as the field writes it (0086 §3); minutes and seconds always two; the halves
   * of the day in the field's own words.
   */
  private labelOf(field: PctTimeField, value: number): string {
    const format = this.format();
    if (field === 'dayPeriod')
      return (format.dayPeriods as readonly [string, string])[value];
    return format.number(this.shownOf(field, value), this.widthOf(field));
  }

  private keyOf(field: PctTimeField, value: number): string {
    if (field === 'dayPeriod') return this.labelOf(field, value);
    return String(this.shownOf(field, value)).padStart(
      this.widthOf(field),
      '0',
    );
  }

  /** The digits a column writes its numbers in: the field's own for the hour, two for the rest. */
  private widthOf(field: PctTimeField): 1 | 2 {
    return field === 'hour' && this.hourWidth() === 1 ? 1 : 2;
  }

  /** The number a row writes — the hour as its cycle writes it, a minute or a second as itself. */
  private shownOf(field: PctTimeField, value: number): number {
    return field === 'hour' ? this.hourShown(value) : value;
  }

  /** The number a cycle writes for an hour — the first one is `0`, `12` or `24`. */
  private hourShown(value: number): number {
    if (value !== 0) return value;
    const cycle = this.format().hourCycle;
    return cycle === 'h12' ? 12 : cycle === 'h24' ? 24 : 0;
  }

  /**
   * Read one by one through `texts()`, because the texts gate finds a read by that shape — a
   * key nobody can see read is a key it calls dead.
   */
  private nameOf(field: PctTimeField): string {
    switch (field) {
      case 'hour':
        return this.texts().timeHours;
      case 'minute':
        return this.texts().timeMinutes;
      case 'second':
        return this.texts().timeSeconds;
      case 'dayPeriod':
        return this.texts().timePeriod;
    }
  }

  /**
   * The active row of every column brought into view — centred the first time, when the panel
   * opens on a time somewhere down a column, and `block: 'nearest'` written out after that, so a
   * walk moves the column only when the row would leave it. Written out rather than called
   * through `scrollIntoView`, which also scrolls every ancestor that can — the page included.
   */
  private keepInView(): void {
    const centre = !this.placed;
    for (const ref of this.lists()) {
      const list = ref.nativeElement;
      const id = list.getAttribute('aria-activedescendant');
      const row =
        id === null ? null : list.querySelector<HTMLElement>(`#${id}`);
      if (row === null) continue;
      const top = row.offsetTop;
      const height = row.offsetHeight;
      const view = list.clientHeight;
      if (centre) list.scrollTop = top - (view - height) / 2;
      else if (top < list.scrollTop) list.scrollTop = top;
      else if (top + height > list.scrollTop + view)
        list.scrollTop = top + height - view;
    }
    this.placed = this.lists().length > 0;
  }

  /**
   * A step the columns cannot list makes the valid minutes depend on the hour, which columns
   * that are fields cannot show (0086 §5) — so it is refused, read as 60, and said.
   */
  private warnOnUnsupportedStep(): void {
    effect(() => {
      const step = this.step();
      if (isPctTimeStep(step)) return;
      console.warn(
        `[pct-time-columns] step=${step} is not a step the columns can list — a whole number ` +
          `of seconds that divides a minute, of minutes that divides an hour, or of hours ` +
          `that divides a day. It is read as 60.`,
      );
    });
  }
}
