import { Component } from '@angular/core';
import {
  materialIcons,
  PctIcon,
  providePctIcons,
} from '@pacit/components/icon';

/**
 * Material Icons
 *
 * A ligature font: the text of the span is the id — `home` — and the font draws the word as
 * one glyph. `materialIcons()` writes both, the class and the text, and the box hides the
 * word from a screen reader so that a named icon is not read twice. `variant` names the font
 * loaded — `outlined` here, the `material-icons-outlined` class of the stylesheet. Material
 * Symbols, the variable font, is `materialSymbols()` with its axes.
 */
@Component({
  selector: 'demo-icon-material',
  imports: [PctIcon],
  providers: [providePctIcons(materialIcons({ variant: 'outlined' }))],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 24px; }',
  template: `
    <pct-icon icon="home" />
    <pct-icon icon="search" />
    <pct-icon icon="shopping_cart" />
    <pct-icon icon="favorite" tone="danger" />
    <pct-icon icon="notifications" />
    <pct-icon icon="settings" />
  `,
})
export class IconMaterialDemo {}
