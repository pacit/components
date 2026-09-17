import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { PctIcon } from '@pacit/components/icon';
import { PCT_ACCORDION } from './accordion';
import { PctAccordionHeadingLevel } from './accordion.types';

/**
 * One section of a `<pct-accordion>`: a `<details>` with a `<summary>`, a heading inside the
 * summary, and the consumer's content below it.
 *
 * **Almost nothing here is behaviour.** The press, the `expanded` state a reader announces,
 * `Enter` and `Space`, the place in the page's tab order and the browser's find-in-page all
 * belong to the `<details>` element
 * ([0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md),
 * [0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)).
 * What this class adds is the three things the platform has no answer to: a **heading**, so
 * that the section can be jumped to; a way to **refuse** the press; and a signal a form or a
 * router can bind to.
 *
 * **A closed section is still text in the document.** `::details-content` computes
 * `content-visibility: hidden` in all three engines, which is the same mechanism the tabs
 * had to ask for by hand — so the browser's find-in-page searches a closed section and opens
 * it, and this component answers nothing to make that happen
 * ([0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
 *
 * **It works on its own**, outside any `<pct-accordion>`: a lone disclosure is a `<details>`
 * with a heading, which is exactly what this is. What it loses is the group — `exclusive` and
 * `headingLevel` are the group's inputs, so a standalone item is never exclusive and its
 * title is an `<h3>`.
 *
 * @example
 * <pct-accordion-item label="Shipping" [(open)]="shipping">
 *   <p>Anything at all.</p>
 * </pct-accordion-item>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-accordion-item',
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
  imports: [PctIcon],
  host: {
    class: 'pct-accordion__item',
    'data-pct-part': 'item',
  },
})
export class PctAccordionItem {
  /**
   * The text of the heading the user presses. Required, and a string rather than a slot for
   * the tabs' reason one component over: a slot is a second public directive and a second
   * thing to type, and the first component to want one cannot tell a shared property from an
   * accident of the only case.
   *
   * @since 0.1.0
   */
  readonly label = input.required<string>();

  /**
   * Whether the section stands open.
   *
   * A `model`, because the component does not own it and neither does the consumer alone: the
   * user opens a section by pressing it, the platform closes one when a sibling of the same
   * group opens, and both of those arrive as the `toggle` event this class writes back from.
   * A consumer who binds one way still gets a working accordion — the value it writes is
   * simply not read back, which is `pct-tabs`' `value` exactly.
   *
   * It is **not** an `aria-expanded` of ours. That state is the `<details>` element's and the
   * accessibility tree takes it from there
   * ([0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)) —
   * measured: chromium reports the summary as a disclosure triangle with `expanded` true or
   * false, and nothing in this library writes the attribute.
   *
   * @since 0.1.0
   */
  readonly open = model(false);

  /**
   * Refuses the press, and only the press. The section keeps its heading, keeps its place in
   * the tab order and keeps announcing whether it is open — a disabled section is a signpost
   * as much as a control, which is the argument `pct-tabs` makes for `aria-disabled` over the
   * native attribute, one component over.
   *
   * The platform has no disabled disclosure, so this is one of the two places the component
   * takes a key from the browser: `preventDefault()` on the summary's `click` stops the
   * toggle for the pointer **and** for `Enter`, measured in all three engines
   * ([`lesson-128`](../../../../docs/lessons.md#lesson-128)).
   *
   * A section that is open when it is disabled **stays** open. That is what refusing the
   * press means, and it is the one arrangement in which a consumer can show a section the
   * user may not close.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The heading's accessible name, where it has to differ from the text drawn in it. An INPUT
   * rather than an `aria-label` on the tag: the disclosure is the `<summary>` inside this
   * template, the host carries no role at all, and an ARIA name on a roleless element is
   * ignored ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   *
   * It is empty by default and should usually stay so — `label` is the name, and a name that
   * does not contain the visible text is WCAG 2.5.3 broken. What it exists for is the case
   * the visible text cannot carry: a title that reads as a fragment out of its column.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page.
   *
   * @since 0.1.0
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * The group this section stands in — injected rather than passed, because injection is what
   * resolves the DECLARATION tree: an item written inside a nested `pct-accordion` gets that
   * one, however the two are drawn. `optional`, because an item on its own is a working
   * disclosure and not a defect.
   */
  private readonly accordion = inject(PCT_ACCORDION, { optional: true });

  /** `null` outside a group and inside a group that lets several sections stand open. */
  protected readonly groupName = computed(
    () => this.accordion?.groupName() ?? null,
  );

  protected readonly headingLevel = computed<PctAccordionHeadingLevel>(
    () => this.accordion?.headingLevel() ?? 3,
  );

  /**
   * The section has opened or closed, and this class is being told rather than deciding.
   *
   * Both directions arrive here and the second is the one worth naming: in an exclusive group
   * the browser closes the section that was open when another is pressed, and it fires
   * `toggle` on that one too — measured, `["a:true", "b:true", "a:false"]` in all three
   * engines. So a group of sections stays in step with no bookkeeping of ours, and the
   * component never has to ask which of its siblings the user touched.
   */
  protected onToggle(event: Event): void {
    this.open.set((event.target as HTMLDetailsElement).open);
  }

  /**
   * A press on the heading. There is nothing here for the ordinary case — the `<details>`
   * opens itself, and a handler that "helped" would be a second opinion about a state that
   * already has one.
   *
   * The one thing it does is refuse. `preventDefault()` on the summary's activation is how
   * the platform is told not to toggle, and it covers the keyboard as well, because `Enter`
   * on a `<summary>` arrives as a click ([`lesson-128`](../../../../docs/lessons.md#lesson-128)).
   */
  protected onPress(event: Event): void {
    if (this.disabled()) event.preventDefault();
  }
}
