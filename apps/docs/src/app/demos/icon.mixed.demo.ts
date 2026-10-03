import { Component } from '@angular/core';
import {
  fontAwesome,
  PctIcon,
  PctIconSource,
  primeIcons,
  providePctIcons,
} from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';
import { Bell, House } from 'lucide';

// A source is a plain object, so one that answers only under a prefix — and hands the rest
// of the id on — is three lines. It carries no roles: the font behind it dresses nothing.
const under = (prefix: string, source: PctIconSource): PctIconSource => ({
  resolve: (id) =>
    id.startsWith(prefix) ? source.resolve(id.slice(prefix.length)) : null,
});

/**
 * Several sets at once
 *
 * The arguments of `providePctIcons()` are asked in order, and the first that answers draws.
 * Drawings answer for their ids and `null` for the rest, so they stand first; a font answers
 * for every id, so it stands last — and a second font behind it would never be reached. A
 * prefix makes room for one: `brand:github` goes to Font Awesome's brands, and everything
 * the drawings do not know goes to PrimeIcons.
 */
@Component({
  selector: 'demo-icon-mixed',
  imports: [PctIcon],
  providers: [
    providePctIcons(
      svgIcons({ house: House, bell: Bell }),
      under('brand:', fontAwesome({ style: 'brands' })),
      primeIcons(),
    ),
  ],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 24px; }',
  template: `
    <pct-icon icon="house" />
    <pct-icon icon="bell" tone="warning" />
    <pct-icon icon="brand:github" />
    <pct-icon icon="brand:angular" />
    <pct-icon icon="brand:npm" />
    <pct-icon icon="heart-fill" tone="danger" />
    <pct-icon icon="cog" />
  `,
})
export class IconMixedDemo {}
