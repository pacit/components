import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { createOverlayRef, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  Component,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  isDevMode,
  model,
  output,
  signal,
  TemplateRef,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  pctOverlay,
  PctModalBackground,
  PctOverlayPanel,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctDialogCloseReason } from './dialog.types';

/**
 * Which element inside a dialog takes focus when it opens.
 *
 * Without it focus goes to the first thing that can hold it, which for a dialog with a close
 * button in its header is the close button — the one control whose meaning is "undo opening
 * this". A confirm dialog wants its safe answer focused, a form dialog its first field, and
 * neither is expressible by DOM order alone.
 *
 * The mechanism is the CDK's (`cdkFocusInitial`, read by the focus trap when it captures) and
 * the name is ours ([0013](../../../../docs/decisions/0013-no-headless-split.md)): a consumer
 * writes what this library promises, not what its dependency happens to be called this year.
 *
 * It follows from "read by the trap" that an `inline` dialog does not read it at all: that
 * mode has no trap, nothing captures, and focus stays where the user left it.
 *
 * @example
 * <pct-dialog heading="Delete the project?">
 *   <button pctAutofocus (click)="cancel()">Cancel</button>
 *   <button (click)="remove()">Delete</button>
 * </pct-dialog>
 */
@Directive({
  selector: '[pctAutofocus]',
  host: { cdkFocusInitial: '' },
})
export class PctAutofocus {}

/**
 * A modal dialog: a panel that takes focus, and a page that stops answering while it is up.
 *
 * It implements the ARIA "Modal Dialog" pattern — `role="dialog"` with `aria-modal="true"`, a
 * focus trap, focus returned to whatever opened it, and Escape from the closing stack. Of the
 * six things this component was to force, **three arrive from the dependency and one from the
 * platform**: the trap, the initial focus and the restore are `cdkTrapFocus`
 * ([0025](../../../../docs/decisions/0025-a-panel-says-whether-it-takes-focus.md)), the Escape
 * ordering is the CDK dispatcher's
 * ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)), and
 * `inert` on the background is the platform's. What is written here is the scroll lock, the
 * panel, and the order the pieces run in
 * ([0029](../../../../docs/decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)).
 *
 * **Not `<dialog showModal()>`, and that is a measurement rather than a preference.** The
 * native element gives the trap, the restore, `inert` and the Escape for free, and inherits
 * everything through the top layer — and it makes every CDK overlay in the page inert while it
 * is open, the top layer included. A `pct-select` inside a native dialog has a panel that
 * cannot be clicked, focused or reached by Tab, in blink, gecko and webkit alike
 * ([`lesson-89`](../../../../docs/lessons.md#lesson-89)).
 *
 * **Or a section of the page, if the consumer says so.** `inline` renders the same panel in
 * the host instead of in an overlay, and with it goes everything in the paragraphs above: the
 * veil, `aria-modal`, the trap, the scroll lock and the closing stack. What is left is a
 * non-modal `role="dialog"` — legal, and the shape a form that is a modal on one screen and a
 * section on another needs. It is
 * [0047](../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)'s
 * cut ("a region of the page, not a layer over it") made by the consumer rather than once for
 * the whole component.
 *
 * **SSR**: nothing renders on the server — unless `inline`, which is what that input is for.
 * The overlay panel is a template attached by a **browser** render, so a modal dialog left
 * `open` at bootstrap sends no markup and hydrates no mismatch (`req-project-ssr`); an inline
 * one is `@if (open())` in the template and arrives in the HTML the server sends.
 *
 * @example
 * <button (click)="confirm.set(true)">Delete</button>
 * <pct-dialog heading="Delete the project?" [(open)]="confirm" (closed)="onClosed($event)">
 *   <p>This cannot be undone.</p>
 *   <button pctAutofocus (click)="confirm.set(false)">Cancel</button>
 * </pct-dialog>
 */
@Component({
  selector: 'pct-dialog',
  imports: [PctIcon, PctOverlayPanel, NgTemplateOutlet],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  host: {
    class: 'pct-dialog',
    // The host draws nothing of its own. As an overlay it renders nothing at all and stays in
    // the tree because it is what the panel reads its severed properties from; `inline` it
    // holds the panel, and `display: contents` is then what puts that panel exactly where the
    // consumer's markup put the tag.
    style: 'display: contents',
  },
})
export class PctDialog {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly background = inject(PctModalBackground);
  private readonly document = inject(DOCUMENT);
  private readonly focusTraps = inject(FocusTrapFactory);

