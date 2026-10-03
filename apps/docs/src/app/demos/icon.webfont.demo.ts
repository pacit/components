import { Component, ViewEncapsulation } from '@angular/core';
import { iconFont, PctIcon, providePctIcons } from '@pacit/components/icon';

/**
 * Your own icon font
 *
 * An icon font is a class per glyph and a stylesheet that draws it, and that is all
 * `iconFont()` asks for: the classes an id becomes. A font that reads a ligature adds
 * `text`, a variable font its axes in `style`, and `roles` names the library's roles in the
 * font's spelling. The four rules under this stage stand in for a `@font-face` and its
 * glyph classes — the same mechanism PrimeIcons and Font Awesome run on.
 */
@Component({
  selector: 'demo-icon-webfont',
  imports: [PctIcon],
  providers: [providePctIcons(iconFont({ class: (id) => `acme acme-${id}` }))],
  // A font's stylesheet is global, as a real one is: the rules have to reach the glyph span
  // inside the box, where a component's scoped styles do not.
  encapsulation: ViewEncapsulation.None,
  styles: `
    demo-icon-webfont {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      font-size: 24px;
    }
    .acme {
      font-family: system-ui, sans-serif;
      font-weight: 700;
      line-height: 1;
    }
    .acme-star::before {
      content: '★';
    }
    .acme-sun::before {
      content: '☀';
    }
    .acme-moon::before {
      content: '☾';
    }
    .acme-flag::before {
      content: '⚑';
    }
  `,
  template: `
    <pct-icon icon="star" tone="warning" />
    <pct-icon icon="sun" />
    <pct-icon icon="moon" />
    <pct-icon icon="flag" tone="danger" />
  `,
})
export class IconWebfontDemo {}
