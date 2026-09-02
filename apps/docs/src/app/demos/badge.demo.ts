import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';

/** A word wearing a tone — and a missing tone is a compile error, not a grey rectangle. */
@Component({
  selector: 'demo-badge',
  imports: [PctBadge],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-badge>Draft</pct-badge>
    <pct-badge tone="danger">3 overdue</pct-badge>
  `,
})
export class BadgeDemo {}
