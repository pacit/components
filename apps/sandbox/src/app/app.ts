import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctInput } from '@pacit/components/input';

@Component({
  selector: 'app-root',
  imports: [PctButton, PctInput, FormField],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Motyw drugiego panelu — demonstracja scoped theme (wym-theme-4). */
  protected readonly panelDark = signal(true);

  /** Model formularza — signal forms (wym-api-5). */
  protected readonly model = signal({ email: '' });

  protected readonly userForm = form(this.model, (p) => {
    required(p.email, { message: 'Adres e-mail jest wymagany' });
    email(p.email, { message: 'To nie wygląda na poprawny adres e-mail' });
  });

  protected togglePanel(): void {
    this.panelDark.update((v) => !v);
  }
}
