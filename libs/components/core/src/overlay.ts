import { Directive, input, signal, Signal } from '@angular/core';

/**
 * What a control has to hand its own overlay, because the DOM will not.
 *
 * A panel rendered through CDK Overlay is a child of `body`, so **every inherited property is
 * silently severed** (`lesson-35`): the scoped theme
 * does not reach it (`req-token-scoped`), the typeface comes from `body` instead of the
 * application, the size from a token instead of the control's context, and the writing
 * direction from the page instead of the control. Each of the four was found by a measurement
 * in the browser, never by a signal — absence of inheritance throws nothing and logs nothing.
 *
 * The list is open, and that is the point of naming it in one place: a fifth property will be
 * one entry here rather than one more read in every control that opens a panel.
 */
export interface PctOverlayInherited {
  /**
   * `data-theme` of the control's nearest themed ancestor, `null` when there is none — the
   * panel then answers to the page's theme, which is what an unthemed control does too.
   */
  readonly theme: string | null;
  /** The typeface the control writes in — the application's, not the browser's default. */
  readonly fontFamily: string;
  /** The size the control writes in: inside the chrome the field's, standalone its own. */
  readonly fontSize: string;
  /** `ltr` / `rtl` as the control resolves it, not as `document.dir` declares it. */
  readonly direction: string;
}

/**
 * The two elements an overlay is opened against, as functions rather than values: both are
 * read **on every open**, because either can move under a control that outlives one opening.
 */
export interface PctOverlaySource {
  /**
   * The control's own visible surface — what the panel is supposed to look like an extension
   * of. Everything inherited is read from it, and the theme from the nearest themed ancestor
   * above it.
   */
  readonly from: () => HTMLElement;
  /**
   * The visible edge the panel lines up with, when it is not the element above: inside the
   * field chrome the border belongs to the wrapper, and the trigger stands in a column inset
   * by padding and decorations (`req-api-overlay`). Absent — or `null` for a control standing
   * on its own — means the control **is** its own edge.
   */
  readonly anchor?: () => HTMLElement | null;
}

/**
 * A panel that lives outside the host tree: its open state, and everything the tree stops
 * carrying once it does.
 */
export interface PctOverlay {
  /** Whether the panel is open. Written only by `show()` and `hide()`. */
  readonly open: Signal<boolean>;
  /**
   * What the panel has to be given explicitly, as read at the last opening; `null` before the
   * first one. A closed panel keeps the last reading rather than dropping it — there is
   * nothing rendered to describe, and a close that clears would repaint the panel on its way
   * out.
   */
  readonly inherited: Signal<PctOverlayInherited | null>;
  /**
   * Width of the anchor as measured at the last opening, in pixels; `0` before the first one.
   * A measurement rather than a binding: the edge's width is what the page's layout made of
   * it, and only the moment of opening knows that.
   */
  readonly anchorWidth: Signal<number>;
  /**
   * Opens the panel — and the reading of the severed properties is not a step of opening but
   * **what opening is**: a control cannot open a panel and forget to carry the theme over,
   * because there is no path to `open() === true` that skips the read.
   */
  show(): void;
  /** Closes the panel. What else a close means — the active entry, focus — is the control's. */
  hide(): void;
}

/**
 * The overlay half of a control that has a panel: the state, and the properties an overlay
 * severs. The idiom is `pctListNavigation`'s and decision 0013's — a function returning
 * signals, never a base class under somebody else's template.
 *
 * What is deliberately **not** here, and the reason is the one D1 was written under: one
 * consumer cannot tell a shared property from an accident of the only case.
 *
 * - **Positioning** stays with the role. Which way a panel drops and which edge it abuts is a
 *   property of a listbox under a combobox, not of overlays: a submenu opens to the side and a
 *   tooltip flips on the axis it has room on. What the layer does own is the anchor — the
 *   contract `req-api-overlay` is about.
 * - **Escape and the outside click** are already ordered, and not here: the CDK dispatcher
 *   delivers a keydown to the **top-most** attached overlay alone, which is the closing stack
 *   this repository would otherwise write a second time. The rule that falls out of it is a
 *   rule about our components rather than about this file — **an overlay closes from the
 *   stack, never from a listener above the control** — and `core.spec.ts` measures the
 *   ordering it rests on.
 * - **The modal half** — `inert` on the background, the scroll lock — waits for the first
 *   modal. Both are written the same way for a dialog and for nothing else here today, and a
 *   panel that locked the page's scroll would be a defect, not a feature.
 *
 * @example
 * private readonly panel = pctOverlay({
 *   from: () => this.trigger().nativeElement,
 *   anchor: () => this.fieldApi?.surface() ?? null,
 * });
 */
export function pctOverlay(src: PctOverlaySource): PctOverlay {
  const open = signal(false);
  const inherited = signal<PctOverlayInherited | null>(null);
  const anchorWidth = signal(0);

  return {
    open: open.asReadonly(),
    inherited: inherited.asReadonly(),
    anchorWidth: anchorWidth.asReadonly(),

    show(): void {
      const from = src.from();
      const style = getComputedStyle(from);
      inherited.set({
        // `closest` starts at the element itself, so a control carrying the attribute is
        // its own answer — the same reading a themed ancestor gives.
        theme: from.closest('[data-theme]')?.getAttribute('data-theme') ?? null,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        direction: style.direction,
      });
      anchorWidth.set((src.anchor?.() ?? from).offsetWidth);
      open.set(true);
    },

    hide(): void {
      open.set(false);
    },
  };
}

/**
 * Puts onto a panel what the tree stopped carrying to it. One attribute instead of four
 * bindings, and that is the whole reason it is a directive: the defect class of `lesson-35`
 * is a property nobody knew was missing, so the panel takes **whatever the reading holds**
 * rather than the three or four things a template happened to name.
 *
 * @example
 * <div class="pct-select__panel" [pctOverlayPanel]="panel.inherited()">
 */
@Directive({
  selector: '[pctOverlayPanel]',
  host: {
    '[attr.data-theme]': 'inherited()?.theme ?? null',
    '[attr.dir]': 'inherited()?.direction ?? null',
    '[style.font-family]': 'inherited()?.fontFamily ?? null',
    '[style.font-size]': 'inherited()?.fontSize ?? null',
  },
})
export class PctOverlayPanel {
  /** `null` before the first opening — the panel is not rendered then either. */
  readonly inherited = input<PctOverlayInherited | null>(null, {
    alias: 'pctOverlayPanel',
  });
}
