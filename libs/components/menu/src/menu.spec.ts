import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
  WritableSignal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctMenu } from './menu';
import { PctMenuItem } from './menu-item';
import { PctMenuTrigger } from './menu-trigger';
import { PctMenuCloseReason } from './menu.types';

/** The panels render in CDK overlays — outside the component's tree. */
const panels = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));

const panel = () => panels()[0] ?? null;

const byId = (id: string) => document.getElementById(id) as HTMLElement | null;

const focused = () => document.activeElement as HTMLElement | null;

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** A settled fixture — the overlay attaches from an effect, so one pass is not enough. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
}

/**
 * The road the closing stack takes: a listener on the document, delivering to the top-most
 * attached overlay. `keyCode` beside `key`, because the CDK's dispatcher reads it.
 */
function escape(): void {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** A key pressed on an element, as the browser would deliver it — bubbling to the panel. */
function press(from: Element, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  from.dispatchEvent(event);
  return event;
}

/**
 * The road an outside press takes, and it is a `click` rather than a `pointerdown`: the
 * dependency records where the press began and decides on the click that follows. The listener
 * sits on `body` in the capture phase, which is why this reaches it from an element inside.
 */
function pressOn(element: Element): void {
  element.dispatchEvent(
    new MouseEvent('pointerdown', { bubbles: true, composed: true }),
  );
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
}

function hover(element: Element): void {
  element.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
}

@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `<button id="elsewhere">elsewhere</button>
    <button id="trigger" [pctMenuTrigger]="menu">Actions</button>
    <pct-menu
      #menu
      [(open)]="open"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
      [placement]="'bottom'"
      (closed)="reasons.push($event)"
    >
      <button id="rename" pctMenuItem (click)="chosen.push('rename')">
        Rename
      </button>
      <button id="duplicate" pctMenuItem [disabled]="blocked()">
        Duplicate
      </button>
      <button id="delete" pctMenuItem (click)="chosen.push('delete')">
        Delete
      </button>
    </pct-menu>`,
})
class Host {
  readonly open = signal(false);
  readonly ariaLabel = signal('');
  readonly ariaLabelledby = signal('');
  readonly blocked = signal(true);
  readonly reasons: PctMenuCloseReason[] = [];
  readonly chosen: string[] = [];
}

@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `<button id="trigger" [pctMenuTrigger]="menu">Actions</button>
    <pct-menu #menu [(open)]="open">
      <button id="first" pctMenuItem>Rename</button>
      <button
        id="into"
        pctMenuItem
        [pctMenuTrigger]="sub"
        (click)="pressed = pressed + 1"
      >
        Move to
      </button>
      <pct-menu #sub placement="end" (closed)="subReasons.push($event)">
        <button id="inbox" pctMenuItem (click)="chosen.push('inbox')">
          Inbox
        </button>
        <button id="archive" pctMenuItem>Archive</button>
      </pct-menu>
      <button id="last" pctMenuItem>Delete</button>
    </pct-menu>`,
})
class NestedHost {
  readonly open = signal(false);
  readonly subReasons: PctMenuCloseReason[] = [];
  readonly chosen: string[] = [];
  pressed = 0;
}

@Component({
  imports: [PctMenu, PctMenuTrigger],
  template: `<button id="trigger" [pctMenuTrigger]="menu">Empty</button>
    <pct-menu #menu ariaLabel="Nothing here" [(open)]="open"></pct-menu>`,
})
class EmptyHost {
  readonly open = signal(false);
}

/** A trigger with no id of its own — the case every other host here happens not to be. */
@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `<button [pctMenuTrigger]="menu">Actions</button>
    <pct-menu #menu [(open)]="open"
      ><button pctMenuItem>Rename</button></pct-menu
    >`,
})
class UnnamedTriggerHost {
  readonly open = signal(false);
}

@Component({
  imports: [PctMenu, PctMenuItem],
  template: `<pct-menu [(open)]="open"
    ><button pctMenuItem>Orphan</button></pct-menu
  >`,
})
class NoTriggerHost {
  readonly open = signal(false);
}

@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `@if (first()) {
      <button id="one" [pctMenuTrigger]="menu">one</button>
    }
    @if (second()) {
      <button id="two" [pctMenuTrigger]="menu">two</button>
    }
    <pct-menu #menu [(open)]="open"
      ><button pctMenuItem>Rename</button></pct-menu
    >`,
})
class TwoTriggersHost {
  readonly first = signal(true);
  readonly second = signal(false);
  readonly open = signal(false);
}

