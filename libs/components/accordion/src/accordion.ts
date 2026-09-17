import {
  booleanAttribute,
  Component,
  computed,
  InjectionToken,
  input,
  Signal,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import { PctAccordionHeadingLevel } from './accordion.types';

/**
 * What an item needs to know about the group it stands in: the `name` that makes the group
 * exclusive, and the level its title is drawn at. Declared HERE, beside the group, so that
 * the item can inject it while importing the group — the other direction would close the
 * import cycle. It is the tabs' channel one component over, and for the same reason.
 *
 * @since 0.1.0
 */
export interface PctAccordionApi {
  /**
   * The shared `name` every `<details>` of this group carries, or `null` when several may
   * stand open. It is the whole of the exclusive behaviour: the platform closes the others
   * ([0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
   */
  readonly groupName: Signal<string | null>;
  /** The heading level each item's title is drawn at. */
  readonly headingLevel: Signal<PctAccordionHeadingLevel>;
}

/**
 * The channel through which a group offers itself to the items below it.
 *
 * @since 0.1.0
 */
export const PCT_ACCORDION = new InjectionToken<PctAccordionApi>(
  'PCT_ACCORDION',
);

/**
 * An accordion: a stack of sections a user opens and closes, each with a heading of its own.
 *
 * It implements the ARIA APG
 * [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) pattern by **not
 * implementing it**: a section is a `<details>` with a `<summary>`, so the disclosure, the
 * `expanded` state, `Enter` and `Space`, the tab order and the browser's own find-in-page all
 * come from the platform ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform),
 * [0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
 * What is left for this component is what the platform has no answer to: the heading the
 * pattern asks for, the skin, and the `name` that ties the sections into one group.
 *
 * **This class draws nothing but a stack.** It is the group, not the section — everything a
 * user presses lives in `<pct-accordion-item>`.
 *
 * @example
 * <pct-accordion exclusive [headingLevel]="2">
 *   <pct-accordion-item label="Shipping">…</pct-accordion-item>
 *   <pct-accordion-item label="Payment">…</pct-accordion-item>
 * </pct-accordion>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-accordion',
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
  host: {
    class: 'pct-accordion',
  },
  providers: [{ provide: PCT_ACCORDION, useExisting: PctAccordion }],
})
export class PctAccordion implements PctAccordionApi {
  /**
   * Whether opening one section closes the rest.
   *
   * It is `false` by default because that is the platform's own default — a `<details>` with
   * no `name` opens and closes on its own, and a library whose unset input behaves
   * differently from the element underneath it has taught the consumer a second set of rules
   * for the same tag.
   *
   * There is no code behind it. `true` gives every section of this group the same `name`, and
   * from there the closing of the others is the browser's, in all three engines
   * ([0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
   *
   * @since 0.1.0
   */
  readonly exclusive = input(false, { transform: booleanAttribute });

  /**
   * The level the items' titles are drawn at — `<h3>` unless told otherwise, which is the
   * level a section of a page under one `<h1>` and one `<h2>` usually wants.
   *
   * See [`PctAccordionHeadingLevel`](./accordion.types.ts) for why it is the consumer's
   * number and not ours.
   *
   * @since 0.1.0
   */
  readonly headingLevel = input<PctAccordionHeadingLevel>(3);

  /**
   * The group's identity. It is generated rather than taken as an input because a `name` is
   * not a name anybody reads: it exists so that two `<details>` know they are siblings, and a
   * consumer who had to invent one could collide with another accordion on the same page —
   * which the platform would answer by closing sections in a group nobody meant to make.
   */
  private readonly uid = nextPctId('pct-accordion');

  readonly groupName = computed(() => (this.exclusive() ? this.uid : null));
}
