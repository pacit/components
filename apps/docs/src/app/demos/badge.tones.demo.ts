import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';

/**
 * Tones
 *
 * Four tones and the absence of one. A badge with no `tone` wears the skin's quiet
 * surfaces; the four named ones are `PctTone`, the same list the toast and the button
 * read, and every word over every box is a measured pair on both themes.
 */
@Component({
  selector: 'demo-badge-tones',
  imports: [PctBadge],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-badge>Draft</pct-badge>
    <pct-badge tone="danger">3 overdue</pct-badge>
    <pct-badge tone="warning">Expiring</pct-badge>
    <pct-badge tone="success">Paid</pct-badge>
    <pct-badge tone="info">Scheduled</pct-badge>
  `,
})
export class BadgeTonesDemo {}
