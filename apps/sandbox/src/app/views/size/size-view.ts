import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctDate, PctDay } from '@pacit/components/date';
import {
  PctField,
  PctNumber,
  PctSuffix,
  PctText,
} from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { PctSize } from '@pacit/components';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * A cross-cutting view: size as **one axis for the whole library** (req-api-size).
 * The point is in the line-up — a single component always looks right, a mismatch
 * shows only once two of them stand side by side on the same edge.
 */
@Component({
  selector: 'sbx-size-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctNumber,
    PctSuffix,
    PctSelect,
    PctDate,
    PctButton,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
  ],
  templateUrl: './size-view.html',
  styleUrl: './size-view.scss',
})
export class SizeView {
  protected readonly sizes: readonly PctSize[] = ['sm', 'md', 'lg'];
  protected readonly countries = COUNTRIES;
  protected readonly startsOn = signal<PctDay | null>('2026-08-27');

  protected readonly text = signal('Text');
  protected readonly amount = signal<number | null>(1499.9);
  protected readonly country = signal<string | null>('pl');
  protected readonly consent = signal(true);
  protected readonly plan = signal<string | null>('a');
}
