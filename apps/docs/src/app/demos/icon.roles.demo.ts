import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import {
  fontAwesome,
  iconFont,
  PctIcon,
  providePctIcons,
} from '@pacit/components/icon';
import { PctSelect, PctSelectOption } from '@pacit/components/select';

// One scene three times over: the select draws the `chevron-down` role, the checkbox the
// `check` role and the avatar the `user` role; the bell is an id of yours. Only the
// providers differ between the cards.
const SCENE = `
  <pct-select ariaLabel="Fruit" [options]="fruit" value="apple" />
  <span class="row">
    <pct-checkbox label="Ripe" [checked]="true" />
    <pct-avatar />
    <pct-icon icon="bell" size="lg" />
  </span>
`;
const FRUIT: readonly PctSelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'pear', label: 'Pear' },
];
const CARD = `
  :host { display: grid; gap: 12px; }
  .row { display: flex; align-items: center; gap: 12px; }
`;

// The font alone: Font Awesome's classes for your ids and not a word about the library's
// roles, so every component keeps the drawing it ships with.
@Component({
  selector: 'demo-icon-roles-none',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [
    providePctIcons(iconFont({ class: (id) => `fa-solid fa-${id}` })),
  ],
  styles: CARD,
  template: SCENE,
})
export class IconRolesNone {
  readonly fruit = FRUIT;
}

// One role, in the font's spelling: the select's arrow is Font Awesome's caret, and the
// other nine drawings stay the library's.
@Component({
  selector: 'demo-icon-roles-arrow',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [
    providePctIcons(
      iconFont({
        class: (id) => `fa-solid fa-${id}`,
        roles: { 'chevron-down': 'caret-down' },
      }),
    ),
  ],
  styles: CARD,
  template: SCENE,
})
export class IconRolesArrow {
  readonly fruit = FRUIT;
}

// The adapter's whole map with one role handed back: Font Awesome's arrow and silhouette,
// the library's tick.
@Component({
  selector: 'demo-icon-roles-tick',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [providePctIcons(fontAwesome({ roles: { check: undefined } }))],
  styles: CARD,
  template: SCENE,
})
export class IconRolesTick {
  readonly fruit = FRUIT;
}

/**
 * Which roles a set dresses
 *
 * The `roles` of a source are what dresses the library, and the map is yours to shape. A
 * font with no roles — `iconFont()` and the font's class pattern — draws your ids and leaves
 * every component as it ships. One role in the map swaps that one drawing, in any spelling
 * the font has: the select's arrow becomes Font Awesome's caret in the second card, and
 * nothing else moves. The adapter's whole map with a role set to `undefined` is the mirror
 * image — Font Awesome's arrow and silhouette, and the checkbox's tick handed back to the
 * library. `primeIcons()`, `materialIcons()` and `svgIcons()` take `roles` the same way.
 */
@Component({
  selector: 'demo-icon-roles',
  imports: [IconRolesNone, IconRolesArrow, IconRolesTick],
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 24px 32px;
      align-items: start;
    }
    figure {
      display: grid;
      gap: 12px;
      margin: 0;
      inline-size: 10rem;
    }
    figcaption {
      font-size: 0.875rem;
      color: var(--pct-text-muted);
    }
  `,
  template: `
    <figure>
      <demo-icon-roles-none />
      <figcaption>The font alone: nothing of the library's replaced</figcaption>
    </figure>
    <figure>
      <demo-icon-roles-arrow />
      <figcaption>One role: the arrow, as a caret</figcaption>
    </figure>
    <figure>
      <demo-icon-roles-tick />
      <figcaption>The adapter's map, less the tick</figcaption>
    </figure>
  `,
})
export class IconRolesDemo {}
