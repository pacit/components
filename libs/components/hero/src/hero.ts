import { Component, input } from '@angular/core';
import { PctHeroFace, PctHeroShow } from './hero.types';

/**
 * The brand gradient as equipment — an attribute component on the element the consumer
 * already has, exactly as `pctButton` dresses a `<button>`
 * ([0065](../../../../docs/decisions/0065-a-treatment-that-paints-is-a-component.md)).
 *
 * A directive was refused for a reason that is architecture rather than taste: a directive
 * carries no stylesheet, the rules it would add classes for have to exist somewhere, and the
 * only global artefact this package ships is `themes/pct.css` — variables, not one rule. A
 * hero-shaped directive would make the package start shipping selectors that can reach a
 * consumer's markup by accident.
 *
 * **One face per element.** `pctHero` names which surface takes the sweep; two components
 * cannot share a host, so the compiler enforces from underneath what the single input says
 * from above. The face cannot go on another component's host — a hero-faced button is
 * `variant="hero"`, which the button already has.
 *
 * @example
 * <article pctHero="edge" show="interact">…</article>
 * <h3 pctHero="text">Tabs</h3>
 * <div [pctHero]="featured() ? 'fill' : null">…</div>
 */
@Component({
  selector: '[pctHero]',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  host: {
    class: 'pct-hero',
    '[attr.data-pct-hero]': 'pctHero()',
    '[attr.data-pct-show]': 'pctHero() ? show() : null',
  },
})
export class PctHero {
  /**
   * The face, or `null` for none — so a condition needs no API of its own: the input takes a
   * binding, and a signal already says what a second input would have said again.
   *
   * There is no default and no bare `<article pctHero>`: the union has no member that is the
   * obvious one, so the attribute written with no value is a type error rather than a guess
   * about which surface the consumer meant.
   */
  readonly pctHero = input<PctHeroFace | null>(null);

  /** `always`, or only under hover and `:focus-visible` — never hover alone, because a treatment only a mouse can summon is one a keyboard cannot. */
  readonly show = input<PctHeroShow>('always');
}
