import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  PendingTasks,
  signal,
  Type,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { PctGrid } from '@pacit/components/grid';
import { DOCS_CARDS, DOCS_CATEGORIES } from '../../../generated/content';
import { CARD_DEMOS, DEMOS } from '../../demos';
import { DocsBand, DocsBar } from '../../docs-bar';
import { DocsFinder } from '../../docs-finder';
import { answersTo, asNeedle } from '../../find';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';

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
  /** The fragment the band answers to — `#choices`, `#overlays`. */
  readonly slug: string;
  readonly cards: readonly GalleryCard[];
}

/**
 * `Text & numbers` → `text-numbers`. The six headers carried no `id` at all, so
 * `/components#choices` did not exist and nothing on the site — not the landing, not a
 * card, not a sentence of prose — could point at a band of a 5430 px page, 1758 px of it
 * above `select` (4.34). The jump itself was already paid for twice and neither payment had
 * anything to land on: `--docs-anchor-offset` clears the sticky header for the native jump,
 * and `ViewportScroller.setOffset` reads that same custom property for the router's.
 */
const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The gallery: every documented component under the bucket its card files it in, each one
 * carrying the component itself (plan 2.8, sketch variant A — "thirty-three stages", thirty-four of them today).
 *
 * The tile shows the card's `**Summary:**` and its entry point, and NOT the `role` and the
 * `selector` it used to: `role` is sliced out of the card's H1 after the em dash, so nine
 * of the thirty-four read `button — button`, and three cards write `**Selectors:**` in the
 * plural and land here as `null`, drawing an empty `<code>`. The summary is the one
 * sentence the content pass actually gates — present, under 200 characters, no link and no
 * requirement number in it — and the entry point is the string a reader types first.
 *
 * The finder above the grid is the one the site already ships (4.34, plate B): `docs-index`
 * filters this same list by the same rule in the component page's rail and in the shell's
 * drawer, and `find.ts` is now where that rule lives so the two cannot answer one word
 * differently. It costs the page nothing when it is not used — the query starts empty, so
 * the prerendered HTML is all thirty-four cards and a field that stands quiet without
 * JavaScript.
 *
 * Above them both stands the bar of the six bands, which is the anchors made visible: each
 * chip is a link to one `id`, and the one the reader is actually in is lit by the same scroll
 * spy the component page's table of contents runs (`spy.ts`). It costs what the sketch said it
 * costs — every chip is a link and owes SC 2.5.8's 24 px outright, so on a narrow page the bar
 * wraps and takes three or four rows rather than one.
 *
 * The preview is the component, not a picture of it: the same `DEMOS` registry the
 * component page mounts, with `CARD_DEMOS` standing in for the seven whose canonical demo
 * is authored for a 675px stage and overflows a card. Both resolve inside ONE
 * `PendingTasks` span so all thirty-four are in the prerendered HTML — a stage that
 * arrived after hydration would be a stage nobody without JavaScript ever sees, and this
 * page is static by construction.
 */
@Component({
  selector: 'docs-components',
  imports: [
    NgComponentOutlet,
    RouterLink,
    DocsBar,
    DocsFinder,
    PctContainer,
    PctGrid,
  ],
  templateUrl: './components.html',
  styleUrl: './components.scss',
})
export class ComponentsPage {
  protected readonly total = DOCS_CARDS.length;

  /** What the reader has typed. Empty until they do, which is the state the page ships in. */
  protected readonly query = signal('');

  /** In `DOCS_CATEGORIES` order, which the content pass proves is the cards' own order. */
  protected readonly buckets = computed<readonly Bucket[]>(() => {
    const needle = asNeedle(this.query());
    return DOCS_CATEGORIES.map((name) => ({
      name,
      slug: slugOf(name),
      cards: DOCS_CARDS.filter(
        (card) => card.category === name && answersTo(card, needle),
      ).map((card) => ({
        id: card.id,
        name: card.id.charAt(0).toUpperCase() + card.id.slice(1),
        summary: card.summary,
        entrypoint: card.entrypoint,
      })),
    })).filter((bucket) => bucket.cards.length > 0);
  });

  /**
   * `2 of 34` beside the label. A filter that empties four of the six buckets moves a lot
   * of page under a reader who is looking at one band of it, and the count is the one place
   * that says how much — so it is a live region, not decoration.
   */
  protected readonly shown = computed(() =>
    this.buckets().reduce((n, bucket) => n + bucket.cards.length, 0),
  );

  /** The bar's own reading of the buckets: a band the filter has emptied is not on it. */
  protected readonly bands = computed<readonly DocsBand[]>(() =>
    this.buckets().map((bucket) => ({
      slug: bucket.slug,
      label: bucket.name,
      count: bucket.cards.length,
    })),
  );

  /** The band the reader is in, or none — set by the spy, and never in the prerender. */
  protected readonly active = signal<string | null>(null);

  protected readonly demos = signal<ReadonlyMap<string, Type<unknown>>>(
    new Map(),
  );

  constructor() {
    describePage(
      'Every component of @pacit/components, grouped and running: each card renders the component itself and leads into its page.',
    );

    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      spyOnSections(document, destroyRef, (id) => this.active.set(id)),
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

  protected onQuery(typed: string): void {
    this.query.set(typed);
  }
}
