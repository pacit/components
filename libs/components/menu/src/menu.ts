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
  contentChildren,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  EmbeddedViewRef,
  inject,
  Injector,
  InjectionToken,
  input,
  isDevMode,
  model,
  output,
  signal,
  Signal,
  TemplateRef,
  untracked,
  ViewContainerRef,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  pctAfterTransition,
  PctDirection,
  pctListNavigation,
  pctOverlay,
  PctOverlayPanel,
  PctPlacement,
  pctPlacementPositions,
} from '@pacit/components/core';
import { PctMenuCloseReason, PctMenuOpenIntent } from './menu.types';

/**
 * The gap between the control and the panel, in pixels — the popover's number and the
 * popover's reason: the distance is an argument the position strategy is handed before any
 * stylesheet exists, so a token here would have to be read back out of the computed style on
 * every opening.
 */
const OFFSET = 4;

/**
 * What a menu needs to know about one of its items, and nothing more. Declared HERE, beside
 * the menu, so that the item can provide it while importing the menu — the other direction
 * (`contentChildren(PctMenuItem)`) would close the import cycle. It is `pct-radio`'s channel
 * one component over, and for the same reason.
 */
export interface PctMenuItemApi {
  /** The element the roving walk gives focus to. */
  readonly element: HTMLElement;
  /**
   * The menu that owns it — the nearest `pct-menu` up the DECLARATION tree, which is what
   * injection resolves for projected content. It is what tells a submenu's items from its
   * parent's: both sets are content of the outer menu, and only this says which walk they
   * belong to.
   */
  readonly menu: PctMenu | null;
  /** Skipped by every movement, and by the press it would otherwise answer. */
  readonly disabled: Signal<boolean>;
  /** The panel this item opens, when a `[pctMenuTrigger]` stands on it. */
  readonly submenu: Signal<PctMenu | null>;
  /** What typeahead matches a prefix against. */
  label(): string;
  /**
   * Told to the item by a `[pctMenuTrigger]` standing on the same element, so that the walk
   * can ask an item whether there is a way further in. It is the one thing on this channel
   * that goes the other way, and it is here rather than on a second token because the two
   * facts have one owner: the element.
   */
  bindSubmenu(menu: PctMenu): void;
  unbindSubmenu(menu: PctMenu): void;
}

/** The channel through which an item announces itself to the menu it stands in. */
export const PCT_MENU_ITEM = new InjectionToken<PctMenuItemApi>(
  'PCT_MENU_ITEM',
);

/**
 * A menu: a list of commands on a panel, walked by the keyboard and chosen from.
 *
 * It implements the ARIA APG [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
 * pattern — `role="menu"` on the panel, `role="menuitem"` on the items, `aria-haspopup="menu"`
 * and `aria-expanded` on the control that opens it.
 *
 * **Focus really moves, and that is the whole difference from the select.** A listbox under a
 * combobox keeps focus on the trigger and points at the active option with
 * `aria-activedescendant` (`lesson-18`); a menu gives DOM focus to the item itself. The reason
 * is what the two roles are: a combobox is an editable value with a list behind it, so focus
 * belongs to the thing being edited, while a menu is a list of commands and nothing else — the
 * item IS what the user is on. Everything else follows: the items are the roving focus, the
 * panel is focused only when it has no items to hand focus to, and no item on a layer is ever a
 * Tab stop.
 *
 * **Tab does not walk a panel on a layer.** Every item there carries `tabindex="-1"` and Tab
 * closes the whole tree, giving focus back to the control that opened it
 * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)) —
 * the popover's rule, arriving here for its second consumer. Such a panel is a child of `body`,
 * so the tab order the DOM would give it runs off the end of the page.
 *
 * **A submenu is a menu.** There is no second component and no nesting depth written down
 * anywhere: an item carrying `[pctMenuTrigger]` opens another `pct-menu`, which learns from
 * that registration who its parent is and closes with it.
 *
 * **`inline` makes it a region of the page rather than a layer over it.** The panel is then
 * rendered in the host, where the consumer wrote the component — the same template, so the same
 * classes, the same parts and the same sheet — and everything the layer was for goes: the
 * overlay, the positioning, the trigger, the dismissals the closing stack delivered. What is
 * left is the role, the walk and the roving focus, plus the one thing a layer never needed and
 * a region cannot do without: a Tab stop, because the page's own order runs through the
 * commands now. It is the cut
 * [0047](../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)
 * made for the drawer, arriving at a second component — and here it is the CONSUMER who makes
 * it, per instance, rather than the library once for the whole type.
 *
 * **SSR**: over a layer, nothing renders on the server. The panel is a template attached to an
 * overlay by a browser render, so a menu left `open` at bootstrap sends no markup and hydrates
 * no mismatch (`req-project-ssr`); the trigger's `aria-expanded` is the deliberate exception —
 * it is part of the control's markup rather than of an interaction. **Inline it is the other
 * way round and deliberately so**: the panel is ordinary content of the host, so an open one is
 * in the server's HTML with its commands in it, which is the property the mode exists for.
 *
 * @example
 * <button pctButton [pctMenuTrigger]="actions">Actions</button>
 * <pct-menu #actions>
 *   <button pctMenuItem (click)="rename()">Rename</button>
 *   <button pctMenuItem [pctMenuTrigger]="more">Move to</button>
 *   <pct-menu #more placement="end">
 *     <button pctMenuItem (click)="move('inbox')">Inbox</button>
 *   </pct-menu>
 * </pct-menu>
 */
