import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';
import { PctButton } from '@pacit/components/button';
import { PctTheme } from '@pacit/components/theme';

/**
 * Two islands one attribute apart: the same badge and the same button, pinned light and
 * pinned dark. The directive draws nothing of its own, so the pair is the smallest honest
 * scene — one island alone would only repeat the surface the page already has — and it
 * stands at rest, because a toggle is state the directive deliberately does not ship (0059).
 */
@Component({
  selector: 'demo-theme-card',
  imports: [PctBadge, PctButton, PctTheme],
  // The islands ask for the surface themselves. The directive writes `data-theme` and stops
  // there — the tokens under it are the skin's, and an element that names none of them
  // paints nothing to see the flip on.
  styles: `
    :host {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--pct-space-3);
    }
    section {
      display: grid;
      justify-items: start;
      gap: var(--pct-space-3);
      padding: var(--pct-space-4);
      border: 1px solid var(--pct-border);
      border-radius: var(--pct-radius-md);
      background: var(--pct-surface);
      color: var(--pct-text);
    }
    p {
      margin: 0;
      color: var(--pct-text-muted);
      font-size: var(--pct-font-size-sm);
    }
  `,
  template: `
    <section pctTheme="light">
      <p>light</p>
      <pct-badge>Draft</pct-badge>
      <button pctButton variant="soft">Save</button>
    </section>
    <section pctTheme="dark">
      <p>dark</p>
      <pct-badge>Draft</pct-badge>
      <button pctButton variant="soft">Save</button>
    </section>
  `,
})
export class ThemeCardScene {}
