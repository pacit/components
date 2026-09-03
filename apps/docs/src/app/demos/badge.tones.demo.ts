import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';

/**
 * Tones
 *
 * Two tones, deliberately: neutral says "a state", danger says "look here". A badge is a
 * word wearing a colour, and every word keeps its contrast on both themes.
 */
@Component({
  selector: 'demo-badge-tones',
  imports: [PctBadge],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-badge>Draft</pct-badge>
    <pct-badge>Scheduled</pct-badge>
    <pct-badge tone="danger">3 overdue</pct-badge>
    <pct-badge tone="danger">Failing</pct-badge>
  `,
})
export class BadgeTonesDemo {}
