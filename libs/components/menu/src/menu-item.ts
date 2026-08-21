import {
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { PCT_MENU_ITEM, PctMenu, PctMenuItemApi } from './menu';

/**
 * One command on a menu: `role="menuitem"`, focusable by the walk and by nothing else.
 *
 * It goes on a **`<button>`**, and the selector says so rather than leaving it to a convention.
 * That is where its keyboard comes from: the platform turns `Enter` and `Space` into a
 * `click`, so the menu writes no handler for either and cannot disagree with the button beside
 * it (`req-api-platform`). It is where `disabled` comes from as well — see the host block.
 *
 * It is a **component on a native element** and not a directive, for the reason `pct-text`
 * gives one entrypoint over: a directive cannot carry styles, projected content keeps the
 * encapsulation of the template that DECLARED it, and the public styling API here is not to
 * stand on `::ng-deep`. Written as a directive, every rule for a row would silently miss the
 * rows ([`lesson-96`](../../../../docs/lessons.md#lesson-96)).
 *
 * **`tabindex="-1"`, always.** No item is ever a Tab stop: focus arrives here from the menu's
 * own walk and leaves by closing the menu
 * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)). The
 * roving tabindex the pattern is usually written with would put a `0` on the active item so
 * that Tab could leave it — and here Tab does not leave the item, it leaves the menu.
 *
 * @example
 * <button pctMenuItem (click)="rename()">Rename</button>
 * <button pctMenuItem disabled>Delete</button>
 */
@Component({
  selector: 'button[pctMenuItem]',
  templateUrl: './menu-item.html',
  styleUrl: './menu-item.scss',
  host: {
    class: 'pct-menu__item',
    'data-pct-part': 'item',
    role: 'menuitem',
    tabindex: '-1',
    // The PLATFORM's disabled state and not `aria-disabled`, and the reason is a
    // measurement rather than a preference: a consumer's `(click)` sits on this same element,
    // a directive's host listener is registered after it, and a listener registered second
    // cannot stop one registered first. `aria-disabled` would therefore say the command is
    // unavailable and let it run ([`lesson-95`](../../../../docs/lessons.md#lesson-95)).
    '[disabled]': 'disabled()',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '(click)': 'press()',
    '(pointerenter)': 'point()',
  },
  providers: [{ provide: PCT_MENU_ITEM, useExisting: PctMenuItem }],
})
export class PctMenuItem implements PctMenuItemApi {
  readonly element: HTMLElement = inject(ElementRef).nativeElement;

  /**
   * The menu this item stands in — injected rather than passed, because injection is what
   * resolves the DECLARATION tree: an item written inside a nested `pct-menu` gets that one,
   * however the two panels are drawn.
   */
  readonly menu = inject(PctMenu, { optional: true });

  /** Skipped by every movement, and by the press it would otherwise answer. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly opened = signal<PctMenu | null>(null);

  /** The panel this item opens, when a `[pctMenuTrigger]` stands on it. */
  readonly submenu = this.opened.asReadonly();

  constructor() {
    if (isDevMode() && !this.menu)
      console.warn(
        `[pct-menu] A \`pctMenuItem\` outside any \`pct-menu\`: it will carry ` +
          `\`role="menuitem"\` with no menu around it, which is a role the accessibility ` +
          `tree drops, and no keyboard will ever reach it. Put it in the content of a ` +
          `\`<pct-menu>\`.`,
      );
  }

  /** What typeahead matches a prefix against — the item's own text, as the user reads it. */
  label(): string {
    return (this.element.textContent ?? '').trim();
  }

  /**
   * Called by `PctMenuTrigger` standing on this same element, and by nothing else. The item
   * has to know, because the menu asks it: `ArrowRight` opens the submenu of the ACTIVE item,
   * and the walk has no other way of telling a command from a way further in.
   */
  bindSubmenu(menu: PctMenu): void {
    this.opened.set(menu);
  }

  unbindSubmenu(menu: PctMenu): void {
    if (this.opened() === menu) this.opened.set(null);
  }

  /**
   * A press on a command closes the tree — the whole tree, and from the root: the user chose
   * something, and a submenu left standing over a page that has moved on is a panel nobody
   * asked for. An item that opens a submenu closes nothing, because the trigger on it has a
   * press of its own to answer.
   *
   * There is no `disabled` guard here, and its absence is the point of the host block above:
   * a disabled `<button>` dispatches no `click` to anybody, so a check here would be a branch
   * nothing can reach — a claim with no measurement behind it, in a file whose whole argument
   * is that the platform is the only thing that really stops the press.
   */
  protected press(): void {
    if (this.opened()) return;
    this.menu?.closeTree('item', true);
  }

  protected point(): void {
    this.menu?.pointTo(this);
  }
}
