import { Component } from '@angular/core';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';

/**
 * Your own SVG
 *
 * A drawing is data — a `viewBox`, the root's paint and the elements inside it — rendered one
 * element at a time, so no string of markup is ever trusted. `svgIcons()` registers drawings
 * under the ids you choose. Written out, a drawing names its own grid and paint, like the
 * mark here; a bare node list is read on the 24-grid with a round 2-unit stroke, the shape
 * lucide and Tabler export, so their icons drop in as they are; a definition from
 * `@fortawesome/free-solid-svg-icons` does too. A one-off goes into the box as content with
 * no source at all, and a folder of files a designer exported becomes
 * `svgSprite('icons.svg')`.
 */
@Component({
  selector: 'demo-icon-svg',
  imports: [PctIcon],
  providers: [
    providePctIcons(
      svgIcons({
        mark: {
          viewBox: '0 0 32 32',
          attributes: { fill: 'currentColor', 'fill-rule': 'evenodd' },
          nodes: [
            [
              'path',
              { d: 'M16 2l13 7.5v13L16 30 3 22.5v-13zm0 7l-7 4v6l7 4 7-4v-6z' },
            ],
          ],
        },
        pin: [
          ['path', { d: 'M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z' }],
          ['circle', { cx: 12, cy: 10, r: 2.5 }],
        ],
      }),
    ),
  ],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 24px; }',
  template: `
    <pct-icon icon="mark" />
    <pct-icon icon="pin" tone="info" />
    <pct-icon label="Draft">
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 20h16M6 16 16 6l2 2L8 18z" />
      </svg>
    </pct-icon>
  `,
})
export class IconSvgDemo {}
