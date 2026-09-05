import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctDrawer } from './drawer';
import { PctDrawerTrigger } from './drawer-trigger';
import { PctDrawerCloseReason, PctDrawerSide } from './drawer.types';

/**
 * Three arrangements, and the last two are not decoration.
 *
 * The **bound** drawer has every input bound and two triggers, which is what most cases ask
 * questions of — and two rather than one because "where does focus go back to" has a different
 * answer for each, and one trigger cannot tell the right answer from the only one. The **bare**
 * drawer binds nothing at all: it is the only place the defaults of `side`, `heading`,
 * `ariaLabel`, `ariaLabelledby`, `closeButton` and `closeOnEscape` are ever observed, since a
 * host that binds an input is a host that cannot see what happens without it
 * ([`lesson-123`](../../../../docs/lessons.md#lesson-123)'s neighbour, and the shape the
 * accordion's mutation run found six times over). The **titled** one carries an `id` the
 * consumer wrote, which is the one input that is not an input.
 */
@Component({
  imports: [PctDrawer, PctDrawerTrigger],
  template: `
    <button type="button" [pctDrawerTrigger]="bound" data-testid="first">
      First
    </button>
    <button type="button" [pctDrawerTrigger]="bound" data-testid="second">
      Second
    </button>
    <pct-drawer
      #bound
      [side]="side()"
      [heading]="heading()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
      [closeButton]="closeButton()"
      [closeOnEscape]="closeOnEscape()"
      [(open)]="open"
      (closed)="reasons.set([...reasons(), $event])"
    >
      <a href="#somewhere" data-testid="inside">a link inside</a>
    </pct-drawer>

    <pct-drawer data-testid="bare">
      <button type="button" data-testid="in-bare">inside the bare one</button>
    </pct-drawer>

    <pct-drawer id="written-by-hand" data-testid="own-id">
      <p>content</p>
    </pct-drawer>
  `,
})
class Host {
  readonly side = signal<PctDrawerSide>('start');
  readonly heading = signal('');
  readonly ariaLabel = signal('');
  readonly ariaLabelledby = signal('');
  readonly closeButton = signal(true);
  readonly closeOnEscape = signal(true);
  readonly open = signal(false);
  readonly reasons = signal<readonly PctDrawerCloseReason[]>([]);
  /** The component itself — the only way to reach the public `close` a consumer would call. */
  readonly panel = viewChild.required<PctDrawer>('bound');
}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/**
 * Two passes. `present` is written from an effect and read by a host binding, so the attribute
 * a case asserts is one render behind the model it followed from.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
}

const drawer = (testid: string) =>
  document.querySelector(`pct-drawer[data-testid="${testid}"]`) as HTMLElement;

/** The one with every input bound — first in document order, and the only one with triggers. */
const bound = () => document.querySelectorAll('pct-drawer')[0] as HTMLElement;

const el = (testid: string) =>
  document.querySelector(`[data-testid="${testid}"]`) as HTMLElement;

const part = (name: string, host: HTMLElement = bound()) =>
  host.querySelector(`[data-pct-part="${name}"]`) as HTMLElement | null;

/** An Escape as it really arrives: on the element that has focus, bubbling to the host. */
function escape(from: Element): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  from.dispatchEvent(event);
  return event;
}

