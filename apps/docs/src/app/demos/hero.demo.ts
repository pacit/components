import { Component } from '@angular/core';
import { PctHero } from '@pacit/components/hero';

/**
 * The three faces
 *
 * `pctHero` names which surface takes the brand gradient — a rim, a word, or the surface
 * itself. One face per element: two components cannot share a host, so gradient text on a
 * gradient fill is unrepresentable rather than discouraged.
 */
@Component({
  selector: 'demo-hero',
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
      padding: 12px 16px;
      border: 1px solid var(--pct-border);
      border-radius: var(--pct-radius-lg);
      background: var(--pct-surface);
    }

    .panel {
      box-sizing: border-box;
      padding: 12px 16px;
      border-radius: var(--pct-radius-lg);
      font-weight: 600;
    }

    .word {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  `,
  template: `
    <article class="face" pctHero="edge">A rim</article>
    <div class="panel" pctHero="fill">A surface</div>
    <p class="word" pctHero="text">A word</p>
  `,
})
export class HeroDemo {}
