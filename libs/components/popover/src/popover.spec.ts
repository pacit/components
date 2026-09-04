import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctPlacement } from '@pacit/components/core';
import { PctPopover, PctPopoverTrigger } from './popover';
import { PctPopoverCloseReason } from './popover.types';

/** The panel renders in a CDK overlay — outside the component's tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const part = (name: string) =>
  document.querySelector(`[data-pct-part="${name}"]`) as HTMLElement | null;

const byId = (id: string) => document.getElementById(id) as HTMLElement | null;

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
function escape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(event);
  return event;
}

/**
 * The road an outside press takes, and it is a `click` rather than a `pointerdown`: the
 * dependency records where the press began and decides on the click that follows, so a
 * selection dragged out of a panel does not dismiss it. The listener sits on `body` in the
 * capture phase, which is why this reaches it from an element inside.
 */
function pressOn(element: Element): void {
  element.dispatchEvent(
    new MouseEvent('pointerdown', { bubbles: true, composed: true }),
  );
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
}

/** A Tab pressed on `from`, forwards or backwards. */
function tab(from: Element, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  from.dispatchEvent(event);
  return event;
}

@Component({
  imports: [PctPopover, PctPopoverTrigger],
  template: `<button id="elsewhere">elsewhere</button>
    <button id="trigger" [pctPopoverTrigger]="pop">Filters</button>
    <pct-popover
      #pop
      [(open)]="open"
      [heading]="heading()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
      [placement]="placement()"
      (closed)="reasons.push($event)"
    >
      <p id="content">Body</p>
      <button id="inside">inside</button>
    </pct-popover>`,
})
class Host {
  readonly open = signal(false);
  readonly heading = signal('Filters');
  readonly ariaLabel = signal('');
  readonly ariaLabelledby = signal('');
  readonly placement = signal<PctPlacement>('bottom');
  readonly reasons: PctPopoverCloseReason[] = [];
}

@Component({
  imports: [PctPopover],
  template: `<pct-popover heading="Nowhere" [(open)]="open"
    >a panel with nothing to hang off</pct-popover
  >`,
})
class NoTriggerHost {
  readonly open = signal(false);
}

@Component({
  imports: [PctPopover, PctPopoverTrigger],
  template: `@if (first()) {
      <button id="first" [pctPopoverTrigger]="pop">first</button>
    }
    @if (second()) {
      <button id="second" [pctPopoverTrigger]="pop">second</button>
    }
    <pct-popover #pop heading="Filters" [(open)]="open">body</pct-popover>`,
})
class TwoTriggersHost {
  readonly first = signal(true);
  readonly second = signal(false);
  readonly open = signal(false);
}

/**
 * The inline shape, and the wrapper is part of the measurement: `#column` is where the consumer
 * wrote the component, and that is where the panel has to be found. `open` starts true, because
 * the property the input exists for is a panel that is already there.
 */
@Component({
  imports: [PctPopover, PctPopoverTrigger],
  template: `<button id="elsewhere">elsewhere</button>
    <button id="trigger" [pctPopoverTrigger]="pop">Filters</button>
    <div id="column">
      <pct-popover
        #pop
        [inline]="inline()"
        [(open)]="open"
        heading="Filters"
        (closed)="reasons.push($event)"
      >
        <button id="inside">inside</button>
      </pct-popover>
    </div>
    <button id="after">after</button>`,
})
class InlineHost {
  readonly inline = signal(true);
  readonly open = signal(true);
  readonly reasons: PctPopoverCloseReason[] = [];
}

/**
 * The shape the input was added for: a column of the page with no control to open it at all.
 * `inline` stands as a bare attribute, which is the other half of what `booleanAttribute` is
 * for — a consumer who never writes an expression.
 */
@Component({
  imports: [PctPopover],
  template: `<pct-popover inline [heading]="heading()" [(open)]="open"
    >a column of the page</pct-popover
  >`,
})
class InlineNoTriggerHost {
  readonly heading = signal('Filters');
  readonly open = signal(true);
}

