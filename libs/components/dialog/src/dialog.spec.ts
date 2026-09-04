import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts, PctModalBackground } from '@pacit/components/core';
import { PctAutofocus, PctDialog } from './dialog';
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

/**
 * The inline dialog, written the way a consumer writes the shape the input exists for: one
 * component that is a layer on one screen and a section of the page on another, so `inline` is
 * BOUND rather than set. The theme on the wrapper is there to be read at an opening — it is
 * what an overlay has to be handed and what the host tree gives for nothing (`lesson-35`).
 */
@Component({
  imports: [PctDialog, PctAutofocus],
  template: `<button id="opener">open</button>
    <div data-theme="brand">
      <pct-dialog
        [inline]="inline()"
        [(open)]="open"
        [heading]="heading()"
        [closeOnEscape]="closeOnEscape()"
        [closeOnBackdrop]="closeOnBackdrop()"
        [closeButton]="closeButton()"
        (closed)="reasons.push($event)"
      >
        <p id="inline-body">Body</p>
        <button id="inline-control" pctAutofocus>inside</button>
      </pct-dialog>
    </div>`,
})
class InlineHost {
  readonly inline = signal(true);
  readonly open = signal(false);
  readonly heading = signal('Filters');
  readonly closeOnEscape = signal(true);
  readonly closeOnBackdrop = signal(true);
  readonly closeButton = signal(true);
  readonly reasons: PctDialogCloseReason[] = [];
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

