import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctCheckbox } from '@pacit/components/checkbox';
import {
  iconFont,
  PctIconSource,
  PctSvgNode,
  providePctIcons,
} from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';

/**
 * The sandbox's own drawings, as data in the shape `lucide` and `@tabler/icons` export —
 * drawn by hand here, because the sandbox brings in no dependency the library refuses to
 * bring in itself. Eight icons on the 24-grid, each of them geometry and nothing else: the
 * renderer paints `path`, `circle`, `line`, `polyline` and `polygon`, and these use all five.
 */
export const SBX_DRAWINGS: Readonly<Record<string, readonly PctSvgNode[]>> = {
  house: [
    ['path', { d: 'M3 10.5 12 3l9 7.5' }],
    ['path', { d: 'M5 9.5V21h14V9.5' }],
    ['path', { d: 'M10 21v-6h4v6' }],
  ],
  bell: [
    ['path', { d: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z' }],
    ['path', { d: 'M10 21a2 2 0 0 0 4 0' }],
  ],
  star: [
    [
      'polygon',
      {
        points:
          '12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9',
      },
    ],
  ],
  trash: [
    ['path', { d: 'M4 7h16' }],
    ['path', { d: 'M9 7V4h6v3' }],
    ['path', { d: 'M6 7l1 14h10l1-14' }],
    ['line', { x1: 10, y1: 11, x2: 10, y2: 17 }],
    ['line', { x1: 14, y1: 11, x2: 14, y2: 17 }],
  ],
  search: [
    ['circle', { cx: 11, cy: 11, r: 7 }],
    ['line', { x1: 21, y1: 21, x2: 16, y2: 16 }],
  ],
  check: [['polyline', { points: '4 12 10 18 20 6' }]],
  x: [
    ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }],
    ['line', { x1: 18, y1: 6, x2: 6, y2: 18 }],
  ],
  info: [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['line', { x1: 12, y1: 11, x2: 12, y2: 16 }],
    ['circle', { cx: 12, cy: 8, r: 0.5 }],
  ],
};

/**
 * An icon FONT the way a consumer registers one — `iconFont()` keyed on a class per id —
 * drawn here by `::before` rules in the sandbox's global stylesheet rather than by a font
 * file, for the same reason the drawings above are hand-made. What the sandbox measures
 * is the mechanism: the span, its classes, and the roles map that dresses the library.
 */
export const SBX_GLYPHS: PctIconSource = iconFont({
  class: (id) => `sbx-glyph sbx-glyph-${id}`,
  roles: {
    check: 'check',
    close: 'x',
    'chevron-down': 'chevron',
    user: 'user',
    indeterminate: 'dash',
  },
});

/**
 * The card the glyph font is provided in — and only this card, which is the point: the
 * sources are an ordinary provider, so one section of a page dresses its components in a
 * set the rest of the page does not have. An avatar with no picture and no name draws the
 * `user` role, a checked checkbox draws `check`: inside this card both are glyphs of the
 * font, outside it both are the drawings the components ship with.
 */
@Component({
  selector: 'sbx-icon-dressed',
  imports: [PctAvatar, PctCheckbox],
  template: `
    <pct-avatar data-testid="dressed-avatar" />
    <pct-checkbox
      label="Done"
      [checked]="true"
      data-testid="dressed-checkbox"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--pct-space-3);
    }
  `,
  providers: [providePctIcons(SBX_GLYPHS)],
})
export class SbxIconDressed {}

/**
 * The same glyph font with NO roles map, for the view to provide: a source that carries no
 * roles leaves every component's drawing alone, which is what lets the plain pair beside the
 * dressed card draw what it ships with while the font still answers `icon="chevron"`.
 */
export const SBX_GLYPHS_ALONE: PctIconSource = iconFont({
  class: (id) => `sbx-glyph sbx-glyph-${id}`,
});

/** The sandbox's drawings as a source, for the view to provide. */
export const SBX_ICONS = svgIcons(SBX_DRAWINGS);