@Component({
  selector: 'pct-menu',
  imports: [NgTemplateOutlet, PctOverlayPanel],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  host: {
    class: 'pct-menu',
    // The host renders nothing — everything it draws lives in the overlay. It stays in the
    // tree because it is where the panel's severed properties are read from.
    style: 'display: contents',
  },
})
export class PctMenu {
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  /**
   * Whether the panel is up. A `model`, because both directions are ordinary: an application
   * opens it, and the menu closes itself on a choice, on Escape, on a press outside, on the
   * trigger and on Tab walking out — every one of which is a panel on a layer getting out of
   * the page's way. An inline menu has nowhere to get out of, and writes this from nobody but
   * the application (`inline`).
   */
  readonly open = model(false);

  /**
   * The accessible name, for a menu whose trigger does not already say it. **Usually neither
   * is needed**: a menu with no name of its own is named by the control that opened it, which
   * is what the APG's own example does and what makes "Actions menu" come out of the two
   * words already on the screen.
   */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere on the page. */
  readonly ariaLabelledby = input<string>('');

  /**
   * Which side of the control it opens on — logical, so `end` is the right in an English page
   * and the left in an Arabic one. `bottom` is the menu button's side and `end` the submenu's;
   * the window has the last word either way (`pctPlacementPositions`). Inline it is read by
   * nobody: a panel that is not positioned has no side to be on.
   */
  readonly placement = input<PctPlacement>('bottom');

  /**
   * Renders the panel **in the host**, where the component was written, instead of on a layer
   * over the page — a column of commands docked into the page rather than one lifted off it.
   *
   * What it gives up is the layer and everything the layer was for: no overlay, no position
   * strategy, no trigger, and none of the dismissals the closing stack delivered. **An inline
   * menu never closes itself.** Escape and a press outside were the overlay's to hear, Tab now
   * walks out of the panel instead of out of the menu, and a chosen command leaves the column
   * standing — it is a region of the page, so there is nothing for it to get out of the way of
   * and no control to hand the page back to. `closed` therefore only ever says `api` here.
   *
   * `open` still says whether it is shown, so a closed inline menu renders nothing. What it
   * does not have is the leave: the overlay owned the wait, and a panel the template removes
   * takes its transition with it. The enter is unchanged, because that half is the sheet's
   * (`@starting-style`) — inline the panel fades in and then goes at once, and
   * `data-pct-leaving` is never written on it.
   *
   * What it keeps is the role, the arrow walk, the typeahead and the roving focus — and it
   * gains the Tab stop they never needed over a layer: exactly one command carries
   * `tabindex="0"`, so the page's order runs into the menu and out the far side
   * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) read
   * as an absence). Nothing pulls focus into an inline panel that appears — a region arriving
   * is not a user asking to be moved.
   *
   * @example
   * <pct-menu inline [open]="true" ariaLabel="Actions">
   *   <button pctMenuItem (click)="rename()">Rename</button>
   * </pct-menu>
   */
  readonly inline = input(false, { transform: booleanAttribute });

