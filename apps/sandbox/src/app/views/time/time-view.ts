import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctTime, PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';
import { SbxDemo } from '../../ui/demo';

/**
 * Time: a text field the library formats and parses per locale, with columns of hours and
 * minutes in a panel beside it — and a value that is a wall-clock time rather than an instant.
 */
@Component({
  selector: 'sbx-time-view',
  imports: [SbxDemo, PctTime, PctTimeColumns, PctField, FormField],
  templateUrl: './time-view.html',
  styleUrl: './time-view.scss',
})
export class TimeView {
  protected readonly model = signal<{ startsAt: PctTimeOfDay | null }>({
    startsAt: '09:30',
  });

  protected readonly meetingForm = form(this.model, (p) => {
    required(p.startsAt, { message: 'Pick the time it starts' });
  });

  protected readonly time = signal<PctTimeOfDay | null>('13:05');
  protected readonly american = signal<PctTimeOfDay | null>('13:05');
  protected readonly polish = signal<PctTimeOfDay | null>('13:05');
  protected readonly korean = signal<PctTimeOfDay | null>('13:05');
  protected readonly quarter = signal<PctTimeOfDay | null>('13:15');
  protected readonly precise = signal<PctTimeOfDay | null>('13:05:30');
  protected readonly office = signal<PctTimeOfDay | null>('13:00');
  protected readonly night = signal<PctTimeOfDay | null>('23:30');
  protected readonly inline = signal<PctTimeOfDay | null>('13:05');

  protected readonly errors = [
    { kind: 'demo', message: 'Not inside office hours' },
  ];
}