describe('PctPopover', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  const open = async (fixture: ComponentFixture<Host>) => {
    fixture.componentInstance.open.set(true);
    await settle(fixture);
  };

  describe('what renders, and when', () => {
    it('a closed popover puts nothing in the document', async () => {
      const fixture = await render(Host);
      expect(panel()).toBeNull();
      // The host is in the tree and draws nothing — it is what the panel reads its theme,
      // typeface and writing direction from when it opens.
      expect(fixture.nativeElement.querySelector('pct-popover')).not.toBeNull();
    });

    /**
     * The one attribute that says what this component is. `role="dialog"` it shares with the
     * modal; `aria-modal` is what it must NOT carry — the page behind is live, and an
     * attribute claiming otherwise is a lie told to the one user who cannot see that it is.
     */
    it('opening attaches a dialog panel that is not modal', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(panel()).not.toBeNull();
      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-modal')).toBeNull();
    });

    it('the content the consumer wrote is projected into the panel', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(part('content')?.querySelector('#content')?.textContent).toBe(
        'Body',
      );
    });

    it('closing takes the panel out again', async () => {
      const fixture = await render(Host);
      await open(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(panel()).toBeNull();
    });

    it('a popover destroyed while open leaves nothing behind', async () => {
      const fixture = await render(Host);
      await open(fixture);
      fixture.destroy();

      expect(panel()).toBeNull();
    });
  });

  describe('the trigger', () => {
    it('says what it opens, and points at it only while it is up', async () => {
      const fixture = await render(Host);
      const trigger = byId('trigger');

      expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.getAttribute('aria-controls')).toBeNull();

      await open(fixture);

      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      expect(trigger?.getAttribute('aria-controls')).toBe(panel()?.id);
      expect(panel()?.id).toBeTruthy();
    });

    it('a press opens it and a second press closes it', async () => {
      const fixture = await render(Host);
      byId('trigger')?.click();
      await settle(fixture);
      expect(fixture.componentInstance.open()).toBe(true);

      byId('trigger')?.click();
      await settle(fixture);
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['trigger']);
    });

    /**
     * The defect the guard in `attach` exists for. The dependency's outside-press listener
     * sits on `body` in the CAPTURE phase, so it sees this click BEFORE the trigger's own
     * handler does — a popover that dismissed itself there would be re-opened on the way back
     * up, and the control that opened it could never shut it
     * ([`lesson-93`](../../../../docs/lessons.md#lesson-93)).
     */
    it('the press that closes it from the trigger is not also an outside press', async () => {
      const fixture = await render(Host);
      await open(fixture);

      pressOn(byId('trigger') as Element);
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['trigger']);
      expect(panel()).toBeNull();
    });
  });

  describe('the accessible name', () => {
    it('the heading names the popover', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const headingId = part('heading')?.id;
      expect(headingId).toBeTruthy();
      expect(panel()?.getAttribute('aria-labelledby')).toBe(headingId);
    });

    it('ariaLabel names a popover with no heading', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('');
      fixture.componentInstance.ariaLabel.set('Filters');
      await open(fixture);

      expect(part('heading')).toBeNull();
      expect(panel()?.getAttribute('aria-label')).toBe('Filters');
      expect(panel()?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('ariaLabelledby wins over the heading — ARIA’s order, not ours', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabelledby.set('content');
      await open(fixture);

      expect(panel()?.getAttribute('aria-labelledby')).toBe('content');
    });

    it('an open popover with no name at all is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('');
      await open(fixture);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );
      warn.mockRestore();
    });
  });

  describe('focus goes in', () => {
    /**
     * Onto the PANEL and not onto the button inside it. The panel is what carries the role and
     * the name, so it is what a screen reader announces on arrival; landing on the first
     * control skips that and starts the user in the middle of something nobody named.
     */
    it('the panel takes focus itself, not the first control in it', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(document.activeElement).toBe(panel());
      expect(panel()?.getAttribute('tabindex')).toBe('-1');
    });

    it('and comes back to the trigger on Escape', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const event = escape();
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['escape']);
      expect(document.activeElement).toBe(byId('trigger'));
    });

    /**
     * The page behind a popover is live, so Escape can be pressed by somebody who has already
     * clicked into it — the closing stack delivers the key wherever focus is. Pulling focus
     * back to the trigger then would take it off what they were doing.
     */
    it('and stays where it is when Escape came from outside the panel', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const elsewhere = byId('elsewhere');
      elsewhere?.focus();
      escape();
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(false);
      expect(document.activeElement).toBe(elsewhere);
    });
  });

  /**
   * **What jsdom can say here and what it cannot.** Which elements Tab can reach is the
   * dependency's `InteractivityChecker`, and it asks whether an element has a box — jsdom
   * runs no layout, so nothing in the panel is focusable there and every Tab is a Tab out.
   * That makes these cases the measurement of the EDGE (a Tab that leaves closes the panel
   * and hands focus back) and leaves the choice of edge to `popover.spec.ts` in the e2e
   * suite, which has an engine under it.
   */
  describe('Tab walks out', () => {
    it('closes the panel and hands focus back to the trigger', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const event = tab(panel() as Element);
      await settle(fixture);

      // The browser's own move is refused: focus is spliced back onto the trigger, and the
      // next Tab carries on from the control the panel belongs to.
      expect(event.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['away']);
      expect(document.activeElement).toBe(byId('trigger'));
    });

    it('backwards out of the panel is the same way out', async () => {
      const fixture = await render(Host);
      await open(fixture);

      tab(panel() as Element, true);
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['away']);
      expect(document.activeElement).toBe(byId('trigger'));
    });

    it('any other key is left alone', async () => {
      const fixture = await render(Host);
      await open(fixture);

      panel()?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      );
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(true);
    });
  });

  describe('a press outside', () => {
    it('closes it, and leaves focus where the press put it', async () => {
      const fixture = await render(Host);
      await open(fixture);

      pressOn(byId('elsewhere') as Element);
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['outside']);
      expect(document.activeElement).not.toBe(byId('trigger'));
    });

    it('a press inside the panel changes nothing', async () => {
      const fixture = await render(Host);
      await open(fixture);

      pressOn(byId('inside') as Element);
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(true);
    });
  });

  describe('the reason it closed', () => {
    it('a value written from outside is `api`, and says so once', async () => {
      const fixture = await render(Host);
      await open(fixture);

      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    it('closing a popover that was never open says nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('the next close starts from `api` again', async () => {
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

  describe('the trigger registration', () => {
    it('a popover opened with no trigger shows nothing, and says why', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(NoTriggerHost);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no trigger'));
      warn.mockRestore();
    });

    /**
     * The other half of `lesson-68`, one component over: a trigger inside an `@if` is
     * destroyed and built again, and a contract with only the half that speaks would report
     * that ordinary page as two triggers fighting over one panel.
     */
    it('the same trigger built again is not a second trigger', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(TwoTriggersHost);

      fixture.componentInstance.first.set(false);
      await settle(fixture);
      fixture.componentInstance.first.set(true);
      await settle(fixture);

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('two live triggers for one panel are reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(TwoTriggersHost);

      fixture.componentInstance.second.set(true);
      await settle(fixture);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Two controls'),
      );
      warn.mockRestore();
    });

    /** A popover asked to open before its trigger exists opens the moment it does. */
    it('a popover opened before its trigger rendered waits for it', async () => {
      const fixture = await render(TwoTriggersHost);
      fixture.componentInstance.first.set(false);
      await settle(fixture);

      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(panel()).toBeNull();

      fixture.componentInstance.first.set(true);
      await settle(fixture);
      expect(panel()).not.toBeNull();
    });
  });

  /**
   * The panel drawn where the consumer wrote it. Every case below is a reading of something the
   * component does **not** do any more — the overlay was doing all of it — and each one would
   * pass by accident if the inline panel were a second copy of the markup rather than the same
   * template rendered somewhere else.
   */
  describe('drawn in the page (`inline`)', () => {
    /** The panel as the consumer's own tree holds it, which is the whole question. */
    const inColumn = (fixture: ComponentFixture<unknown>) =>
      fixture.nativeElement.querySelector(
        '#column pct-popover [data-pct-part="panel"]',
      ) as HTMLElement | null;

    /** The CDK pane an attached popover overlay is drawn in, and nothing else has. */
    const pane = () => document.querySelector('.pct-popover__pane');

    /**
     * The property the input exists for, and the server's own situation reproduced: a pass of
     * change detection over the host view and NOTHING else — no `ApplicationRef` tick, so no
     * `afterNextRender`, which is the hook that never runs on a server. The overlay half has
     * not begun at that point and never would; the inline panel is already there, because it is
     * markup of the host template gated on `inline()` and `open()` and on nothing more.
     *
     * The other half of the measurement — a real render that hydrates with no `NG05xx` — is
     * `apps/sandbox-e2e/src/hydration.spec.ts`, which has a server under it.
     */
    it('needs no browser render, where an overlay popover needs one', () => {
      const overlay = TestBed.createComponent(Host);
      overlay.componentInstance.open.set(true);
      overlay.changeDetectorRef.detectChanges();
      expect(panel()).toBeNull();
      overlay.destroy();

      const fixture = TestBed.createComponent(InlineHost);
      fixture.changeDetectorRef.detectChanges();

      expect(inColumn(fixture)).not.toBeNull();
      expect(pane()).toBeNull();
    });

    it('attaches no overlay, and the panel in the page is the only one', async () => {
      const fixture = await render(InlineHost);
      await settle(fixture);

      expect(pane()).toBeNull();
      expect(document.querySelectorAll('[data-pct-part="panel"]').length).toBe(
        1,
      );
      expect(inColumn(fixture)).toBe(panel());
      expect(part('content')?.querySelector('#inside')).not.toBeNull();
    });

    /** The role is the one thing about a popover that inline does not touch. */
    it('keeps `role="dialog"`, `tabindex="-1"` and its name', async () => {
      const fixture = await render(InlineHost);
      const drawn = inColumn(fixture);

      expect(drawn?.getAttribute('role')).toBe('dialog');
      expect(drawn?.getAttribute('tabindex')).toBe('-1');
      expect(drawn?.getAttribute('aria-modal')).toBeNull();
      expect(drawn?.getAttribute('aria-labelledby')).toBe(part('heading')?.id);
    });

    /**
     * Nothing was severed, so nothing is handed back (`lesson-35` read as an absence). The
     * attributes are the four `pctOverlayPanel` writes: on an inline panel each of them would
     * be a copy pinned over the live value it is standing in.
     */
    it('is handed nothing back, because nothing was severed', async () => {
      const fixture = await render(InlineHost);
      const drawn = inColumn(fixture);

      expect(drawn?.getAttribute('dir')).toBeNull();
      expect(drawn?.getAttribute('data-theme')).toBeNull();
      expect(drawn?.style.fontFamily).toBe('');
      expect(drawn?.style.fontSize).toBe('');
    });

    /**
     * The responsive case the input exists for, and the two defects it can produce: a panel in
     * the page with the layer still standing over it, and a `closed` for a popover that never
     * closed. It moved.
     */
    it('a popover switched between the two modes moves, and does not close', async () => {
      const fixture = await render(InlineHost);

      fixture.componentInstance.inline.set(false);
      await settle(fixture);
      expect(pane()).not.toBeNull();
      expect(inColumn(fixture)).toBeNull();
      expect(panel()?.querySelector('#inside')).not.toBeNull();

      fixture.componentInstance.inline.set(true);
      await settle(fixture);
      expect(pane()).toBeNull();
      expect(document.querySelectorAll('[data-pct-part="panel"]').length).toBe(
        1,
      );
      expect(inColumn(fixture)).toBe(panel());
      expect(panel()?.querySelector('#inside')).not.toBeNull();
      // And no reading carried back with it: a closed overlay keeps its last one, so the
      // binding has to be the mode's rather than the layer's.
      expect(panel()?.getAttribute('dir')).toBeNull();

      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /**
     * Focus into the panel is how a reader is told about something that appeared elsewhere in
     * the document. Inline it appears where the reader already is — and this is an opening,
     * not a bootstrap, so it is the moment the overlay would have moved focus.
     */
    it('does not take focus when it opens', async () => {
      const fixture = await render(InlineHost);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      byId('elsewhere')?.focus();
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(panel()).not.toBeNull();
      expect(document.activeElement).toBe(byId('elsewhere'));
    });

    /**
     * 0031's splice is for a panel that stands at the end of the document's order however near
     * its trigger it is drawn. This one stands where it looks like it stands, so a Tab that
     * closed it would be shutting the panel behind a user walking past it.
     */
    it('leaves Tab alone in both directions', async () => {
      const fixture = await render(InlineHost);

      const forwards = tab(panel() as Element);
      const backwards = tab(panel() as Element, true);
      await settle(fixture);

      expect(forwards.defaultPrevented).toBe(false);
      expect(backwards.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /** Escape is the closing stack's, and the stack has no entry for a panel never attached. */
    it('is not closed by Escape, from the document or from the panel', async () => {
      const fixture = await render(InlineHost);

      escape();
      panel()?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /** So is the outside press — and inline there is no inside and outside to tell apart. */
    it('is not closed by a press outside it', async () => {
      const fixture = await render(InlineHost);

      pressOn(byId('elsewhere') as Element);
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('closing takes the panel out at once, with no leaving state to wait out', async () => {
      const fixture = await render(InlineHost);

      fixture.componentInstance.open.set(false);
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(document.querySelector('[data-pct-leaving]')).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    it('a popover that was never shown says nothing when it is closed', async () => {
      const fixture = TestBed.createComponent(InlineHost);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /**
     * The overlay half's promise, read where there is no overlay: a popover torn down while it
     * is up says nothing, because nothing is left to hear it. The panel goes with the tree it
     * stands in rather than with a layer that has to be disposed of.
     */
    it('destroyed while open says nothing', async () => {
      const fixture = await render(InlineHost);
      expect(panel()).not.toBeNull();

      fixture.destroy();

      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /**
     * A trigger is optional inline rather than forbidden — a docked panel a button reveals is
     * an ordinary disclosure. What goes is `aria-haspopup`: nothing pops up.
     */
    it('a trigger still toggles it, and no longer claims a popup', async () => {
      const fixture = await render(InlineHost);
      const trigger = byId('trigger');

      expect(trigger?.getAttribute('aria-haspopup')).toBeNull();
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      expect(trigger?.getAttribute('aria-controls')).toBe(panel()?.id);

      trigger?.click();
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['trigger']);
      expect(trigger?.getAttribute('aria-controls')).toBeNull();
    });

    /**
     * The warning is true of an overlay and false twice over here: the panel is on the screen,
     * and the shape the input was added for has no control to open it at all.
     */
    it('says nothing about a missing trigger', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(InlineNoTriggerHost);
      await settle(fixture);

      expect(panel()).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    /** But the name is still the panel's own promise, and the role that needs it is unchanged. */
    it('still reports an inline panel with no accessible name', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(InlineNoTriggerHost);
      fixture.componentInstance.heading.set('');
      await settle(fixture);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
      );
      warn.mockRestore();
    });
  });
});
