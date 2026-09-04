import { Component, signal } from '@angular/core';
import {
  PctCalendar,
  PctDay,
  pctAddDays,
  pctToday,
} from '@pacit/components/date';

/**
 * A month at rest — a day already chosen, and today ringed rather than filled.
 *
 * The grid stays six weeks, because a month that stopped mid-week would misreport a control
 * whose height is fixed on purpose. The day cell comes down instead: six rows at `sm` are
 * 168 px on their own and the stage has 144, so the card takes `--pct-date-day-size` below
 * the shipped axis and lets every other box follow it (`req-api-size`). A smaller calendar,
 * not a partial one.
 */
@Component({
  selector: 'demo-calendar-card',
  imports: [PctCalendar],
  styles: `
    :host {
      display: block;
      /* One number moves the whole month — the nav, the weekday headings and the seven
         columns are all derived from the day cell. The type stays on the shipped scale:
         the boxes are what the card is short of, not the reading. */
      --pct-date-day-size: 16px;
      --pct-date-day-font-size: var(--pct-font-size-sm);
      --pct-date-caption-font-size: var(--pct-font-size-sm);
      --pct-date-weekday-font-size: var(--pct-font-size-sm);
      --pct-date-nav-size: 14px;
      --pct-date-icon-size: 10px;
      --pct-date-gap: var(--pct-space-2);
      line-height: 1.2;
    }
  `,
  template: ` <pct-calendar [(value)]="day" ariaLabel="Pick a day" /> `,
})
export class CalendarCardScene {
  /**
   * A day ahead of today rather than today itself: the fill and the ring are two different
   * facts, and a value sitting on today would draw only one of them.
   */
  readonly day = signal<PctDay | null>(pctAddDays(pctToday(), 3));
}
