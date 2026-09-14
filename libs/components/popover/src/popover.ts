import { InteractivityChecker } from '@angular/cdk/a11y';
import {
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
  OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  EmbeddedViewRef,
  inject,
  Injector,
  input,
  isDevMode,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  pctAfterTransition,
  pctOverlay,
  PctOverlayPanel,
  PctPlacement,
  pctPlacementPositions,
} from '@pacit/components/core';
import { PctPopoverCloseReason } from './popover.types';

/**
 * The gap between the trigger and the panel, in pixels — the tooltip's number and the
 * tooltip's reason: the distance is an argument the position strategy is handed before any
 * stylesheet exists, so a token here would have to be read back out of the computed style on
 * every opening.
 */
const OFFSET = 8;

/**
 * A popover: a panel of content hanging off the control that opened it, with focus inside it
 * and the rest of the page still answering.
 *
 * **It is the non-modal half of the dialog, and every difference follows from that one word.**
 * `role="dialog"` with **no** `aria-modal`, no veil, no `inert` over the background and no
 * scroll lock — the page behind stays live, which is the whole point of a panel that hangs off
 * a control instead of standing over the page. What it keeps from the dialog is the part a
 * panel with content cannot do without: it takes focus, it says what it is, and it gives focus
 * back to the trigger when the user dismisses it.
 *
 * **Focus goes to the panel itself, not to the first control in it.** The panel carries the
 * name and the role, so focusing it is what makes a screen reader announce what has just
 * opened; landing on the first field skips that announcement and starts the user in the middle
 * of something they were never told about. Tab from there reaches the content, because the
 * panel stands before its own children.
 *
 * **And it comes back only if it was inside.** A popover is non-modal, so the user can click
 * into the page behind it and dismiss it from there — pulling focus back to the trigger then
 * would take it off whatever they had just started typing in. Tab out of the panel is the
 * third way out and the one the DOM would get wrong on its own: an overlay is a child of
 * `body`, so its content sits at the end of the document's tab order however near the trigger
 * it is drawn, and Tab therefore closes the panel and hands focus back to the trigger for the
 * page's own order to carry on from.
 *
 * **Or it is a part of the page.** `inline` draws the same panel where the consumer wrote the
 * component instead of in a layer over it — 0047's sentence about the drawer, made an input,
 * because the shape a page really has is often both: a filter panel that stands permanently on
 * a wide screen and hangs off a button on a narrow one is one panel with two lives, and the
 * consumer is the only one who knows which page is which. Everything that goes with it is
 * something the overlay was doing; the input's own comment holds the list.
 *
 * **SSR**: nothing renders on the server — unless it is `inline`, where the panel is markup of
 * the host template and an open one is in what the server sends, which is the property that
 * input exists for. Attached to an overlay it is a template waiting for a browser render, so a
 * popover left `open` at bootstrap sends no markup and hydrates no mismatch
 * (`req-project-ssr`). The trigger's `aria-expanded` is the deliberate exception — it is part
 * of the control's markup rather than of an interaction.
 *
 * @example
 * <button pctButton [pctPopoverTrigger]="filters">Filters</button>
 * <pct-popover #filters heading="Filters" placement="bottom">
 *   <pct-field label="Owner"><input pctText /></pct-field>
 *   <button pctButton (click)="filters.open.set(false)">Apply</button>
 * </pct-popover>
 *
 * <!-- the same panel, drawn where it stands -->
 * <pct-popover inline [open]="true" heading="Filters">…</pct-popover>
 */
@Component({
  selector: 'pct-popover',
  imports: [PctOverlayPanel, NgTemplateOutlet],
  templateUrl: './popover.html',
  styleUrl: './popover.scss',
  host: {
    class: 'pct-popover',
    // The host draws nothing of its own in either mode: with an overlay everything it draws
    // lives outside the tree, and it stays here because it is where the panel's severed
    // properties are read from. `display: contents` is also what makes the inline panel land
    // in the consumer's own layout — the host box is not there to be a wrapper between the
    // page's grid and the panel it wrote into it.
    style: 'display: contents',
  },
})
export class PctPopover {
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly interactivity = inject(InteractivityChecker);