  /** Why it closed. See `PctMenuCloseReason`. */
  readonly closed = output<PctMenuCloseReason>();

  private readonly uid = nextPctId('pct-menu');

  /** What the trigger's `aria-controls` points at while the panel is up. */
  readonly panelId = `${this.uid}-panel`;

  /**
   * The items of THIS menu, in document order. The query is over the whole content —
   * `descendants: true` — because an item may stand inside an `@if`, an `@for` or a wrapper a
   * consumer drew, and the filter is what keeps a submenu's items out of its parent's walk:
   * both sets are content of the outer `pct-menu`, and only the ownership each item was
   * injected with says which menu they belong to.
   */
  private readonly declared = contentChildren(PCT_MENU_ITEM, {
    descendants: true,
  });

  readonly items = computed(() =>
    this.declared().filter((item) => item.menu === this),
  );

  /**
   * The keyboard walk — the shared machinery from `core`, and the second role to use it. What
   * the menu adds to the select's reading of it is one flag: a menu comes round at the ends
   * and a listbox stops there, which is the platform's answer for both.
   */
  private readonly nav = pctListNavigation<PctMenuItemApi>({
    items: this.items,
    isDisabled: (item) => item.disabled(),
    label: (item) => item.label(),
    wrap: true,
  });

  /**
   * The control this panel hangs off, as registered by `PctMenuTrigger`. A signal and not a
   * field, because a menu asked to open before its trigger has rendered has to open the moment
   * it does — the effect below is waiting for this rather than giving up.
   */
  private readonly trigger = signal<HTMLElement | null>(null);

  /**
   * The id of that control, for the name a menu takes from it. It is READ where the trigger
   * has one and written where it has not: a name that depends on the consumer having thought
   * to put an id on their button is a name most menus would not have.
   */
  protected readonly triggerId = signal<string | null>(null);

  /** The menu this one hangs off, when an item of another menu opened it. */
  private readonly parent = signal<PctMenu | null>(null);

  private readonly panelTemplate =
    viewChild.required<TemplateRef<void>>('panel');

  /**
   * The overlay half from `core`: the four properties a panel outside the host tree stops
   * inheriting (`lesson-35`). The menu is the layer's fifth consumer.
   */
  private readonly panelOverlay = pctOverlay({
    from: () => this.trigger() ?? this.host.nativeElement,
  });

  /**
   * What the overlay severed, handed back — and `null` inline, where nothing was severed: the
   * panel stands in the consumer's own tree, so the theme, the typeface, the size and the
   * writing direction reach it down the cascade (`lesson-35` read as an absence, 0047). It is a
   * `computed` and not the reading itself because the mode can change under a standing panel:
   * a menu that was a layer a moment ago holds the four properties it was handed there, and
   * writing them onto markup that inherits its own would pin it to the theme of wherever it
   * last popped up.
   */
  protected readonly inherited = computed(() =>
    this.inline() ? null : this.panelOverlay.inherited(),
  );

  /** The overlay while it is up; `null` whenever the menu is closed. */
  private ref: OverlayRef | null = null;

  /**
   * Whether the inline panel is on the screen — what `ref` is for the overlay, in the mode that
   * has none. The close has bookkeeping to do (the reason, the walk) and it has to run once, on
   * the way down, rather than on every pass of an effect that sees a menu already shut.
   */
  private inlineUp = false;

  /** The panel's view, so the leave can be put on the screen before it is waited for. */
  private view: EmbeddedViewRef<void> | null = null;

