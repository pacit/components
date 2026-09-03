import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTheme, PctThemeName } from '@pacit/components/theme';

/**
 * An island that switches
 *
 * The directive writes one attribute; the tokens under it do the rest. Bind it to a signal
 * and a whole region of the page changes theme without touching the document.
 */
@Component({
  selector: 'demo-theme-islands',
  imports: [PctButton, PctTheme],
  styles:
    ':host { display: grid; gap: 12px; } section { padding: 16px; border-radius: 12px; background: var(--pct-surface); color: var(--pct-text); border: 1px solid var(--pct-border); }',
  template: `
    <section [pctTheme]="island()">
      <p>This island is {{ island() }}.</p>
      <button pctButton variant="soft" size="sm" (click)="flip()">
        Flip the island
      </button>
    </section>
  `,
})
export class ThemeIslandsDemo {
  readonly island = signal<PctThemeName>('dark');

  protected flip(): void {
    this.island.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