  /**
   * The panel drawn where the consumer wrote the tag. Every case here is a reading of what an
   * inline dialog does **not** do — the veil, `aria-modal`, the trap, the lock and the closing
   * stack are all the layer's, and the layer is what this mode gives up. What is left is a
   * non-modal `role="dialog"`, which is a legal one, and the ways out that belong to the
   * content rather than to the overlay.
   */
  describe('inline — a section of the page, not a layer over it', () => {
    const openInline = async (fixture: ComponentFixture<InlineHost>) => {
      fixture.componentInstance.open.set(true);
      await settle(fixture);
    };

    /** The panel as the DOM around the consumer's tag holds it, not as the document holds it. */
    const inHost = (fixture: ComponentFixture<InlineHost>) =>
      fixture.nativeElement.querySelector(
        '[data-pct-part="panel"]',
      ) as HTMLElement | null;

    it('the panel is drawn in the host, and the content with it', async () => {
      const fixture = await render(InlineHost);
      await openInline(fixture);

      expect(inHost(fixture)).not.toBeNull();
      expect(inHost(fixture)?.closest('pct-dialog')).not.toBeNull();
      // The overlay's own pane carries this class and nothing else in the page does, so its
      // absence is the assertion that no overlay was created at all.
      expect(document.querySelector('.pct-dialog__pane')).toBeNull();
      expect(part('content')?.querySelector('#inline-body')?.textContent).toBe(
        'Body',
      );
    });

    it('there is no veil — the surface `closeOnBackdrop` speaks about does not exist', async () => {
      const fixture = await render(InlineHost);
      await openInline(fixture);

      expect(fixture.componentInstance.closeOnBackdrop()).toBe(true);
      expect(part('backdrop')).toBeNull();
    });

    it('the panel makes no claim about the page behind it', async () => {
      const fixture = await render(InlineHost);
      await openInline(fixture);

      // `aria-modal` says "everything else has stopped answering". Nothing has, so saying it
      // would be a lie a screen reader acts on — it is what makes a reader confine its walk.
      expect(panel()?.getAttribute('aria-modal')).toBeNull();
      expect(panel()?.getAttribute('role')).toBe('dialog');
      // `tabindex` stays: there is no trap to park focus here any more, but an application
      // that moves the keyboard to a section it has just revealed needs somewhere to move it.
      expect(panel()?.getAttribute('tabindex')).toBe('-1');
      // The heading still names it — a non-modal dialog is announced by its name like any
      // other, and this is the wiring inline keeps.
      expect(panel()?.getAttribute('aria-labelledby')).toBe(
        part('heading')?.id,
      );
    });

    it('nothing goes inert and the page goes on scrolling', async () => {
      const fixture = await render(InlineHost);
      const outside = document.createElement('div');
      document.body.append(outside);
      try {
        await openInline(fixture);

        expect(outside.hasAttribute('inert')).toBe(false);
        expect(root().style.overflow).toBe('');
        // The service is the one place a leak would survive the fixture, so it is read as
        // well as the two attributes it writes.
        expect(TestBed.inject(PctModalBackground).depth()).toBe(0);
      } finally {
        outside.remove();
      }
    });

    it('focus stays where the user left it, and `pctAutofocus` decides nothing', async () => {
      const fixture = await render(InlineHost);
      const opener = document.getElementById('opener') as HTMLElement;
      opener.focus();

      await openInline(fixture);

      // The content carries `pctAutofocus`, which is `cdkFocusInitial` — read by a focus trap
      // and by nothing else. Inline there is no trap, so nothing captures and the keyboard
      // stays with whatever the user was doing. A section of a page that grabbed focus as it
      // appeared would be the defect, not the feature.
      expect(document.activeElement).toBe(opener);
    });

    it('Escape is the closing stack’s, and an inline dialog is not in it', async () => {
      const fixture = await render(InlineHost);
      await openInline(fixture);

      const event = escape();
      await settle(fixture);

      // `closeOnEscape` is at its default `true` and the key still does nothing: it travels
      // to the top-most ATTACHED OVERLAY, and there is none. A listener above the panel would
      // answer for the page as well as for this dialog, which is the thing 0024 forbids.
      expect(fixture.componentInstance.closeOnEscape()).toBe(true);
      expect(inHost(fixture)).not.toBeNull();
      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('the close button closes it, and the reason still arrives', async () => {
      const fixture = await render(InlineHost);
      await openInline(fixture);

      part('close')?.click();
      await settle(fixture);

      // The overlay used to be what a close was read from; an inline dialog has none and
      // still closes, so `closed` had to stop being an overlay's event.
      expect(inHost(fixture)).toBeNull();
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons).toEqual(['close']);
    });

    it('a closed inline dialog draws nothing and reports nothing', async () => {
      const fixture = await render(InlineHost);

      expect(inHost(fixture)).toBeNull();
      // `open` false at the first render is not a close: nobody saw a panel, so nobody is
      // owed the reason it went.
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    /**
     * The property the whole mode exists for. `ngServerMode` is the flag Angular itself reads:
     * `afterNextRender` returns a no-op reference while it is set, which is exactly the
     * condition an overlay is never attached under. Flipping it is the closest a test without
     * a browser comes to a render on the server — and it is what makes this case fail the day
     * the inline panel starts waiting for a render it will not get.
     */
    it('an inline panel is in the markup a server sends; an overlay panel is not', async () => {
      const globals = globalThis as Record<string, unknown>;
      globals['ngServerMode'] = true;
      try {
        const inline = TestBed.createComponent(InlineHost);
        // Set before the first render: a dialog left open at bootstrap, which is the case
        // prerendering has to answer.
        inline.componentInstance.open.set(true);
        await settle(inline);

        expect(inline.nativeElement.innerHTML).toContain(
          'data-pct-part="panel"',
        );
        expect(inline.nativeElement.textContent).toContain('Filters');

        const modal = TestBed.createComponent(Host);
        modal.componentInstance.open.set(true);
        await settle(modal);

        // The other half of `req-project-ssr`, and the reason the two modes are one input
        // rather than one default: a modal sends no markup, so it hydrates no mismatch.
        expect(modal.nativeElement.innerHTML).not.toContain(
          'data-pct-part="panel"',
        );
        expect(document.querySelector('.pct-dialog__pane')).toBeNull();
      } finally {
        delete globals['ngServerMode'];
      }
    });

    it('crossing the line moves the panel and does not close the dialog', async () => {
      const fixture = await render(InlineHost);
      fixture.componentInstance.inline.set(false);
      await openInline(fixture);

      expect(document.querySelector('.pct-dialog__pane')).not.toBeNull();
      expect(panel()?.getAttribute('data-theme')).toBe('brand');
      expect(TestBed.inject(PctModalBackground).depth()).toBe(1);

      fixture.componentInstance.inline.set(true);
      await settle(fixture);

      // One panel, in the host. Two would mean the overlay was left standing beside it.
      expect(document.querySelectorAll('[data-pct-part="panel"]').length).toBe(
        1,
      );
      expect(inHost(fixture)).not.toBeNull();
      expect(document.querySelector('.pct-dialog__pane')).toBeNull();
      // Nothing was severed on this side of the line, so nothing is handed back: the theme is
      // the tree's again, and a `data-theme` frozen at the last opening would be a lie the
      // moment the page changed skin (`lesson-35` read as an absence, 0047).
      expect(panel()?.hasAttribute('data-theme')).toBe(false);
      // The page was given back with the layer, and not one render later.
      expect(TestBed.inject(PctModalBackground).depth()).toBe(0);
      expect(root().style.overflow).toBe('');
      // The dialog did not close — it changed where it draws, and a `closed` here would be an
      // event the application acts on for a reason that never happened.
      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.reasons).toEqual([]);

      fixture.componentInstance.inline.set(false);
      await settle(fixture);

      expect(document.querySelector('.pct-dialog__pane')).not.toBeNull();
      expect(inHost(fixture)).toBeNull();
      expect(fixture.componentInstance.reasons).toEqual([]);
    });

    it('every way out switched off is not reported inline — there is no trap', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(InlineHost);
        fixture.componentInstance.closeOnEscape.set(false);
        fixture.componentInstance.closeOnBackdrop.set(false);
        fixture.componentInstance.closeButton.set(false);
        await openInline(fixture);

        // The same three switches that are a WCAG 2.1.2 keyboard trap in a modal. Here two of
        // them govern nothing and the user tabs out of the panel the way they tab out of a
        // paragraph, so the warning would fire on the wide half of every responsive dialog.
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('an inline dialog with no accessible name is still reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const fixture = await render(InlineHost);
        fixture.componentInstance.heading.set('');
        await openInline(fixture);

        // The name is not the layer's — a `role="dialog"` with nothing to call it is
        // announced as "dialog" wherever it stands.
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('no accessible name'),
        );
      } finally {
        warn.mockRestore();
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