  /** True while the panel is fading out — the state the leave transition runs from. */
  protected readonly leaving = signal(false);

  /** The pending wait for that transition; `null` when nothing is leaving. */
  private cancelLeave: (() => void) | null = null;

  /** Why the **next** close happened; read once by the effect. */
  private reason: PctMenuCloseReason = 'api';

  /** Where focus goes on the **next** open. Reset to the default once used. */
  private intent: PctMenuOpenIntent = 'first';

  /**
   * The writing direction the panel was opened in — read once, at the moment of opening, and
   * kept because the arrow keys need it after that: `ArrowRight` walks INTO a submenu in an
   * English menu and OUT of one in an Arabic menu, and the panel lives outside the host tree,
   * so there is nowhere else to ask.
   */
  private dir: PctDirection = 'ltr';

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
      // trigger through the effect.
      if (!untracked(this.inline) && untracked(this.open)) {
        const trigger = untracked(this.trigger);
        if (trigger) this.attach(trigger);
      }
      if (isDevMode()) this.warnOnTrigger();
    });

    // The popover's effect, and its `untracked` body for the popover's reason: attaching reads
    // the placement, the template and the properties the overlay layer has just written, and
    // every one of those would otherwise be a reason to run this again
    // ([`lesson-94`](../../../../docs/lessons.md#lesson-94)).
    effect(() => {
      // The three signals are read before any branch, so that every one of them is tracked
      // from the first run: inline there is no browser-only step to wait for — the panel is
      // drawn by this component's own template — and an early return on `rendered` before the
      // reads would leave `open` and `trigger` untracked until something else re-ran this.
      const rendered = this.rendered;
      const inline = this.inline();
      const trigger = this.trigger();
      const open = this.open();
      untracked(() => {
        if (inline) {
          this.showInline(open);
          return;
        }
        if (!rendered) return;
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

    if (isDevMode()) effect(() => this.warnOnTrigger());
  }

  // ── what the trigger and the items register ─────────────────────────────────────────────

  /**
   * Registers the control the panel hangs off, and the menu that control stands in — `null`
   * for a menu button, an enclosing `pct-menu` for a submenu. Both come from the same place
   * because they are the same fact: who opened this.
   *
   * `untracked` for the popover's reason: this runs inside the trigger directive's effect, and
   * a read of these signals there would make each registration depend on the registration
   * ([`lesson-94`](../../../../docs/lessons.md#lesson-94)).
   */
  bindTrigger(element: HTMLElement, parent: PctMenu | null): void {
    const current = untracked(this.trigger);
    if (isDevMode() && current && current !== element)
      console.warn(
        `[pct-menu] Two controls carry \`pctMenuTrigger\` for the same menu. Both will say ` +
          `\`aria-expanded\`, the panel will hang off whichever registered last, and focus ` +
          `goes back to that one whoever opened it. Give each control a menu of its own.`,
      );
    this.trigger.set(element);
    this.parent.set(parent);
    if (!element.id) element.id = `${this.uid}-trigger`;
    this.triggerId.set(element.id);
  }

  /**
   * Gives the registration back. It exists so that the warning above can tell a **second**
   * trigger from the same trigger built again — a control inside an `@if` is destroyed and
   * recreated ([`lesson-68`](../../../../docs/lessons.md#lesson-68)).
   */
  unbindTrigger(element: HTMLElement): void {
    if (untracked(this.trigger) !== element) return;
    this.trigger.set(null);
    this.parent.set(null);
    this.triggerId.set(null);
  }

  // ── open ────────────────────────────────────────────────────────────────────────────────

  /**
   * Opens it, saying where focus is to land. An already-open menu is not opened again — the
   * intent is applied to it as it stands, which is what `ArrowRight` into a submenu the
   * pointer has already opened has to do.
   */
  openFrom(intent: PctMenuOpenIntent): void {
    this.intent = intent;
    if (untracked(this.open)) this.applyIntent(intent);
    else this.open.set(true);
  }

  /**
   * Opens it if it is closed and closes the whole tree if it is open — what a press on a menu
   * button does, and the one path whose close carries the `trigger` reason.
   */
  toggle(): void {
    if (untracked(this.open)) this.closeTree('trigger', true);
    else this.openFrom('first');
  }

  // ── close ───────────────────────────────────────────────────────────────────────────────

  /**
   * Closes this menu and everything below it, leaving focus where it is. The recursion goes
   * DOWN and not up: a submenu is a child view of the panel that is about to be detached, so
   * one that stayed open would be left hanging off a control that is on its way out.
   */
  closeBelow(reason: PctMenuCloseReason): void {
    for (const item of untracked(this.items)) {
      const submenu = item.submenu();
      if (submenu && untracked(submenu.open)) submenu.closeBelow(reason);
    }
    // An inline menu takes its submenus down and stays: it is the consumer's own markup, and a
    // command chosen from a docked column has no business taking the column with it. This one
    // line is every dismissal at once — the choice, Tab, and whatever a submenu asks of the
    // tree it hangs in.
    if (untracked(this.inline)) return;
    if (!untracked(this.open)) return;
    this.reason = reason;
    this.open.set(false);
  }

  /**
   * Closes the whole tree from the root down, and hands focus back to the control that opened
   * it. `restore` is what tells a dismissal from a departure: Tab and a chosen item give the
   * page its control back, a press somewhere else does not — the user is already where they
   * meant to be, and pulling focus to a button they have just left behind would take them off
   * it.
   */
  closeTree(reason: PctMenuCloseReason, restore: boolean): void {
    const root = this.root();
    const trigger = untracked(root.trigger);
    root.closeBelow(reason);
    if (!restore) return;
    // An inline root has no control to hand the page back to, and the place the user came from
    // is still on the screen: the command they walked into the submenu from. Without this the
    // panel that had focus is removed and the page is left with focus on `body`.
    if (trigger) trigger.focus();
    else if (untracked(root.inline)) root.activeItem()?.element.focus();
  }

  /**
   * Closes this menu alone and gives focus back to whatever opened it — the parent's item for
   * a submenu, the menu button for a root menu. **Only if focus is inside this panel**: the
   * page behind a menu is live, and a submenu the pointer opened has left focus on the item
   * above it, where Escape has to leave it.
   */
  private dismiss(reason: PctMenuCloseReason): void {
    if (!untracked(this.open)) return;
    const inside = this.holdsFocus();
    this.closeBelow(reason);
    if (inside) untracked(this.trigger)?.focus();
  }

  // ── the walk ────────────────────────────────────────────────────────────────────────────

  /**
   * Moves the walk and takes DOM focus with it — the two halves of roving focus, which are
   * one call here so that no path can do the first without the second. On the way it closes
   * the submenu of the item being left: a menu shows one open submenu at a time, and it is
   * always the active item's.
   */
  private step(move: () => void): void {
    move();
    this.applyActive();
  }

  private applyActive(): void {
    const item = untracked(this.items)[this.nav.activeIndex()];
    this.closeSubmenusExcept(item ?? null);
    item?.element.focus();
  }

  /** What the intent means once there is a panel to apply it to. */
  private applyIntent(intent: PctMenuOpenIntent): void {
    if (intent === 'none') return;
    this.step(() => (intent === 'last' ? this.nav.last() : this.nav.first()));
    // A menu with nothing in it still has to be somewhere for Escape to be pressed: the panel
    // takes focus itself when it has no item to hand it to.
    if (this.nav.activeIndex() < 0) this.panelElement()?.focus();
  }

  private closeSubmenusExcept(keep: PctMenuItemApi | null): void {
    for (const item of untracked(this.items)) {
      if (item === keep) continue;
      const submenu = item.submenu();
      if (submenu && untracked(submenu.open)) submenu.closeBelow('away');
    }
  }

  /**
   * The pointer arriving on an item. The highlight follows the mouse, because a menu whose
   * keyboard position and visible highlight disagree answers the next `ArrowDown` from a row
   * the user is no longer looking at — and a submenu opens **without** taking focus, so that
   * crossing a row on the way somewhere else does not pull the user a level deeper.
   */
  pointTo(item: PctMenuItemApi): void {
    this.closeSubmenusExcept(item.submenu() ? item : null);
    if (item.disabled()) return;
    this.nav.setActive(untracked(this.items).indexOf(item));
    item.element.focus();
    item.submenu()?.openFrom('none');
  }

  /**
   * The key map, which stays with the role: what the walk itself owns is in `core`, and which
   * key opens a submenu, closes one or leaves the tree is a property of being a menu.
   *
   * `Enter` and `Space` are **not** here, and their absence is the point: an item is a
   * `<button>`, so the platform turns both into a `click` and the item answers that
   * (`req-api-platform`). A menu that read them itself would be a second implementation of a
   * button, one keyboard layout away from disagreeing with the first.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key;
    // `ArrowRight` walks INTO a submenu in a left-to-right menu and OUT of one in a
    // right-to-left menu: the direction of travel is the writing direction, exactly as
    // `start`/`end` are (`req-token-logical`).
    const dir = this.direction();
    const inwards = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const outwards = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.step(() => this.nav.move(1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.step(() => this.nav.move(-1));
        return;
      case 'Home':
        event.preventDefault();
        this.step(() => this.nav.first());
        return;
      case 'End':
        event.preventDefault();
        this.step(() => this.nav.last());
        return;
      case 'Tab':
        // Inline the key is left alone, and that is 0031 read the other way round: the panel
        // stands where the consumer wrote it, so the order the DOM carries on with is the right
        // one — Tab walks out of the commands and on into the page, closing nothing.
        if (untracked(this.inline)) return;
        // The whole tree, and focus back on the control that opened it: an overlay is a child
        // of `body`, so the order the DOM would carry on with runs off the end of the page
        // ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
        event.preventDefault();
        this.closeTree('away', true);
        return;
      case inwards: {
        const submenu = this.activeItem()?.submenu();
        if (!submenu) return;
        event.preventDefault();
        submenu.openFrom('first');
        return;
      }
      case outwards:
        // Out of a submenu and back onto the item it hangs on. A root menu leaves the key
        // alone: there is nothing to go back to, and a menu that swallowed it would take
        // caret movement away from whatever else the key is for.
        if (!untracked(this.parent)) return;
        event.preventDefault();
        this.dismiss('away');
        return;
      default:
        // The space is deliberately not typed at: it is how a button is pressed, and a menu
        // that read it as a letter would swallow the press of every item whose label needs a
        // second word.
        if (key.length === 1 && key !== ' ') {
          event.preventDefault();
          this.step(() => this.nav.typeahead(key));
        }
    }
  }

  /**
   * Focus arriving where the walk did not send it, and the walk following it — the tab strip's
   * answer one role over. It is what the Tab stop needs: the page's order puts the user on a
   * command with the cursor still standing nowhere, and a movement from nowhere goes to the
   * edge it comes from, so the first `ArrowDown` would step onto the very command the user is
   * already on. Over a layer it changes nothing — every focus there is one the walk asked for.
   *
   * A focus that landed on no command — the panel's own padding, which `tabindex="-1"` makes
   * focusable — leaves the cursor where it stands rather than putting it nowhere.
   */
  protected onFocusIn(event: FocusEvent): void {
    const at = untracked(this.items).findIndex(
      (item) => item.element === event.target,
    );
    if (at >= 0) this.nav.setActive(at);
  }

  /**
   * The writing direction the arrow keys are read in. Over a layer it is the one read at the
   * opening and kept, because there is nowhere to ask afterwards — the panel is outside the
   * tree. Inline there is somewhere: the panel stands in the page, so the direction is read off
   * it at the keypress, which is the only reading that can follow a page whose direction
   * changes under a panel that never closes.
   */
  private direction(): PctDirection {
    if (!untracked(this.inline)) return this.dir;
    const panel = this.panelElement();
    return panel && getComputedStyle(panel).direction === 'rtl' ? 'rtl' : 'ltr';
  }

  private activeItem(): PctMenuItemApi | null {
    return untracked(this.items)[this.nav.activeIndex()] ?? null;
  }

  /**
   * The command the page's Tab lands on, and `null` wherever there is no such thing: over a
   * layer no row is ever a Tab stop (0031), and inline exactly one has to be — a panel every
   * row of which was a stop would take as many Tab presses to cross as it has commands, and one
   * where none was would be a region no keyboard could reach at all.
   *
   * It follows the walk, so leaving the menu and coming back returns to the command the user
   * was on. Where the walk stands nowhere — before the first movement, and after a close — it
   * is the first command that can be reached; and a walk standing on a disabled row hands it on
   * for the same reason, since the platform will not focus a disabled `<button>` and the menu
   * would drop out of the tab order behind it.
   */
  private readonly tabStop = computed<PctMenuItemApi | null>(() => {
    if (!this.inline()) return null;
    const items = this.items();
    const active = items[this.nav.activeIndex()];
    if (active && !active.disabled()) return active;
    return items.find((item) => !item.disabled()) ?? null;
  });

  /** Whether this command is the one the page's tab order stops at. Read by `PctMenuItem`. */
  holdsTabStop(item: PctMenuItemApi): boolean {
    return this.tabStop() === item;
  }

  // ── the panel ───────────────────────────────────────────────────────────────────────────

  private attach(trigger: HTMLElement): void {
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
    this.dir = inherited?.direction === 'rtl' ? 'rtl' : 'ltr';

    const position = createFlexibleConnectedPositionStrategy(
      this.injector,
      trigger,
    )
      .withPositions(pctPlacementPositions(this.placement(), OFFSET, this.dir))
      .withPush(true);

    const ref = createOverlayRef(this.injector, {
      positionStrategy: position,
      // The panel follows a scrolling page rather than closing on it, as the popover's does:
      // the page behind is live, and a menu is not a modal thing to be interrupted by it.
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      direction: this.dir,
      panelClass: 'pct-menu__pane',
      disposeOnNavigation: true,
    });
    this.ref = ref;
    this.view = ref.attach(
      new TemplatePortal<void>(this.panelTemplate(), this.viewContainer),
    );

    // The strategy measures the panel as it is attached, and what it measures has to be the
    // panel with its items in it.
    ref.updatePosition();

    // From the stack and never from a listener above the control: the dispatcher hands a
    // keydown to the top-most attached overlay alone, which is what makes Escape close a
    // submenu and leave the menu it hangs on standing
    // ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)).
    ref.keydownEvents().subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss('escape');
    });

    // A press outside dismisses — **except on the trigger**, which has a press of its own to
    // answer, and except anywhere inside this menu's own tree, which the dependency has no
    // way of knowing about: a submenu is a second overlay, so a press in it is "outside" every
    // panel above it ([`lesson-93`](../../../../docs/lessons.md#lesson-93)).
    ref.outsidePointerEvents().subscribe((event) => {
      const target = event.target as Node | null;
      if (!target || trigger.contains(target)) return;
      if (this.holds(target)) return;
      // A press that landed on the menu ABOVE this one closes this one and stops there.
      if (untracked(this.parent)?.holds(target)) {
        this.closeBelow('outside');
        return;
      }
      this.closeTree('outside', false);
    });

    this.applyIntent(this.intent);
    this.intent = 'first';
  }

  /**
   * The inline mode's whole answer to `attach`, and it is short because the template does the
   * work: the panel is `@if`-ed into the host, so what is left here is the bookkeeping a
   * rendered panel cannot do for itself — saying that it closed — and taking down a layer the
   * menu was on before `inline` was written to it.
   *
   * Nothing is focused on the way up. A menu that pops up was asked for by a press, and the
   * user is waiting to be moved into it; a region of the page arriving on a wide screen was
   * asked for by nobody, and pulling focus there would take the user off what they were doing.
   */
  private showInline(open: boolean): void {
    this.cancelLeave?.();
    this.detach();
    if (open === this.inlineUp) return;
    this.inlineUp = open;
    if (!open) this.announceClose();
  }

  /**
   * What a close says, wherever the panel stood: the reason, once, and a walk put back to
   * nowhere. It is separate from the fade below because only one of the two is a fact — the
   * event says the menu was closed, which is a decision, and the fade is what the pixels do
   * about it afterwards. The mode with nothing to fade needs exactly this half.
   */
  private announceClose(): void {
    this.closed.emit(this.reason);
    this.reason = 'api';
    this.nav.clear();
  }

  /**
   * Puts the panel into its leaving state and detaches it once the motion is over. The
   * `closed` event does **not** wait for that: it says the menu was closed, which is a
   * decision, and the fade is what the pixels do about it afterwards.
   */
  private beginLeave(): void {
    if (!this.ref || this.cancelLeave) return;

    this.announceClose();

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

  // ── where things are ────────────────────────────────────────────────────────────────────

  /** The menu at the top of this tree — itself, when nothing opened it. */
  private root(): PctMenu {
    const parent = untracked(this.parent);
    return parent ? parent.root() : this;
  }

  /**
   * Whether a node is in this panel. **This panel and not its submenus**, and the difference
   * is a measurement rather than an oversight: the dependency's outside-press dispatcher walks
   * the attached overlays from the top down and **stops** at the first one containing the
   * press, so a menu never sees a press that landed in a panel opened from it. A walk over its
   * own subtree was written first and every test passed without it.
   *
   * What keeps that honest is a test rather than the code: `a press inside the submenu is not
   * a press outside the menu` fails the day the dispatcher stops stopping.
   */
  private holds(target: Node): boolean {
    return this.ref?.overlayElement.contains(target) ?? false;
  }

  private holdsFocus(): boolean {
    const panel = this.panelElement();
    const active = this.document.activeElement;
    return !!panel && !!active && panel.contains(active);
  }

  /**
   * The panel, wherever this menu draws it: in the overlay it opened, or — inline — in the host
   * the consumer wrote. The reading is by part rather than by a kept reference so that both
   * modes answer the same question, and a menu with no panel up answers `null` in both.
   */
  private panelElement(): HTMLElement | null {
    const root: ParentNode =
      this.ref?.overlayElement ?? this.host.nativeElement;
    return root.querySelector<HTMLElement>('[data-pct-part="panel"]');
  }

  /**
   * A menu has to hang off something — **unless it is inline**, where it hangs off nothing by
   * construction and the report below would fire on every correct use of the mode. Opened with
   * no trigger registered it does nothing at all — no panel, no error, no clue — and the
   * missing piece is one attribute in a template.
   *
   * The inline half is the other configuration that cannot be meant: a control that says
   * `aria-haspopup="menu"` for a panel which never pops up. It is reported rather than
   * repaired, and for the reason the two-trigger warning gives — either half may be the one the
   * author wanted. A menu that is a layer on a narrow screen and a region on a wide one drops
   * the control with the same condition that sets the input, and then there is nothing to say.
   */
  private warnOnTrigger(): void {
    // The signals are read before the gate so that the effect running this tracks them from
    // its first run — `rendered` is a field, and flips nothing.
    const inline = this.inline();
    const trigger = this.trigger();
    const open = this.open();
    if (!this.rendered) return;
    if (inline) {
      if (!trigger) return;
      console.warn(
        `[pct-menu] A \`pctMenuTrigger\` for an inline menu: the panel is rendered where it ` +
          `was written, so the control announces \`aria-haspopup="menu"\` and \`aria-expanded\` ` +
          `for something that never pops up. Drop \`inline\`, or drop the trigger and write ` +
          `\`open\` from the application.`,
      );
      return;
    }
    if (!open || trigger) return;
    console.warn(
      `[pct-menu] An open menu with no trigger: there is nothing for the panel to hang off, ` +
        `so nothing is shown. Put \`[pctMenuTrigger]\` on the control that opens it.`,
    );
  }
}