  /**
   * Whether the panel is up. A `model`, because both directions are ordinary: an application
   * opens it, and the popover closes itself on Escape, on a press outside and on the trigger.
   */
  readonly open = model(false);

  /**
   * The visible title, rendered as the panel's heading and used as its accessible name. A
   * panel with no name is announced as "dialog" and nothing else, so an empty one is reported
   * in dev mode rather than passed over.
   */
  readonly heading = input<string>('');

  /**
   * The accessible name of a popover with no visible heading — an INPUT and not an attribute
   * on the tag, for the dialog's reason: the role sits on the panel inside the overlay, and
   * the host carries none at all (`req-a11y-built-in`).
   */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere inside the content. */
  readonly ariaLabelledby = input<string>('');

  /**
   * Which side of the trigger it opens on — logical, so `end` is the right in an English page
   * and the left in an Arabic one. The window has the last word: a side with no room for the
   * panel falls back to the one across the trigger (`pctPlacementPositions`). It says nothing
   * `inline`: a panel drawn in the page is placed by the page.
   */
  readonly placement = input<PctPlacement>('bottom');

  /**
   * Draws the panel in the host, where the consumer wrote the component, instead of in an
   * overlay over the page. The same template, the same classes, the same parts and the same
   * stylesheet — a second panel written out for this case is the defect the input exists to
   * avoid.
   *
   * **What it gives up is what the overlay was doing, and nothing else.** The anchoring goes
   * with it, and so do the three ways out the layer delivered. Escape and the outside press
   * come from the closing stack, which has no entry for a panel that was never attached
   * ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)); Tab out
   * is 0031's splice, and 0031 exists because an overlay stands at the END of the document's
   * order however near its trigger it is drawn. Inline it stands exactly where its trigger
   * does, the page's own order carries on from it, and a panel that closed behind a user
   * walking past it could never be a place to park — which is the whole of
   * [0047](../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md),
   * read one component over. `trigger` and `api` are therefore the only reasons an inline close
   * can carry.
   *
   * **Nothing moves focus either.** Focus into the panel is how a reader is told about
   * something that has appeared elsewhere in the document; a panel that appears where the
   * reader already is has announced itself by being there — and an inline popover left `open`
   * at bootstrap would otherwise pull focus the moment the page hydrated, which nobody asked
   * for. It keeps `role="dialog"`, its name, and `tabindex="-1"`: out of the tab order itself,
   * so Tab from the trigger goes into the content rather than onto the box around it.
   *
   * **It appears, and it goes.** The enter is the stylesheet's alone — `@starting-style` fires
   * wherever the panel is inserted and needs no JavaScript — but the leave is not run: `leaving`
   * never turns over inline and `data-pct-leaving` is an overlay attribute. The attribute exists
   * to hold a node in the DOM until its fade has finished, and inline that node is holding a
   * hole open in the page's own layout while it waits. An overlay has no layout to hold.
   */
  readonly inline = input(false, { transform: booleanAttribute });

  /** Why it closed. See `PctPopoverCloseReason`. */
  readonly closed = output<PctPopoverCloseReason>();

  private readonly uid = nextPctId('pct-popover');

  /** What the trigger's `aria-controls` points at while the panel is up. */
  readonly panelId = `${this.uid}-panel`;

  protected readonly headingId = `${this.uid}-heading`;

  /**
   * The control this panel hangs off, as registered by `PctPopoverTrigger`. A signal and not a
   * field, because a popover asked to open before its trigger has rendered has to open the
   * moment it does — the effect below is waiting for this rather than giving up.
   */
  private readonly trigger = signal<HTMLElement | null>(null);

