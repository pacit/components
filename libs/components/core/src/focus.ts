import { Directive } from '@angular/core';

/**
 * Keeps DOM focus where the control put it, for a panel whose role says focus never enters it.
 *
 * A listbox under a combobox is the case this was written from (`req-a11y-built-in`): focus
 * stays on the trigger and the active option is pointed at by `aria-activedescendant`
 * (`lesson-18`). The panel is then a surface the user presses **without** it taking anything —
 * and the browser disagrees by default. A press on the panel's own background, on the gap
 * between options, on the empty-list text or on its scrollbar moves focus off the control,
 * and the whole pattern goes with it:
 *
 * - `document.activeElement` becomes `body` — measured in blink, gecko and webkit alike;
 * - the panel stays open, because a press inside it is not a press outside it;
 * - every key the control owns is dead, the handler sitting on the trigger — the arrows, Home
 *   and End, Enter, the typeahead. Escape survives, and only because the CDK listens for it on
 *   the document;
 * - `aria-activedescendant` keeps pointing at the active option **from an element that no
 *   longer has focus**, which is a reference a screen reader has no reason to follow.
 *
 * **`mousedown`, not `pointerdown`, and that is a measurement rather than a preference.** The
 * broader event looks like the safer choice and is not: touch never moved focus here in the
 * first place — a tap on the panel left the trigger focused in every engine — while preventing
 * the default of `pointerdown` cancels the compatibility events that follow it, and in webkit
 * that includes the `click` a tap on an option needs to be picked at all. The event whose
 * default action moves focus is `mousedown`; guarding anything wider buys nothing and costs a
 * component its pointer.
 *
 * **What this directive is not.** It is the declaration that a panel does **not** take focus —
 * a panel that has to (a dialog, a menu) is the other kind, and it says so with the other half
 * of this layer, which waits for its first consumer (`0025`). The same goes for a panel with a
 * control inside it: this guard is deliberately blanket, so a search field in a panel is a
 * panel of the other kind, not an exception to this one.
 *
 * @example
 * <div class="pct-select__panel" role="listbox" [pctOverlayPanel]="inherited()" pctFocusStays>
 *
 * @since 0.1.0
 */
@Directive({
  selector: '[pctFocusStays]',
  host: {
    '(mousedown)': 'keep($event)',
  },
})
export class PctFocusStays {
  /**
   * Cancels the focus move at its source. The press still reaches the element — a click on an
   * option is unaffected, since `click` is not the default action being prevented here.
   */
  protected keep(event: MouseEvent): void {
    event.preventDefault();
  }
}
