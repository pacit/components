import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * Faces
 *
 * `variant` picks the paint. Solid carries the primary action, outline and ghost sit beside
 * it, soft is the quiet tint — and hero is the one that drifts, reserved for the single most
 * important call on a page.
 */
@Component({
  selector: 'demo-button-faces',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <button pctButton>Solid</button>
    <button pctButton variant="outline">Outline</button>
    <button pctButton variant="ghost">Ghost</button>
    <button pctButton variant="soft">Soft</button>
    <button pctButton variant="hero">Hero</button>
  `,
})
export class ButtonFacesDemo {}
