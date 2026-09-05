import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_TEXTS,
  PctSize,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

import {
  isPctDay,
  PctDay,
  pctAddDays,
  pctAddMonths,
  pctClampDay,
  pctDay,
  pctDayParts,
  pctDaysInMonth,
  pctMonthGrid,
  pctToday,
  pctWeekday,
} from './day';
import {
  pctDayFormat,
  pctFirstDayOfWeek,
  pctMonthCaption,
  pctWeekdayNames,
} from './locale';

/** One cell of the grid, with everything the template and the reader need already decided. */
export interface PctCalendarCell {
  readonly day: PctDay;
  /** The number the eye reads. */
  readonly label: string;
  /** The whole date in words — the cell's accessible name, because `27` is not one. */
  readonly name: string;
  /** Whether the day belongs to the month the caption names. */
  readonly inMonth: boolean;
  /** Outside `min`/`max`, or refused by `dateDisabled`. */
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly today: boolean;
}

/** A day the consumer refuses — weekends, holidays, a taken slot. */
export type PctDayPredicate = (day: PctDay) => boolean;

/**
 * A day input written as an attribute is a string; one bound from a model may be anything.
 * Absent is `undefined` and not `null`, because `min` / `max` belong to the `FormUiControl`
 * contract and that contract spells an absent bound `undefined` — the same reader
 * `[pctNumber]` and `<pct-slider>` use for their numeric ones.
 */
function optionalDay(value: unknown): PctDay | undefined {
  return isPctDay(value) ? value : undefined;
}

/**
 * Calendar — one month of days as a `role="grid"`, walked by a roving tabindex.
 *
 * It is the ARIA APG's
 * [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * grid, and it is a component of its own rather than a private half of `<pct-date>` for one
 * reason: a calendar standing on the page, always visible, is a real control and not a
 * degenerate date field. `<pct-date>` puts this one in a panel; a booking screen puts it in
 * a column.
 *
 * The value is a [`PctDay`](./day.ts) — `YYYY-MM-DD`, a calendar day and not an instant
 * ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)).
 *
 * **The cursor moves focus, it does not point at it.** A grid is the menu's half of
 * [0032](../../../../docs/decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md), not
 * the listbox's: the cell the user is on IS the focused element, which is what makes
 * `aria-activedescendant` unnecessary and a `<td>` with `tabindex` sufficient.
 *
 * @example
 * <pct-calendar [(value)]="day" min="2026-01-01" max="2026-12-31" />
 *
 * @example
 * // Weekends refused, with the bounds left open.
 * <pct-calendar [(value)]="day" [dateDisabled]="isWeekend" />
 */
