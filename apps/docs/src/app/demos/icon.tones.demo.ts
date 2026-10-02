import { Component } from '@angular/core';
import { PctIcon, providePctIcons } from '@pacit/components/icon';
import { svgIcons } from '@pacit/components/svg-icon';
import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide';

/**
 * Tones and sizes
 *
 * The four tones are `PctTone`, the same list the toast, the badge and the button read; an
 * icon wearing one takes the skin's colour and nothing else changes. The three sizes are
 * steps on the icon's own tokens, and no `size` is `1em` — the text's own, the right size
 * beside a word. The drawings are lucide's, rendered from the data the package exports.
 */
@Component({
  selector: 'demo-icon-tones',
  imports: [PctIcon],
  providers: [
    providePctIcons(
      svgIcons({
        success: CircleCheck,
        warning: TriangleAlert,
        danger: CircleAlert,
        info: Info,
        bell: Bell,
      }),
    ),
  ],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  `,
  template: `
    <div class="row">
      <pct-icon icon="success" tone="success" size="lg" />
      <pct-icon icon="warning" tone="warning" size="lg" />
      <pct-icon icon="danger" tone="danger" size="lg" />
      <pct-icon icon="info" tone="info" size="lg" />
    </div>
    <div class="row">
      <pct-icon icon="bell" size="sm" />
      <pct-icon icon="bell" size="md" />
      <pct-icon icon="bell" size="lg" />
      <span>Inbox <pct-icon icon="bell" /></span>
    </div>
  `,
})
export class IconTonesDemo {}
