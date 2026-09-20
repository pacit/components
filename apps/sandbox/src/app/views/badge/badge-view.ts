import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';
import { SbxDemo } from '../../ui/demo';

/**
 * Badge: a word wearing a tone. What is worth watching is what is NOT here — no role, no
 * label, no size, no pill, and no tone attribute on the untoned badge. The list of tones is
 * not here either: it is `PctTone`, shared with every other component that wears one (0076),
 * since the ramps the badge's own union was waiting for landed with the button's axis (0082).
 */
@Component({
  selector: 'sbx-badge-view',
  imports: [SbxDemo, PctBadge],
  templateUrl: './badge-view.html',
  styleUrl: './badge-view.scss',
})
export class BadgeView {}
