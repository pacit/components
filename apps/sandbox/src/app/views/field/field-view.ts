import { Component, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
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
 * Obudowa `pct-field`: etykieta, podpowiedź, błąd, dekoracje i ramka.
 * Kontrolki w środku są tu tłem — każda ma własny widok.
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
    required(p.email, { message: 'Adres e-mail jest wymagany' });
    email(p.email, { message: 'To nie wygląda na poprawny adres e-mail' });
  });

  /** Pole „opis" pokazuje jednoczesność licznika i wymiany podpowiedzi na błąd. */
  protected readonly bioMax = 120;
  protected readonly bioModel = signal({ bio: '' });
  protected readonly bioForm = form(this.bioModel, (p) => {
    minLength(p.bio, 10, { message: 'Napisz przynajmniej 10 znaków' });
  });

  protected readonly price = signal<number | null>(1499.9);
  protected readonly query = signal('');
  protected readonly consent = signal(false);
  protected readonly plan = signal<string | null>('free');

  protected clearPrice(): void {
    this.price.set(null);
  }
}