  private readonly panelTemplate =
    viewChild.required<TemplateRef<void>>('panel');

  /**
   * The overlay half from `core`: the four properties a panel outside the host tree stops
   * inheriting (`lesson-35`). The popover is the layer's fourth consumer and the second one
   * whose panel takes focus.
   */
  private readonly panelOverlay = pctOverlay({
    // The trigger is what the panel is an extension of. The host is the fallback and never
    // the real answer — nothing opens without a trigger — but it inherits the same four
    // properties, so a reading taken from it is honest rather than empty.
    from: () => this.trigger() ?? this.host.nativeElement,
  });

  /**
   * What the panel has to be handed because the tree stopped handing it — and `null` inline,
   * where the tree never stopped. It is not merely unnecessary there: a popover that has been
   * an overlay keeps the last reading (a closed panel has nothing to describe), so binding it
   * to an inline panel would pin a copy of the trigger's theme, typeface and direction over the
   * live ones it is standing in, and the responsive case this input exists for is exactly the
   * one that switches mode after an opening.
   */
  protected readonly inherited = computed(() =>
    this.inline() ? null : this.panelOverlay.inherited(),
  );

  /** The overlay while it is up; `null` whenever the popover is closed. */
  private ref: OverlayRef | null = null;

  /**
   * Whether the panel is on the screen — attached to the overlay or standing in the host, which
   * are two places and one state. It is what makes a close an event: the overlay half could
   * answer that question with `ref`, the inline half has nothing to ask, and one field asked by
   * both is one answer to "did this popover close" instead of two that can disagree.
   */
  private shown = false;

  /** The panel's view, so the leave can be put on the screen before it is waited for. */
  private view: EmbeddedViewRef<void> | null = null;

  /** True while the panel is fading out — the state the leave transition runs from. */
  protected readonly leaving = signal(false);

  /** The pending wait for that transition; `null` when nothing is leaving. */
  private cancelLeave: (() => void) | null = null;

  /**
   * Why the **next** close happened. Set by whichever path closes the popover and read once by
   * the effect; `api` is the default, because a value written from outside is what every path
   * that does not announce itself looks like.
   */
  private reason: PctPopoverCloseReason = 'api';

  /**
   * Whether a render has happened. There is none on the server, so this is the gate that keeps
   * the overlay a browser-only thing without the component asking which platform it is on.
   *
   * A field and not a signal, and the difference is a whole pass of the application: a signal
   * written after the first render is a second render for every consumer of the page, which
   * is what the cost record read on every preview holding one of these
   * ([`lesson-161`](../../../../docs/lessons.md#lesson-161)). What the effect below would have
   * done on that write is done once, in the callback that flips it.
   */
  private rendered = false;

  constructor() {
    afterNextRender(() => {
      this.rendered = true;
      // Open what was asked open before there was a render to open into, and say what the
      // development warning has to say now that it can — the two things the flip used to
      // trigger through the effects.
      if (!untracked(this.inline) && untracked(this.open)) {
        const trigger = untracked(this.trigger);
        if (trigger) this.attach(trigger);
      }
      if (isDevMode()) this.warnOnNoTrigger();
    });

    // Three dependencies and no more, which is why the body is `untracked`: attaching reads
    // the placement, the template and the properties the overlay layer has just written, and
    // every one of those would otherwise be a reason to run this again. It converges — the
    // second pass finds the panel attached and returns — but a run that exists only to
    // discover it has nothing to do is the near miss of [`lesson-94`](../../../../docs/lessons.md#lesson-94),
    // and the near miss is the one worth writing down.
    //
    // The mode is read FIRST and leaves through a return of its own, so that neither branch
    // takes the other's dependencies: inline waits for no render — the panel is in the template
    // — and the overlay half acts on an `open` only once there has been a render to act in.
    effect(() => {
      if (this.inline()) {
        const open = this.open();
        untracked(() => this.syncInline(open));
        return;
      }
      // Both signals are read before the gate on `rendered`, a field and not a signal (see it
      // above): were the return to come first, nothing would re-run this on the first `open`
      // after the render, because nothing would have been tracked.
      const trigger = this.trigger();
      const open = this.open();
      if (!this.rendered) return;
      untracked(() => {
        if (open) {
          if (trigger) this.attach(trigger);
          return;
        }
        this.beginLeave();
      });
    });

    // Destroyed while open: nothing is left to hear a `closed`, and the panel goes at once
    // rather than fading out of a tree that no longer exists.
    inject(DestroyRef).onDestroy(() => {
      this.cancelLeave?.();
      this.detach();
    });

    if (isDevMode()) effect(() => this.warnOnUnnamed());
    if (isDevMode()) effect(() => this.warnOnNoTrigger());
  }

