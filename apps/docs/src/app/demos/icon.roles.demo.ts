import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import {
  materialIcons,
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
    <pct-icon icon="notifications" size="lg" />
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

// No roles at all: Material Icons for your ids, and every component keeps the drawing it
// ships with.
@Component({
  selector: 'demo-icon-roles-none',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [
    providePctIcons(materialIcons({ variant: 'outlined', roles: [] })),
  ],
  styles: CARD,
  template: SCENE,
})
export class IconRolesNone {
  readonly fruit = FRUIT;
}

// One role, in the adapter's spelling: the select's arrow is Material's `expand_more`, and
// the other nine drawings stay the library's.
@Component({
  selector: 'demo-icon-roles-arrow',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [
    providePctIcons(
      materialIcons({ variant: 'outlined', roles: ['chevron-down'] }),
    ),
  ],
  styles: CARD,
  template: SCENE,
})
export class IconRolesArrow {
  readonly fruit = FRUIT;
}

// The adapter's whole map with one role handed back: Material's arrow and silhouette, the
// library's tick.
@Component({
  selector: 'demo-icon-roles-tick',
  imports: [PctIcon, PctSelect, PctCheckbox, PctAvatar],
  providers: [
    providePctIcons(
      materialIcons({ variant: 'outlined', roles: { check: undefined } }),
    ),
  ],
  styles: CARD,
  template: SCENE,
})
export class IconRolesTick {
  readonly fruit = FRUIT;
}

/**
 * Which roles a set dresses
 *
 * The `roles` of a source are what dresses the library, and they are yours to choose. A
 * list names the roles to dress and nothing else, each in the adapter's spelling: `[]` is a
 * font that draws your ids and leaves every component as it ships, `['chevron-down']` is
 * the select's arrow and nothing else. A map corrects the adapter's own, and a role set to
 * `undefined` in it is handed back to the library — Material everywhere but the checkbox's
 * tick. `primeIcons({ roles: [] })`, `fontAwesome()` and the others take `roles` the same
 * way; `svgIcons()` takes the map.
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
      <figcaption>No roles: nothing of the library's replaced</figcaption>
    </figure>
    <figure>
      <demo-icon-roles-arrow />
      <figcaption>One role: the arrow, and nothing else</figcaption>
    </figure>
    <figure>
      <demo-icon-roles-tick />
      <figcaption>The adapter's map, less the tick</figcaption>
    </figure>
  `,
})
export class IconRolesDemo {}
