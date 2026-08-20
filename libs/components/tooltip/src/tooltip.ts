import {
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
  OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  ComponentRef,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  isDevMode,
} from '@angular/core';
import {
  nextPctId,
  pctAfterTransition,
  pctOverlay,
  PctOverlayInherited,
  PctOverlayPanel,
  PctPlacement,
  pctPlacementPositions,
} from '@pacit/components/core';
import { PctTooltipAs } from './tooltip.types';

/**
 * The gap between the control and its tooltip, in pixels.
 *
 * A number here and not a token, and the reason is where it is read: the distance is an
 * argument to the dependency's position strategy, that is a value JavaScript hands over before
 * any stylesheet exists. A token would have to be read back out of the computed style on every
 * opening — a layout measurement to learn a constant — and a skin that moved it would move
 * nothing the panel draws.
 */
const OFFSET = 8;

/**
 * How long a pointer rests on the control before the tooltip appears. Not zero: a pointer
 * crossing a toolbar passes over every button in it, and a tooltip with no wait turns that
 * into a row of panels flashing on and off.
 */
const HOVER_DELAY = 150;

/**
 * How long the tooltip survives the pointer leaving. This is not politeness but WCAG 1.4.13
 * ("hoverable"): the panel stands `OFFSET` pixels away from the control, so a pointer moving
 * onto it leaves the control first — and with no grace at all the thing the user is reaching
 * for would go away as they reached for it.
 */
const LEAVE_DELAY = 150;

/** A press long enough to be a question about the control rather than a tap on it. */
const LONG_PRESS = 500;

/** How long a tooltip opened by a long press stays once the finger has gone. */
const TOUCH_STAY = 1500;

/**
 * The panel a tooltip draws — attached to an overlay by `PctTooltip`, never written in a
 * template. It is public because it is what the part inventory names (`req-api-parts`): the
 * `panel` part a consumer styles belongs to this class.
 */
@Component({
  selector: 'pct-tooltip',
  imports: [PctOverlayPanel],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.scss',
  host: {
    class: 'pct-tooltip',
    // The host is a wrapper the overlay creates; everything drawn is one element below it.
    style: 'display: contents',
  },
})
export class PctTooltipPanel {
  /** What it says. */
  readonly text = input('');

  /** The id the trigger's `aria-describedby` points at while this is on the screen. */
  readonly panelId = input('');

  /** What the tree stopped carrying outside the host: theme, typeface, size, direction. */
  readonly inherited = input<PctOverlayInherited | null>(null);

  /** True while the panel is fading out — the state the leave transition runs from. */
  readonly leaving = input(false);
}

/**
 * A tooltip: a short piece of text about the control it sits on, shown on hover, on keyboard
 * focus and on a long press.
 *
 * It implements the ARIA APG
 * [Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) — `role="tooltip"` on a
 * panel that takes no focus, reached from the trigger by an ARIA relation, dismissible with
 * Escape while focus stays where it was.
 *
 * **What the text is, is the whole question** ([`PctTooltipAs`](./tooltip.types.ts)). A tooltip
 * on a labelled control *describes* it and reaches assistive technology as
 * `aria-describedby` — added while the panel is up and taken away with it, because a
 * description of something nobody can see is a reference into the void that an audit does see
 * (`req-a11y-axe`). A tooltip on an icon-only button *names* it, and a name may not come and
 * go with the pointer: it is written as `aria-label` and stands whether the tooltip is open,
 * closed or never opened at all. `title` makes neither choice, which is why this component
 * exists.
 *
 * **WCAG 1.4.13 (content on hover or focus)** is the rest of the behaviour: Escape dismisses
 * it without moving focus, the pointer can travel onto the panel and read it, and nothing
 * takes it away on a timer.
 *
 * **SSR**: the panel is attached by an event, and there are no events on the server — so
 * nothing renders there and nothing hydrates. `aria-label` is the exception, and deliberately:
 * a name is part of the markup, not of an interaction.
 *
 * @example
 * <button pctButton pctTooltip="Removes the project and everything in it">Delete</button>
 *
 * @example
 * <!-- An icon-only button: the tooltip is the only name it has. -->
 * <button pctButton pctTooltip="Delete" pctTooltipAs="name" pctTooltipPlacement="end">
 *   <pct-icon name="trash">…</pct-icon>
 * </button>
 */
@Directive({
  selector: '[pctTooltip]',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
  },
})
export class PctTooltip {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  /** The text. An empty one is a tooltip that never opens rather than an empty panel. */
  readonly text = input('', { alias: 'pctTooltip' });

