import {
  afterNextRender,
  ApplicationRef,
  ComponentRef,
  createComponent,
  DestroyRef,
  DOCUMENT,
  EnvironmentInjector,
  inject,
  Injectable,
  Injector,
  signal,
} from '@angular/core';
import { pctInheritedFrom } from '@pacit/components/core';
import {
  PCT_TOAST_CONFIG,
  PCT_TOAST_HOST,
  PctToastAction,
  PctToastHost,
  PctToastRef,
  PctToastSpec,
  PctToastState,
} from './toast';
import { PctToastViewport } from './toast-viewport';

/** A message's clock: what is left of it, and when that reading was taken. */
interface PctToastClock {
  remaining: number;
  armedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * The library's toasts — messages that arrive on top of the page rather than in it.
 *
 * The whole component is this service plus one view it creates, and the shape follows from a
 * measurement rather than from a preference
 * ([0044](../../../../docs/decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)):
 *
 * - **the region is a place, opened before anything has to be said.** A live region that
 *   enters the document together with its text is a region an assistive technology has not
 *   registered yet — the same finding `PctAnnouncer` is built around
 *   ([0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)). So a render
 *   creates the viewport empty, and every message after that is a change **inside** it;
 * - **the region is `role="log"` and writes nothing else.** Measured in chromium's own
 *   accessibility tree: `log` publishes `live=polite`, `atomic=false`,
 *   `relevant="additions text"` — a stack of messages read one at a time. `role="status"`,
 *   the reflex, publishes `atomic=true`, which re-reads every toast on the screen each time
 *   one arrives. An attribute the platform already publishes is not ours to write
 *   ([0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md));
 * - **the viewport is a child of `body`,** which is the one place `PctModalBackground` leaves
 *   speaking while a modal is up — an inert subtree is absent from the accessibility tree,
 *   not merely ignored, so a toast raised by a dialog's own save button would otherwise reach
 *   nobody. The price is that nothing is inherited there, and the reading that repairs it is
 *   `pctInheritedFrom` in `core` (`lesson-35`).
 *
 * There is no `PctToast` component to put in a template, and that is the point: a message
 * about something that has just happened is raised from the code that made it happen.
 *
 * @example
 * private readonly toaster = inject(PctToaster);
 * this.toaster.show('Draft saved.');
 * this.toaster.show({ text: 'Could not save.', urgent: true });
 * this.toaster.show({ text: 'Message deleted.', action: { label: 'Undo', run: () => this.undo() } });
 *
 * @since 0.1.0
 */
@Injectable({ providedIn: 'root' })
export class PctToaster implements PctToastHost {
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);
  private readonly config = inject(PCT_TOAST_CONFIG);

  readonly placement = {
    block: this.config.block,
    inline: this.config.inline,
  };

  private readonly list = signal<readonly PctToastState[]>([]);

  /**
   * Messages raised before the region existed. They wait here, off the screen, and move into
   * the list on the pass after the viewport's first render — so that the first render of a
   * `role="log"` is a render of an empty one, and a message never arrives inside a region
   * nothing has registered. A queue, and not a `mounted` signal gating a computed the
   * viewport reads: a signal written after the first render is a second pass for every
   * consumer of the page, and the gate wrote one on every page whether or not anything was
   * waiting ([`lesson-161`](../../../../docs/lessons.md#lesson-161)). With a queue the only
   * write after the first render is the one that shows a message.
   */
  private pending: PctToastState[] = [];

  /** What the viewport draws. Empty until the region exists — see {@link pending}. */
  readonly toasts = this.list.asReadonly();

  private viewport: ComponentRef<PctToastViewport> | null = null;
  /** Whether the viewport is in the application's change detection — see {@link attach}. */
  private attached = false;
  private lastId = 0;
  private held = false;
  /** Whether the stack is in the top layer — see {@link raise}. */
  private shown = false;

  /** Everything about a message the screen does not show. */
  private readonly actions = new Map<number, PctToastAction>();
  private readonly clocks = new Map<number, PctToastClock>();

  constructor() {
    // On a server this never runs, so no viewport is appended to the document being sent and
    // no clock is ever armed (`req-project-ssr`). `show()` on a server puts the message in
    // the list and stops there — there is no screen for it to be on.
    afterNextRender(() => this.open());

    // A `providedIn: 'root'` service lives as long as the application injector — one page
    // load in a browser, one test in a suite. Without this the viewport of a torn-down
    // application stays in the document, and its clocks go on running.
    inject(DestroyRef).onDestroy(() => this.close());
  }

