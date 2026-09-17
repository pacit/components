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
import { PCT_CONFIG } from '@pacit/components/core';
import { PctButtonSize, PctButtonVariant } from './button.types';

/**
 * Button. An attribute selector on a native `<button>` — or on a native `<a>`, when the
 * control navigates — so semantics, keyboard handling and focus work natively
 * (req-a11y-built-in). The paint is the same on both; what differs is the element, and the
 * element is the consumer's ([0071](../../../../docs/decisions/0071-a-link-in-button-s-clothes-is-a-link.md)).
 *
 * @example
 * <button pctButton variant="outline" size="lg">Save</button>
 * <a pctButton href="/start">Get started</a>
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
    '[attr.data-pct-size]': 'size()',
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
   * Height 28 / 36 / 44 px — the axis every field shares, so rows line up. From `providePctConfig` by default (req-api-config).
   *
   * @since 0.1.0
   */
  readonly size = input<PctButtonSize>(this.config.defaultSize);

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

  constructor() {
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
