import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTheme } from '@pacit/components/theme';

/** The directive only spells the attribute — the cascade does the theming. */
@Component({
  selector: 'demo-theme',
  imports: [PctButton, PctTheme],
  styles:
    'section { background: var(--pct-surface); color: var(--pct-text); border: 1px solid var(--pct-border); border-radius: 8px; padding: 16px; display: grid; gap: 8px; justify-items: start; }',
  template: `
    <section pctTheme="dark">
      <p>A dark island: one attribute, every token below it flips.</p>
      <button pctButton variant="soft" size="sm">Reads the island</button>
    </section>
  `,
})
export class ThemeDemo {}