  /**
   * Which side of the control it opens on — logical, so `end` is the right in an English page
   * and the left in an Arabic one. The window has the last word: a side with no room for the
   * panel falls back to the one across the control (`pctPlacementPositions`).
   */
  readonly placement = input<PctPlacement>('top', {
    alias: 'pctTooltipPlacement',
  });

  /** Whether the text describes the control or names it. See `PctTooltipAs`. */
  readonly as = input<PctTooltipAs>('description', { alias: 'pctTooltipAs' });

  /**
   * Switches the tooltip off without taking it out of the template — the state a control has
   * while its own text is not worth showing. A disabled tooltip also stops naming: a name that
   * is not shown is still a name, and one an application asked to be rid of is not.
   */
  readonly disabled = input(false, {
    transform: booleanAttribute,
    alias: 'pctTooltipDisabled',
  });

  /** The panel's id — what `aria-describedby` points at while it is up. */
  private readonly panelId = nextPctId('pct-tooltip');

  /**
   * The overlay half from `core`: the four properties a panel outside the host tree stops
   * inheriting (`lesson-35`). A tooltip is the layer's third consumer and the first one whose
   * panel is not opened by a click.
   */
  private readonly overlay = pctOverlay({
    from: () => this.host.nativeElement,
  });

  /** The overlay while it is up; `null` whenever the tooltip is closed. */
  private ref: OverlayRef | null = null;

  /** The panel component inside that overlay, so its inputs can be written while it is up. */
  private panel: ComponentRef<PctTooltipPanel> | null = null;

  /** The pending wait for the leave transition; `null` when nothing is leaving. */
  private cancelLeave: (() => void) | null = null;

  /** The one timer this directive owns — a hover, a long press or a grace period. */
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the `aria-label` on the trigger is ours, so nobody else's is ever removed. */
  private named = false;

  /** Whether our id stands in the trigger's `aria-describedby`, for the same reason. */
  private described = false;

  constructor() {
    // A NAME is not an event. A control named by its tooltip has to be named before anybody
    // hovers it — on the server, in a search index, for a screen-reader user reading the page
    // rather than pointing at it — so this half is an attribute written once and kept, not
    // something the overlay carries.
    effect(() => this.name());

    // The text is a signal like any other, and an open panel has to follow it. Taken away
    // entirely — or the tooltip switched off — the panel goes with it, rather than leaving a
    // control describing itself with a string it no longer has.
    effect(() => {
      const text = this.text().trim();
      if (!text || this.disabled()) {
        this.hide();
        return;
      }
      if (!this.panel) return;
      this.panel.setInput('text', this.text());
      this.panel.changeDetectorRef.detectChanges();
      // A longer sentence is a wider panel, and the side it was placed on was measured
      // against the width it had a moment ago.
      this.ref?.updatePosition();
    });

    if (isDevMode()) afterNextRender(() => this.warn());

    inject(DestroyRef).onDestroy(() => {
      this.stopTimer();
      this.cancelLeave?.();
      this.detach();
      this.unname();
    });
  }

  // ── the pointer, the keyboard and the finger ────────────────────────────────────────────