  /**
   * Whether the dialog is up. A `model`, because both directions are ordinary: an application
   * opens it, and the dialog closes itself on Escape, on the backdrop and on its own button.
   */
  readonly open = model(false);

  /**
   * Whether the panel is drawn **where the consumer wrote the tag** instead of in an overlay.
   * The same `<ng-template>` either way — the same box, the same parts, the same stylesheet —
   * so the two modes cannot drift apart the way a second hand-written panel would.
   *
   * **It gives up most of what a modal is, and each loss is the same fact from another side:
   * there is no layer, so there is nothing to hold the page away with.** No backdrop, so
   * `closeOnBackdrop` has nothing to answer for. No `aria-modal`, because nothing behind the
   * panel stopped answering — and a non-modal `role="dialog"` is a legal dialog. No focus
   * trap, and therefore no capture and no restore: focus stays where the user left it, and
   * `[pctAutofocus]` decides nothing, because the mechanism under it is `cdkFocusInitial`,
   * which the trap reads and nobody else does. No scroll lock. No registration in the closing
   * stack — which is the road Escape travels ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)),
   * so `closeOnEscape` is inert as well. The ways out that remain are the close button and
   * whatever the content holds; the ways out that go were the layer's own.
   *
   * What it keeps: `role="dialog"`, the heading and both ARIA names, the close button, the
   * `closed` reason, and `open` as the state — an inline dialog with `open` false renders
   * nothing at all. There is no leave choreography to decide about, because this component
   * animates nothing: the panel appears and disappears with the state, in both modes.
   *
   * **It renders on the server, and that is the property this input exists for.** An overlay
   * needs a browser render to attach to; a template branch needs nothing.
   *
   * **A branch in the template, and not the panel hoisted out of the veil.**
   * `.pct-dialog__backdrop` is three things in one element — the veil, the frame that centres
   * the panel in the viewport, and the box a dialog taller than the window scrolls in — and
   * that was chosen over a position strategy plus the dependency's own backdrop, which no
   * stylesheet of this library can reach
   * ([0029](../../../../docs/decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)).
   * A hoist would have to write all three somewhere else for the modal case; the branch writes
   * none of them, and inline needs not one line of CSS added — the panel's box is complete on
   * its own.
   *
   * The input is a `boolean` and not a breakpoint, because the component has no business
   * knowing what a wide screen is: a consumer binds it (`[inline]="wide()"`) and a dialog
   * crosses the line in either direction while open — the overlay is taken down, the panel is
   * drawn in the host, and no `closed` is emitted, because the dialog did not close.
   *
   * @example
   * <pct-dialog inline heading="Filters" [(open)]="shown">…</pct-dialog>
   */
  readonly inline = input(false, { transform: booleanAttribute });

  /**
   * The visible title, rendered as the panel's heading and used as its accessible name. A
   * dialog with no name is a dialog a screen reader announces as "dialog" and nothing else,
   * so an empty one is reported in dev mode rather than passed over.
   */
  readonly heading = input<string>('');

  /**
   * The accessible name of a dialog with no visible heading — an INPUT and not an attribute on
   * the tag, for the select's reason: `role="dialog"` sits on the panel inside the overlay,
   * and the host carries no role at all (`req-a11y-built-in`).
   */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere inside the dialog's content. */
  readonly ariaLabelledby = input<string>('');

