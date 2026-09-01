import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';
import { SbxDemo } from '../../ui/demo';

/**
 * Badge: a word wearing a tone. What is worth watching is what is NOT here — no role, no
 * label, no size, no pill — and the union: two tones today because the skin has colour for
 * two, with the rest arriving the day the ramps do, as a type change every consumer sees.
 */
@Component({
  selector: 'sbx-badge-view',
  imports: [SbxDemo, PctBadge],
  templateUrl: './badge-view.html',
  styleUrl: './badge-view.scss',
})
export class BadgeView {}
