import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';

/** A word wearing a tone — and the tone is the library's four, never a list of its own. */
@Component({
  selector: 'demo-badge',
  imports: [PctBadge],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-badge>Draft</pct-badge>
    <pct-badge tone="success">Paid</pct-badge>
    <pct-badge tone="danger">3 overdue</pct-badge>
  `,
})
export class BadgeDemo {}
