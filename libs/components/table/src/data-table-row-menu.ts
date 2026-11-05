import {
  afterEveryRender,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { nextPctId, PCT_TEXTS } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import type { PctMenu } from '@pacit/components/menu';
import { PctDataTable } from './data-table';
import { PctTablePinnedRows } from './data-table-pinned-rows';
import type { PctRowId } from './model/columns';

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves
 * in. Kept in a map of this module's own, not in `providers` (`lesson-173`).
 */
interface Link {
  readonly parts: WritableSignal<PctTableRowMenuParts | null>;
}

const LINKS = /* @__PURE__ */ new WeakMap<PctTableRowMenu, Link>();

/** A field the browser's own context menu serves: what is typed, and a link. */
const NATIVE = 'input, textarea, select, [contenteditable], a[href]';

/** The rows of the table's own bodies: not those of a table drawn in one of its cells. */
const ROWS = ':scope > pct-table-frame > table > tbody > tr';

/** A row's button of actions, in its trailing cell. */
const BUTTON = ':scope > td > [data-pct-part="actions"]';

/**
 * How long the guard against the platform's own context menu waits after the context menu
 * key: Windows raises the menu after the key's release, outside the row's keydown.
 */
const KEY_GUARD = 1000;

/**
 * A menu of actions on a row: a trailing column holds a button per row, and the application's
 * `pct-menu` opens from the row it is asked on — by that button, a press of the secondary
 * button on the row, the context menu key or `Shift+F10`. `id()` says which row the menu
 * stands for, so its items act on it
 * ([0118](../../../../docs/decisions/0118-a-rows-menu-is-the-applications-menu-opened-from-the-row.md)).
 *
 * The menu is the application's, written where it writes any menu, with its own items: the
 * table only says which row it was opened for. Focus goes to the first item and back to the
 * row's button when the menu closes. A row the menu's command moved keeps it on its button; a
 * row taken away, or scrolled out of a window, closes the menu and hands the focus to the
 * button now where it stood. A field and a link keep the browser's own context menu.
 *
 * @example
 * <pct-data-table [pctTableRowMenu]="actions" #rowMenu="pctTableRowMenu" [rows]="rules()" [columns]="columns" [rowId]="byId" />
 * <pct-menu #actions>
 *   <button pctMenuItem (click)="remove(rowMenu.id())">Remove</button>
 * </pct-menu>
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableRowMenu]',
  exportAs: 'pctTableRowMenu',
})
export class PctTableRowMenu {
  private readonly table = inject(PctDataTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly pinned = inject(PctTablePinnedRows, { optional: true });

  /**
   * The menu the rows open: the application's `pct-menu`.
   *
   * @since next
   */
  readonly menu = input.required<PctMenu>({ alias: 'pctTableRowMenu' });

  private readonly current = signal<PctRowId | null>(null);

  /**
   * The id of the row the menu was last opened for; `null` before it was opened.
   *
   * @since next
   */
  readonly id = this.current.asReadonly();

  private readonly parts = signal<PctTableRowMenuParts | null>(null);

  /** The menu and the button it hangs off: the last row's it was opened for. */
  private bound: { readonly menu: PctMenu; trigger: HTMLElement } | null = null;

  /** Where that button stood among the rows' buttons, for the one that takes its place. */
  private place = 0;

  constructor() {
    LINKS.set(this, { parts: this.parts });
    const parts = this.parts;
    this.table.contribute({
      menu: {
        parts: PctTableRowMenuParts,
        // Read once the table has made the parts, in the render that draws them.
        head: computed(() => (parts() as PctTableRowMenuParts).head()),
        cell: computed(() => (parts() as PctTableRowMenuParts).cell()),
      },
    });
    const element = this.host.nativeElement;
    const press = (event: Event) => this.press(event);
    element.addEventListener('contextmenu', press);
    element.addEventListener('keydown', press);
    // Each render: the row the menu hangs off may have moved, or gone.
    afterEveryRender(() => this.follow());
    inject(DestroyRef).onDestroy(() => {
      element.removeEventListener('contextmenu', press);
      element.removeEventListener('keydown', press);
      // The menu outlives the table: the button it hung off goes with the table.
      this.release();
    });
  }

  /**
   * Whether the menu is open for the row.
   *
   * @since next
   */
  isOpenFor(id: PctRowId): boolean {
    return this.menu().open() && this.current() === id;
  }

  /**
   * Opens the menu for the row, from its button: focus on the first item, or the last.
   *
   * @since next
   */
  openFor(
    id: PctRowId,
    button: HTMLElement,
    intent: 'first' | 'last' = 'first',
  ): void {
    this.hang(button);
    this.place = this.buttons().indexOf(button);
    this.current.set(id);
    this.menu().openFrom(intent);
  }

  /**
   * The row's button pressed: the menu opens for its row, or closes if it is open for it.
   *
   * @since next
   */
  toggleFor(id: PctRowId, button: HTMLElement): void {
    if (this.isOpenFor(id)) this.menu().closeTree('trigger', true);
    else this.openFor(id, button);
  }

  /** Hangs the menu off the button, giving back the one before, in the menu that had it. */
  private hang(button: HTMLElement): void {
    const menu = this.menu();
    if (this.bound?.menu === menu && this.bound.trigger === button) return;
    this.release();
    menu.bindTrigger(button, null);
    this.bound = { menu, trigger: button };
  }

  private release(): void {
    this.bound?.menu.unbindTrigger(this.bound.trigger);
    this.bound = null;
  }

  /**
   * The row asked for its menu: a press of the secondary button, the context menu key or
   * `Shift+F10` on it or in it. A field and a link keep the browser's own menu, as does a
   * row in a table drawn in this one's cell, which answers first.
   */
  private press(event: Event): void {
    if (event.type === 'keydown') {
      const key = event as KeyboardEvent;
      if (key.key !== 'ContextMenu' && !(key.shiftKey && key.key === 'F10'))
        return;
    }
    if (event.defaultPrevented) return;
    const target = event.target as Element;
    if (target.closest(NATIVE)) return;
    const row = target.closest('tr');
    if (row === null || !this.rows().includes(row)) return;
    const id = this.idOf(row);
    if (id === undefined) return;
    event.preventDefault();
    if ((event as KeyboardEvent).key === 'ContextMenu') this.guard();
    this.openFor(id, row.querySelector(BUTTON) as HTMLElement);
  }

  /**
   * The context menu key's own menu, which Windows raises after the key is let go, at the
   * item the focus moved to: kept off once, for a moment.
   */
  private guard(): void {
    const view = this.host.nativeElement.ownerDocument.defaultView as Window;
    const off = (event: Event) => event.preventDefault();
    view.addEventListener('contextmenu', off, { capture: true, once: true });
    setTimeout(
      () => view.removeEventListener('contextmenu', off, { capture: true }),
      KEY_GUARD,
    );
  }

  /** The table's own rows of data and pinned rows, which carry a button each. */
  private rows(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(ROWS),
    ).filter((row) => row.querySelector(BUTTON) !== null);
  }

  /** The rows' buttons, in the order the rows stand. */
  private buttons(): HTMLElement[] {
    return this.rows().map((row) => row.querySelector(BUTTON) as HTMLElement);
  }

  /** The id of a row drawn: a line's key, or a pinned row's by its place among them. */
  private idOf(row: HTMLElement): PctRowId | undefined {
    const index = row.dataset['pctIndex'];
    if (index !== undefined)
      return untracked(this.table.lines)[Number(index)].key;
    const edge = (row.parentElement as HTMLElement).dataset['pctPinned'];
    const pinned = this.pinned as PctTablePinnedRows<unknown>;
    const rows = edge === 'top' ? pinned.pinnedTop() : pinned.pinnedBottom();
    const at = Array.from((row.parentElement as HTMLElement).children).indexOf(
      row,
    );
    return untracked(this.table.rowId)(rows[at]);
  }

  /** The button of the row now drawn for the id, if any. */
  private buttonOf(id: PctRowId): HTMLElement | undefined {
    return (
      this.rows()
        .find((row) => this.idOf(row) === id)
        ?.querySelector<HTMLElement>(BUTTON) ?? undefined
    );
  }

  /**
   * The button the menu hangs off was drawn again or taken away: the row's new button takes
   * the menu over, where the row moved. A row no longer drawn — taken away, or scrolled out
   * of a window — closes the menu, and the button now where it stood takes the focus the
   * menu let go of.
   */
  private follow(): void {
    const bound = this.bound;
    if (bound === null || bound.trigger.isConnected) return;
    const document = this.host.nativeElement.ownerDocument;
    const lost = () =>
      document.activeElement === null ||
      document.activeElement === document.body;
    const id = untracked(this.current) as PctRowId;
    const moved = this.buttonOf(id);
    if (moved !== undefined) {
      // The menu, open or not, hangs off the row's new button; a focus the button took with
      // it is the table's to hand on, as for any control of a row drawn anew.
      this.hang(moved);
      return;
    }
    // The focus was in the menu, which the table does not look after, or nobody has it: the
    // row's place keeps it.
    const focus = untracked(bound.menu.open) || lost();
    bound.menu.closeTree('api', false);
    this.release();
    const buttons = this.buttons();
    const next = buttons[Math.min(this.place, buttons.length - 1)];
    if (next !== undefined && focus) next.focus();
  }
}