/**
 * An item written outside any `<pct-menu>` — a configuration the component cannot repair
 * and therefore reports. It is also the only place where the item's own optional injection
 * and its two null-safe calls are exercised: everywhere else the menu is there.
 */
@Component({
  imports: [PctMenuItem],
  template: `<button pctMenuItem id="orphan">Rename</button>`,
})
class OrphanItemHost {}

describe('PctMenu', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  /** Every host here holds the panel open through the same `model` binding. */
  const open = async (
    fixture: ComponentFixture<{ readonly open: WritableSignal<boolean> }>,
  ) => {
    fixture.componentInstance.open.set(true);
    await settle(fixture);
  };

  describe('what renders, and when', () => {
    it('a closed menu puts nothing in the document, and the trigger says so', async () => {
      const fixture = await render(Host);

      expect(panel()).toBeNull();
      const trigger = byId('trigger');
      expect(trigger?.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.getAttribute('aria-controls')).toBeNull();
    });

    it('opening attaches a menu panel the trigger points at', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const trigger = byId('trigger');
      expect(panel()).not.toBeNull();
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      expect(trigger?.getAttribute('aria-controls')).toBe(panel()?.id);
    });

    /**
     * The name a menu has without being given one. The APG's own example names the panel by
     * the control that opened it, and here that costs the consumer nothing — the id is read
     * where the trigger has one and written where it has not.
     */
    it('the panel is named by its trigger', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(panel()?.getAttribute('aria-labelledby')).toBe('trigger');
      expect(panel()?.getAttribute('aria-label')).toBeNull();
    });

    it('an explicit ariaLabel replaces that, rather than standing beside it', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabel.set('Row actions');
      await open(fixture);

      expect(panel()?.getAttribute('aria-label')).toBe('Row actions');
      expect(panel()?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('and a name that already stands on the page wins over both', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabel.set('Row actions');
      fixture.componentInstance.ariaLabelledby.set('elsewhere');
      await open(fixture);

      expect(panel()?.getAttribute('aria-labelledby')).toBe('elsewhere');
    });

    /**
     * The id is what `aria-controls` points at, so it has to be the library's own and unique
     * per instance — checking that the two attributes agree would pass just as well on two
     * panels sharing one id, which is the defect the counter exists to prevent.
     */
    it('the panel carries an id of its own', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(panel()?.id).toMatch(/^pct-menu-\d+-panel$/);
    });

    it('the items the consumer wrote are the panel’s own children', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const items = panel()?.children ?? [];
      expect(Array.from(items).map((item) => item.id)).toEqual([
        'rename',
        'duplicate',
        'delete',
      ]);
      expect(byId('rename')?.getAttribute('role')).toBe('menuitem');
      expect(byId('rename')?.getAttribute('tabindex')).toBe('-1');
    });

    /**
     * The name a menu takes from its trigger has to survive the trigger having no id, which
     * is the ordinary case: a consumer writes `<button pctMenuTrigger>` and nothing else. The
     * id is read where there is one and written where there is not, so the panel is named
     * either way and a consumer's own id is never overwritten.
     */
    it('a trigger with no id of its own is given one, and still names the panel', async () => {
      const fixture = await render(UnnamedTriggerHost);
      await open(fixture);

      const trigger = document.querySelector<HTMLElement>('[aria-haspopup]');
      expect(trigger?.id).toMatch(/^pct-menu-\d+-trigger$/);
      expect(panel()?.getAttribute('aria-labelledby')).toBe(trigger?.id);
    });

    it('closing takes the panel out again', async () => {
      const fixture = await render(Host);
      await open(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(panel()).toBeNull();
    });
  });

  describe('the walk', () => {
    it('a menu destroyed while open leaves nothing behind', async () => {
      const fixture = await render(Host);
      await open(fixture);
      fixture.destroy();

      expect(panel()).toBeNull();
    });

    it('opening puts focus on the first item', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(focused()?.id).toBe('rename');
    });

    it('a menu with no items focuses the panel itself', async () => {
      const fixture = await render(EmptyHost);
      await open(fixture);

      expect(focused()).toBe(panel());
    });

    it('the arrows move focus and step over what is disabled', async () => {
      const fixture = await render(Host);
      await open(fixture);

      press(focused()!, 'ArrowDown');
      // `duplicate` is disabled — the step lands past it.
      expect(focused()?.id).toBe('delete');
      press(focused()!, 'ArrowUp');
      expect(focused()?.id).toBe('rename');
    });

    /**
     * The one line `core` learned for this component. A listbox stops at its last option
     * because a native `<select>` does; a menu comes round, because every menu the platform
     * draws does.
     */
    it('the walk comes round at the ends', async () => {
      const fixture = await render(Host);
      await open(fixture);

      press(focused()!, 'ArrowUp');
      expect(focused()?.id).toBe('delete');
      press(focused()!, 'ArrowDown');
      expect(focused()?.id).toBe('rename');
    });

    it('Home and End go to the ends', async () => {
      const fixture = await render(Host);
      await open(fixture);

      press(focused()!, 'End');
      expect(focused()?.id).toBe('delete');
      press(focused()!, 'Home');
      expect(focused()?.id).toBe('rename');
    });

    it('a letter moves to the item whose text starts with it', async () => {
      const fixture = await render(Host);
      await open(fixture);

      press(focused()!, 'd');
      expect(focused()?.id).toBe('delete');
    });

    /**
     * The space is how a button is pressed, so a menu that read it as a letter would swallow
     * the press of every item whose label needs a second word.
     */
    it('the space is not typed at', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const event = press(focused()!, ' ');
      expect(event.defaultPrevented).toBe(false);
      expect(focused()?.id).toBe('rename');
    });

    it('the arrow keys are the menu’s, so the page under it does not scroll', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(press(focused()!, 'ArrowDown').defaultPrevented).toBe(true);
    });
  });

  describe('choosing', () => {
    it('a press on an item runs it and closes the menu', async () => {
      const fixture = await render(Host);
      await open(fixture);

      byId('rename')?.click();
      await settle(fixture);

      expect(fixture.componentInstance.chosen).toEqual(['rename']);
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['item']);
      expect(focused()?.id).toBe('trigger');
    });

    /**
     * The platform's own disabled state, and not `aria-disabled` beside it. A consumer's
     * `(click)` sits on the same element and is registered before a directive's host
     * listener, so a listener that only *decided* not to run the command could not stop the
     * one already listening ([`lesson-95`](../../../../docs/lessons.md#lesson-95)).
     */
    it('a disabled item cannot be pressed, and the platform is what stops it', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const item = byId('duplicate') as HTMLButtonElement;
      expect(item.disabled).toBe(true);
      item.click();
      await settle(fixture);

      expect(panel()).not.toBeNull();
    });

    /**
     * The pointer half of the same promise. A disabled `<button>` swallows a press in every
     * engine and its hover in most of them — "most" being why the guard is here rather than
     * left to the platform: what the highlight says about where the user is has to be true in
     * all three.
     */
    it('and the pointer resting on it moves nothing', async () => {
      const fixture = await render(Host);
      await open(fixture);

      hover(byId('duplicate')!);
      expect(focused()?.id).toBe('rename');
    });

    it('and it is reachable again the moment it is enabled', async () => {
      const fixture = await render(Host);
      await open(fixture);
      fixture.componentInstance.blocked.set(false);
      await settle(fixture);

      press(focused()!, 'ArrowDown');
      expect(focused()?.id).toBe('duplicate');
    });
  });

  describe('the ways out', () => {
    it('Escape closes it and gives focus back to the trigger', async () => {
      const fixture = await render(Host);
      await open(fixture);

      escape();
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['escape']);
      expect(focused()?.id).toBe('trigger');
    });

    /**
     * The other half of the restore, and the one a live page makes necessary: nothing is
     * `inert` under a menu, so the user can click into the page behind it and press Escape
     * from there. A restore that did not ask whether focus was inside the panel would take
     * them off what they had just started and hand them back to a control they left.
     */
    it('Escape pressed from outside the panel moves no focus', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const elsewhere = byId('elsewhere');
      elsewhere?.focus();
      escape();
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(elsewhere);
    });

    /**
     * An overlay is a child of `body`, so the tab order the DOM would carry on with runs off
     * the end of the page. The whole tree closes and the control that opened it gets focus
     * back, for the page's own order to carry on from
     * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
     */
    it('Tab closes it and hands the page back its own order', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const event = press(focused()!, 'Tab');
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['away']);
      expect(focused()?.id).toBe('trigger');
    });

    it('Shift+Tab does the same', async () => {
      const fixture = await render(Host);
      await open(fixture);

      press(focused()!, 'Tab', true);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(focused()?.id).toBe('trigger');
    });

    it('a press outside closes it and leaves focus where the press landed', async () => {
      const fixture = await render(Host);
      await open(fixture);

      pressOn(byId('elsewhere')!);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['outside']);
      expect(focused()?.id).not.toBe('trigger');
    });

    /**
     * The defect the guard in `attach` exists for: the dependency's outside-press listener
     * sits on `body` in the CAPTURE phase, so it sees the click BEFORE the trigger's own
     * handler does. A menu that dismissed itself there would be reopened by its own toggle on
     * the way back up ([`lesson-93`](../../../../docs/lessons.md#lesson-93)).
     */
    it('a second press on the trigger closes it, and does not reopen it', async () => {
      const fixture = await render(Host);
      await open(fixture);

      pressOn(byId('trigger')!);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['trigger']);
    });
  });

  describe('what it says about the close', () => {
    /**
     * Every other reason here is one the menu decided on. This is the one it cannot tell from
     * anything else: an application writing `false` looks exactly like a button a consumer put
     * in their own content, and inventing a distinction between the two would be a promise
     * nothing could keep.
     */
    it('a value written from outside is `api`', async () => {
      const fixture = await render(Host);
      await open(fixture);

      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    it('closing a menu that was never open says nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('and the reason starts from `api` again after one that was not', async () => {
      const fixture = await render(Host);
      await open(fixture);
      escape();
      await settle(fixture);

      await open(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['escape', 'api']);
    });
  });

  describe('the trigger', () => {
    /**
     * The other half of the toggle. Every other case here presses the trigger to SHUT the
     * menu, so the press that opens one — the ordinary one, and the one that decides where
     * focus lands — was measured by nothing.
     */
    it('a press opens it at the first command', async () => {
      const fixture = await render(Host);

      byId('trigger')?.click();
      await settle(fixture);

      expect(panel()).not.toBeNull();
      expect(focused()?.id).toBe('rename');
    });

    it('ArrowDown opens it at the first item and ArrowUp at the last', async () => {
      const fixture = await render(Host);

      press(byId('trigger')!, 'ArrowDown');
      await settle(fixture);
      expect(focused()?.id).toBe('rename');

      escape();
      await settle(fixture);

      press(byId('trigger')!, 'ArrowUp');
      await settle(fixture);
      expect(focused()?.id).toBe('delete');
    });

    it('two controls for one menu are reported, and one built again is not', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(TwoTriggersHost);

      // The same trigger destroyed and built again — an `@if` around a control is not a
      // second control (`lesson-68`).
      fixture.componentInstance.first.set(false);
      await settle(fixture);
      fixture.componentInstance.first.set(true);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();

      fixture.componentInstance.second.set(true);
      await settle(fixture);
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it('an open menu with nothing to hang off is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(NoTriggerHost);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('submenus', () => {
    it('the item that opens one says so about itself', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      const into = byId('into');
      expect(into?.getAttribute('aria-haspopup')).toBe('menu');
      expect(into?.getAttribute('aria-expanded')).toBe('false');
    });

    it('ArrowRight walks in, ArrowLeft walks back out', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      press(focused()!, 'ArrowDown');
      expect(focused()?.id).toBe('into');

      press(focused()!, 'ArrowRight');
      await settle(fixture);
      expect(panels()).toHaveLength(2);
      expect(focused()?.id).toBe('inbox');

      press(focused()!, 'ArrowLeft');
      await settle(fixture);
      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('into');
      expect(fixture.componentInstance.subReasons).toEqual(['away']);
    });

    /**
     * The closing stack hands a key to the top-most panel and to no other
     * ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)), so
     * one Escape is one level out.
     */
    it('Escape closes the submenu alone', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);

      escape();
      await settle(fixture);

      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('into');
    });

    /**
     * The half of the restore that only the pointer can reach. A submenu opened by hovering
     * leaves focus on the row above it, so Escape has nothing inside the panel to give back —
     * and a restore that did not ask would pull the user onto the row they were already on
     * from a panel they never entered.
     */
    it('Escape on a pointer-opened submenu moves no focus', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      hover(byId('into')!);
      await settle(fixture);
      expect(panels()).toHaveLength(2);
      expect(focused()?.id).toBe('into');

      escape();
      await settle(fixture);

      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('into');
      expect(fixture.componentInstance.subReasons).toEqual(['escape']);
    });

    it('walking off the item takes its submenu with it', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);
      expect(panels()).toHaveLength(2);

      press(focused()!, 'ArrowLeft');
      press(focused()!, 'ArrowDown');
      await settle(fixture);

      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('last');
    });

    it('choosing in a submenu closes the whole tree', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);

      byId('inbox')?.click();
      await settle(fixture);

      expect(panels()).toHaveLength(0);
      expect(fixture.componentInstance.chosen).toEqual(['inbox']);
      expect(focused()?.id).toBe('trigger');
    });

    it('a press on the item opens the submenu rather than toggling the menu shut', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      byId('into')?.click();
      await settle(fixture);

      expect(panels()).toHaveLength(2);
      expect(focused()?.id).toBe('inbox');
      // The item's own `(click)` still runs — a submenu trigger is an item like any other.
      expect(fixture.componentInstance.pressed).toBe(1);
    });

    /**
     * The pointer moves the highlight and opens the panel, but does NOT take focus into it:
     * crossing a row on the way somewhere else would otherwise pull the user a level deeper
     * every time.
     */
    it('the pointer opens a submenu without taking focus into it', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      hover(byId('into')!);
      await settle(fixture);

      expect(panels()).toHaveLength(2);
      expect(focused()?.id).toBe('into');
    });

    it('and moving the pointer to another row closes it again', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      hover(byId('into')!);
      await settle(fixture);

      hover(byId('last')!);
      await settle(fixture);

      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('last');
    });

    /**
     * A submenu is a second overlay, so a press inside it is "outside" the panel above it as
     * far as the dependency is concerned — and a menu that believed that would close the tree
     * the moment the user reached the thing they had opened.
     */
    it('a press inside the submenu is not a press outside the menu', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);

      // The panel's own background rather than an item on it: a press on an item is a
      // CHOICE, and this case is about the press that chooses nothing.
      pressOn(panels()[1]);
      await settle(fixture);

      expect(panels()).toHaveLength(2);
    });

    it('a press on the menu above closes the submenu and stops there', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);

      pressOn(panels()[0]);
      await settle(fixture);

      expect(panels()).toHaveLength(1);
    });

    it('Tab from a submenu closes the whole tree', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);
      press(focused()!, 'ArrowDown');
      press(focused()!, 'ArrowRight');
      await settle(fixture);

      press(focused()!, 'Tab');
      await settle(fixture);

      expect(panels()).toHaveLength(0);
      expect(focused()?.id).toBe('trigger');
    });

    /**
     * The direction of travel is the writing direction, exactly as `start`/`end` are: in an
     * Arabic menu the way further in is `ArrowLeft`, because that is where the panel is drawn.
     */
    it('in a right-to-left menu the arrows swap', async () => {
      const fixture = await render(NestedHost);
      byId('trigger')!.style.direction = 'rtl';
      await open(fixture);

      press(focused()!, 'ArrowDown');
      // The submenu reads the direction off the item it hangs on, which in a browser
      // inherits it from the panel's own `dir`. jsdom resolves no cascade, so the fact a
      // browser would supply is supplied here — and measured for real in `menu.spec.ts`
      // under `apps/sandbox-e2e`.
      byId('into')!.style.direction = 'rtl';
      press(focused()!, 'ArrowLeft');
      await settle(fixture);
      expect(panels()).toHaveLength(2);
      expect(focused()?.id).toBe('inbox');

      press(focused()!, 'ArrowRight');
      await settle(fixture);
      expect(panels()).toHaveLength(1);
      expect(focused()?.id).toBe('into');
    });

    it('ArrowLeft in a root menu is left to whatever else it is for', async () => {
      const fixture = await render(NestedHost);
      await open(fixture);

      expect(press(focused()!, 'ArrowLeft').defaultPrevented).toBe(false);
      expect(panels()).toHaveLength(1);
    });
  });
  describe('an item with no menu around it', () => {
    it('says so, and says what breaks and what to do instead', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await render(OrphanItemHost);

      expect(warn).toHaveBeenCalledTimes(1);
      const said = String(warn.mock.calls[0]?.[0] ?? '');
      expect(said).toContain('outside any');
      expect(said).toContain('role="menuitem"');
      expect(said).toContain('no keyboard');
      expect(said).toContain('<pct-menu>');

      warn.mockRestore();
    });

    it('and it is a warning, not a failure: the press and the pointer answer nothing', async () => {
      // `menu?.closeTree()` and `menu?.pointTo()` are null-safe for this one case, and a
      // menu is present in every other test in this file — so the `?.` is measured here or
      // it is not measured at all.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(OrphanItemHost);
      const item = byId('orphan') as HTMLButtonElement;

      expect(() => {
        hover(item);
        item.click();
      }).not.toThrow();

      await fixture.whenStable();
      warn.mockRestore();
    });
  });
});
