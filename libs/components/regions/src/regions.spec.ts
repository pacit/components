import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PCT_REGIONS } from '@pacit/components/core';
import { PctRegionDirective, PctRegionKey, providePctRegions } from './regions';

describe('@pacit/components/regions', () => {
  /**
   * The region cycle: the mechanism a keyboard reaches a place by when the reading order puts
   * that place somewhere else (plan 4.16, 0072).
   *
   * What these cases hold is the half the library ships. The other half — WHICH key — is the
   * consumer's, and the one case that says so is the one that presses F6 with nothing mounted
   * and watches nothing happen.
   */
  describe('PctRegions', () => {
    @Component({
      imports: [PctRegionDirective, PctRegionKey],
      template: `<div pctRegionKey [key]="key()" data-testid="app">
        <nav pctRegion="Navigation" data-testid="nav">
          <a href="#a">One</a>
        </nav>
        <main pctRegion="Main" data-testid="main">
          <button type="button">Two</button>
        </main>
      </div>`,
    })
    class Page {
      readonly key = signal('F6');
    }

    /** A stack outside the element the key is mounted on — the toast's own situation. */
    @Component({
      imports: [PctRegionDirective],
      template: `<aside pctRegion="Notifications" data-testid="aside"></aside>`,
    })
    class Outside {}

    /**
     * Binds nothing: `pctRegionKey` and no more, which is what a consumer writes first. `Page`
     * above binds `[key]`, and a bound input is never the default — so this is the only host on
     * which the shipped answers to "which key" and "listening where" can be read at all.
     */
    @Component({
      imports: [PctRegionDirective, PctRegionKey],
      template: `<div pctRegionKey data-testid="app">
        <nav pctRegion="Navigation" data-testid="nav">
          <a href="#a">One</a>
        </nav>
        <main pctRegion="Main" data-testid="main">
          <button type="button">Two</button>
        </main>
      </div>`,
    })
    class BarePage {}

    /** The other seat of the same directive, and the one the sandbox uses. */
    @Component({
      imports: [PctRegionDirective, PctRegionKey],
      template: `<div pctRegionKey listenOn="document" data-testid="app">
        <nav pctRegion="Navigation" data-testid="nav">
          <a href="#a">One</a>
        </nav>
        <main pctRegion="Main" data-testid="main">
          <button type="button">Two</button>
        </main>
      </div>`,
    })
    class DocumentPage {}

    /**
     * A region that arrives after the one below it in the document — the `@if` the class comment
     * names, and the only arrangement in which "the document's order" and "the order they
     * registered in" are two different answers.
     */
    @Component({
      imports: [PctRegionDirective],
      template: `@if (early()) {
          <nav pctRegion="Navigation" data-testid="nav"></nav>
        }
        <main pctRegion="Main" data-testid="main"></main>`,
    })
    class LatePage {
      readonly early = signal(false);
    }

    /** The key mounted over nothing at all. */
    @Component({
      imports: [PctRegionKey],
      template: `<div pctRegionKey data-testid="app"></div>`,
    })
    class NoRegions {}

    /** A region the consumer has already made focusable, on their own terms. */
    @Component({
      imports: [PctRegionDirective, PctRegionKey],
      template: `<div pctRegionKey data-testid="app">
        <nav pctRegion="Navigation" tabindex="0" data-testid="nav"></nav>
      </div>`,
    })
    class OwnTabIndex {}

    const at = (testid: string) =>
      document.querySelector<HTMLElement>(`[data-testid="${testid}"]`)!;

    const press = (
      key: string,
      target: EventTarget | null = document.activeElement,
      init: KeyboardEventInit = {},
    ) =>
      target?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );

    /** A change and the render that follows it, for a case that toggles an `@if`. */
    const settle = async (fixture: ComponentFixture<unknown>) => {
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const render = async <T>(type: Type<T>) => {
      const fixture = TestBed.createComponent(type);
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    };

    beforeEach(() => {
      TestBed.configureTestingModule({
        // The mechanism is a provider an application installs, so the cases install it — all but
        // one, which takes it out again to prove what a page without it does (0072).
        providers: [provideZonelessChangeDetection(), providePctRegions()],
      });
    });

    it('walks the regions in the document’s order and wraps at the end', async () => {
      await render(Page);
      const regions = TestBed.inject(PCT_REGIONS)!;
      expect(regions.regions().map((r) => r.label())).toEqual([
        'Navigation',
        'Main',
      ]);

      // From nowhere in particular, the first; then the next; then round.
      expect(regions.next(null)).toBe(true);
      expect(document.activeElement).toBe(at('nav'));
      regions.next(document.activeElement);
      expect(document.activeElement).toBe(at('main'));
      regions.next(document.activeElement);
      expect(document.activeElement).toBe(at('nav'));
    });

    it('lands on the region itself, out of the tab order', async () => {
      await render(Page);
      TestBed.inject(PCT_REGIONS)!.next(null);

      // A region is a place, not a control: the user arrives at it and walks it with Tab.
      // `-1` is what makes that possible without adding a stop of its own.
      expect(at('nav').getAttribute('tabindex')).toBe('-1');
      expect(document.activeElement).toBe(at('nav'));
    });

    it('answers the key on the element it was mounted on, and the key is an input', async () => {
      const fixture = await render(Page);
      press('F6', at('app'));
      expect(document.activeElement).toBe(at('nav'));

      fixture.componentInstance.key.set('F8');
      fixture.detectChanges();
      await fixture.whenStable();

      press('F6', at('app'));
      expect(document.activeElement).toBe(at('nav'));
      press('F8', at('app'));
      expect(document.activeElement).toBe(at('main'));
    });

    it('takes no keystroke from an application that never offered one', async () => {
      // The decision, as a case. With no `pctRegionKey` anywhere the regions still register —
      // a stack is a region whether or not anybody cycles — and F6 does what it always did.
      await render(Outside);
      const regions = TestBed.inject(PCT_REGIONS)!;
      expect(regions.regions()).toHaveLength(1);
      expect(regions.key()).toBeNull();

      at('aside').ownerDocument.body.focus();
      press('F6', at('aside'));
      expect(document.activeElement).not.toBe(at('aside'));
    });

    it('lets go of a region whose element has gone', async () => {
      const fixture = await render(Page);
      expect(TestBed.inject(PCT_REGIONS)!.regions()).toHaveLength(2);
      fixture.destroy();
      expect(TestBed.inject(PCT_REGIONS)!.regions()).toHaveLength(0);
    });

    it('lets go of ONE region and keeps the rest', async () => {
      // The remover has to be the region's own. A teardown that empties the list passes the
      // case above and loses a page's other regions the first time an `@if` closes.
      const fixture = await render(LatePage);
      fixture.componentInstance.early.set(true);
      await settle(fixture);
      expect(TestBed.inject(PCT_REGIONS)!.regions()).toHaveLength(2);

      fixture.componentInstance.early.set(false);
      await settle(fixture);

      const left = TestBed.inject(PCT_REGIONS)!.regions();
      expect(left).toHaveLength(1);
      expect(left[0].label()).toBe('Main');
    });

    it('reads the order off the document and not off the registrations', async () => {
      // The `@if` the class comment names: `Navigation` registers SECOND and stands FIRST,
      // because a region that arrives late is still where it is on the page. A comparator that
      // kept the order it was handed would answer this backwards and nothing else would notice.
      const fixture = await render(LatePage);
      expect(
        TestBed.inject(PCT_REGIONS)!
          .regions()
          .map((r) => r.label()),
      ).toEqual(['Main']);

      fixture.componentInstance.early.set(true);
      await settle(fixture);

      expect(
        TestBed.inject(PCT_REGIONS)!
          .regions()
          .map((r) => r.label()),
      ).toEqual(['Navigation', 'Main']);
    });

    it('has nowhere to go on a page with no regions, and says so', async () => {
      await render(NoRegions);
      const regions = TestBed.inject(PCT_REGIONS)!;
      expect(regions.regions()).toEqual([]);
      expect(regions.next(null)).toBe(false);

      // And the key is left to the application: nothing moved, so nothing was answered.
      expect(press('F6', at('app'))).toBe(true);
    });

    it('leaves a tabindex the consumer wrote where it is', async () => {
      // `-1` is what a place needs to be landed on. A place the consumer has already put IN the
      // tab order is a decision, and overwriting it would take a stop off their page.
      await render(OwnTabIndex);
      TestBed.inject(PCT_REGIONS)!.next(null);

      expect(at('nav').getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(at('nav'));
    });

    it('a consumer who binds nothing gets F6, on this element and not on the document', async () => {
      await render(BarePage);
      const regions = TestBed.inject(PCT_REGIONS)!;

      // The default key, read where it can be read: the service carries it for the parts of the
      // library standing outside this element, so the default is API and not an implementation.
      expect(regions.key()).toBe('F6');

      // `host` is the default seat, and it has the hole its own comment names: a press that
      // never reaches the element is a press this directive never sees.
      document.body.focus();
      press('F6', document);
      expect(document.activeElement).not.toBe(at('nav'));

      press('F6', at('app'));
      expect(document.activeElement).toBe(at('nav'));
    });

    it('answers the key on the document when the consumer says the word', async () => {
      // The other seat, and the reason it exists: on a cold page focus is on `body`, outside
      // every element, so `host` cannot hear the first press. This can.
      await render(DocumentPage);
      document.body.focus();

      expect(press('F6', document)).toBe(false);
      expect(document.activeElement).toBe(at('nav'));
    });

    it('takes the document listener down with the element that asked for it', async () => {
      const fixture = await render(DocumentPage);
      const nav = at('nav');
      fixture.destroy();

      document.body.focus();
      expect(press('F6', document)).toBe(true);
      expect(document.activeElement).not.toBe(nav);
    });

    it('leaves alone a press somebody has already answered, and any press with a modifier', async () => {
      // Two listeners for one key is what `listenOn: 'document'` makes possible — the stack
      // answers inside itself and this steps aside. And a modifier means the user asked the
      // browser for something, not us.
      await render(BarePage);

      const answered = new KeyboardEvent('keydown', {
        key: 'F6',
        bubbles: true,
        cancelable: true,
      });
      answered.preventDefault();
      at('app').dispatchEvent(answered);
      expect(document.activeElement).not.toBe(at('nav'));

      for (const modifier of ['altKey', 'ctrlKey', 'metaKey'] as const) {
        expect(press('F6', at('app'), { [modifier]: true })).toBe(true);
        expect(document.activeElement).not.toBe(at('nav'));
      }

      // And the same press without one still works, so the guard is a guard and not a wall.
      press('F6', at('app'));
      expect(document.activeElement).toBe(at('nav'));
    });
  });

  /**
   * The channel, read by an application that installed nothing — which is every application
   * until one calls `providePctRegions()`.
   *
   * This is the whole promise of 0072 and the reason the token lives in `./core` rather than a
   * service with `providedIn: 'root'`: a root service compiles to a static initialiser no
   * bundler may drop, and a cycle declared once would be a cycle every entrypoint carries,
   * measured at +19111 B (`lesson-181`). What makes that trade honest is the default being
   * `null` and not a working cycle nobody asked for — so the components that reach for it
   * (`pct-toast-viewport` is the one this was built for) find nothing and do nothing.
   */
  describe('PCT_REGIONS — the channel with nobody on it', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('resolves to null when no application installed a cycle', () => {
      expect(TestBed.inject(PCT_REGIONS)).toBeNull();
    });

    it('and to a cycle the moment one does', () => {
      TestBed.configureTestingModule({ providers: [providePctRegions()] });
      expect(TestBed.inject(PCT_REGIONS)).not.toBeNull();
      expect(TestBed.inject(PCT_REGIONS)!.key()).toBeNull();
    });
  });
});
