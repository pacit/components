import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctDate, PctDay } from '@pacit/components/date';
import { PctDatetime, PctDateTime } from '@pacit/components/datetime';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';
import { PctField, PctNumber, PctText } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { PctSlider } from '@pacit/components/slider';
import { PctWheel, PctWheelOption } from '@pacit/components/wheel';
import { PctSwitch } from '@pacit/components/switch';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * A cross-cutting view: the same set of states for every control.
 *
 * The states are **forced through inputs** here, not derived from a form — the point
 * is to see the appearance of every state side by side, including those that are hard
 * to reach by clicking (an error on an untouched field, a disabled select with a
 * value picked).
 */
@Component({
  selector: 'sbx-states-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctNumber,
    PctSelect,
    PctSlider,
    PctWheel,
    PctDate,
    PctTime,
    PctDatetime,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctSwitch,
    PctButton,
  ],
  templateUrl: './states-view.html',
  styleUrl: './states-view.scss',
})
export class StatesView {
  protected readonly countries = COUNTRIES;
  protected readonly days: readonly PctWheelOption[] = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
  ];

  /**
   * A message injected outright, with no form schema. `kind` belongs to the
   * signal-forms error contract — a name of our own for the kind is enough here.
   */
  protected readonly errors = [
    { kind: 'demo', message: 'This value is not valid' },
  ];

  protected readonly text = signal('Text');
  protected readonly amount = signal<number | null>(1499.9);
  protected readonly country = signal<string | null>('pl');
  protected readonly checked = signal(true);
  protected readonly plan = signal<string | null>('a');
  protected readonly backups = signal(true);
  protected readonly budget = signal(40);
  protected readonly day = signal<string | null>('tue');
  protected readonly startsOn = signal<PctDay | null>('2026-08-27');
  protected readonly startsAt = signal<PctTimeOfDay | null>('13:05');
  protected readonly startsAtDay = signal<PctDateTime | null>(
    '2026-12-01T13:05',
  );
}
