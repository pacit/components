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
import { PctSelect, PctSelectOption } from '@pacit/components/select';

/**
 * Widok „wszystko naraz" — dotychczasowa strona sandboxa w całości.
 *
 * Zostaje jako gęsty przekrój pod audyt axe i przyszłe testy screenshotowe;
 * poszczególne panele rozejdą się stąd do widoków per komponent.
 */
@Component({
  selector: 'sbx-kitchen-sink',
  imports: [
    PctButton,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
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

  protected readonly model = signal<{
    email: string;
    terms: boolean;
    plan: string;
    country: string;
    seats: number | null;
  }>({
    email: '',
    terms: false,
    plan: '',
    country: '',
    seats: 1,
  });

  protected readonly userForm = form(this.model, (p) => {
    required(p.email, { message: 'Adres e-mail jest wymagany' });
    email(p.email, { message: 'To nie wygląda na poprawny adres e-mail' });
    required(p.terms, { message: 'Musisz zaakceptować regulamin' });
    required(p.plan, { message: 'Wybierz plan' });
    required(p.country, { message: 'Wybierz kraj' });
    required(p.seats, { message: 'Podaj liczbę stanowisk' });
    min(p.seats, 1, { message: 'Minimum jedno stanowisko' });
    max(p.seats, 500, {
      message: 'Powyżej 500 stanowisk skontaktuj się z nami',
    });
  });

  /** Select w panelu ciemnym — sprawdza propagację motywu do nakładki. */
  protected readonly scopedCountry = signal('');

  /** Wielkości do zestawienia „pole obok przycisku" (wym-api-18). */
  protected readonly sizes = ['sm', 'md', 'lg'] as const;

  /** Select w zestawieniu wielkości — wielkość bierze z obudowy. */
  protected readonly sizeCountry = signal('pl');

  /** Demo obudowy pct-field ze slotami — kwota z dwoma miejscami po przecinku. */
  protected readonly price = signal<number | null>(1499.9);

  protected clearPrice(): void {
    this.price.set(null);
  }

  /** Stan nieokreślony — demonstracja aria-checked="mixed". */
  protected readonly partial = signal(true);

  /** Demo układu poziomego radiogroup. */
  protected readonly layoutDemo = signal('a');

  protected togglePanel(): void {
    this.panelDark.update((v) => !v);
  }
}
