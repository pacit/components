import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';
import { SbxDemo } from '../../ui/demo';

/**
 * Badge: a word wearing a tone. What is worth watching is what is NOT here — no role, no
 * label, no size, no pill — and the union: two tones today, though no longer for the reason it
 * records. The ramps it was waiting for landed with the button's tone axis (0082), so the rest
 * is owed — as a type change every consumer sees.
 */
@Component({
  selector: 'sbx-badge-view',
  imports: [SbxDemo, PctBadge],
  templateUrl: './badge-view.html',
  styleUrl: './badge-view.scss',
})
export class BadgeView {}
