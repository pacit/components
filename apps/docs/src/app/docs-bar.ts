import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One band of a page: the address it answers to, its name, and how much is under it. */
export interface DocsBand {
  /** The fragment — `#choices`, `#semantic`, `#tokens`. */
  readonly slug: string;
  readonly label: string;
  readonly count: number;
}

/**
 * The band bar: a page's own anchors made visible, one chip per band, the one the reader is
 * in lit by whatever spy the page runs.
 *
 * It was written for the gallery on 2026-09-08 and is a component the day a second page
 * wants one — `theming` has three tiers and `trust` has seven axes, and three hand copies of
 * a chip row is the shape [`lesson-21`](../../../../docs/lessons.md#lesson-21) names. What
 * the page keeps is the only part that is the page's: which bands exist and which one is
 * active.
 *
 * Every chip is a LINK, so every chip is a target that owes SC 2.5.8's 24 px on its own —
 * that is the bar's whole cost, and the reason it wraps to three or four rows on a narrow
 * page rather than shrinking to fit.
 */
@Component({
  selector: 'docs-bar',
  imports: [RouterLink],
  templateUrl: './docs-bar.html',
  styleUrl: './docs-bar.scss',
})
export class DocsBar {
  readonly bands = input.required<readonly DocsBand[]>();

  /** The band the reader is in, or none — the prerender's answer is always none. */
  readonly active = input<string | null>(null);

  /** What a reader hears the bar called; every page has its own word for its bands. */
  readonly label = input('Sections');

  /** The e2e suite's handle on this bar, since a page may hold more than one list. */
  readonly testid = input<string | null>(null);
}