/**
 * The rows' menu's parts: the header of the trailing column and a row's button, templates the
 * table draws in the places it keeps for them. Declared here, rendered there.
 * `pctTableRowMenu` makes it, so it has no selector.
 *
 * @since next
 */
@Component({
  imports: [PctIcon],
  // Its element is the table's child and draws nothing: the templates stand where they are put.
  host: { hidden: '' },
  templateUrl: './data-table-row-menu.html',
  styleUrl: './data-table-row-menu.scss',
})
export class PctTableRowMenuParts {
  protected readonly rowMenu = inject(PctTableRowMenu);
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * What the header of the trailing column holds: the word a row's button is named by.
   *
   * @since next
   */
  readonly head = viewChild.required<TemplateRef<unknown>>('head');

  /**
   * What a row's cell of the column holds, given the row.
   *
   * @since next
   */
  readonly cell = viewChild.required<TemplateRef<unknown>>('cell');

  /** The id of the word a row's button is named by, before the row's first text. */
  protected readonly wordId = `${nextPctId('pct-table-menu')}-word`;

  constructor() {
    (LINKS.get(this.rowMenu) as Link).parts.set(this);
  }

  /**
   * `ArrowDown` and `ArrowUp` on a row's button open the menu at its first item or its last,
   * as a menu button's do — outside a grid, whose stop the arrows move.
   */
  protected key(id: PctRowId, event: KeyboardEvent): void {
    const button = event.currentTarget as HTMLElement;
    if (button.closest('[role="grid"], [role="treegrid"]')) return;
    const intent =
      event.key === 'ArrowDown'
        ? 'first'
        : event.key === 'ArrowUp'
          ? 'last'
          : null;
    if (intent === null) return;
    event.preventDefault();
    this.rowMenu.openFor(id, button, intent);
  }
}
