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

/** A panel on a layer — the mode that draws it outside the component's own tree. */
const overlayPanels = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '.cdk-overlay-container [role="menu"]',
    ),
  );

/** The panel inside the component's own tree, which is where an inline menu draws it. */
const inlinePanel = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '[role="menu"]',
  );

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

/**
 * The mode where the panel is a region of the page: no trigger, no layer, and `open` true from
 * the start — a column of commands docked into the markup the consumer wrote. The two buttons
 * around it are the page's tab order, which is the one an inline panel stands in.
 */
@Component({
  imports: [PctMenu, PctMenuItem],
  template: `<button id="before">before</button>
    <pct-menu
      inline
      [(open)]="open"
      ariaLabel="Commands"
      (closed)="reasons.push($event)"
    >
      <button
        id="rename"
        pctMenuItem
        [disabled]="blocked()"
        (click)="chosen.push('rename')"
      >
        Rename
      </button>
      <button id="duplicate" pctMenuItem (click)="chosen.push('duplicate')">
        Duplicate
      </button>
      <button id="delete" pctMenuItem>Delete</button>
    </pct-menu>
    <button id="after">after</button>`,
})
class InlineHost {
  readonly open = signal(true);
  readonly blocked = signal(false);
  readonly reasons: PctMenuCloseReason[] = [];
  readonly chosen: string[] = [];
}

/**
 * The menu the mode was asked for: a layer on a narrow screen and a region on a wide one, with
 * the trigger drawn on the same condition that leaves `inline` off — which is the arrangement
 * the dev-mode report below has to stay quiet about.
 */
@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `@if (!inline()) {
      <button id="trigger" [pctMenuTrigger]="menu">Actions</button>
    }
    <pct-menu
      #menu
      [inline]="inline()"
      [(open)]="open"
      (closed)="reasons.push($event)"
    >
      <button id="rename" pctMenuItem>Rename</button>
      <button id="delete" pctMenuItem>Delete</button>
    </pct-menu>`,
})
class ResponsiveHost {
  readonly inline = signal(false);
  readonly open = signal(false);
  readonly reasons: PctMenuCloseReason[] = [];
}

/** A control announcing a popup for a panel that never pops up — the pair that cannot be meant. */
@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `<button id="trigger" [pctMenuTrigger]="menu">Actions</button>
    <pct-menu #menu inline [(open)]="open"
      ><button pctMenuItem>Rename</button></pct-menu
    >`,
})
class InlineWithTriggerHost {
  readonly open = signal(false);
}

