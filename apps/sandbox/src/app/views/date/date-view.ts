import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  PctCalendar,
  PctDate,
  PctDay,
  pctDayBounds,
} from '@pacit/components/date';
import { PctField } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Date: a text field the library formats and parses per locale, with a calendar in a panel
 * beside it — and a value that is a calendar DAY rather than an instant.
 */
@Component({
  selector: 'sbx-date-view',
  imports: [SbxDemo, PctDate, PctCalendar, PctField, FormField],
  templateUrl: './date-view.html',
  styleUrl: './date-view.scss',
})
export class DateView {
  protected readonly model = signal<{ startsOn: PctDay | null }>({
    startsOn: '2026-08-27',
  });

  protected readonly bookingForm = form(this.model, (p) => {
    required(p.startsOn, { message: 'Pick the day it starts' });
  });

  protected readonly stay = signal<{
    arrives: PctDay | null;
    leaves: PctDay | null;
  }>({ arrives: '2026-08-27', leaves: '2026-08-30' });

  /**
   * Bounds a signal form hands the fields: the compiler refuses `min` and `max` beside
   * `[formField]`, and Angular's own `minDate()` / `maxDate()` take a `Date`.
   */
  protected readonly stayForm = form(this.stay, (p) => {
    pctDayBounds(p.arrives, {
      min: '2026-08-01',
      max: '2026-12-31',
      message: 'Bookings run from August to December 2026',
    });
    pctDayBounds(p.leaves, {
      min: ({ valueOf }) => valueOf(p.arrives) ?? undefined,
      message: 'The stay ends after it starts',
    });
  });

  protected readonly day = signal<PctDay | null>('2026-08-27');
  protected readonly bounded = signal<PctDay | null>('2026-08-27');
  protected readonly polish = signal<PctDay | null>('2026-08-27');
  protected readonly japanese = signal<PctDay | null>('2026-08-27');
  protected readonly inline = signal<PctDay | null>('2026-08-27');

  /** A hole in the range rather than an edge of it: weekends stay reachable and untakeable. */
  protected readonly noWeekends = (value: PctDay): boolean => {
    const at = new Date(`${value}T00:00:00Z`).getUTCDay();
    return at === 0 || at === 6;
  };
}
