import { Directive, ElementRef, inject, input } from '@angular/core';
import { PctDrawer } from './drawer';

/**
 * The control that opens a drawer: it toggles the panel and says so about itself.
 *
 * `aria-expanded` is why this is a directive on the button rather than an input on the panel.
 * The attribute belongs to the control — it is what a screen reader reads when the user
 * arrives at it, open or shut — and a component that wrote it into an element somewhere else
 * in the template would be reaching into markup it does not own. That is the whole of the ARIA
 * Disclosure pattern, and it is here because the platform's own disclosure needs its button
 * **inside** the thing it opens
 * ([0046](../../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)),
 * which a drawer's never is.
 *
 * **`aria-controls` is written whether the drawer is open or not** — the opposite of the
 * popover's rule, and for the opposite reason. A popover's panel does not exist while it is
 * shut, so pointing at it would be a reference into the void; a drawer's panel is always in
 * the document, findable by find-in-page, and an id that resolves is exactly what lets a
 * screen reader offer the panel from the button.
 *
 * The selector demands a `<button>`. A disclosure is a press, and the element that already
 * means "a press" brings the role, the keyboard, the tab order and the disabled state with it
 * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)).
 *
 * @example
 * <button pctButton [pctDrawerTrigger]="nav">Menu</button>
 * <pct-drawer #nav heading="Sections">…</pct-drawer>
 */
@Directive({
  selector: 'button[pctDrawerTrigger]',
  host: {
    '[attr.aria-expanded]': 'drawer().open()',
    '[attr.aria-controls]': 'drawer().panelId',
    '(click)': 'toggle()',
  },
})
export class PctDrawerTrigger {
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;

  /** The panel this control opens — the `pct-drawer` from a template reference variable. */
  readonly drawer = input.required<PctDrawer>({ alias: 'pctDrawerTrigger' });

  /**
   * The press. Opening remembers **this** button as where the keyboard goes back to, which is
   * what lets a drawer have more than one trigger: a header bar and a footer link are two
   * ways in, and the answer to "where was I" is the one that was pressed rather than the one
   * that happened to register last.
   */
  protected toggle(): void {
    const drawer = this.drawer();
    if (drawer.open()) {
      drawer.close('trigger');
      return;
    }
    drawer.rememberTrigger(this.element);
    drawer.open.set(true);
  }
}
