import { NgComponentOutlet } from '@angular/common';
import { Component, inject, PendingTasks, signal, Type } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctGrid } from '@pacit/components/grid';
import { DOCS_CARDS, DOCS_CATEGORIES } from '../../../generated/content';
import { CARD_DEMOS, DEMOS } from '../../demos';
import { describePage } from '../../seo';

/** One tile: the card's own gated fields, resolved once so the template calls nothing. */
interface GalleryCard {
  readonly id: string;
  /** The heading of the page this links to, so the link's name and its target agree. */
  readonly name: string;
  readonly summary: string;
  readonly entrypoint: string | null;
}

interface Bucket {
  readonly name: string;
  readonly cards: readonly GalleryCard[];
}

/**
 * The gallery: every documented component under the bucket its card files it in, each one
 * carrying the component itself (plan 2.8, sketch variant A — "thirty-three stages").
 *
 * The tile shows the card's `**Summary:**` and its entry point, and NOT the `role` and the
 * `selector` it used to: `role` is sliced out of the card's H1 after the em dash, so nine
 * of the thirty-three read `button — button`, and three cards write `**Selectors:**` in the
 * plural and land here as `null`, drawing an empty `<code>`. The summary is the one
 * sentence the content pass actually gates — present, under 200 characters, no link and no
 * requirement number in it — and the entry point is the string a reader types first.
 *
 * The preview is the component, not a picture of it: the same `DEMOS` registry the
 * component page mounts, with `CARD_DEMOS` standing in for the seven whose canonical demo
 * is authored for a 675px stage and overflows a card. Both resolve inside ONE
 * `PendingTasks` span so the thirty-three are in the prerendered HTML — a stage that
 * arrived after hydration would be a stage nobody without JavaScript ever sees, and this
 * page is static by construction.
 */
@Component({
  selector: 'docs-components',
  imports: [NgComponentOutlet, RouterLink, PctContainer, PctGrid],
  templateUrl: './components.html',
  styleUrl: './components.scss',
})
export class ComponentsPage {
  protected readonly total = DOCS_CARDS.length;

  /** In `DOCS_CATEGORIES` order, which the content pass proves is the cards' own order. */
  protected readonly buckets: readonly Bucket[] = DOCS_CATEGORIES.map(
    (name) => ({
      name,
      cards: DOCS_CARDS.filter((card) => card.category === name).map(
        (card) => ({
          id: card.id,
          name: card.id.charAt(0).toUpperCase() + card.id.slice(1),
          summary: card.summary,
          entrypoint: card.entrypoint,
        }),
      ),
    }),
  ).filter((bucket) => bucket.cards.length > 0);

  protected readonly demos = signal<ReadonlyMap<string, Type<unknown>>>(
    new Map(),
  );

  constructor() {
    describePage(
      'Every component of @pacit/components, grouped and running: each card renders the component itself and leads into its page.',
    );

    const done = inject(PendingTasks).add();
    Promise.all(
      DOCS_CARDS.map((card) =>
        (CARD_DEMOS[card.id] ?? DEMOS[card.id])?.().then(
          (type) => [card.id, type] as const,
        ),
      ),
    ).then((pairs) => {
      this.demos.set(new Map(pairs.filter((pair) => pair !== undefined)));
      done();
    });
  }
}
