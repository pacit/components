import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
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

    const at = (testid: string) =>
      document.querySelector<HTMLElement>(`[data-testid="${testid}"]`)!;

    const press = (
      key: string,
      target: Element | null = document.activeElement,
    ) =>
      target?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );

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
  });
});
