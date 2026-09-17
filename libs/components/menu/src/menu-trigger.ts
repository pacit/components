import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { PCT_MENU_ITEM, PctMenu } from './menu';

/**
 * The control a menu hangs off: it opens the panel and says so about itself.
 *
 * `aria-expanded` is why this is a directive on the trigger rather than a `for` input on the
 * panel. The attribute belongs to the control — it is what a screen reader reads when the user
 * arrives at it, open or closed — and a component that wrote it into an element somewhere else
 * in the template would be reaching into markup it does not own. `aria-controls` is written
 * **only while the panel is up**, which is the select's rule for the same reason: an id that
 * points at nothing is a reference into the void.
 *
 * **The same directive opens a submenu**, and the difference is not declared but injected: a
 * trigger standing on a `pctMenuItem` is a way further into a menu, so it opens rather than
 * toggles and leaves the arrow keys to the panel that owns the walk. A trigger standing
 * anywhere else is a menu button, and answers `ArrowDown`/`ArrowUp` itself.
 *
 * @example
 * <button pctButton [pctMenuTrigger]="actions">Actions</button>
 * <pct-menu #actions>…</pct-menu>
 *
 * @since 0.1.0
 */
@Directive({
  selector: '[pctMenuTrigger]',
  host: {
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'menu().open()',
    '[attr.aria-controls]': 'menu().open() ? menu().panelId : null',
    '(click)': 'press()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class PctMenuTrigger {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  /**
   * The item this trigger stands on, when it stands on one. `self` and not the ancestor
   * lookup: an item three rows above is not what makes this trigger a submenu's.
   */
  private readonly item = inject(PCT_MENU_ITEM, { optional: true, self: true });

  /** The menu this control stands in, which for a submenu is its parent. */
  private readonly parent = inject(PctMenu, { optional: true });

  /**
   * The panel this control opens — the `pct-menu` from a template reference variable.
   *
   * @since 0.1.0
   */
  readonly menu = input.required<PctMenu>({ alias: 'pctMenuTrigger' });

  constructor() {
    effect((onCleanup) => {
      const menu = this.menu();
      menu.bindTrigger(this.host, this.parent);
      this.item?.bindSubmenu(menu);
      onCleanup(() => {
        menu.unbindTrigger(this.host);
        this.item?.unbindSubmenu(menu);
      });
    });
  }

  /**
   * A menu button toggles; a submenu's item opens. The difference is what the second press
   * means: on a button it is "I have changed my mind", and on an item the pointer has usually
   * opened the panel already, so a toggle would shut the very thing the press asked to walk
   * into.
   */
  protected press(): void {
    if (this.item) this.menu().openFrom('first');
    else this.menu().toggle();
  }

  /**
   * The two keys a menu button owns. Inside a menu it owns none: the panel above holds the
   * walk, and `ArrowDown` there is a step to the next command rather than a way into this one
   * (`ArrowRight` is that, and it is the panel's).
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.item) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.menu().openFrom('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.menu().openFrom('last');
    }
  }
}
