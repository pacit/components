import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctField, PctNumber, PctText } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
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
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctButton,
  ],
  templateUrl: './states-view.html',
  styleUrl: './states-view.scss',
})
export class StatesView {
  protected readonly countries = COUNTRIES;

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
}
