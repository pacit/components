import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';

@Component({
  selector: 'app-root',
  imports: [PctButton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Motyw drugiego panelu — demonstracja scoped theme (wym-theme-4). */
  protected readonly panelDark = signal(true);

  protected togglePanel(): void {
    this.panelDark.update((v) => !v);
  }
}