  protected onPointerEnter(event: PointerEvent): void {
    // A tap reports itself as a pointer entering, and a tooltip that opened on it would open
    // on every press of every button. Touch has its own road below.
    if (event.pointerType === 'touch') return;
    this.later(() => this.show(), HOVER_DELAY);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.later(() => this.hide(), LEAVE_DELAY);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      // A press is the user acting on the control, not asking what it is — and the panel
      // would otherwise stand over whatever the press opened.
      this.hide();
      return;
    }
    this.later(() => this.show(), LONG_PRESS);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    // Either the long press never came due — and the timer goes with the finger — or it did,
    // and the panel stays up long enough to be read by somebody who has no pointer to rest.
    if (this.ref) this.later(() => this.hide(), TOUCH_STAY);
    else this.stopTimer();
  }

  protected onFocusIn(): void {
    // Focus waits for nothing: the keyboard user has arrived at the control deliberately, and
    // a delay on the way in is a delay on the only road they have to the text.
    if (this.focusIsVisible()) this.show();
  }

  protected onFocusOut(): void {
    this.hide();
  }

  /**
   * Whether this focus is one the user can be shown something for. A tooltip that opened on
   * every click as well would stand over the thing the click had just done — and `:focus-visible`
   * is the platform's own answer to "did this focus come from the keyboard", rather than a
   * second guess at it kept in a field here (`req-api-platform`).
   *
   * Read defensively: an engine that does not know the selector throws on `matches`, and the
   * honest fallback is to show. The failure that costs something is the keyboard user who
   * never gets the text, not the mouse user who gets it once too often.
   */
  private focusIsVisible(): boolean {
    try {
      return this.host.nativeElement.matches(':focus-visible');
    } catch {
      return true;
    }
  }

  // ── open and close ──────────────────────────────────────────────────────────────────────

  private show(): void {
    this.stopTimer();
    if (!this.text().trim() || this.disabled()) return;

    if (this.ref) {
      // Asked for again before its leave had finished — so the fade is turned round rather
      // than a second panel attached over the first.
      this.cancelLeave?.();
      this.cancelLeave = null;
      this.panel?.setInput('leaving', false);
      this.panel?.changeDetectorRef.detectChanges();
      this.describe();
      return;
    }
    this.attach();
  }

  private hide(): void {
    this.stopTimer();
    const ref = this.ref;
    const panel = this.panel;
    if (!ref || !panel || this.cancelLeave) return;

    // The description goes at the start of the leave and not at the end of it: from here on
    // the panel is on its way out, and a reference to a fading element is a reference to
    // something the reader can no longer be pointed at.
    this.undescribe();
    panel.setInput('leaving', true);
    panel.changeDetectorRef.detectChanges();

    const element = ref.overlayElement.querySelector<HTMLElement>(
      '[data-pct-part="panel"]',
    );
    if (!element) {
      this.detach();
      return;
    }

    const cancel = pctAfterTransition(element, () => this.detach());
    // `pctAfterTransition` calls back at once where there is no transition to wait for — in
    // jsdom, and for a user who asked for no motion. The assignment then lands AFTER the
    // detach it belongs to, so what is kept is a wait that is still pending.
    this.cancelLeave = this.ref ? cancel : null;
  }

  private attach(): void {
    // `show()` on the overlay layer **is** the read of what an overlay severs: there is no
    // path to an open panel that carries no theme (`lesson-35`).
    this.overlay.show();
    const inherited = this.overlay.inherited();
    const direction = inherited?.direction === 'rtl' ? 'rtl' : 'ltr';

    const position = createFlexibleConnectedPositionStrategy(
      this.injector,
      this.host.nativeElement,
    )
      .withPositions(pctPlacementPositions(this.placement(), OFFSET, direction))
      // A tooltip that does not fit is slid back into the window rather than clipped: a
      // sentence with its end cut off is worse than one a few pixels off its side.
      .withPush(true);

    const ref = createOverlayRef(this.injector, {
      positionStrategy: position,
      // The panel follows a scrolling page. The alternative — closing on scroll — would take
      // the text away from a user who scrolled the control into a comfortable place to read it.
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      // The direction is the CONTROL's, not the page's: `start`/`end` are resolved by the
      // dependency against the overlay's own direction, and a panel outside the host tree has
      // no other way of learning it.
      direction,
      panelClass: 'pct-tooltip__pane',
      disposeOnNavigation: true,
    });
    this.ref = ref;

    // The injector is handed over explicitly, because a component created outside the tree
    // resolves nothing from the place it appears to stand in: the texts, the configuration and
    // the theme of the subtree the control lives in would all be the application's defaults.
    const panel = ref.attach(
      new ComponentPortal(PctTooltipPanel, null, this.injector),
    );
    this.panel = panel;
    panel.setInput('text', this.text());
    panel.setInput('panelId', this.panelId);
    panel.setInput('inherited', inherited);

    // The position strategy measures the panel the moment it is attached, and what it measures
    // is what stands in the DOM. Without this pass that is an empty box: the text arrives at
    // the next detection, and the panel is left centred on the width it had before it had any.
    panel.changeDetectorRef.detectChanges();
    ref.updatePosition();

    this.describe();

    // Dismissible without moving focus (WCAG 1.4.13). It comes from the closing stack — the
    // dependency's dispatcher hands a keydown to the top-most attached overlay alone — so a
    // tooltip open inside a dialog answers Escape first and the dialog does not see the key
    // ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)).
    ref.keydownEvents().subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.hide();
    });

    ref.overlayElement.addEventListener('pointerenter', this.onPanelEnter);
    ref.overlayElement.addEventListener('pointerleave', this.onPanelLeave);
  }

  private detach(): void {
    const ref = this.ref;
    this.cancelLeave = null;
    this.panel = null;
    this.ref = null;
    if (!ref) return;

    ref.overlayElement.removeEventListener('pointerenter', this.onPanelEnter);
    ref.overlayElement.removeEventListener('pointerleave', this.onPanelLeave);
    this.undescribe();
    ref.dispose();
    this.overlay.hide();
  }

  /** The pointer reached the panel: it is being read, so nothing is taking it away. */
  private readonly onPanelEnter = (): void => this.show();

  private readonly onPanelLeave = (): void =>
    this.later(() => this.hide(), LEAVE_DELAY);

  private later(action: () => void, delay: number): void {
    this.stopTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      action();
    }, delay);
  }

  private stopTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  // ── what the trigger says about itself ──────────────────────────────────────────────────

  /**
   * `aria-describedby` is a **list**, and one this library writes into rather than over: a
   * control inside the field chrome already points at its hint or its error there
   * (`req-api-message`), and a tooltip that set the attribute would silently take that away.
   */
  private describe(): void {
    if (this.as() !== 'description' || this.described) return;
    const host: HTMLElement = this.host.nativeElement;
    const current = host.getAttribute('aria-describedby')?.trim();
    host.setAttribute(
      'aria-describedby',
      current ? `${current} ${this.panelId}` : this.panelId,
    );
    this.described = true;
  }

  /** Takes back exactly the one id this directive added, and leaves whatever else stood there. */
  private undescribe(): void {
    if (!this.described) return;
    this.described = false;
    const host: HTMLElement = this.host.nativeElement;
    const rest = (host.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== this.panelId)
      .join(' ');
    if (rest) host.setAttribute('aria-describedby', rest);
    else host.removeAttribute('aria-describedby');
  }

  private name(): void {
    const host: HTMLElement = this.host.nativeElement;
    const name =
      this.as() === 'name' && !this.disabled() ? this.text().trim() : '';
    if (name) {
      host.setAttribute('aria-label', name);
      this.named = true;
      return;
    }
    this.unname();
  }

  private unname(): void {
    if (!this.named) return;
    this.named = false;
    this.host.nativeElement.removeAttribute('aria-label');
  }

  // ── what the author is told in dev mode ─────────────────────────────────────────────────

  /**
   * The two ways the "describes vs names" choice goes wrong, reported where they are cheap to
   * fix. Neither is repaired here: which of the two a tooltip is depends on what the control
   * already says, and this is the one thing the library cannot know better than the author.
   */
  private warn(): void {
    const host: HTMLElement = this.host.nativeElement;
    if (!this.text().trim() || this.disabled()) return;

    if (this.as() === 'description' && !this.hasName(host)) {
      console.warn(
        `[pctTooltip] "${this.text()}" describes a control that has no name of its own, so ` +
          `a screen reader announces the description and nothing else. Give the control a ` +
          `name, or say that the tooltip IS the name: \`pctTooltipAs="name"\`.`,
      );
      return;
    }

    const visible = (host.textContent ?? '').trim();
    if (
      this.as() === 'name' &&
      visible &&
      !this.text().toLowerCase().includes(visible.toLowerCase())
    ) {
      console.warn(
        `[pctTooltip] The tooltip names a control that already reads "${visible}", and the ` +
          `name it gives ("${this.text()}") does not contain that text — so speech input has ` +
          `no way of addressing it (WCAG 2.5.3). Use \`pctTooltipAs="description"\`, or make ` +
          `the name start with what the control says.`,
      );
    }
  }

  /**
   * Whether the control has a name without the tooltip. A heuristic, deliberately: the real
   * computation is the browser's, and this library measures that one in the audit over a
   * rendered page (`req-a11y-axe`) rather than reimplementing it. What this has to be is
   * cheap and free of false alarms — everything it reads really does name an element.
   *
   * `labels` is here because the first version of this method did not have it, and the first
   * page it ran on reported a false alarm: an `<input pctText>` inside the field chrome is
   * named by a `<label for>` standing somewhere else entirely, and the input carries **not
   * one attribute** saying so ([`lesson-91`](../../../../docs/lessons.md#lesson-91)). The
   * collection is the platform's own answer to the question, which is the same road
   * `:focus-visible` takes above rather than a second guess kept here.
   */
  private hasName(host: HTMLElement): boolean {
    for (const attribute of ['aria-label', 'aria-labelledby', 'title'])
      if (host.getAttribute(attribute)?.trim()) return true;
    if ((host.textContent ?? '').trim()) return true;
    const labels = (host as HTMLInputElement).labels;
    if (labels)
      for (const label of Array.from(labels))
        if (label.textContent?.trim()) return true;
    if (host.querySelector<HTMLImageElement>('img[alt]')?.alt.trim())
      return true;
    return !!host.querySelector('svg > title, svg > desc');
  }
}