  /**
   * Opens it if it is closed and closes it if it is open — what a press on the trigger does,
   * and the one path whose close carries the `trigger` reason.
   */
  toggle(): void {
    if (this.open()) this.dismiss('trigger', false);
    else this.open.set(true);
  }

  // ── what the trigger registers ──────────────────────────────────────────────────────────

  /**
   * Registers the control the panel hangs off. Called by `PctPopoverTrigger` and by nothing
   * else: the attributes a trigger carries belong to a directive standing on it, rather than
   * to a component reaching into an element it does not own.
   */
  bindTrigger(element: HTMLElement): void {
    // `untracked`, and it is not a tidy-up: this runs inside the trigger directive's effect,
    // so reading the signal there would make each trigger's registration depend on the
    // registration. With one trigger that is a wasted second pass; with TWO it is a loop that
    // never ends — each effect invalidated by the other's write, for ever
    // ([`lesson-94`](../../../../docs/lessons.md#lesson-94)).
    const current = untracked(this.trigger);
    if (isDevMode() && current && current !== element)
      console.warn(
        `[pct-popover] Two controls carry \`pctPopoverTrigger\` for the same popover. Both ` +
          `will say \`aria-expanded\`, the panel will hang off whichever registered last, and ` +
          `focus goes back to that one whoever opened it. Give each control a popover of its ` +
          `own.`,
      );
    this.trigger.set(element);
  }

  /**
   * Gives the registration back. It exists so that the warning above can tell a **second**
   * trigger from the same trigger built again — a control inside an `@if` is destroyed and
   * recreated, and a contract with only the half that speaks reports that as a defect
   * ([`lesson-68`](../../../../docs/lessons.md#lesson-68)).
   */
  unbindTrigger(element: HTMLElement): void {
    if (untracked(this.trigger) === element) this.trigger.set(null);
  }

  // ── open and close ──────────────────────────────────────────────────────────────────────

