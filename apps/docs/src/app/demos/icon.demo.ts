import { Component } from '@angular/core';
import { PctIcon, primeIcons, providePctIcons } from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';
import { Bell, House, Search, Trash } from 'lucide';

/**
 * One line, two sources: the application's own drawings first — lucide's, exactly as the
 * package exports them — and PrimeIcons' classes for every other id. The box is `1em`,
 * `tone` colours it with the skin's four, and a `label` turns decoration into an image.
 */
@Component({
  selector: 'demo-icon',
  imports: [PctIcon],
  providers: [
    providePctIcons(
      svgIcons({ house: House, bell: Bell, search: Search, trash: Trash }),
      primeIcons(),
    ),
  ],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 24px; }',
  template: `
    <pct-icon icon="house" />
    <pct-icon icon="search" />
    <pct-icon icon="bell" tone="warning" label="3 unread messages" />
    <pct-icon icon="trash" tone="danger" />
    <pct-icon icon="heart-fill" />
    <pct-icon icon="check-circle" tone="success" />
  `,
})
export class IconDemo {}