  /**
   * Puts a message up and hands back the way to take it down again.
   *
   * A bare string is a {@link PctToastNotice} with the configured duration. What decides
   * whether the message expires is its **shape**, not an argument: a notice has a clock, a
   * standing message has none, and the type is what keeps the two apart.
   */
  show(spec: PctToastSpec | string): PctToastRef {
    const source: PctToastSpec =
      typeof spec === 'string' ? { text: spec } : spec;
    const action = source.action ?? null;
    const urgent = source.urgent === true;
    const duration =
      action !== null || urgent
        ? null
        : source.duration === undefined
          ? this.config.duration
          : source.duration;

    const id = ++this.lastId;
    if (action !== null) this.actions.set(id, action);
    if (duration !== null && duration > 0) {
      this.clocks.set(id, { remaining: duration, armedAt: 0, timer: null });
    }

    const toast: PctToastState = {
      id,
      text: source.text,
      urgent,
      tone: source.tone ?? null,
      actionLabel: action?.label ?? '',
    };
    if (this.viewport === null) {
      // No screen yet — on a server there never is one — so the message waits with the
      // others, in order; `open()` shows them on the pass after the empty render.
      this.pending.push(toast);
      return { id, dismiss: () => this.dismiss(id) };
    }

    this.attach();
    this.list.update((list) => this.capped([...list, toast]));
    // Read on every message and not once at the opening, for the reason `pctOverlay` reads
    // on every open: a theme is switched, a direction is switched, and a viewport created at
    // bootstrap would otherwise be showing the page as it was then. There is nothing to
    // repaint in between — a stack with nothing in it is not on the screen.
    this.viewport.setInput('inherited', pctInheritedFrom(this.root()));
    this.raise();
    this.arm(id);

    return { id, dismiss: () => this.dismiss(id) };
  }

  /** Takes one message down. Unknown or already-gone ids are a no-op. */
  dismiss(id: number): void {
    this.forget(id);
    this.pending = this.pending.filter((toast) => toast.id !== id);
    this.list.update((list) => list.filter((toast) => toast.id !== id));
    // Nothing left to hover or to focus: the hold cannot be handed back by an event that
    // will not arrive, because the element that would have fired it has gone.
    if (this.list().length === 0 && this.held) this.release();
  }

  /** Takes every message down — for a route change, or a sign-out. */
  clear(): void {
    for (const toast of [...this.pending, ...this.list()])
      this.forget(toast.id);
    this.pending = [];
    this.list.set([]);
    if (this.held) this.release();
  }

  /** The user pressed a message's action: it runs, and the message has served its purpose. */
  run(id: number): void {
    const action = this.actions.get(id);
    this.dismiss(id);
    action?.run();
  }

  /**
   * Stops every clock while a pointer or the keyboard is inside the stack.
   *
   * The keyboard half is not a courtesy. Measured in three engines: when the element holding
   * focus is removed, focus goes to `body` — so a toast expiring under a user who has tabbed
   * into it takes their place on the page away
   * ([`lesson-121`](../../../../docs/lessons.md#lesson-121)).
   */
  hold(): void {
    if (this.held) return;
    this.held = true;
    const now = Date.now();
    for (const clock of this.clocks.values()) {
      if (clock.timer === null) continue;
      clearTimeout(clock.timer);
      clock.timer = null;
      clock.remaining = Math.max(0, clock.remaining - (now - clock.armedAt));
    }
  }

  /** Starts them again. */
  release(): void {
    if (!this.held) return;
    this.held = false;
    for (const id of this.clocks.keys()) this.arm(id);
  }

  /** Whether a pointer or the keyboard is holding the stack. Read by the unit suite. */
  get paused(): boolean {
    return this.held;
  }

  private capped(list: readonly PctToastState[]): readonly PctToastState[] {
    const over = list.length - this.config.limit;
    if (over <= 0) return list;
    for (const toast of list.slice(0, over)) this.forget(toast.id);
    return list.slice(over);
  }

  private forget(id: number): void {
    const clock = this.clocks.get(id);
    if (clock?.timer != null) clearTimeout(clock.timer);
    this.clocks.delete(id);
    this.actions.delete(id);
  }

  /** Starts a message's clock, if it has one and nothing is holding it. */
  private arm(id: number): void {
    const clock = this.clocks.get(id);
    if (clock === undefined || clock.timer !== null || this.held) return;
    if (clock.remaining <= 0) {
      this.dismiss(id);
      return;
    }
    clock.armedAt = Date.now();
    clock.timer = setTimeout(() => this.dismiss(id), clock.remaining);
  }