  private attach(trigger: HTMLElement): void {
    // Above the guard below, not inside it: a popover asked for again during its own leave has
    // already announced the close it is about to turn round, so this is the state coming back.
    this.shown = true;

    if (this.ref) {
      // Asked for again before its leave had finished — so the fade is turned round rather
      // than a second panel attached over the first.
      this.cancelLeave?.();
      this.cancelLeave = null;
      this.leaving.set(false);
      return;
    }

    // `show()` on the overlay layer **is** the read of what an overlay severs: there is no
    // path to an open panel that carries no theme (`lesson-35`).
    this.panelOverlay.show();
    const inherited = this.panelOverlay.inherited();
    const direction = inherited?.direction === 'rtl' ? 'rtl' : 'ltr';

    const position = createFlexibleConnectedPositionStrategy(
      this.injector,
      trigger,
    )
      .withPositions(pctPlacementPositions(this.placement(), OFFSET, direction))
      // A panel that does not fit is slid back into the window rather than clipped: content
      // with its edge cut off is worse than a panel a few pixels off its side.
      .withPush(true);

    const ref = createOverlayRef(this.injector, {
      positionStrategy: position,
      // The panel follows a scrolling page rather than closing on it: the page behind is live,
      // so scrolling is something the user may well be doing *because* the panel is open.
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      // The direction is the TRIGGER's, not the page's: `start`/`end` are resolved by the
      // dependency against the overlay's own direction, and a panel outside the host tree has
      // no other way of learning it.
      direction,
      panelClass: 'pct-popover__pane',
      // A popover left attached across a route change hangs off a control that has gone.
      disposeOnNavigation: true,
    });
    this.ref = ref;
    this.view = ref.attach(
      new TemplatePortal<void>(this.panelTemplate(), this.viewContainer),
    );

    // The strategy measures the panel as it is attached, and what it measures has to be the
    // panel with its content in it — the portal outlet has run a detection pass by now, so
    // this is a second measurement of a laid-out box rather than of an empty one.
    ref.updatePosition();

    // From the stack and never from a listener above the control: the dispatcher hands a
    // keydown to the top-most attached overlay alone, so a select opened inside this popover
    // answers Escape first and the popover does not see the key at all
    // ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)).
    ref.keydownEvents().subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss('escape', true);
    });

    // A press outside the panel dismisses it — **except on the trigger**, which has a press
    // of its own to answer. The two are the same click and this one arrives first: the
    // dependency listens on `body` in the CAPTURE phase, so a popover that closed here would
    // be re-opened by its own toggle on the way back up, and would never shut from its
    // control at all ([`lesson-93`](../../../../docs/lessons.md#lesson-93)).
    ref.outsidePointerEvents().subscribe((event) => {
      const target = event.target as Node | null;
      if (target && trigger.contains(target)) return;
      this.dismiss('outside', false);
    });

    this.panelElement()?.focus();
  }

  /**
   * The inline half of open and close: what is left of both once there is no overlay to attach
   * to. The panel itself is the template's — `@if (inline() && open())` — so what is left here
   * is the bookkeeping around it, and the tear-down of a layer that was standing when the mode
   * changed. **A popover that goes inline while it is up has moved, not closed**: no `closed`
   * is emitted, and the overlay goes at once rather than fading, because a copy of the panel
   * dissolving over the page beside the real one would read as two panels.
   */
  private syncInline(open: boolean): void {
    this.cancelLeave?.();
    this.detach();

    if (open) {
      this.shown = true;
      return;
    }
    this.beginLeave();
  }

  /**
   * Says the popover closed, once. `shown` is the whole of the guard: a popover that was never
   * up did not close, and neither did one whose leave has already been announced. The event is
   * the **decision** to close — the fade, where there is one, is what the pixels do about it
   * afterwards.
   */
  private announceClose(): void {
    if (!this.shown) return;
    this.shown = false;
    this.closed.emit(this.reason);
    this.reason = 'api';
  }

  /**
   * Puts the panel into its leaving state and detaches it once the motion is over — inline
   * there is neither, and the announcement is all this is.
   */
  private beginLeave(): void {
    if (this.cancelLeave) return;

    this.announceClose();

    // Nothing on the screen to hold in place: inline the template has already taken the panel
    // out, and holding a node through its fade would hold a hole open in the page's own layout.
    if (!this.ref) return;

    this.leaving.set(true);
    const panel = this.panelElement();
    if (!panel) {
      this.detach();
      return;
    }
    // The state has to be on the element before the transition can run from it, and an
    // embedded view is checked when the application gets round to it.
    this.view?.detectChanges();

    const cancel = pctAfterTransition(panel, () => this.detach());
    // `pctAfterTransition` calls back at once where there is no transition to wait for — in
    // jsdom, and for a user who asked for no motion. The assignment then lands AFTER the
    // detach it belongs to, so what is kept is a wait that is still pending.
    this.cancelLeave = this.ref ? cancel : null;
  }

  private detach(): void {
    const ref = this.ref;
    this.cancelLeave = null;
    this.ref = null;
    this.view = null;
    if (!ref) return;

    ref.dispose();
    this.leaving.set(false);
    this.panelOverlay.hide();
  }

  private dismiss(reason: PctPopoverCloseReason, restore: boolean): void {
    if (!this.open()) return;
    this.reason = reason;
    // The state first and the focus second, and the order is readable rather than incidental:
    // the close is a decision the application hears about, and where focus lands afterwards is
    // what this component does about it. The panel is still on the screen for both — the leave
    // has not begun — so `restoreFocus` can still ask whether focus was inside it.
    this.open.set(false);
    if (restore) this.restoreFocus();
  }

  /**
   * Tab out of the panel: it closes, and focus goes back to the trigger rather than onwards.
   *
   * **The panel is not where it looks like it is.** An overlay is a child of `body`, so its
   * content stands at the END of the document's tab order however near the trigger it is
   * drawn — Tab past the last control in it leaves the page for the browser's own chrome, and
   * Shift+Tab out of the first one lands wherever the page happens to end. Splicing focus back
   * onto the trigger puts the panel where the reader thinks it is: the next Tab carries on
   * from the control the panel belongs to, in either direction.
   *
   * The alternative was to close on `focusout` and let the browser take focus where it would.
   * It was refused on what the event really reports: `relatedTarget` is `null` both for focus
   * going nowhere in the page and for the whole WINDOW losing it, so a popover that closed on
   * that would be gone when the user came back from another application.
   *
   * **None of it applies inline, and no line here says so.** The premise of the paragraph above
   * is that the panel is not where it looks like it is; inline it is exactly where it looks
   * like it is, the document's own order carries on from it, and a Tab that closed it would be
   * shutting the panel behind a user who was only walking past. What makes this handler inert
   * there is the lookup below: `panelElement` answers for the overlay alone, so inline there is
   * no panel to measure the edge of and the key is left to the page. A guard on the mode would
   * read better and could **not fail** — the spec passes identically with it and without it —
   * and a line no test can tell from its absence is a claim with nothing behind it. What holds
   * the behaviour is the case that measures it: `leaves Tab alone in both directions`.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const panel = this.panelElement();
    if (!panel) return;

    const tabbable = this.tabbables(panel);
    const target = event.target as HTMLElement;
    // With focus on the panel itself, a forward Tab is the way IN to the content — and the
    // way out only when there is no content to go into.
    const leaving = event.shiftKey
      ? target === panel || target === tabbable[0]
      : tabbable.length === 0 || target === tabbable[tabbable.length - 1];
    if (!leaving) return;

    event.preventDefault();
    this.dismiss('away', true);
  }

  /**
   * What Tab can reach inside the panel, in document order. The dependency's checker and not a
   * selector written here: which elements are tabbable is a question about disabled states,
   * `contenteditable`, media elements and four engines' disagreements about them, and this
   * library buys that machinery rather than keeping a second opinion of its own
   * ([0013](../../../../docs/decisions/0013-no-headless-split.md)).
   */
  private tabbables(panel: HTMLElement): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>('*')).filter(
      (element) =>
        this.interactivity.isFocusable(element) &&
        this.interactivity.isTabbable(element),
    );
  }

  /**
   * Gives focus back to the trigger — **if the panel still has it**. The page behind a
   * popover is live, so a user can click into it, start typing, and dismiss the panel with
   * Escape from there; a restore that did not ask would then take focus off what they were
   * doing and hand it to a control they had left behind.
   */
  private restoreFocus(): void {
    const panel = this.panelElement();
    const active = this.document.activeElement;
    if (!panel || !active || !panel.contains(active)) return;
    this.trigger()?.focus();
  }

  /**
   * The overlay's panel, and only the overlay's. Every caller is on that side — the focus in,
   * the edge of the tab order, the element the leave is waited out on — and each of the three
   * is something an inline panel does not do, so a lookup in the host would be a branch nothing
   * could reach.
   */
  private panelElement(): HTMLElement | null {
    return (
      this.ref?.overlayElement.querySelector<HTMLElement>(
        '[data-pct-part="panel"]',
      ) ?? null
    );
  }

  // ── what the author is told in dev mode ─────────────────────────────────────────────────

  /** An open panel with no accessible name is announced as "dialog" and nothing more. */
  private warnOnUnnamed(): void {
    if (!this.open()) return;
    if (this.heading() || this.ariaLabel() || this.ariaLabelledby()) return;
    console.warn(
      `[pct-popover] An open popover with no accessible name. Give it a \`heading\`, or ` +
        `\`ariaLabel\`/\`ariaLabelledby\` when the name already stands somewhere in the ` +
        `content. Without one a screen reader announces "dialog" and the user has to read ` +
        `the panel to find out what it is.`,
    );
  }

  /**
   * A popover has to hang off something. Opened with no trigger registered it does nothing at
   * all — no panel, no error, no clue — and the missing piece is one attribute in a template.
   *
   * **Inline it hangs off nothing by construction**, and the warning would be false twice over:
   * the panel is on the screen, and the shape the input was added for — a filter column that
   * stands on a wide page — has no control to open it at all.
   */
  private warnOnNoTrigger(): void {
    // All three read before the gate, so that the effect running this tracks them from its
    // first run — `rendered` is a field, and flips nothing.
    const inline = this.inline();
    const open = this.open();
    const trigger = this.trigger();
    if (inline || !this.rendered || !open || trigger) return;
    console.warn(
      `[pct-popover] An open popover with no trigger: there is nothing for the panel to hang ` +
        `off, so nothing is shown. Put \`[pctPopoverTrigger]\` on the control that opens it.`,
    );
  }
}

