import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { PCT_CONFIG, PctTone } from '@pacit/components/core';
import { PctButtonSize, PctButtonVariant } from './button.types';

/**
 * The words a reader would make a name of: an element's `aria-label` or `alt` (a blank one is
 * none), otherwise the text of its content, otherwise its `title` — and nothing under `hidden`
 * (`until-found`, in any case, is still in the page) or `aria-hidden`, where the spinner and
 * every unnamed `pct-icon` sit.
 * A named `pct-icon` answers with its label.
 *
 * Attributes rather than properties, and `nodeType` rather than `instanceof`: a custom
 * element's `alt` property can be anything, and a node from another realm — an iframe's — is
 * a `Text` that is not an instance of this window's `Text`.
 */
function spoken(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data;
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const hidden = el.getAttribute('hidden')?.toLowerCase();
  if (
    (hidden !== undefined && hidden !== 'until-found') ||
    el.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true'
  )
    return '';
  const alternative =
    el.getAttribute('aria-label')?.trim() || el.getAttribute('alt')?.trim();
  if (alternative) return alternative;
  return (
    Array.from(el.childNodes, spoken).join('').trim() ||
    (el.getAttribute('title') ?? '')
  );
}

/** The element under `root` with this id — a document, a shadow root, or a detached subtree. */
const byId = (root: ParentNode, id: string): Element | undefined =>
  Array.from(root.querySelectorAll('[id]')).find((node) => node.id === id);

/**
 * Whether anything names the button besides its glyph. A heuristic, as the tooltip's is: the
 * real computation is the browser's, and the audit measures that one over a rendered page
 * (`req-a11y-axe`). It errs towards silence — where it cannot tell, it counts a name — because
 * a sentence that fires on a page that is fine teaches people to ignore the sentence, and an
 * unnamed button it misses is still the audit's to find.
 *
 * An `aria-labelledby` counts when a reference resolves to something with words in it: a
 * reference to nothing names nothing (measured in 0030), and neither does an empty element.
 * The target's words are read whole as well as as spoken, because a browser reads a hidden
 * target it is pointed at. References are looked up under the button's own root, so a button
 * in a shadow root finds its label there, and one not in a document yet still finds the
 * labels that travel with it.
 */
function named(el: HTMLElement): boolean {
  const root = el.getRootNode() as ParentNode;
  const references = el.getAttribute('aria-labelledby')?.match(/\S+/g);
  const labels = (el as HTMLButtonElement).labels;
  return [
    ...(references
      ? references.flatMap((id) => {
          const target = byId(root, id);
          return target ? [target.textContent, spoken(target)] : [];
        })
      : []),
    ...(labels ? Array.from(labels, (label) => label.textContent) : []),
    spoken(el),
  ].some((words) => words?.trim());
}

