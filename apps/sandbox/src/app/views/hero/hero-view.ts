import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctHero } from '@pacit/components/hero';
import { SbxDemo } from '../../ui/demo';

/**
 * Hero: the library's one loud face, on the element the consumer already has. Three faces and
 * two triggers, and what is worth watching is the pair the gradient needs — the surface stops
 * for a rim and a fill, the lifted trio for a word, because a word is measured at 4.5:1 and
 * the brand's own stops do not clear it on the dark ground (0065).
 */
@Component({
  selector: 'sbx-hero-view',
  imports: [SbxDemo, PctButton, PctHero],
  templateUrl: './hero-view.html',
  styleUrl: './hero-view.scss',
})
export class HeroView {
  /** The page's own stop, wired to a button so the demo is the control it documents. */
  readonly stopped = signal(false);
}
