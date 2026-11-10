import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctWheel, PctWheelOption } from '@pacit/components/wheel';
import { SbxDemo } from '../../ui/demo';

const two = (value: number): string => String(value).padStart(2, '0');

/** `count` rows of two digits, from `00`, every `step`. */
const digits = (count: number, step = 1): PctWheelOption<number>[] =>
  Array.from({ length: count }, (_, index) => ({
    value: index * step,
    label: two(index * step),
  }));

/**
 * Wheel: a listbox on the platform's own scroll (0089) — the row that rests on the line is
 * the value, and a ring is the same rows drawn three times with the scroll put back on the
 * middle turn where it settles (0091).
 */
@Component({
  selector: 'sbx-wheel-view',
  imports: [SbxDemo, PctWheel, PctField, FormField],
  templateUrl: './wheel-view.html',
  styleUrl: './wheel-view.scss',
})
export class WheelView {
  protected readonly days: readonly PctWheelOption[] = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday', disabled: true },
    { value: 'sun', label: 'Sunday' },
  ];
  protected readonly hours = digits(24);
  protected readonly minutes = digits(60);
  protected readonly quarters = digits(4, 15);

  /** A list with a value, and one that opens with none. */
  protected readonly day = signal<string | null>('wed');
  protected readonly unset = signal<string | null>(null);

  /** Two rings side by side — the fields of one value. */
  protected readonly hour = signal<number | null>(9);
  protected readonly minute = signal<number | null>(30);

  protected readonly model = signal<{ day: string | null }>({ day: null });
  protected readonly dayForm = form(this.model, (p) => {
    required(p.day, { message: 'Pick a day' });
  });

  protected readonly wrapped = signal<{ day: string | null }>({ day: 'tue' });
  protected readonly wrappedForm = form(this.wrapped);

  protected readonly quarter = signal<number | null>(15);

  protected write(value: string): void {
    this.day.set(value);
  }
}
