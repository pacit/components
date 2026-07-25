import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import {
  PctField,
  PctPrefix,
  PctSuffix,
  PctText,
} from '@pacit/components/field';
import { PctSelect, PctSelectOption } from '@pacit/components/select';

@Component({
  selector: 'app-root',
  imports: [
    PctButton,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctSelect,
    PctField,
    PctText,
    PctPrefix,
    PctSuffix,
    FormField,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Motyw drugiego panelu — demonstracja scoped theme (wym-theme-4). */
  protected readonly panelDark = signal(true);

  /** Model formularza — signal forms (wym-api-5). */
  protected readonly countries: readonly PctSelectOption[] = [
    { value: 'pl', label: 'Polska' },
    { value: 'de', label: 'Niemcy' },
    { value: 'cz', label: 'Czechy', disabled: true },
    { value: 'sk', label: 'Słowacja' },
    { value: 'ua', label: 'Ukraina' },
    { value: 'lt', label: 'Litwa' },
  ];

  protected readonly model = signal({
    email: '',
    terms: false,
    plan: '',
    country: '',
  });

  protected readonly userForm = form(this.model, (p) => {
    required(p.email, { message: 'Adres e-mail jest wymagany' });
    email(p.email, { message: 'To nie wygląda na poprawny adres e-mail' });
    required(p.terms, { message: 'Musisz zaakceptować regulamin' });
    required(p.plan, { message: 'Wybierz plan' });
    required(p.country, { message: 'Wybierz kraj' });
  });

  /** Select w panelu ciemnym — sprawdza propagację motywu do nakładki. */
  protected readonly scopedCountry = signal('');

  /** Demo obudowy pct-field ze slotami. */
  protected readonly price = signal('1499');

  protected clearPrice(): void {
    this.price.set('');
  }

  /** Stan nieokreślony — demonstracja aria-checked="mixed". */
  protected readonly partial = signal(true);

  /** Demo układu poziomego radiogroup. */
  protected readonly layoutDemo = signal('a');

  protected togglePanel(): void {
    this.panelDark.update((v) => !v);
  }
}
