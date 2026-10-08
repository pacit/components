import { Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { pctWarn } from '@pacit/components/core';
import {
  PctField,
  PctLabelAux,
  PctMessageAux,
  PctNumber,
  PctPrefix,
  PctSuffix,
  PctText,
} from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/**
 * The `pct-field` wrapper: label, hint, error, decorations and border. The controls
 * inside are the backdrop here — each of them has a view of its own.
 */
@Component({
  selector: 'sbx-field-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctNumber,
    PctPrefix,
    PctSuffix,
    PctLabelAux,
    PctMessageAux,
    PctSelect,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctButton,
    FormField,
  ],
  templateUrl: './field-view.html',
  styleUrl: './field-view.scss',
})
export class FieldView {
  protected readonly countries = COUNTRIES;

  protected readonly model = signal({ email: '', country: '' });

  protected readonly userForm = form(this.model, (p) => {
    required(p.email, { message: 'The e-mail address is required' });
    email(p.email, {
      message: 'That does not look like a valid e-mail address',
    });
  });

  /**
   * A verdict without a veto (0087): the amount is allowed at any size and suspect above
   * ten thousand; the phone is optional and the form would rather have it. Neither rule
   * makes the form invalid — `submit()` runs over both.
   */
  protected readonly paymentModel = signal({ amount: 25_000, phone: '' });
  protected readonly paymentForm = form(this.paymentModel, (p) => {
    pctWarn(p.amount, ({ value }) =>
      (value() ?? 0) > 10_000
        ? {
            kind: 'big',
            message: 'Unusually large — it will be reviewed by hand',
          }
        : undefined,
    );
    pctWarn(
      p.phone,
      schema((phone) => {
        required(phone, {
          message: 'Without a number we cannot call you back',
        });
      }),
    );
  });

  /** The "description" field shows the counter and the hint-to-error swap at once. */
  protected readonly bioMax = 120;
  protected readonly bioModel = signal({ bio: '' });
  protected readonly bioForm = form(this.bioModel, (p) => {
    minLength(p.bio, 10, { message: 'Write at least 10 characters' });
  });

  protected readonly price = signal<number | null>(1499.9);
  protected readonly query = signal('');
  protected readonly consent = signal(false);
  protected readonly plan = signal<string | null>('free');

  protected clearPrice(): void {
    this.price.set(null);
  }
}
