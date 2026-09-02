import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/** Five faces, one directive — `variant` picks the paint, the element stays a `<button>`. */
@Component({
  selector: 'demo-button',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <button pctButton variant="hero">Get started</button>
    <button pctButton>Solid</button>
    <button pctButton variant="outline">Outline</button>
    <button pctButton variant="soft">Soft</button>
    <button pctButton variant="ghost">Ghost</button>
    <button pctButton loading>Saving…</button>
  `,
})
export class ButtonDemo {}