/**
 * The control a popover hangs off: it toggles the panel and says so about itself.
 *
 * `aria-expanded` is why this is a directive on the trigger rather than a `for` input on the
 * panel. The attribute belongs to the control — it is what a screen reader reads when the user
 * arrives at the button, open or closed — and a component that wrote it into an element
 * somewhere else in the template would be reaching into markup it does not own. `aria-controls`
 * is written **only while the panel is up**, which is the select's rule for the same reason: an
 * id that points at nothing is a reference into the void. That rule holds for an `inline`
 * popover too, and for once for the drawer's opposite reason: a drawer's panel is in the
 * document whether it is open or not, an inline popover's is not.
 *
 * **`aria-haspopup` goes when the panel does not pop up.** The attribute says the control opens
 * a dialog somewhere over the page; an `inline` popover is a piece of the page the button
 * reveals, so what is left is `aria-expanded` and `aria-controls` — the plain disclosure the
 * drawer's trigger is, which carries no `aria-haspopup` for the same reason.
 *
 * @example
 * <button pctButton [pctPopoverTrigger]="filters">Filters</button>
 * <pct-popover #filters heading="Filters">…</pct-popover>
 */
@Directive({
  selector: '[pctPopoverTrigger]',
  host: {
    '[attr.aria-haspopup]': 'popover().inline() ? null : "dialog"',
    '[attr.aria-expanded]': 'popover().open()',
    '[attr.aria-controls]': 'popover().open() ? popover().panelId : null',
    '(click)': 'popover().toggle()',
  },
})
export class PctPopoverTrigger {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** The panel this control opens — the `pct-popover` from a template reference variable. */
  readonly popover = input.required<PctPopover>({ alias: 'pctPopoverTrigger' });

  constructor() {
    effect((onCleanup) => {
      const popover = this.popover();
      const element: HTMLElement = this.host.nativeElement;
      popover.bindTrigger(element);
      onCleanup(() => popover.unbindTrigger(element));
    });
  }
}