@Component({
  selector: 'pct-calendar',
  imports: [NgTemplateOutlet, PctIcon],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  host: {
    class: 'pct-calendar',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctCalendar {
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);

  /** The chosen day, or `null`. */
  readonly value = model<PctDay | null>(null);

  /** The earliest and latest day the walk may reach; absent means no bound on that side. */
  readonly min = input(undefined, { transform: optionalDay });

  /** The latest day the walk may reach; absent means no bound on that side — the other half of `min`. */
  readonly max = input(undefined, { transform: optionalDay });

  /**
   * Days inside the bounds that still cannot be picked. The split is deliberate:
   * **`min`/`max` are the range and this is the holes in it** — the bounds clamp where the
   * keyboard can go, a refused day is reached, announced and simply not takeable.
   */
  readonly dateDisabled = input<PctDayPredicate | null>(null);

  /** Freezes the grid: no day can be picked, the walk and the month buttons stop, and `aria-disabled` says so. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Overrides the application's `LOCALE_ID`, as on `[pctNumber]` and `<pct-slider>`. */
  readonly locale = input<string>('');

  /**
   * Which day the week starts on, `1` (Monday) … `7` (Sunday). Absent, the locale decides —
   * through the platform where it answers and through a table of regions where it does not
   * (`locale.ts`, and firefox 151 is the engine that does not).
   */
  readonly firstDayOfWeek = input(0, { transform: numberAttribute });

  /** Scales the grid with the field sizes, so a panel matches the field it opens from; from `providePctConfig` by default (req-api-config). */
  readonly size = input<PctSize>(this.config.defaultSize);

  /** The accessible name of the grid; the panel that owns one passes its own. */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere on the page. */
  readonly ariaLabelledby = input<string>('');

  /**
   * A day was chosen **by the user** — which is not the same event as `value` changing, and
   * the difference is what closes a panel: a value written from outside must not.
   */
  readonly dayPicked = output<PctDay>();

  private readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid');

  private readonly uid = nextPctId('pct-calendar');
  protected readonly captionId = `${this.uid}-caption`;

  protected readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  protected readonly weekStart = computed(() => {
    const asked = this.firstDayOfWeek();
    return asked >= 1 && asked <= 7
      ? asked
      : pctFirstDayOfWeek(this.activeLocale());
  });

  /**
   * Today as the user's own clock has it. A signal set once at construction rather than a
   * read inside a `computed`: a calendar left open across midnight redrawing itself is not a
   * feature anybody asked for, and a `computed` that read the clock would be a signal whose
   * value depends on when it happens to be evaluated.
   */
  private readonly today = signal(pctToday());

  /**
   * The day the keyboard is standing on. `null` until something puts it somewhere — the
   * value, or today held inside the bounds.
   */
  private readonly cursorDay = signal<PctDay | null>(null);

  protected readonly cursor = computed<PctDay>(() => {
    const held = this.cursorDay();
    if (held !== null) return held;
    const value = this.value();
    return pctClampDay(
      value !== null && isPctDay(value) ? value : this.today(),
      this.min(),
      this.max(),
    );
  });

  protected readonly caption = computed(() =>
    pctMonthCaption(this.activeLocale(), this.cursor()),
  );

  protected readonly weekdays = computed(() =>
    pctWeekdayNames(this.activeLocale(), this.weekStart()),
  );

  /**
   * Whether a day cannot be taken — the bounds and the consumer's predicate in ONE rule,
   * because the grid draws it and the keyboard obeys it, and two copies of it would be two
   * chances to disagree about which days are takeable.
   */
  private readonly refuses = computed(() => {
    const min = this.min();
    const max = this.max();
    const refused = this.dateDisabled();
    return (day: PctDay): boolean =>
      (min !== undefined && day < min) ||
      (max !== undefined && day > max) ||
      (refused?.(day) ?? false);
  });

  protected readonly weeks = computed<readonly (readonly PctCalendarCell[])[]>(
    () => {
      const cursor = pctDayParts(this.cursor());
      const format = pctDayFormat(this.activeLocale());
      const value = this.value();
      const selected = value !== null && isPctDay(value) ? value : null;
      const today = this.today();
      const refuses = this.refuses();

      return pctMonthGrid(cursor.year, cursor.month, this.weekStart()).map(
        (week) =>
          week.map((day) => {
            const parts = pctDayParts(day);
            return {
              day,
              // The number as this language writes it — `٢٧` where the locale's digits are
              // the Arabic-Indic ones, because the field above the grid is written in them.
              label: format.number(parts.day),
              name: format.formatLong(day),
              inMonth:
                parts.month === cursor.month && parts.year === cursor.year,
              disabled: refuses(day),
              selected: selected === day,
              today: day === today,
            };
          }),
      );
    },
  );

  /** Whether a step of that size still lands inside the bounds — the nav buttons read it. */
  protected readonly canGoBack = computed(() => {
    const min = this.min();
    return (
      min === undefined || pctAddMonths(this.cursor(), -1) >= startOfMonth(min)
    );
  });

  protected readonly canGoForward = computed(() => {
    const max = this.max();
    return (
      max === undefined || pctAddMonths(this.cursor(), 1) <= endOfMonth(max)
    );
  });

  /**
   * How many times the keyboard has asked for focus to follow the cursor. A counter and not
   * a flag: two moves in a row have to be two runs of the hook below, and a flag set twice
   * is set once.
   */
  private readonly focusWanted = signal(0);

  constructor() {
    // `afterRenderEffect` and not `effect`: a month step REBUILDS the grid, so the cell the
    // cursor lands on is created by the very pass that moved it — a hook running before the
    // render would be looking for an element that does not exist yet (the select's own
    // reading of the same problem, `lesson-94`'s neighbour).
    afterRenderEffect(() => {
      if (this.focusWanted() === 0) return;
      untracked(() => this.focusCursor());
    });
  }

  /**
   * Focuses the cell the cursor is on — what a panel calls the moment it opens. With no cell
   * to land on the grid itself takes it, so an opening never leaves focus on the `body`:
   * that is the state where every key this control owns is dead and nothing reports it
   * (`focus.ts`'s reading of the same failure, from the other side).
   */
  focusCursor(): void {
    const grid = this.grid().nativeElement;
    const cell = grid.querySelector<HTMLElement>(
      '[data-pct-part="day"][tabindex="0"]',
    );
    (cell ?? grid).focus();
  }

  /** Moves the cursor and takes focus with it — the grid moves focus (0032). */
  private moveTo(day: PctDay, event?: Event): void {
    event?.preventDefault();
    const held = pctClampDay(day, this.min(), this.max());
    if (held === this.cursor()) return;
    this.cursorDay.set(held);
    this.focusWanted.update((n) => n + 1);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const cursor = this.cursor();
    // A grid's arrows are about the CELL to the side, and which side that is depends on the
    // direction the grid is written in — `dir="rtl"` mirrors the drawing, so it has to mirror
    // the movement too, or the cursor walks away from the key that was pressed
    // (`req-token-logical` read on the keyboard rather than in a sheet).
    const rtl =
      this.grid().nativeElement.ownerDocument.defaultView?.getComputedStyle(
        this.grid().nativeElement,
      ).direction === 'rtl';
    const inline = rtl ? -1 : 1;

    switch (event.key) {
      case 'ArrowRight':
        return this.moveTo(pctAddDays(cursor, inline), event);
      case 'ArrowLeft':
        return this.moveTo(pctAddDays(cursor, -inline), event);
      case 'ArrowDown':
        return this.moveTo(pctAddDays(cursor, 7), event);
      case 'ArrowUp':
        return this.moveTo(pctAddDays(cursor, -7), event);
      case 'Home':
        return this.moveTo(
          pctAddDays(
            cursor,
            -((pctWeekday(cursor) - this.weekStart() + 7) % 7),
          ),
          event,
        );
      case 'End':
        return this.moveTo(
          pctAddDays(
            cursor,
            6 - ((pctWeekday(cursor) - this.weekStart() + 7) % 7),
          ),
          event,
        );
      case 'PageUp':
        return this.moveTo(
          pctAddMonths(cursor, event.shiftKey ? -12 : -1),
          event,
        );
      case 'PageDown':
        return this.moveTo(
          pctAddMonths(cursor, event.shiftKey ? 12 : 1),
          event,
        );
      case 'Enter':
      case ' ':
        // The CURSOR is taken, not the cell the key landed on. They are the same in every
        // resting state and differ for exactly one frame: a move writes the cursor and focus
        // follows it after the render, so an `Enter` sent in that window reaches the cell
        // being left. Measured — a keyboard case that pressed the two in the same tick
        // picked the day it had just walked off, in one engine of three.
        event.preventDefault();
        return this.take(cursor);
      default:
        return;
    }
  }

  /** A step of the nav buttons: the month moves and the cursor moves with it. */
  protected step(months: number): void {
    const next = pctAddMonths(this.cursor(), months);
    const held = pctClampDay(next, this.min(), this.max());
    this.cursorDay.set(held);
  }

  /** A press lands on a CELL, which is the one place the pointer and the cursor may differ. */
  protected pick(cell: PctCalendarCell, event?: Event): void {
    event?.preventDefault();
    this.take(cell.day);
  }

  private take(day: PctDay): void {
    if (this.disabled() || this.refuses()(day)) return;
    this.cursorDay.set(day);
    this.value.set(day);
    this.dayPicked.emit(day);
  }

  protected isCursor(day: PctDay): boolean {
    return day === this.cursor();
  }
}

function startOfMonth(day: PctDay): PctDay {
  const { year, month } = pctDayParts(day);
  return pctDay(year, month, 1);
}

function endOfMonth(day: PctDay): PctDay {
  const { year, month } = pctDayParts(day);
  return pctDay(year, month, pctDaysInMonth(year, month));
}