/** A docked column with a way further in: the submenu is a layer, hanging off an inline row. */
@Component({
  imports: [PctMenu, PctMenuItem, PctMenuTrigger],
  template: `<pct-menu inline [(open)]="open" ariaLabel="Commands">
    <button id="first" pctMenuItem>Rename</button>
    <button id="into" pctMenuItem [pctMenuTrigger]="sub">Move to</button>
    <pct-menu #sub placement="end">
      <button id="inbox" pctMenuItem (click)="chosen.push('inbox')">
        Inbox
      </button>
    </pct-menu>
  </pct-menu>`,
})
class InlineNestedHost {
  readonly open = signal(true);
  readonly chosen: string[] = [];
}

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

  describe('inline: the panel as a region of the page', () => {
    /** The three commands, in the order they were written, as the page's Tab sees them. */
    const tabIndexes = () =>
      ['rename', 'duplicate', 'delete'].map((id) =>
        byId(id)?.getAttribute('tabindex'),
      );

    it('draws the panel in the host, where the consumer wrote it', async () => {
      const fixture = await render(InlineHost);

      const panel = inlinePanel(fixture);
      expect(panel).not.toBeNull();
      expect(panel?.parentElement?.tagName.toLowerCase()).toBe('pct-menu');
      // Nothing was lifted off the page: no overlay was ever created for it.
      expect(overlayPanels()).toHaveLength(0);
      expect(document.querySelectorAll('[data-pct-part="panel"]')).toHaveLength(
        1,
      );
    });

    /**
     * It is the SAME template, not a second panel written for the mode — which is the defect
     * the whole change exists to avoid, and the one that would give a consumer's stylesheet a
     * panel it does not match and a screen reader a role it does not carry.
     */
    it('and it is the same panel: one role, one part, one id, the commands its own children', async () => {
      const fixture = await render(InlineHost);
      const panel = inlinePanel(fixture);

      expect(panel?.className).toBe('pct-menu__panel');
      expect(panel?.getAttribute('data-pct-part')).toBe('panel');
      expect(panel?.getAttribute('role')).toBe('menu');
      expect(panel?.id).toMatch(/^pct-menu-\d+-panel$/);
      expect(panel?.getAttribute('aria-label')).toBe('Commands');
      expect(Array.from(panel?.children ?? []).map((el) => el.id)).toEqual([
        'rename',
        'duplicate',
        'delete',
      ]);
    });

    /**
     * The property the mode exists for, measured the way the server measures it: `ngServerMode`
     * is the flag Angular's own `afterNextRender` reads, and this component's browser-only gate
     * is that call. A panel that waited for a render is missing from the HTML the server sends
     * — which is exactly what the overlay does, asserted here beside it so that the two claims
     * are one measurement.
     */
    it('is in the markup a server sends, where the layer sends none', async () => {
      const flags = globalThis as { ngServerMode?: boolean };
      flags.ngServerMode = true;
      try {
        const region = await render(InlineHost);
        const layer = await render(Host);
        layer.componentInstance.open.set(true);
        await settle(layer);

        expect(inlinePanel(region)?.textContent).toContain('Rename');
        expect(
          Array.from(inlinePanel(region)?.children ?? []).map((el) => el.id),
        ).toEqual(['rename', 'duplicate', 'delete']);
        expect(overlayPanels()).toHaveLength(0);
        expect(inlinePanel(layer)).toBeNull();
      } finally {
        flags.ngServerMode = false;
      }
    });

    it('a closed inline menu renders nothing at all', async () => {
      const fixture = await render(InlineHost);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(inlinePanel(fixture)).toBeNull();
      expect(document.querySelectorAll('[data-pct-part="item"]')).toHaveLength(
        0,
      );
    });

    /**
     * The close still says so, and says it once. It is the one thing the overlay used to carry
     * that a rendered panel cannot do for itself — and `api` is the only reason an inline menu
     * ever has, because nothing else closes it.
     */
    it('the application closing it says `api`, once, and it opens again after', async () => {
      const fixture = await render(InlineHost);
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['api']);

      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(inlinePanel(fixture)).not.toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    /**
     * The close is a transition and not a state: an inline menu is asked about its openness on
     * every pass of the effect that watches it, and one that has always been shut has closed
     * nothing. Without the distinction a menu would announce a close at bootstrap, to an
     * application that had never opened it.
     */
    it('and one that was never open says nothing', async () => {
      const fixture = await render(ResponsiveHost);
      fixture.componentInstance.inline.set(true);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual([]);

      // …and that silence is not a menu whose close was never wired: the same one, opened and
      // shut, says it once.
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    it('a chosen command runs and leaves the column standing', async () => {
      const fixture = await render(InlineHost);

      byId('duplicate')?.click();
      await settle(fixture);

      expect(fixture.componentInstance.chosen).toEqual(['duplicate']);
      expect(fixture.componentInstance.open()).toBe(true);
      expect(inlinePanel(fixture)).not.toBeNull();
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('Tab walks out of it instead of closing it', async () => {
      const fixture = await render(InlineHost);
      const first = byId('rename') as HTMLElement;
      first.focus();

      const event = press(first, 'Tab');
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(inlinePanel(fixture)).not.toBeNull();
      expect(fixture.componentInstance.open()).toBe(true);
    });

    /**
     * Neither Escape nor a press outside is the inline panel's to answer: the first arrived
     * through the closing stack, which only attached overlays are on, and the second through a
     * dispatcher that has no panel of ours to be outside of. What would be left if the panel
     * read the key itself is a region of the page that vanishes with no way to bring it back.
     */
    it('Escape and a press outside dismiss nothing', async () => {
      const fixture = await render(InlineHost);
      const first = byId('rename') as HTMLElement;
      first.focus();

      const event = press(first, 'Escape');
      escape();
      pressOn(byId('after') as HTMLElement);
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(inlinePanel(fixture)).not.toBeNull();
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    describe('the Tab stop', () => {
      /**
       * The one thing the mode adds rather than drops. Over a layer no command is a Tab stop
       * (0031); inline every command being one would make the menu as many Tab presses wide as
       * it has rows, and none being one would make it a region no keyboard could reach.
       */
      it('is exactly one command inline, and none at all over a layer', async () => {
        const region = await render(InlineHost);
        expect(tabIndexes()).toEqual(['0', '-1', '-1']);

        region.destroy();
        const layer = await render(Host);
        await open(layer);
        expect(tabIndexes()).toEqual(['-1', '-1', '-1']);
      });

      it('follows the walk, so leaving and coming back lands where the user was', async () => {
        const fixture = await render(InlineHost);
        const first = byId('rename') as HTMLElement;
        first.focus();

        press(first, 'ArrowDown');
        await settle(fixture);

        expect(focused()?.id).toBe('duplicate');
        expect(tabIndexes()).toEqual(['-1', '0', '-1']);
      });

      /**
       * A `0` on a disabled `<button>` is a stop the platform will not stand on, so the menu
       * would drop out of the page's tab order behind it — which is the same defect as having
       * no stop at all, arrived at from the other side.
       */
      it('hands itself on rather than sit on a command the platform will not focus', async () => {
        const fixture = await render(InlineHost);
        (byId('rename') as HTMLElement).focus();
        await settle(fixture);
        expect(tabIndexes()).toEqual(['0', '-1', '-1']);

        fixture.componentInstance.blocked.set(true);
        await settle(fixture);

        // The disabled command keeps its `-1`: it is off the tab order either way, and what
        // moved is the `0` — onto the first command the platform will actually stand on.
        expect(tabIndexes()).toEqual(['-1', '0', '-1']);
      });
    });

    describe('the walk, which the mode keeps', () => {
      /**
       * The Tab stop and the walk have to agree, or the first arrow after tabbing in steps onto
       * the command the user is already standing on: the shared walk starts at "nowhere", and a
       * movement from nowhere goes to the edge it comes from.
       */
      it('starts where the page’s Tab left the user, not at the top', async () => {
        const fixture = await render(InlineHost);
        const second = byId('duplicate') as HTMLElement;
        second.focus();

        press(second, 'ArrowDown');
        await settle(fixture);

        expect(focused()?.id).toBe('delete');
      });

      /** A focus that landed on no command is not a walk to nowhere: the panel's own padding. */
      it('and a focus on the panel itself leaves the cursor where it stands', async () => {
        const fixture = await render(InlineHost);
        const panel = inlinePanel(fixture) as HTMLElement;
        (byId('duplicate') as HTMLElement).focus();

        panel.focus();
        press(panel, 'ArrowDown');
        await settle(fixture);

        expect(focused()?.id).toBe('delete');
      });

      it('the letters and the ends still move it', async () => {
        const fixture = await render(InlineHost);
        const first = byId('rename') as HTMLElement;
        first.focus();

        press(first, 'd');
        await settle(fixture);
        expect(focused()?.id).toBe('duplicate');

        press(focused() as HTMLElement, 'End');
        await settle(fixture);
        expect(focused()?.id).toBe('delete');
      });
    });

    describe('a way further in', () => {
      it('opens on a layer, and choosing there leaves the column standing', async () => {
        const fixture = await render(InlineNestedHost);
        const into = byId('into') as HTMLElement;
        into.focus();

        press(into, 'ArrowRight');
        await settle(fixture);
        expect(overlayPanels()).toHaveLength(1);
        expect(focused()?.id).toBe('inbox');

        byId('inbox')?.click();
        await settle(fixture);

        expect(fixture.componentInstance.chosen).toEqual(['inbox']);
        expect(overlayPanels()).toHaveLength(0);
        expect(inlinePanel(fixture)).not.toBeNull();
        expect(fixture.componentInstance.open()).toBe(true);
        // The page is not left with focus on `body`: there is no control to hand it back to,
        // and the command the user walked in from is still on the screen.
        expect(focused()?.id).toBe('into');
      });

      /**
       * The direction is read at the keypress here rather than kept from an opening, because
       * an inline panel never had one — and it is read off the panel, which is in the page and
       * therefore inherits it.
       */
      it('and in a right-to-left page the arrows swap', async () => {
        const fixture = await render(InlineNestedHost);
        const panel = inlinePanel(fixture) as HTMLElement;
        panel.style.direction = 'rtl';
        const into = byId('into') as HTMLElement;
        into.focus();

        press(into, 'ArrowLeft');
        await settle(fixture);

        expect(overlayPanels()).toHaveLength(1);
        expect(focused()?.id).toBe('inbox');
      });
    });

    describe('what it is reported for, and what it is not', () => {
      it('an inline menu with no trigger is not reported: it has none by construction', async () => {
        const warn = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => undefined);
        const fixture = await render(InlineHost);
        await settle(fixture);

        expect(warn).not.toHaveBeenCalled();

        // …and the same silence has not swallowed the report the layer needs.
        const orphan = await render(NoTriggerHost);
        orphan.componentInstance.open.set(true);
        await settle(orphan);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });

      it('a control for an inline menu is reported: it announces a popup that never pops up', async () => {
        const warn = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => undefined);
        const fixture = await render(InlineWithTriggerHost);
        await settle(fixture);

        expect(warn).toHaveBeenCalled();
        const said = String(warn.mock.calls[0]?.[0] ?? '');
        expect(said).toContain('inline menu');
        expect(said).toContain('never pops up');
        warn.mockRestore();
      });

      it('and the responsive arrangement is not: the control goes with the layer', async () => {
        const warn = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => undefined);
        const fixture = await render(ResponsiveHost);
        await open(fixture);

        fixture.componentInstance.inline.set(true);
        await settle(fixture);

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    });

    describe('the mode changing under a standing panel', () => {
      it('a layer that becomes a region takes itself down and keeps its commands', async () => {
        const fixture = await render(ResponsiveHost);
        await open(fixture);
        expect(overlayPanels()).toHaveLength(1);

        fixture.componentInstance.inline.set(true);
        await settle(fixture);

        expect(overlayPanels()).toHaveLength(0);
        const panel = inlinePanel(fixture);
        expect(panel).not.toBeNull();
        expect(Array.from(panel?.children ?? []).map((el) => el.id)).toEqual([
          'rename',
          'delete',
        ]);
      });

      it('and a region that becomes a layer goes back onto one', async () => {
        const fixture = await render(ResponsiveHost);
        fixture.componentInstance.inline.set(true);
        await open(fixture);
        expect(inlinePanel(fixture)).not.toBeNull();

        fixture.componentInstance.inline.set(false);
        await settle(fixture);

        expect(inlinePanel(fixture)).toBeNull();
        expect(overlayPanels()).toHaveLength(1);
        expect(
          Array.from(overlayPanels()[0].children).map((el) => el.id),
        ).toEqual(['rename', 'delete']);
      });

      /**
       * What a layer hands a panel is what the tree stopped handing it (`lesson-35`); a region
       * is back in the tree, so keeping any of it would pin the panel to the theme of wherever
       * it last popped up.
       */
      it('and gives back nothing the layer had handed it', async () => {
        const fixture = await render(ResponsiveHost);
        (fixture.nativeElement as HTMLElement).setAttribute(
          'data-theme',
          'brand',
        );
        await open(fixture);
        expect(overlayPanels()[0].getAttribute('data-theme')).toBe('brand');

        fixture.componentInstance.inline.set(true);
        await settle(fixture);

        expect(inlinePanel(fixture)?.getAttribute('data-theme')).toBeNull();
        expect(inlinePanel(fixture)?.style.fontFamily).toBe('');
      });
    });
  });
});
