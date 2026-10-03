import { Component } from '@angular/core';
import { PctIcon, primeIcons, providePctIcons } from '@pacit/components/icon';

/**
 * PrimeIcons
 *
 * `primeIcons()` is the adapter: `<pct-icon icon="bell">` holds a span wearing `pi pi-bell`,
 * and PrimeIcons' own stylesheet — yours to include, in the `styles` of `angular.json` —
 * draws the glyph. The library brings no font and no list of names: whatever the stylesheet
 * knows is an id here. The same line carries the library's ten roles in PrimeIcons'
 * spelling, so the select's arrow and the toast's marks wear the set too — the example
 * "One line dresses the library" shows that side, and "Which roles a set dresses" how to
 * keep some of them.
 */
@Component({
  selector: 'demo-icon-prime',
  imports: [PctIcon],
  providers: [providePctIcons(primeIcons())],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 24px; }',
  template: `
    <pct-icon icon="home" />
    <pct-icon icon="search" />
    <pct-icon icon="shopping-cart" />
    <pct-icon icon="heart-fill" tone="danger" />
    <pct-icon icon="github" />
    <pct-icon icon="cog" />
  `,
})
export class IconPrimeDemo {}
