import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import { primeIcons, providePctIcons } from '@pacit/components/icon';

/**
 * One line dresses the library
 *
 * A source that knows the library's roles in its own vocabulary swaps the drawings every
 * component ships with: `providePctIcons(primeIcons())` on this card, and the avatar's
 * silhouette and the checkbox's tick are PrimeIcons' — `pi pi-user`, `pi pi-check`. It is an
 * ordinary provider, so the same line at bootstrap dresses the whole application, and here
 * it stops at the edge of the card: the pair on the right draws what the components ship.
 */
@Component({
  selector: 'demo-icon-dressed-card',
  imports: [PctAvatar, PctCheckbox],
  providers: [providePctIcons(primeIcons())],
  styles: ':host { display: inline-flex; align-items: center; gap: 12px; }',
  template: `
    <pct-avatar />
    <pct-checkbox label="PrimeIcons" [checked]="true" />
  `,
})
export class IconDressedCard {}

@Component({
  selector: 'demo-icon-dressed',
  imports: [IconDressedCard, PctAvatar, PctCheckbox],
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 32px;
    }
    .plain {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
  `,
  template: `
    <demo-icon-dressed-card />
    <span class="plain">
      <pct-avatar />
      <pct-checkbox label="Built in" [checked]="true" />
    </span>
  `,
})
export class IconDressedDemo {}
