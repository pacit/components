import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctDay, pctWeekday } from '@pacit/components/date';
import {
  PctDatetime,
  PctDateTime,
  pctDateTimeBounds,
} from '@pacit/components/datetime';
import { PctField } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Datetime: a day and a time of it as two texts under one label, each the library formats and
 * parses per locale, with one panel holding the calendar and the columns — and a value that is
 * a wall clock with a date rather than an instant.
 */
@Component({
  selector: 'sbx-datetime-view',
  imports: [SbxDemo, PctDatetime, PctField, FormField],
  templateUrl: './datetime-view.html',
  styleUrl: './datetime-view.scss',
})
export class DatetimeView {
  protected readonly model = signal<{ startsAt: PctDateTime | null }>({
    startsAt: '2026-12-01T09:30',
  });

  protected readonly meetingForm = form(this.model, (p) => {
    required(p.startsAt, { message: 'Pick the day and the time it starts' });
  });

  protected readonly standalone = signal<PctDateTime | null>(
    '2026-12-01T13:05',
  );
  protected readonly american = signal<PctDateTime | null>('2026-12-01T13:05');
  protected readonly polish = signal<PctDateTime | null>('2026-12-01T13:05');
  protected readonly vietnamese = signal<PctDateTime | null>(
    '2026-12-01T13:05',
  );
  protected readonly window = signal<PctDateTime | null>('2026-12-01T09:15');
  protected readonly booked = signal<PctDateTime | null>('2026-12-02T09:00');
  protected readonly precise = signal<PctDateTime | null>(
    '2026-12-01T13:05:30',
  );

  /** Saturdays and Sundays — refused whole, hours included. */
  protected readonly weekend = (day: PctDay): boolean => pctWeekday(day) >= 6;

  /** A room's bookings on 2 December: the whole of ten o'clock, and half past twelve. */
  protected readonly taken = (value: PctDateTime): boolean =>
    value.startsWith('2026-12-02T10:') || value === '2026-12-02T12:30';

  protected readonly talk = signal<{
    startsAt: PctDateTime | null;
    endsAt: PctDateTime | null;
  }>({ startsAt: '2026-12-01T10:00', endsAt: '2026-12-01T11:00' });

  /**
   * Bounds a signal form hands the fields: the compiler refuses `min` and `max` beside
   * `[formField]`, and Angular's own `minDate()` / `maxDate()` take a `Date`.
   */
  protected readonly talkForm = form(this.talk, (p) => {
    pctDateTimeBounds(p.startsAt, {
      min: '2026-12-01T09:00',
      max: '2026-12-03T18:00',
      message:
        'The conference runs from 1 December, 09:00, to 3 December, 18:00',
    });
    // The start and the close in one rule: a datetime's pair is never a window, so a start
    // past the close is a talk with no end the form takes, not the night between them.
    pctDateTimeBounds(p.endsAt, {
      min: ({ valueOf }) => valueOf(p.startsAt) ?? undefined,
      max: '2026-12-03T18:00',
      message: (error) =>
        error.kind === 'minDateTime'
          ? 'It ends after it starts'
          : 'The conference closes on 3 December at 18:00',
    });
  });
}