  /** Whether Escape closes it. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });

  /** Whether a press on the surface around the panel closes it. */
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });

  /** Whether the panel draws a close button of its own in the header. */
  readonly closeButton = input(true, { transform: booleanAttribute });

  /**
   * Why it closed. The reason is what an application acts on — `escape` and `backdrop` are a
   * withdrawal, the content's own buttons are an answer — and `open` carries none of it.
   */
  readonly closed = output<PctDialogCloseReason>();

  private readonly uid = nextPctId('pct-dialog');
  protected readonly panelId = `${this.uid}-panel`;
  protected readonly headingId = `${this.uid}-heading`;

  private readonly panelTemplate =
    viewChild.required<TemplateRef<void>>('panel');

  /**
   * The overlay half from `core`: the state and the four properties a panel outside the host
   * tree stops inheriting (`lesson-35`). The dialog is the layer's second consumer, and the
   * first one that is not a dropdown — which is what makes the reading shared rather than the
   * select's own accident.
   */
  private readonly panelOverlay = pctOverlay({
    from: () => this.host.nativeElement,
  });

  protected readonly inherited = this.panelOverlay.inherited;

  /** The overlay while it is up; `null` whenever the dialog is closed — or inline. */
  private ref: OverlayRef | null = null;

  /**
   * Whether a panel is up, in either mode. This is what arms the close, and `ref` used to be:
   * an inline dialog has no overlay and still closes, and reading the field that happens to
   * hold one would have made `closed` an overlay's event rather than the dialog's.
   */
  private shown = false;

  /** The dependency's trap, created over the panel and destroyed with it. */
  private trap: FocusTrap | null = null;

  /** Where focus was when the dialog opened — what the close gives it back to. */
  private restoreTo: HTMLElement | null = null;

  /**
   * Why the **next** close happened. Set by whichever path closes the dialog and read once by
   * the effect; `api` is the default, because a value written from outside is what every path
   * that does not announce itself looks like — including every button a consumer put in the
   * content.
   */
  private reason: PctDialogCloseReason = 'api';

  /**
   * Whether a render has happened. There is none on the server, so this is the gate that keeps
   * the overlay a browser-only thing without the component asking which platform it is on.
   * The inline panel stands outside this gate on purpose — a template branch needs no render
   * to exist, and a panel that waited for one would be a panel the server never sends.
   */
  private readonly rendered = signal(false);

  /** True while the press that started this click landed on the backdrop and not on the panel. */
  private pressedBackdrop = false;

  constructor() {
    afterNextRender(() => this.rendered.set(true));

    effect(() => {
      const open = this.open();
      const inline = this.inline();

      if (open) {
        // Inline the panel is in the template and `open` has already drawn it — there is
        // nothing to attach and no render to wait for. The `detach` is for the crossing: a
        // dialog that was a layer a moment ago still has an overlay under it, and the panel
        // is now standing in the host. It is not a close, so nothing is emitted.
        if (inline) this.detach();
        else if (this.rendered()) this.attach();
        // Not inline and not drawn yet — that is the server, and there is no panel to close
        // later either.
        else return;
        this.shown = true;
        return;
      }

      if (!this.shown) return;
      this.shown = false;
      this.detach();
      this.closed.emit(this.reason);
      this.reason = 'api';
    });

    // Destroyed while open: the page has to come back, and no `closed` is emitted — nobody is
    // left to hear it.
    inject(DestroyRef).onDestroy(() => this.detach());

    if (isDevMode()) effect(() => this.warnOnUnnamed());
    if (isDevMode()) effect(() => this.warnOnNoWayOut());
  }

  private attach(): void {
    if (this.ref) return;

    // `show()` **is** the read of what the overlay severs — there is no path to an open panel
    // that carries no theme.
    this.panelOverlay.show();

    const ref = createOverlayRef(this.injector, {
      panelClass: 'pct-dialog__pane',
      // A dialog left attached across a route change is a page the user cannot get back to.
      disposeOnNavigation: true,
    });
    this.ref = ref;
    ref.attach(new TemplatePortal(this.panelTemplate(), this.viewContainer));

    // Everything that does not hold the panel stops answering — the modal half 0024 deferred.
    this.background.hold(ref.hostElement);

    // The trap is the dependency's; the choreography around it is this component's, and that
    // is the whole difference from letting `cdkTrapFocus` do it. Two things need saying out
    // loud here rather than happening inside a directive's `ngOnDestroy`: **where focus goes
    // back to**, read before anything moves it, and **the fallback** — the trap's initial
    // capture reports whether it found anything tabbable, and a dialog whose content has no
    // control (`closeButton=false` and a paragraph) has nothing for it to find. Focus would
    // then stay where it was, which is now an inert background, and the panel would be
    // announced by nobody. `tabindex="-1"` in the template is what makes the panel itself an
    // answer to that.
    this.restoreTo = this.document.activeElement as HTMLElement | null;
    const panel = ref.overlayElement.querySelector<HTMLElement>(
      '[data-pct-part="panel"]',
    );
    if (panel) {
      const trap = this.focusTraps.create(panel);
      this.trap = trap;
      void trap
        .focusInitialElementWhenReady()
        .then((captured) => {
          if (!captured && this.trap === trap) panel.focus();
        })
        // A dialog closed before the capture settled has nothing left to focus.
        .catch(() => undefined);
    }

    // From the stack and never from a listener above the control: the dispatcher hands a
    // keydown to the top-most attached overlay alone, so a select panel opened inside this
    // dialog answers Escape first and the dialog does not see the key at all.
    ref.keydownEvents().subscribe((event) => {
      if (event.key !== 'Escape' || !this.closeOnEscape()) return;
      event.preventDefault();
      this.dismiss('escape');
    });
  }

  /**
   * Takes the overlay down. A no-op when there is none, which is the whole of what an inline
   * dialog ever needs from it — and the reason the effect can call it on either road.
   */
  private detach(): void {
    const ref = this.ref;
    if (!ref) return;
    this.ref = null;

    // The order is the promise, and it is written here in three lines so that it can be read
    // rather than inferred. Give the page back FIRST: focus is about to go to the element
    // that opened this dialog, that element sits in the background, and an inert subtree
    // refuses `focus()` — measured in three engines, not deduced. Only then let the panel go.
    this.background.release();

    this.trap?.destroy();
    this.trap = null;

    this.restoreTo?.focus();
    this.restoreTo = null;

    ref.dispose();
    this.panelOverlay.hide();
  }

  private dismiss(reason: PctDialogCloseReason): void {
    if (!this.open()) return;
    this.reason = reason;
    this.open.set(false);
  }

  protected closeFromButton(): void {
    this.dismiss('close');
  }

  /**
   * A press on the surface around the panel. Both halves of the gesture have to have landed
   * there: a selection dragged from inside the panel and released outside it is one `click` on
   * the backdrop, and closing on it throws away what the user was in the middle of doing.
   *
   * The parameter is `Event` and not `PointerEvent`, because the only thing read here is where
   * the event landed — and the narrower type would be a promise about a constructor jsdom does
   * not implement, paid for by nothing.
   */
  protected pressBackdrop(event: Event): void {
    this.pressedBackdrop = event.target === event.currentTarget;
  }

  protected clickBackdrop(event: Event): void {
    const onBackdrop =
      this.pressedBackdrop && event.target === event.currentTarget;
    this.pressedBackdrop = false;
    if (!onBackdrop || !this.closeOnBackdrop()) return;
    this.dismiss('backdrop');
  }

  /** An open dialog with no accessible name is announced as "dialog" and nothing more. */
  private warnOnUnnamed(): void {
    if (!this.open()) return;
    if (this.heading() || this.ariaLabel() || this.ariaLabelledby()) return;
    console.warn(
      `[pct-dialog] An open dialog with no accessible name. Give it a \`heading\`, or ` +
        `\`ariaLabel\`/\`ariaLabelledby\` when the name already stands somewhere in the ` +
        `content. Without one a screen reader announces "dialog" and the user has to read ` +
        `the panel to find out what it is.`,
    );
  }

  /**
   * Every way out switched off at once. Each of the three is a reasonable thing to turn off on
   * its own — a confirm dialog that insists on an answer, a wizard step that ignores a stray
   * click — and all three together is WCAG 2.1.2, a keyboard trap, with the content's own
   * buttons as the only escape. That last road is real, so this reports rather than repairs.
   *
   * Inline it says nothing, and not out of leniency: there is no trap to be caught in. The
   * panel is a region of the page and the keyboard tabs out of it the way it tabs out of a
   * paragraph, while two of the three switches are already off by construction — a warning
   * there would fire on the wide half of every responsive dialog and mean nothing on either.
   */
  private warnOnNoWayOut(): void {
    if (!this.open() || this.inline()) return;
    if (this.closeOnEscape() || this.closeOnBackdrop() || this.closeButton())
      return;
    console.warn(
      `[pct-dialog] Escape, the backdrop and the close button are all switched off. The ` +
        `only way out is a control in the content — make sure there is one, or leave ` +
        `\`closeOnEscape\` on.`,
    );
  }
}
