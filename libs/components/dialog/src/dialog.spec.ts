import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts, PctModalBackground } from '@pacit/components/core';
import { PctDialog } from './dialog';
import { PctDialogCloseReason } from './dialog.types';

/** The panel renders in a CDK overlay — outside the component's tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const part = (name: string) =>
  document.querySelector(`[data-pct-part="${name}"]`) as HTMLElement | null;

const root = () => document.documentElement;

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

@Component({
  imports: [PctDialog],
  template: `<button id="opener">open</button>
    <pct-dialog
      [(open)]="open"
      [heading]="heading()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
      [closeOnEscape]="closeOnEscape()"
      [closeOnBackdrop]="closeOnBackdrop()"
      [closeButton]="closeButton()"
      (closed)="reasons.push($event)"
    >
      <p id="content">Body</p>
      <button id="inside">inside</button>
    </pct-dialog>`,
})
class Host {
  readonly open = signal(false);
  readonly heading = signal('Delete the project?');
  readonly ariaLabel = signal('');
  readonly ariaLabelledby = signal('');
  readonly closeOnEscape = signal(true);
  readonly closeOnBackdrop = signal(true);
  readonly closeButton = signal(true);
  readonly reasons: PctDialogCloseReason[] = [];
}

@Component({
  imports: [PctDialog],
  template: `<pct-dialog [(open)]="open"
    >no bindings but the state</pct-dialog
  >`,
})
class DefaultsHost {
  readonly open = signal(false);
}

@Component({
  imports: [PctDialog],
  template: `<pct-dialog
    heading="Nothing to focus"
    [closeButton]="false"
    [(open)]="open"
    >a sentence and no controls</pct-dialog
  >`,
})
class BareHost {
  readonly open = signal(false);
}

@Component({
  imports: [PctDialog],
  template: `<pct-dialog heading="Outer" [(open)]="outer">
    <pct-dialog heading="Inner" [(open)]="inner">inner body</pct-dialog>
  </pct-dialog>`,
})
class NestedHost {
  readonly outer = signal(false);
  readonly inner = signal(false);
}

describe('PctDialog', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    // A leak here is a page that never scrolls again, and it would leak into the NEXT case
    // rather than into the one that caused it.
    root().style.overflow = '';
    root().style.paddingInlineEnd = '';
    for (const inert of Array.from(document.querySelectorAll('[inert]')))
      inert.removeAttribute('inert');
  });

  const open = async (fixture: ComponentFixture<Host>) => {
    fixture.componentInstance.open.set(true);
    await settle(fixture);
  };

  describe('what renders, and when', () => {
    it('a closed dialog puts nothing in the document', async () => {
      const fixture = await render(Host);
      expect(panel()).toBeNull();
      // The host is in the tree and draws nothing — it is what the panel reads its theme,
      // typeface and writing direction from when it opens.
      expect(fixture.nativeElement.querySelector('pct-dialog')).not.toBeNull();
    });

    it('opening attaches a panel with the modal role', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(panel()).not.toBeNull();
      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-modal')).toBe('true');
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
  });

  describe('the accessible name', () => {
    it('the heading names the dialog', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const headingId = part('heading')?.id;
      expect(headingId).toBeTruthy();
      expect(panel()?.getAttribute('aria-labelledby')).toBe(headingId);
    });

    it('ariaLabel names a dialog with no heading', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('');
      fixture.componentInstance.ariaLabel.set('Confirm');
      await open(fixture);

      expect(panel()?.getAttribute('aria-label')).toBe('Confirm');
      expect(panel()?.getAttribute('aria-labelledby')).toBeNull();
    });

    it('ariaLabelledby wins over the heading — ARIA’s order, not ours', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabelledby.set('content');
      await open(fixture);

      expect(panel()?.getAttribute('aria-labelledby')).toBe('content');
    });

    it('an open dialog with no name at all is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(Host);
        fixture.componentInstance.heading.set('');
        await open(fixture);

        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('no accessible name'),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('the defaults', () => {
    it('a dialog starts closed and answers all three ways out', async () => {
      const fixture = await render(Host);
      // Written as one case on purpose: each of the four is an input default, and a default
      // is a promise the consumer never types. `open` false is what makes the other three
      // observable at all.
      expect(fixture.componentInstance.open()).toBe(false);
      expect(panel()).toBeNull();

      await open(fixture);
      expect(part('close')).not.toBeNull();

      escape();
      await settle(fixture);
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['escape']);
    });

    it('with nothing bound but the state, every default is the generous one', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(DefaultsHost);
        // A dialog with no name is reported only once it is OPEN — a closed one shows nobody
        // anything, and a warning about it would fire on every page that merely declares one.
        expect(warn).not.toHaveBeenCalled();

        fixture.componentInstance.open.set(true);
        await settle(fixture);

        // No heading bound: the header carries the close button and nothing else, and the
        // panel is named by neither of the two ARIA inputs, both of which default to empty.
        expect(part('heading')).toBeNull();
        expect(panel()?.getAttribute('aria-label')).toBeNull();
        expect(panel()?.getAttribute('aria-labelledby')).toBeNull();
        expect(part('close')).not.toBeNull();

        escape();
        await settle(fixture);
        expect(panel()).toBeNull();
      } finally {
        warn.mockRestore();
      }
    });

    it('the veil closes a dialog that never said it should', async () => {
      const fixture = await render(DefaultsHost);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      const backdrop = part('backdrop') as HTMLElement;
      backdrop.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(panel()).toBeNull();
    });

    it('a dialog whose content has nothing focusable takes focus itself', async () => {
      const fixture = await render(BareHost);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      // The trap reports whether it found anything tabbable, and here there is nothing —
      // without the fallback focus would stay where it was, which by then is an inert
      // background. `tabindex="-1"` on the panel is what makes it an answer.
      expect(document.activeElement).toBe(panel());
    });
  });

  describe('the ways out', () => {
    it('Escape closes it, eats the key and says why', async () => {
      const fixture = await render(Host);
      await open(fixture);

      const event = escape();
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['escape']);
      // Eaten, so that a dialog inside a dialog does not close both at once.
      expect(event.defaultPrevented).toBe(true);
    });

    it('closeOnEscape=false leaves the key unanswered', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.closeOnEscape.set(false);
      await open(fixture);

      const event = escape();
      await settle(fixture);

      expect(panel()).not.toBeNull();
      expect(event.defaultPrevented).toBe(false);
    });

    it('the close button closes it and takes its name from PCT_TEXTS', async () => {
      const fixture = await render(Host);
      await open(fixture);

      expect(part('close')?.getAttribute('aria-label')).toBe('Close');
      part('close')?.click();
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['close']);
    });

    it('closeButton=false draws no button', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.closeButton.set(false);
      await open(fixture);

      expect(part('close')).toBeNull();
      // The header is still there — it carries the heading.
      expect(part('heading')).not.toBeNull();
    });

    it('a press and a click on the veil close it', async () => {
      const fixture = await render(Host);
      await open(fixture);
      const backdrop = part('backdrop') as HTMLElement;

      backdrop.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual(['backdrop']);
    });

    it('a drag that began inside the panel does not close it', async () => {
      const fixture = await render(Host);
      await open(fixture);
      const backdrop = part('backdrop') as HTMLElement;

      // The press lands on the panel; the release, on the veil. The browser reports one
      // `click` on their common ancestor — which is the veil — and closing on it throws away
      // whatever the user was selecting.
      (panel() as HTMLElement).dispatchEvent(
        new Event('pointerdown', { bubbles: true }),
      );
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(panel()).not.toBeNull();
    });

    it('closeOnBackdrop=false ignores the veil', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.closeOnBackdrop.set(false);
      await open(fixture);
      const backdrop = part('backdrop') as HTMLElement;

      backdrop.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(panel()).not.toBeNull();
    });

    it('a value written from outside closes it with the reason `api`', async () => {
      const fixture = await render(Host);
      await open(fixture);

      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['api']);
    });

    it('a close that arrives twice is not reported twice', async () => {
      const fixture = await render(Host);
      await open(fixture);

      part('close')?.click();
      await settle(fixture);
      // The second press lands on a button that is no longer in the document, but the same
      // path is reachable from a consumer holding on to the component — and a dialog that is
      // already closed has nothing to close.
      part('close')?.click();
      await settle(fixture);

      expect(fixture.componentInstance.reasons).toEqual(['close']);
    });

    it('a named dialog with one way out is reported by neither warning', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(Host);
        // Escape off, and the veil and the button still there: a dialog that insists is a
        // legitimate shape, and only all three at once is a keyboard trap.
        fixture.componentInstance.closeOnEscape.set(false);
        await open(fixture);

        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('every way out switched off at once is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(Host);
        fixture.componentInstance.closeOnEscape.set(false);
        fixture.componentInstance.closeOnBackdrop.set(false);
        fixture.componentInstance.closeButton.set(false);
        await open(fixture);

        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('all switched off'),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('the background', () => {
    it('everything that does not hold the panel goes inert, and comes back', async () => {
      const fixture = await render(Host);
      const outside = document.createElement('div');
      document.body.append(outside);
      try {
        await open(fixture);
        expect(outside.hasAttribute('inert')).toBe(true);
        // The overlay container is the one body child that keeps answering — a select panel
        // opened from inside the dialog lives there too.
        expect(panel()?.closest('[inert]')).toBeNull();

        fixture.componentInstance.open.set(false);
        await settle(fixture);
        expect(outside.hasAttribute('inert')).toBe(false);
      } finally {
        outside.remove();
      }
    });

    it('the page stops scrolling while it is up', async () => {
      const fixture = await render(Host);
      await open(fixture);
      expect(root().style.overflow).toBe('hidden');

      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(root().style.overflow).toBe('');
    });

    it('the page comes back when the dialog is destroyed while open', async () => {
      const fixture = await render(Host);
      await open(fixture);
      expect(root().style.overflow).toBe('hidden');

      fixture.destroy();
      expect(root().style.overflow).toBe('');
      expect(TestBed.inject(PctModalBackground).depth()).toBe(0);
    });

    it('a dialog inside a dialog gives the page back only once the last one closes', async () => {
      const fixture = await render(NestedHost);
      const background = TestBed.inject(PctModalBackground);

      fixture.componentInstance.outer.set(true);
      await settle(fixture);
      fixture.componentInstance.inner.set(true);
      await settle(fixture);
      expect(background.depth()).toBe(2);

      fixture.componentInstance.inner.set(false);
      await settle(fixture);
      expect(background.depth()).toBe(1);
      expect(root().style.overflow).toBe('hidden');

      fixture.componentInstance.outer.set(false);
      await settle(fixture);
      expect(background.depth()).toBe(0);
      expect(root().style.overflow).toBe('');
    });

    it('the background is released BEFORE the panel goes', async () => {
      const fixture = await render(Host);
      await open(fixture);

      // The order is the whole point: the focus trap restores focus as it is destroyed, and
      // the element it aims at sits in the background. An inert subtree refuses `focus()`, so
      // a release that came after the detach would leave focus on `body` — in a browser,
      // where `inert` does something. Here the order is what can be measured: at the moment
      // the panel leaves the document, nothing is inert any more.
      const order: string[] = [];
      const observer = new MutationObserver(() => {
        if (!panel())
          order.push(
            document.querySelector('[inert]') ? 'inert-still-on' : 'released',
          );
      });
      observer.observe(document.body, { childList: true, subtree: true });
      try {
        fixture.componentInstance.open.set(false);
        await settle(fixture);
        expect(order[0]).toBe('released');
      } finally {
        observer.disconnect();
      }
    });
  });

  describe('the strings', () => {
    it('an application’s own close label replaces the default', async () => {
      TestBed.configureTestingModule({
        providers: [providePctTexts({ dialogClose: 'Dismiss' })],
      });
      const fixture = await render(Host);
      await open(fixture);

      expect(part('close')?.getAttribute('aria-label')).toBe('Dismiss');
      // A partial override leaves the rest at the defaults.
      expect(part('heading')?.textContent?.trim()).toBe('Delete the project?');
    });
  });
});