/**
 * Button. An attribute selector on a native `<button>` — or on a native `<a>`, when the
 * control navigates — so semantics, keyboard handling and focus work natively
 * (req-a11y-built-in). The paint is the same on both; what differs is the element, and the
 * element is the consumer's ([0071](../../../../docs/decisions/0071-a-link-in-button-s-clothes-is-a-link.md)).
 *
 * @example
 * <button pctButton variant="outline" size="lg">Save</button>
 * <a pctButton href="/start">Get started</a>
 * <button pctButton iconOnly variant="ghost" aria-label="Delete the draft">
 *   <pct-icon icon="trash" />
 * </button>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'button[pctButton], a[pctButton]',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: {
    class: 'pct-button',
    '[attr.data-pct-variant]': 'variant()',
    // Absent when there is no tone, and absent on the hero face whatever was asked for: an
    // attribute the stylesheet must not answer is better not written than written and ignored.
    '[attr.data-pct-tone]': 'appliedTone()',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-icon-only]': 'iconOnly() ? "" : null',
    '[attr.data-pct-loading]': 'loading() ? "" : null',
    // The face's own hook, written on both elements, because only one of them has a
    // `disabled` attribute to key on and the stylesheet should not have to know which.
    '[attr.data-pct-disabled]': 'isDisabled() ? "" : null',
    // The platform's own refusal, where the platform has one: on a `<button>` the attribute
    // blocks the click, drops the element out of the tab order and says "disabled" in the
    // accessibility tree without anything being written for it.
    '[attr.disabled]': 'isButton && isDisabled() ? "" : null',
    // And where it has none. A link cannot be disabled — `aria-disabled` says the state,
    // `onClick` refuses the navigation, and the element stays focusable on purpose: a
    // control a reader cannot reach cannot tell them why it does nothing.
    '[attr.aria-disabled]': '!isButton && isDisabled() ? "true" : null',
    // Only while the button actually works. `aria-busy="false"` is the default value, so
    // writing it out adds nothing and stands in the accessibility tree of every button on
    // the page.
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
})
export class PctButton {
  private readonly config = inject(PCT_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Which element wears the face. Read once from the tag, because a component's host cannot
   * change element under it — and it is what decides whether the disabled state is the
   * platform's attribute or a promise this component has to keep itself.
   */
  protected readonly isButton = this.host.nativeElement.tagName === 'BUTTON';

  /**
   * Picks the face. All five paint the same element; `hero` adds the drifting gradient and freezes it under reduced motion.
   *
   * @since 0.1.0
   */
  readonly variant = input<PctButtonVariant>('solid');

  /**
   * Which of the skin's four families the face paints from — `danger`, `warning`, `success`,
   * `info` — or `null`, the default, which is the brand. The names are shared with every other
   * component that wears a tone rather than invented here ({@link PctTone},
   * [0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)), and
   * there is no `primary` member because primary is what a button with no tone already is.
   *
   * It paints four faces and refuses the fifth: `hero` is the brand gradient and keeps it.
   *
   * **The tone is not the message.** On a button the second channel a tone owes
   * ([`req-a11y-forced-colors`](../../../../docs/requirements/a11y.md#req-a11y-forced-colors))
   * is the LABEL — "Delete account" says danger in words, and a reader hears the same
   * "Delete account, button" whatever the face is painted with. A red button labelled "OK"
   * says nothing to anyone who cannot see the red, and no attribute here can repair that.
   *
   * @since 0.2.0
   */
  readonly tone = input<PctTone | null>(null);

  /**
   * Height 28 / 36 / 44 px — the axis every field shares, so rows line up. From `providePctConfig` by default (req-api-config).
   *
   * @since 0.1.0
   */
  readonly size = input<PctButtonSize>(this.config.defaultSize);

  /**
   * The face for one glyph and no words: a square as tall as the size, the glyph drawn on the
   * icon's own step for that size, and 24 px under both axes whatever a skin does to the
   * height. Geometry only — every face, tone and state above is the same button.
   *
   * There is nothing on it to read, so **the name is written on the button**: `aria-label`,
   * or a tooltip with `pctTooltipAs="name"`, which shows the name as well as speaking it. Dev
   * mode says so once when nothing names it
   * ([0085](../../../../docs/decisions/0085-an-icon-only-button-is-a-face-and-its-name-is-written-on-it.md)).
   *
   * @since next
   */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  /**
   * Blocks the click and greys the face; the grey is written to survive forced colors. On a link it is `aria-disabled` and a refused navigation — the platform has no disabled link.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Shows the spinner in the face's own colour and sets `aria-busy`. Does not block the click — pair it with `disabled` when it should.
   *
   * @since 0.1.0
   */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.loading(),
  );

  /** The tone the element really wears: every face but the hero's, which takes none. */
  protected readonly appliedTone = computed(() =>
    this.variant() === 'hero' ? null : this.tone(),
  );

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnToneOnTheHeroFace());
    if (isDevMode()) afterNextRender(() => this.warnOnIconOnlyWithNoName());

    // A `<button>` gets nothing here, and that is the point: the platform refuses a disabled
    // press by itself, so a listener on every button in an application would be a cost with
    // no promise behind it — the cost record measured six of them on one preview and said so.
    if (this.isButton) return;

    // Not a `(click)` in `host` — measured. A disabled link has to refuse the consumer's own
    // handler as well as the navigation, and a host listener cannot: for a press that lands
    // on the element itself both listeners run in REGISTRATION order, and the template's is
    // registered first, so `stopImmediatePropagation` arrives too late. Two properties fix
    // that and both are needed: the listener is attached when the directive is instantiated
    // (before the template's), and it listens in the CAPTURE phase (which runs before the
    // target phase for a press that lands on the projected label).
    this.host.nativeElement.addEventListener(
      'click',
      (event) => this.onClick(event),
      { capture: true },
    );
    if (isDevMode()) afterNextRender(() => this.warnOnLinkWithNowhereToGo());
  }

  /**
   * A tone asked of the one face that cannot wear it. Said rather than swallowed: the
   * attribute is not written, so nothing in the page shows that the tone was asked for, and a
   * silent refusal is how a consumer comes to believe the tone is there.
   */
  private warnOnToneOnTheHeroFace(): void {
    if (this.variant() !== 'hero' || this.tone() === null) return;
    console.warn(
      `[pctButton] tone="${this.tone()}" on variant="hero" is ignored. The hero face is the ` +
        `brand gradient and paints from no other family — drop the tone, or ask for a face ` +
        `that wears one (solid, outline, ghost, soft).`,
    );
  }

  /**
   * An icon-only button nothing names. The glyph is decoration — `pct-icon` stands outside the
   * accessibility tree until it is given a label — so a square holding one is announced as
   * "button" and nothing else, which axe reports at critical (`lesson-92`). Read after the
   * first render, when a tooltip naming the button has already written its `aria-label`; what
   * counts as a name is `named()`'s, and it errs towards silence.
   */
  private warnOnIconOnlyWithNoName(): void {
    if (!this.iconOnly() || named(this.host.nativeElement)) return;
    console.warn(
      `[pctButton] An icon-only button with no name. The glyph is decoration, so a screen ` +
        `reader announces "button" and nothing more. Write the name on the button: ` +
        `aria-label="…", or pctTooltip="…" with pctTooltipAs="name" to show it as well.`,
    );
  }

  /**
   * The refusal a link has no platform mechanism for: `preventDefault` stops the navigation,
   * `stopImmediatePropagation` stops the consumer's own handler on the same element, and
   * both are exactly what a disabled button gets for free.
   */
  private onClick(event: Event): void {
    if (!this.isDisabled()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /**
   * An `<a>` with no `href` is not a link: no role, no place in the tab order, no keyboard
   * at all — a button-shaped thing only a mouse can press. Said once, after the first
   * render, so that a `routerLink` (which writes the attribute during that render) is not
   * accused of something it did not do.
   */
  private warnOnLinkWithNowhereToGo(): void {
    if (this.host.nativeElement.hasAttribute('href')) return;
    console.warn(
      `[pctButton] An <a pctButton> with no href. It is painted like a button and is ` +
        `none of one: no role, no focus, no keyboard. Give it an href (routerLink writes ` +
        `one), or write a <button pctButton> instead.`,
    );
  }
}
