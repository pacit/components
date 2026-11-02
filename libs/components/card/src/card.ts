import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  Directive,
  input,
} from '@angular/core';
import { PctIcon } from '@pacit/components/icon';
import { PctSkeleton } from '@pacit/components/skeleton';

/**
 * The anchor that makes the whole card one link: the consumer's `<a>` inside the title, with
 * its own `href` or `routerLink`, whose box is stretched over the card by a pseudo-element.
 *
 * **The platform's link, all of it.** A press anywhere on the card is a press on this anchor,
 * so a middle click, Ctrl or ⌘ with a click and the context menu do what a link does, and a
 * reader meets one link named by the title alone — not the whole card read out as its name
 * ([0109](../../../../docs/decisions/0109-a-card-is-one-link-by-its-title-and-its-controls-stand-over-it.md)).
 * The focus ring is drawn around the card, which is the box a press there opens.
 *
 * @example
 * <h3 pctCardTitle><a pctCardLink routerLink="/devices/heat-pump">Heat pump</a></h3>
 *
 * @since next
 */
@Component({
  selector: 'a[pctCardLink]',
  templateUrl: './card-link.html',
  styleUrl: './card-link.scss',
  host: { class: 'pct-card-link' },
})
export class PctCardLink {}

/**
 * A control that answers on its own inside a card that is one link: it stands over the
 * link's box, so a press on it is its own and not the link's. The header's actions and the
 * footer's actions stand there already; this is for a control written in the body, or for a
 * passage whose text must stay selectable, which then leaves the link.
 *
 * **A directive, and its two declarations inline.** A control is as often a component of its
 * own — `pct-switch`, `pct-select` — and an element holds one component, so this cannot be
 * one; a directive carries no stylesheet, and two inline declarations are all it needs.
 *
 * @example
 * <pct-switch pctCardControl label="Enabled" [(checked)]="enabled" />
 *
 * @since next
 */
@Directive({
  selector: '[pctCardControl]',
  host: {
    class: 'pct-card-control',
    '[style.position]': '"relative"',
    '[style.z-index]': '1',
  },
})
export class PctCardControl {}

/**
 * The card's title: the consumer's heading, at the level the page's outline needs, with the
 * card's type on it and the browser's margins taken off.
 *
 * @example
 * <h3 pctCardTitle>Heat pump</h3>
 *
 * @since next
 */
@Component({
  selector: '[pctCardTitle]',
  templateUrl: './card-title.html',
  styleUrl: './card-title.scss',
  host: { class: 'pct-card-title' },
})
export class PctCardTitle {}

/**
 * The line under the card's title: where the thing stands, or what kind it is.
 *
 * @example
 * <p pctCardSubtitle>Utility room</p>
 *
 * @since next
 */
@Component({
  selector: '[pctCardSubtitle]',
  templateUrl: './card-subtitle.html',
  styleUrl: './card-subtitle.scss',
  host: { class: 'pct-card-subtitle' },
})
export class PctCardSubtitle {}

/**
 * A card: a header of a title, a subtitle, an icon and actions, a body of anything, and a
 * footer that stays at the bottom when the cards of a row stand at one height.
 *
 * **A box, not a landmark.** The card writes no role: its heading is the consumer's, at the
 * level the page needs, and that is what a reader navigates by. A list of cards is the
 * consumer's `<ul>`, a feed of them the consumer's `role="feed"`.
 *
 * **Three states, none of them a veil.** `loading` draws the skeleton in place of the body and
 * marks the card `aria-busy`; `error` draws the message in place of the body, with the danger
 * icon beside it; `muted` repaints the card on the skin's disabled surface in its muted text — never `opacity`,
 * which would dim the text under its contrast and the controls with it — and leaves every
 * control working, because a device that does not answer can still be renamed. The header and
 * the footer stay in every state.
 *
 * **One link, when the title holds one.** An `a[pctCardLink]` in the title stretches over the
 * card and the controls in the header's and the footer's actions stand over it
 * ([0109](../../../../docs/decisions/0109-a-card-is-one-link-by-its-title-and-its-controls-stand-over-it.md)).
 * The APG has no pattern for a card; this is the one the measurement chose.
 *
 * @example
 * <pct-card>
 *   <h3 pctCardTitle>Heat pump</h3>
 *   <p pctCardSubtitle>Utility room</p>
 *   <p>Supply 21.4 °C</p>
 *   <span pctCardFooter>Updated a moment ago</span>
 * </pct-card>
 *
 * @since next
 */
@Component({
  selector: 'pct-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
  imports: [PctIcon, PctSkeleton],
  host: {
    class: 'pct-card',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.data-pct-state]': 'state()',
    '[attr.data-pct-muted]': 'muted() ? "" : null',
    '[attr.data-pct-link]': 'link() ? "" : null',
  },
})
export class PctCard {
  /**
   * Whether the card's content is on its way: the body gives way to the skeleton, and the
   * card is `aria-busy` until it arrives. The header and the footer stay.
   *
   * @since next
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * A message saying why the card has nothing to show, drawn in place of the body with the
   * danger icon; `null` or `''` for none. `loading` wins while both are set: the answer is not
   * in yet.
   *
   * @since next
   */
  readonly error = input<string | null>(null);

  /**
   * Whether the thing the card stands for is out of reach — a device that does not answer.
   * The card stands on the skin's disabled surface and keeps its controls working; say why in
   * the card's own words, because colours are the eye's alone.
   *
   * @since next
   */
  readonly muted = input(false, { transform: booleanAttribute });

  /** The anchor that makes the card one link, when the title holds one. */
  protected readonly link = contentChild(PctCardLink, { descendants: true });

  /** What stands in the body's place: the body itself, the skeleton or the message. */
  protected readonly state = computed(() =>
    this.loading() ? 'loading' : this.error() ? 'error' : null,
  );
}