  /**
   * Puts the viewport into the application's change detection — once, with the first message.
   * Attaching a view tells the scheduler to run the application again whatever the view's
   * state, so an empty region attached on the first render was a second pass on every page
   * holding a toaster (`lesson-161`); a message is a pass anyway, and the viewport joins on it.
   */
  private attach(): void {
    if (this.attached || this.viewport === null) return;
    this.appRef.attachView(this.viewport.hostView);
    this.attached = true;
  }

  private open(): void {
    const ref = createComponent(PctToastViewport, {
      environmentInjector: this.environmentInjector,
      elementInjector: Injector.create({
        providers: [{ provide: PCT_TOAST_HOST, useValue: this }],
        parent: this.injector,
      }),
    });
    this.document.body.appendChild(ref.location.nativeElement);
    // The empty render, and the whole reason a message raised before this waits in
    // `pending` rather than standing in the list: the region has to be in the document and
    // registered before it holds a sentence. Rendered by hand, not yet attached to the
    // application and not yet told what it inherits: attaching a view and setting an input
    // both tell the scheduler to run the whole application again, unconditionally, and an
    // empty region has nothing to show for that pass (`lesson-161`). It joins change detection
    // with its first message (`attach`), which is a pass anyway, and takes what it inherits
    // on every message, as it always did.
    ref.changeDetectorRef.detectChanges();

    this.viewport = ref;
    // And into the top layer at once, empty. Measured in chromium's own accessibility tree:
    // a popover the user agent has closed is `display: none` and its live region is ABSENT —
    // so a stack that entered the top layer with its first message would be a region nothing
    // had registered, which is the failure 0026 is built around arriving a second way. (The
    // sheet overrides that `display: none`, which is what leaves a browser with no top layer
    // an ordinary fixed box — but a region is registered on the strength of what the platform
    // does by default, not of what a stylesheet talks it out of.)
    this.raise();
    // Whatever was raised before there was a screen to be on — shown now, on the pass after
    // the empty render, and written only when there is something to show (see `pending`).
    if (this.pending.length) {
      this.attach();
      const waiting = this.pending;
      this.pending = [];
      this.list.update((list) => this.capped([...list, ...waiting]));
      for (const toast of waiting) this.arm(toast.id);
    }
  }

  /**
   * Puts the stack at the top of the top layer — where the CDK's overlays are, and where a
   * `z-index` cannot follow them ([`lesson-122`](../../../../docs/lessons.md#lesson-122)).
   *
   * The order in the top layer is the order things were shown in, so being last means being
   * shown last: a message raised while a modal is up has to be above that modal, or it is a
   * report nobody sees. The toggle costs nothing measurable — in three engines the messages
   * already in the stack keep their opacity across it, and only the one being added runs its
   * `@starting-style`.
   */
  private raise(): void {
    const element = this.viewport?.location.nativeElement as
      HTMLElement | undefined;
    // A browser with no top layer keeps the stack exactly where `--pct-toast-z-index` puts
    // it, which is above the page and below nothing else this library draws. jsdom is one
    // such environment, which is why the unit suite reaches the lines below only by lending
    // it the two methods.
    if (element === undefined || typeof element.showPopover !== 'function')
      return;
    try {
      // Whether it is open is read from here rather than from `:popover-open`, and that is
      // not a shortcut: `manual` means nobody but this service can show or hide it, so the
      // state IS ours — and the pseudo-class costs an environment that does not implement
      // it a `SyntaxError` from `matches()` in exchange for an answer already known.
      if (this.shown) element.hidePopover();
      element.showPopover();
      this.shown = true;
    } catch {
      // Nothing here is worth a stack nobody can see: the attribute goes, and the box is an
      // ordinary fixed one ordered by its z-index — which is what it already looks like,
      // since the sheet overrides the user agent's `display: none` for a closed popover.
      this.shown = false;
      element.removeAttribute('popover');
    }
  }

  private close(): void {
    for (const toast of [...this.pending, ...this.list()])
      this.forget(toast.id);
    this.pending = [];
    this.list.set([]);
    if (this.viewport === null) return;
    if (this.attached) this.appRef.detachView(this.viewport.hostView);
    this.attached = false;
    this.viewport.destroy();
    this.viewport.location.nativeElement.remove();
    this.viewport = null;
    this.shown = false;
  }

  /**
   * What the toasts inherit from. There is no trigger and no control, so the honest source is
   * the application's own root element — `body` would find neither the typeface the
   * application writes in nor a `data-theme` an application puts on its root component, which
   * is where the theme usually sits.
   */
  private root(): HTMLElement {
    const first = this.appRef.components[0];
    return (
      (first?.location.nativeElement as HTMLElement | undefined) ??
      this.document.body
    );
  }
}
