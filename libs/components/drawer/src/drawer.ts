import {
  booleanAttribute,
  Component,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  pctAfterTransition,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctDrawerCloseReason, PctDrawerSide } from './drawer.types';

/**
 * A drawer: a panel docked to an edge of the window that the page goes on working around.
 *
 * It implements the ARIA APG
 * [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) pattern — and it is the
 * one place in this library where that pattern has to be written rather than taken. The
 * accordion showed a disclosure is the platform's, on one condition: `<summary>` has to be the
 * first child of the `<details>` it opens
 * ([0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
 * A drawer's button is in the header bar and its panel is at the edge of the window, so the
 * two are apart and no element expresses them — what is left is `aria-expanded` on somebody
 * else's button, `aria-controls` pointing here, and a panel that is hidden without being gone
 * ([0047](../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)).
 *
 * **It is not an overlay, and that is the whole design.** The panel is drawn where the
 * consumer wrote it, so the tab order, the theme, the writing direction and the stacking
 * context are the page's own — none of the four things a panel outside the host tree stops
 * inheriting applies ([`lesson-35`](../../../../docs/lessons.md#lesson-35)), and the tab order
 * a popover has to splice by hand ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md))
 * is here for nothing. A user tabs in, parks, and tabs out — which is exactly the shape 0031
 * said a popover is not.
 *
 * **A closed drawer is still text in the document.** It carries `hidden="until-found"`, so the
 * browser's find-in-page searches a shut navigation panel and the reveal is answered rather
 * than undone — the tabs' mechanism at its second component
 * ([0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
 *
 * **Not modal.** There is no veil, no focus trap and no `inert` on the page behind: a panel
 * that took the page away would not be a place to park. A side sheet that must be answered
 * before anything else is `pct-dialog`.
 *
 * @example
 * <button pctDrawerTrigger [pctDrawerTrigger]="nav">Menu</button>
 * <pct-drawer #nav heading="Sections" side="start">
 *   <nav>…</nav>
 * </pct-drawer>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-drawer',
  imports: [PctIcon],
  templateUrl: './drawer.html',
  styleUrl: './drawer.scss',
  host: {
    class: 'pct-drawer',
    // The host IS the panel, so the role, the name and the state all sit on the tag the
    // consumer typed — the opposite of the dialog, whose role travels to an overlay and whose
    // name therefore has to be an input (`req-a11y-built-in`). A named `region` is a landmark:
    // a screen reader reaches a parked panel by its name without walking the page to it.
    role: 'region',
    '[id]': 'panelId',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]':
      'ariaLabelledby() || (heading() ? headingId : null)',
    '[attr.data-pct-side]': 'side()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.hidden]': 'present() ? null : "until-found"',
    '(beforematch)': 'onFound()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class PctDrawer {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly document = inject(DOCUMENT);

  /**
   * Whether the drawer stands open. A `model`, because both directions are ordinary: an
   * application opens it, and the drawer closes itself on Escape, on its own cross and on a
   * second press of the trigger.
   *
   * @since 0.1.0
   */
  readonly open = model(false);

  /**
   * Which edge it is docked to. See [`PctDrawerSide`](./drawer.types.ts) for why it is logical.
   *
   * @since 0.1.0
   */
  readonly side = input<PctDrawerSide>('start');

  /**
   * The visible title, drawn at the top of the panel and used as its accessible name. A region
   * with no name is not a landmark at all — a screen reader lists it as "region" and the user
   * has to read the panel to find out what it is — so an unnamed one is reported in dev mode.
   *
   * @since 0.1.0
   */
  readonly heading = input<string>('');

  /**
   * The accessible name of a drawer with no visible heading.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere inside the content.
   *
   * @since 0.1.0
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * Whether the panel draws a cross of its own in the header.
   *
   * @since 0.1.0
   */
  readonly closeButton = input(true, { transform: booleanAttribute });

  /**
   * Whether Escape closes it — and only an Escape pressed **inside** the panel, because the
   * page behind is live. A non-modal panel that answered every Escape in the document would
   * be taking the key away from whatever the user was really doing.
   *
   * @since 0.1.0
   */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });

  /**
   * Why it closed.
   *
   * @since 0.1.0
   */
  readonly closed = output<PctDrawerCloseReason>();

  private readonly uid = nextPctId('pct-drawer');

  /**
   * What `aria-controls` on the trigger points at. The consumer's own `id` wins if they wrote
   * one: the attribute is on the tag they typed, and a host binding that overwrote it would
   * silently break every other reference in their page.
   */
  readonly panelId = this.element.getAttribute('id') || this.uid;

  protected readonly headingId = `${this.uid}-heading`;

  /**
   * Whether the panel is still on the screen. It is not `open()`: a drawer slides out, and
   * `hidden="until-found"` computes `content-visibility: hidden`, which empties the panel of
   * its content at once — so applying it on the close would slide an empty slab off the edge.
   * The attribute therefore lands **after** the motion, and the wait is `pctAfterTransition`'s,
   * which reads the duration the token build wrote and collapses with it when the user asked
   * for less motion (`req-a11y-motion`).
   */
  protected readonly present = signal(false);

  /**
   * The leave in flight, cancelled by a drawer opened again before it finished.
   *
   * There is deliberately **no** cancel on destroy. A drawer torn down mid-slide leaves a
   * `setTimeout` and a `transitionend` listener on a detached element; both are collected with
   * it, and the callback writes a signal nobody reads. A cleanup for that would be a line no
   * test in any engine could tell from its absence — a branch nothing can reach is a claim
   * with no measurement behind it, and this library would rather not have one.
   */
  private cancelLeave: (() => void) | null = null;

  /**
   * Why the **next** close happened. Set by whichever path closes the drawer and read once by
   * the effect; `api` is the default, because a value written from outside is what every path
   * that does not announce itself looks like — including a control the consumer put in the
   * content. The dialog's field one component over, and for its reason: `open` carries a
   * state and a withdrawal is not one.
   */
  private reason: PctDrawerCloseReason = 'api';

  /**
   * The element that last opened it, remembered by the trigger. It is not "the trigger" —
   * a drawer may be opened from the header bar and from a link in the footer, and the answer
   * to "where does focus go back to" is the one that was pressed rather than the one that
   * registered last ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)
   * reported that ambiguity in dev mode; here there is nothing to report).
   */
  private openedBy: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => this.sync(open));
    });

    // One guard per call, because that is the shape `check-texts` reads a guard in.
    if (isDevMode()) effect(() => this.warnOnUnnamed());
    if (isDevMode()) effect(() => this.warnOnCaught());
  }

  /**
   * Called by [`PctDrawerTrigger`](./drawer-trigger.ts) so that a close the drawer performs
   * itself can give the keyboard back to the control that pressed it.
   *
   * @since 0.1.0
   */
  rememberTrigger(trigger: HTMLElement): void {
    this.openedBy = trigger;
  }

  /**
   * Closes with a reason, from a path that knows one. A close while already shut is a no-op:
   * Escape pressed twice is one withdrawal, not two events.
   *
   * @since 0.1.0
   */
  close(reason: PctDrawerCloseReason): void {
    if (!this.open()) return;

    // Read BEFORE the model changes, and the answer decides whether the keyboard moves at
    // all: it goes back only if it was inside, which is 0031's rule read here — the page
    // behind is live, so a user who has already clicked into it must not be pulled out.
    const inside = this.element.contains(this.document.activeElement);

    this.reason = reason;
    this.open.set(false);
    if (inside) this.openedBy?.focus();
  }

  /**
   * The state going one way or the other. Opening is immediate; closing waits out the slide so
   * that what leaves the screen is the panel and not an empty box.
   */
  private sync(open: boolean): void {
    this.cancelLeave?.();
    this.cancelLeave = null;

    if (open) {
      this.present.set(true);
      return;
    }

    // Never shown: there is no motion to wait for, `present` is already false, and nothing
    // closed — a drawer that was shut and is shut again is not an event.
    if (!this.present()) return;

    this.cancelLeave = pctAfterTransition(this.element, () =>
      this.present.set(false),
    );

    this.closed.emit(this.reason);
    this.reason = 'api';
  }

  /**
   * The browser found text in a shut drawer and is about to reveal it. Opening the model here
   * is what makes the reveal permanent — the platform takes `hidden` off by itself, and the
   * next render would put it straight back
   * ([0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
   */
  protected onFound(): void {
    this.open.set(true);
  }

  protected onEscape(event: Event): void {
    // The state is read here and not left to `close`, because the default is taken either way
    // once `preventDefault` has run: a shut drawer that swallowed Escape would be taking the
    // key from whatever the page really wanted to do with it, and a shut drawer is exactly
    // the state a page spends most of its time in.
    if (!this.closeOnEscape() || !this.open()) return;
    // The page behind keeps every other Escape: this handler is on the host, so it runs only
    // for a key pressed on the panel or inside it. Preventing the default is what stops the
    // same press also closing a dialog this drawer stands in.
    event.preventDefault();
    this.close('escape');
  }

  protected closeFromButton(): void {
    this.close('close');
  }

  /**
   * `position: fixed` means the window — unless an ancestor says otherwise. A `transform`, a
   * `filter`, `contain: paint`, `content-visibility: auto` or a `will-change` naming one of
   * them on ANY element above the drawer makes that element the containing block, and the
   * panel docks to it: it lands in the middle of the page, at an edge nobody asked for, and
   * nothing in the drawer is wrong. The consumer cannot diagnose that without knowing the
   * rule, and the platform knows which element it was: `offsetParent` of a fixed element is
   * `null` while it belongs to the window and the catching ancestor otherwise — measured in
   * three engines, over every property in `CAPTURING` and a dozen that do not catch
   * (`container-type` among them, whatever the first draft of the card said). So that is
   * what is asked, and the properties are read only to NAME the reason.
   */
  private warnOnCaught(): void {
    if (!this.open()) return;
    const view = this.document.defaultView;
    const caught = this.element.offsetParent;
    if (!view || !caught) return;
    const reason = capturingProperty(view.getComputedStyle(caught));
    // Chromium answers `<body>` for a `zoom` above the drawer while the panel stays at the
    // window, so the body (and the root) is reported only with a reason read off it.
    if (
      !reason &&
      (caught === this.document.body ||
        caught === this.document.documentElement)
    )
      return;
    const name =
      caught.tagName.toLowerCase() + (caught.id ? `#${caught.id}` : '');
    console.warn(
      `[pct-drawer] An open drawer docked to <${name}> and not to the window: that ` +
        `ancestor establishes a containing block` +
        (reason ? ` (\`${reason}\`)` : '') +
        `, and \`position: fixed\` docks to it. Move the drawer out from under it, or ` +
        `take the property off — a transform, a filter, \`contain: paint\`, ` +
        `\`content-visibility: auto\` or a \`will-change\` naming one of them is enough.`,
    );
  }

  /** An open region with no accessible name is announced as "region" and nothing else. */
  private warnOnUnnamed(): void {
    if (!this.open()) return;
    if (this.heading() || this.ariaLabel() || this.ariaLabelledby()) return;
    console.warn(
      `[pct-drawer] An open drawer with no accessible name. Give it a \`heading\`, or ` +
        `\`ariaLabel\`/\`ariaLabelledby\` when the name already stands somewhere in the ` +
        `content. A region without one is not a landmark a screen reader can offer — it is ` +
        `announced as "region" and the user has to read the panel to find out what it is.`,
    );
  }
}

