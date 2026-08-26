import { Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  max,
  min,
  required,
} from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import {
  PctField,
  PctNumber,
  PctPrefix,
  PctSuffix,
  PctText,
} from '@pacit/components/field';
import {
  PctMultiSelect,
  PctSelect,
  PctSelectOption,
} from '@pacit/components/select';
import { PctSwitch } from '@pacit/components/switch';

/**
 * The "everything at once" view — the sandbox page as it used to be, in full.
 *
 * It stays as a dense cross-section for the axe audit and the visual tests; the
 * individual panels move out of here into the per-component views.
 */
@Component({
  selector: 'sbx-kitchen-sink',
  imports: [
    PctButton,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctSwitch,
    PctMultiSelect,
    PctSelect,
    PctField,
    PctText,
    PctNumber,
    PctPrefix,
    PctSuffix,
    FormField,
  ],
  templateUrl: './kitchen-sink.html',
  styleUrl: './kitchen-sink.scss',
})
export class KitchenSink {
  /** The theme of the second panel — a scoped theme demo (req-token-scoped). */
  protected readonly panelDark = signal(true);

  /** The form model — signal forms (req-api-signal-forms). */
  protected readonly countries: readonly PctSelectOption[] = [
    { value: 'pl', label: 'Poland' },
    { value: 'de', label: 'Germany' },
    { value: 'cz', label: 'Czechia', disabled: true },
    { value: 'sk', label: 'Slovakia' },
    { value: 'ua', label: 'Ukraine' },
    { value: 'lt', label: 'Lithuania' },
  ];

  protected readonly model = signal<{
    email: string;
    terms: boolean;
    plan: string;
    country: string;
    regions: string[];
    seats: number | null;
  }>({
    email: '',
    terms: false,
    plan: '',
    country: '',
    regions: [],
    seats: 1,
  });

  protected readonly userForm = form(this.model, (p) => {
    required(p.email, { message: 'The e-mail address is required' });
    email(p.email, {
      message: 'That does not look like a valid e-mail address',
    });
    required(p.terms, { message: 'You have to accept the terms' });
    required(p.plan, { message: 'Pick a plan' });
    required(p.country, { message: 'Pick a country' });
    required(p.seats, { message: 'Give the number of seats' });
    min(p.seats, 1, { message: 'At least one seat' });
    max(p.seats, 500, {
      message: 'Above 500 seats, get in touch with us',
    });
  });

  /** The select in the dark panel — checks the theme propagates to the overlay. */
  protected readonly scopedCountry = signal<string | null>('');

  /** The sizes for the "a field beside a button" line-up (req-api-size). */
  protected readonly sizes = ['sm', 'md', 'lg'] as const;

  /** The select in the size line-up — it takes its size from the wrapper. */
  protected readonly sizeCountry = signal<string | null>('pl');

  /** A pct-field demo with slots — an amount with two decimal places. */
  protected readonly price = signal<number | null>(1499.9);

  protected clearPrice(): void {
    this.price.set(null);
  }

  /** The indeterminate state — a demonstration of aria-checked="mixed". */
  protected readonly partial = signal(true);

  /** The horizontal radiogroup layout demo. */
  protected readonly layoutDemo = signal<string | null>('a');

  /** A setting that takes effect the moment it is moved. */
  protected readonly backups = signal(true);

  protected togglePanel(): void {
    this.panelDark.update((v) => !v);
  }
}