describe('PctDrawer', () => {
  describe('what the tag carries', () => {
    it('is a named region, shut and still findable', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      await settle(fixture);

      const host = bound();
      expect(host.getAttribute('role')).toBe('region');
      expect(host.getAttribute('hidden')).toBe('until-found');
      expect(host.getAttribute('data-pct-open')).toBeNull();
      expect(host.getAttribute('data-pct-side')).toBe('start');
      expect(host.getAttribute('aria-labelledby')).toBe(
        part('heading')?.id ?? '',
      );
    });

    it('takes the id the consumer wrote and generates one otherwise', async () => {
      await render(Host);

      expect(drawer('own-id').id).toBe('written-by-hand');
      expect(drawer('bare').id).toMatch(/^pct-drawer-\d+$/);
      expect(drawer('bare').id).not.toBe(bound().id);
    });

    it('the side is bound and logical', async () => {
      const fixture = await render(Host);
      for (const side of ['start', 'end', 'top', 'bottom'] as const) {
        fixture.componentInstance.side.set(side);
        await settle(fixture);
        expect(bound().getAttribute('data-pct-side')).toBe(side);
      }
    });

    it('a bare drawer takes every default: start, a cross, no name', async () => {
      await render(Host);
      const bare = drawer('bare');

      expect(bare.getAttribute('data-pct-side')).toBe('start');
      // `open`'s own default, which the bound drawer cannot show: a host that binds an input
      // is a host that cannot see what happens without it.
      expect(bare.getAttribute('hidden')).toBe('until-found');
      expect(bare.getAttribute('data-pct-open')).toBeNull();
      expect(bare.getAttribute('aria-label')).toBeNull();
      expect(bare.getAttribute('aria-labelledby')).toBeNull();
      expect(part('close', bare)).not.toBeNull();
      expect(part('heading', bare)).toBeNull();
    });
  });

  describe('the accessible name', () => {
    it('a heading names the region', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      await settle(fixture);

      const heading = part('heading');
      expect(heading?.textContent?.trim()).toBe('Sections');
      expect(heading?.id).toMatch(/^pct-drawer-\d+-heading$/);
      expect(bound().getAttribute('aria-labelledby')).toBe(heading?.id);
      expect(bound().getAttribute('aria-label')).toBeNull();
    });

    it('ariaLabel names a drawer with no heading', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabel.set('Notes');
      await settle(fixture);

      expect(bound().getAttribute('aria-label')).toBe('Notes');
      expect(bound().getAttribute('aria-labelledby')).toBeNull();
      expect(part('heading')).toBeNull();
    });

    it('ariaLabelledby wins over the heading it would otherwise point at', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      fixture.componentInstance.ariaLabelledby.set('somewhere-else');
      await settle(fixture);

      expect(bound().getAttribute('aria-labelledby')).toBe('somewhere-else');
    });

    it('an open drawer with no name at all is reported in dev mode', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      // The whole sentence, not a word of it: a message assembled from four strings can lose
      // any one of them and still contain the word somebody happened to assert on.
      expect(warn.mock.calls[0][0]).toBe(
        '[pct-drawer] An open drawer with no accessible name. Give it a `heading`, or ' +
          '`ariaLabel`/`ariaLabelledby` when the name already stands somewhere in the ' +
          'content. A region without one is not a landmark a screen reader can offer — it ' +
          'is announced as "region" and the user has to read the panel to find out what it ' +
          'is.',
      );
      warn.mockRestore();
    });

    it('and any one of the three names silences it', async () => {
      for (const name of ['heading', 'ariaLabel', 'ariaLabelledby'] as const) {
        const warn = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => undefined);
        const fixture = await render(Host);
        fixture.componentInstance[name].set('Sections');
        fixture.componentInstance.open.set(true);
        await settle(fixture);

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
        TestBed.resetTestingModule();
      }
    });

    it('and a drawer nobody has opened says nothing, named or not', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      await render(Host);

      // Three unnamed drawers stand in this fixture and not one of them is open.
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  /**
   * `position: fixed` means the window — unless an ancestor says otherwise, and the drawer
   * cannot undo that: what it does is say so. jsdom has no layout, so the platform's answer
   * (`offsetParent`, null for a panel the window holds and the catching ancestor otherwise —
   * measured in three engines, `drawer.spec.ts` in `sandbox-e2e`) is DOCTORED here, and what
   * these cases hold is the sentence: whole, with the ancestor and the reason named.
   */
  describe('the containing block', () => {
    const quiet = () =>
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    /** The platform's answer, written by hand: `offsetParent` of the bound drawer. */
    function caughtBy(ancestor: HTMLElement | null): void {
      Object.defineProperty(bound(), 'offsetParent', {
        configurable: true,
        get: () => ancestor,
      });
    }

    function ancestor(style: string, id = ''): HTMLElement {
      const el = document.createElement('div');
      if (id) el.id = id;
      el.style.cssText = style;
      document.body.appendChild(el);
      return el;
    }

    afterEach(() => {
      document.body.style.cssText = '';
      for (const el of Array.from(document.body.querySelectorAll('div[id]')))
        el.remove();
    });

    it('a drawer an ancestor has caught is reported in dev mode, with the ancestor and the reason named', async () => {
      const warn = quiet();
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      caughtBy(ancestor('transform: translateX(10px)', 'card'));
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      // The whole sentence, for the reason the unnamed case gives.
      expect(warn.mock.calls[0][0]).toBe(
        '[pct-drawer] An open drawer docked to <div#card> and not to the window: that ' +
          'ancestor establishes a containing block (`transform: translateX(10px)`), and ' +
          '`position: fixed` docks to it. Move the drawer out from under it, or take the ' +
          'property off — a transform, a filter, `contain: paint`, ' +
          '`content-visibility: auto` or a `will-change` naming one of them is enough.',
      );
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('and the reason is read off the ancestor — or left out when nothing readable is on it', async () => {
      const reasons: ReadonlyArray<readonly [style: string, named: string]> = [
        ['contain: paint', ' (`contain: paint`)'],
        ['filter: blur(2px)', ' (`filter: blur(2px)`)'],
        ['will-change: transform', ' (`will-change: transform`)'],
        // An ancestor the platform says caught the panel with nothing this reader knows:
        // the report is one clause shorter, not absent.
        ['color: red', ''],
      ];
      for (const [style, named] of reasons) {
        const warn = quiet();
        const fixture = await render(Host);
        fixture.componentInstance.heading.set('Sections');
        caughtBy(ancestor(style));
        fixture.componentInstance.open.set(true);
        await settle(fixture);

        expect(warn.mock.calls[0][0]).toContain(
          `<div> and not to the window: that ancestor establishes a containing block${named}, and`,
        );
        warn.mockRestore();
        TestBed.resetTestingModule();
      }
    });

    it('and a drawer the window holds says nothing', async () => {
      const warn = quiet();
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      // jsdom's own answer is the window's: null, the same value an engine gives.
      expect(bound().offsetParent).toBeNull();
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('and <body> is named only with a reason read off it', async () => {
      // Chromium answers `<body>` for a `zoom` above the drawer while the panel stays at the
      // window — so the body alone is not a report, and the body with a transform is.
      const warn = quiet();
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      caughtBy(document.body);
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();

      document.body.style.transform = 'translateX(10px)';
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(
        'docked to <body> and not to the window: that ancestor establishes a containing block (`transform: translateX(10px)`)',
      );
      warn.mockRestore();
    });
  });

  describe('the trigger', () => {
    it('says aria-expanded about itself and points at the panel either way', async () => {
      const fixture = await render(Host);
      const first = el('first');

      expect(first.getAttribute('aria-expanded')).toBe('false');
      // The opposite of the popover's rule: the panel is in the document while shut, so the
      // reference resolves and is worth writing.
      expect(first.getAttribute('aria-controls')).toBe(bound().id);

      first.click();
      await settle(fixture);

      expect(first.getAttribute('aria-expanded')).toBe('true');
      expect(el('second').getAttribute('aria-expanded')).toBe('true');
      expect(bound().getAttribute('data-pct-open')).toBe('');
      expect(bound().getAttribute('hidden')).toBeNull();
    });

    it('a second press closes it, and says which press that was', async () => {
      const fixture = await render(Host);
      el('first').click();
      await settle(fixture);
      el('first').click();
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons()).toEqual(['trigger']);
      expect(bound().getAttribute('hidden')).toBe('until-found');
    });
  });

  describe('the ways out', () => {
    it('the cross closes it and carries a name from PCT_TEXTS', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      const close = part('close') as HTMLButtonElement;
      expect(close.getAttribute('aria-label')).toBe('Close');

      close.click();
      await settle(fixture);
      expect(fixture.componentInstance.reasons()).toEqual(['close']);
    });

    it('closeButton=false draws no cross, and no header at all with nothing else in it', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.closeButton.set(false);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(part('close')).toBeNull();
      expect(part('header')).toBeNull();
    });

    it('a heading with no cross keeps the header row', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.heading.set('Sections');
      fixture.componentInstance.closeButton.set(false);
      await settle(fixture);

      expect(part('header')).not.toBeNull();
      expect(part('heading')?.textContent?.trim()).toBe('Sections');
      expect(part('close')).toBeNull();
    });

    it('Escape inside closes it, and the key is taken', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      const event = escape(el('inside'));
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.open()).toBe(false);
      expect(fixture.componentInstance.reasons()).toEqual(['escape']);
    });

    it('closeOnEscape=false leaves the key to the page', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.closeOnEscape.set(false);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      const event = escape(el('inside'));
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.reasons()).toEqual([]);
    });

    it('a value written from outside closes with no reason of its own', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons()).toEqual(['api']);
    });

    it('closing what was never open is not an event', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons()).toEqual([]);
      expect(bound().getAttribute('hidden')).toBe('until-found');
    });

    it('close() on a shut drawer is a no-op, and does not poison the next reason', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.panel().close('close');
      await settle(fixture);

      expect(fixture.componentInstance.reasons()).toEqual([]);
      expect(fixture.componentInstance.open()).toBe(false);

      // The half a returned-early call could still get wrong: a reason written while shut
      // would be the one reported by the NEXT close, whatever really caused it.
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);
      expect(fixture.componentInstance.reasons()).toEqual(['api']);
    });

    it('a reason is spent once — the close after it is `api` again', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);
      escape(el('inside'));
      await settle(fixture);

      fixture.componentInstance.open.set(true);
      await settle(fixture);
      fixture.componentInstance.open.set(false);
      await settle(fixture);

      expect(fixture.componentInstance.reasons()).toEqual(['escape', 'api']);
    });

    it('Escape on a shut drawer changes nothing', async () => {
      const fixture = await render(Host);
      const event = escape(bound());
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.reasons()).toEqual([]);
    });
  });

  describe('where the keyboard goes back to', () => {
    it('to the control that opened it, and not to the one that registered last', async () => {
      const fixture = await render(Host);

      el('second').focus();
      el('second').click();
      await settle(fixture);

      el('inside').focus();
      escape(el('inside'));
      await settle(fixture);

      expect(document.activeElement).toBe(el('second'));
    });

    it('and nowhere at all when there was no trigger to go back to', async () => {
      // The bare drawer is deliberately unnamed, so opening it says so; that is another
      // case's subject and only noise here.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const fixture = await render(Host);
      // The bare drawer has no `pctDrawerTrigger` anywhere: it is opened by find-in-page and
      // shut by a key, so `openedBy` is null at the one moment the code reads it. This is also
      // where `closeOnEscape`'s own default is observed — the bound drawer binds it.
      drawer('bare').dispatchEvent(new Event('beforematch', { bubbles: true }));
      await settle(fixture);

      const inside = el('in-bare');
      inside.focus();
      expect(drawer('bare').contains(document.activeElement)).toBe(true);

      escape(inside);
      await settle(fixture);

      expect(drawer('bare').getAttribute('data-pct-open')).toBeNull();
      // Nothing moved it: with no trigger there is nowhere to send the keyboard, and the
      // close must not reach for one. The browser takes focus off it a moment later, when
      // `hidden` lands and the subtree stops being rendered — which is the platform's job
      // and not this component's.
      expect(document.activeElement).toBe(inside);
      warn.mockRestore();
    });

    it('and nowhere at all when focus was not inside', async () => {
      const fixture = await render(Host);
      el('first').click();
      await settle(fixture);

      el('second').focus();
      // The page behind is live, so a user who has already clicked into it is left alone.
      escape(bound());
      await settle(fixture);

      expect(document.activeElement).toBe(el('second'));
      expect(fixture.componentInstance.open()).toBe(false);
    });
  });

  describe('the text that stays in the document', () => {
    it('a reveal by find-in-page opens it rather than being undone', async () => {
      const fixture = await render(Host);
      expect(bound().getAttribute('hidden')).toBe('until-found');

      bound().dispatchEvent(new Event('beforematch', { bubbles: true }));
      await settle(fixture);

      expect(fixture.componentInstance.open()).toBe(true);
      expect(bound().getAttribute('hidden')).toBeNull();
    });
  });

  describe('the strings', () => {
    it('providePctTexts swaps the cross’s name', async () => {
      TestBed.configureTestingModule({
        providers: [providePctTexts({ drawerClose: 'Shut' })],
      });
      const fixture = await render(Host);
      fixture.componentInstance.open.set(true);
      await settle(fixture);

      expect(part('close')?.getAttribute('aria-label')).toBe('Shut');
    });
  });
});