/**
 * The properties that make an element the containing block of its fixed descendants, each
 * with the value that means "off" — measured in chromium, firefox and webkit on 2026-09-05.
 * `contain` and `will-change` are lists and are read below. `container-type`, `overflow`,
 * `isolation`, `opacity`, `zoom`, `position` and `contain: size | style` were measured too and
 * catch nothing.
 */
const CAPTURING: ReadonlyArray<readonly [property: string, off: string]> = [
  ['transform', 'none'],
  ['translate', 'none'],
  ['rotate', 'none'],
  ['scale', 'none'],
  ['perspective', 'none'],
  ['filter', 'none'],
  ['backdrop-filter', 'none'],
  ['offset-path', 'none'],
  ['transform-style', 'flat'],
  ['content-visibility', 'visible'],
];

/** The property an ancestor caught the panel with, as `name: value`, or `null` when none is read. */
function capturingProperty(style: CSSStyleDeclaration): string | null {
  for (const [property, off] of CAPTURING) {
    const value = style.getPropertyValue(property);
    // jsdom answers '' for a property nobody set; an engine answers the "off" value.
    if (value !== '' && value !== off) return `${property}: ${value}`;
  }
  const contain = style.getPropertyValue('contain');
  if (/\b(paint|layout|strict|content)\b/.test(contain))
    return `contain: ${contain}`;
  const willChange = style.getPropertyValue('will-change');
  if (
    /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter|offset-path|contain|content-visibility)\b/.test(
      willChange,
    )
  )
    return `will-change: ${willChange}`;
  return null;
}
