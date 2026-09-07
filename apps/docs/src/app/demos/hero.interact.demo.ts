import { Component } from '@angular/core';
import { PctHero } from '@pacit/components/hero';

/**
 * When it paints
 *
 * `show="interact"` is hover OR `:focus-visible`, never hover alone — a treatment only a
 * mouse can summon is one a keyboard cannot, and this library does not ship those. On a
 * device with no hover the pair falls to focus and a press. Tab to the card to see it.
 */
@Component({
  selector: 'demo-hero-interact',
  imports: [PctHero],
  // The class is `face` and not `card`, measured: the gallery's own overflow check walks
  // `document.querySelectorAll('.card')` across the whole page, so a demo that spells its
  // box `card` hands that check a tile with no stage and no name inside it.
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
    }

    .face {
      box-sizing: border-box;
      display: block;
      padding: 12px 16px;
      border: 1px solid var(--pct-border);
      border-radius: var(--pct-radius-lg);
      background: var(--pct-surface);
      color: inherit;
      text-decoration: none;
    }
  `,
  template: `
    <a class="face" href="#hero" pctHero="edge" show="interact">
      Under attention
    </a>
    <a class="face" href="#hero" pctHero="text" show="interact">
      Or a word of it
    </a>
  `,
})
export class HeroInteractDemo {}
