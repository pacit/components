import {
  ApplicationRef,
  Component,
  Provider,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  PCT_REGIONS,
  providePctTexts,
  type PctRegion,
  type PctRegionsApi,
} from '@pacit/components/core';
import { providePctToastConfig } from './toast';
import { PctToaster } from './toaster';

@Component({ template: `<p>a page</p>` })
class Host {}

/**
 * A toaster on a page that has been rendered — which is the only kind there is. The service is
 * injected BEFORE the first render on purpose: the viewport is created by that render, and a
 * spec that reversed the two would be testing a component nobody built.
 */
async function boot(providers: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const toaster = TestBed.inject(PctToaster);
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return { toaster, fixture };
}

const region = () =>
  document.body.querySelector('pct-toast-viewport') as HTMLElement | null;

const items = () =>
  Array.from(document.querySelectorAll('[data-pct-part="item"]'));

const texts = () =>
  items().map((item) =>
    item.querySelector('[data-pct-part="message"]')?.textContent?.trim(),
  );

/**
 * A synchronous render of everything attached, and deliberately not `whenStable()`: half of
 * this file runs under fake timers, and Angular's own scheduling is `setTimeout` — a spec that
 * waited for stability there would wait for a clock it had stopped itself.
 */
function flush(): void {
  TestBed.inject(ApplicationRef).tick();
}

describe('PctToaster', () => {
  describe('the region', () => {
    it('is opened by a render, empty, before anything has to be said', async () => {
      await boot();

      const viewport = region();
      expect(viewport).not.toBeNull();
      expect(viewport?.parentElement).toBe(document.body);
      expect(items()).toEqual([]);
    });

    it('is a log and writes none of what the role already publishes', async () => {
      await boot();
      const viewport = region();

      expect(viewport?.getAttribute('role')).toBe('log');
      // Measured in chromium's own accessibility tree: `log` publishes `live=polite`,
      // `atomic=false`, `relevant="additions text"`. Writing them here would be three
      // attributes restating the engine, and one of them (`atomic`) is the value the
      // reflex — `role="status"` — gets wrong for a stack (0039, 0044).
      expect(viewport?.getAttribute('aria-live')).toBeNull();
      expect(viewport?.getAttribute('aria-atomic')).toBeNull();
      expect(viewport?.getAttribute('aria-relevant')).toBeNull();
    });

    it('stands at the end of both axes where no configuration says otherwise', async () => {
      // The one case that boots with no `providePctToastConfig` at all: everywhere else
      // the host writes the placement, so the defaults the token carries are exercised
      // here or nowhere.
      await boot();

      expect(region()?.getAttribute('data-pct-block')).toBe('end');
      expect(region()?.getAttribute('data-pct-inline')).toBe('end');
    });

    it('stands where the configuration puts it', async () => {
      await boot([providePctToastConfig({ block: 'start', inline: 'center' })]);

      expect(region()?.getAttribute('data-pct-block')).toBe('start');
      expect(region()?.getAttribute('data-pct-inline')).toBe('center');
    });

    it('takes its place in the top layer, and takes it again with every message', async () => {
      // jsdom implements no popover at all, so the two methods are lent to it: what is being
      // measured is the SEQUENCE this service performs, not the platform's own behaviour —
      // that half is `apps/sandbox-e2e/src/toast.spec.ts`, where a message raised over a
      // modal can be pressed through its veil.
      const calls: string[] = [];
      const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
      proto['showPopover'] = function (this: HTMLElement) {
        calls.push('show');
      };
      proto['hidePopover'] = function (this: HTMLElement) {
        calls.push('hide');
      };
      try {
        const { toaster } = await boot();
        // Shown empty: a region the user agent has closed is `display: none`, and a
        // `display: none` live region is absent from the accessibility tree.
        expect(calls).toEqual(['show']);
        expect(region()?.getAttribute('popover')).toBe('manual');

        toaster.show('One');
        toaster.show('Two');
        flush();

        // Hidden and shown again per message: the top layer orders by when a thing was
        // shown, so being last is the only way of being on top.
        expect(calls).toEqual(['show', 'hide', 'show', 'hide', 'show']);
      } finally {
        delete proto['showPopover'];
        delete proto['hidePopover'];
      }
    });

    it('gives the top layer up rather than leave a stack nobody can see', async () => {
      const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
      proto['showPopover'] = function () {
        throw new Error('not here');
      };
      try {
        await boot();

        // The attribute goes with it: left behind, the user agent's own rule for a closed
        // popover would hide the region — and a message nobody sees is worse than one under
        // a dialog.
        expect(region()?.getAttribute('popover')).toBeNull();
      } finally {
        delete proto['showPopover'];
      }
    });

    it('goes with the application that opened it', async () => {
      await boot();
      expect(region()).not.toBeNull();

      TestBed.resetTestingModule();

      expect(region()).toBeNull();
    });
  });

  describe('a message', () => {
    it('appears in the region, in the order it was raised', async () => {
      const { toaster } = await boot();

      toaster.show('Draft saved.');
      toaster.show('Second.');
      flush();

      expect(texts()).toEqual(['Draft saved.', 'Second.']);
      expect(items()[0].closest('pct-toast-viewport')).toBe(region());
    });

    it('is not an alert unless it is urgent', async () => {
      const { toaster } = await boot();

      toaster.show('Draft saved.');
      toaster.show({ text: 'Could not save.', urgent: true });
      flush();

      expect(items()[0].getAttribute('role')).toBeNull();
      expect(items()[1].getAttribute('role')).toBe('alert');
    });

    it('draws a tone as a mark and a state attribute, or as nothing at all', async () => {
      const { toaster } = await boot();

      // Four at a time and not five: the stack is capped, and a fifth message would push the
      // first one out from under the assertions below.
      toaster.show({ text: 'Could not save.', tone: 'danger' });
      toaster.show({ text: 'Half the rows imported.', tone: 'warning' });
      toaster.show({ text: 'Backup finished.', tone: 'success' });
      toaster.show({ text: 'A new version is available.', tone: 'info' });
      flush();

      for (const [i, tone] of [
        'danger',
        'warning',
        'success',
        'info',
      ].entries()) {
        const item = items()[i];
        expect(item.getAttribute('data-pct-tone')).toBe(tone);
        // The drawing is the half a colour cannot carry — a reader who does not separate red
        // from green, or a forced palette that throws both away, still has the shape. One
        // name per tone and one path per name: a set that resolved to one icon would be a
        // colour again.
        const icon = item.querySelector('[data-pct-part="icon"]');
        expect(icon?.getAttribute('name')).toBe(tone);
        expect(icon?.querySelectorAll('svg')).toHaveLength(1);
      }
    });

    it('draws no mark and writes no attribute when a message has no tone', async () => {
      const { toaster } = await boot();

      // The absence IS the neutral, which is why the union has no member for it: a consumer
      // who never thought about tones ships exactly the message they shipped before.
      toaster.show('Draft saved.');
      flush();

      expect(items()[0].hasAttribute('data-pct-tone')).toBe(false);
      expect(items()[0].querySelector('[data-pct-part="icon"]')).toBeNull();
    });

    it('keeps urgency and tone apart, because they answer different questions', async () => {
      const { toaster } = await boot();

      // What INTERRUPTS and what HAPPENED are two facts: a failure a user can deal with later
      // is `danger` and not urgent, and a session about to expire interrupts whatever its tone.
      toaster.show({ text: 'Could not save.', tone: 'danger' });
      toaster.show({ text: 'Session expires in a minute.', urgent: true });
      flush();

      expect(items()[0].getAttribute('role')).toBeNull();
      expect(items()[0].getAttribute('data-pct-tone')).toBe('danger');
      expect(items()[1].getAttribute('role')).toBe('alert');
      expect(items()[1].hasAttribute('data-pct-tone')).toBe(false);
    });

    it('carries the cross, named through PCT_TEXTS', async () => {
      const { toaster } = await boot([
        providePctTexts({ toastDismiss: 'Take it down' }),
      ]);

      toaster.show('Draft saved.');
      flush();

      const close = items()[0].querySelector('[data-pct-part="close"]');
      expect(close?.getAttribute('aria-label')).toBe('Take it down');
    });

    /**
     * The same name with NOBODY providing one, which the case above cannot see: a host that
     * overrides a default is a host that never observes it.
     *
     * It is here because of what its absence cost. `toastDismiss`'s own default was the one
     * mutant in `core/src/texts.ts` that no assertion in the library reached, so it was killed
     * by a TIMEOUT or not at all — and the file's score read `100.00` or `96.77` for the same
     * sources depending on what else the machine was doing (plan §4.2, third reading). One
     * assertion is the third option that item says does not exist, and for this mutant it does:
     * a string default is trivially assertable, so the clock stops counting towards the score.
     */
    it('and the cross keeps its English name when nobody provides one', async () => {
      const { toaster } = await boot();

      toaster.show('Draft saved.');
      flush();

      const close = items()[0].querySelector('[data-pct-part="close"]');
      expect(close?.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('draws an action only when there is one', async () => {
      const { toaster } = await boot();

      toaster.show('Nothing to do.');
      toaster.show({
        text: 'Deleted.',
        action: { label: 'Undo', run: () => undefined },
      });
      flush();

      expect(items()[0].querySelector('[data-pct-part="action"]')).toBeNull();
      expect(
        items()[1]
          .querySelector('[data-pct-part="action"]')
          ?.textContent?.trim(),
      ).toBe('Undo');
    });

    it('is taken down by its cross', async () => {
      const { toaster } = await boot();
      toaster.show('Draft saved.');
      flush();

      (
        items()[0].querySelector('[data-pct-part="close"]') as HTMLElement
      ).click();
      flush();

      expect(items()).toEqual([]);
    });

    it('runs its action and goes, in that order for the caller and this one for the list', async () => {
      const { toaster } = await boot();
      let seen: number | null = null;
      toaster.show({
        text: 'Deleted.',
        action: { label: 'Undo', run: () => (seen = items().length) },
      });
      flush();

      (
        items()[0].querySelector('[data-pct-part="action"]') as HTMLElement
      ).click();
      flush();

      expect(items()).toEqual([]);
      // The message is gone from the list BEFORE the callback runs, so an action that raises
      // a toast of its own does not push its own message over the limit.
      expect(seen).toBe(1);
    });

    it('can be taken back by whoever raised it, and twice is not an error', async () => {
      const { toaster } = await boot();
      const ref = toaster.show('Connecting…');
      flush();

      ref.dismiss();
      ref.dismiss();
      flush();

      expect(items()).toEqual([]);
    });
  });

  describe('the clock', () => {
    it('takes a notice down after its duration', async () => {
      const { toaster } = await boot();
      vi.useFakeTimers();
      try {
        toaster.show({ text: 'Draft saved.', duration: 1000 });
        flush();
        expect(texts()).toEqual(['Draft saved.']);

        vi.advanceTimersByTime(999);
        flush();
        expect(texts()).toEqual(['Draft saved.']);

        vi.advanceTimersByTime(1);
        flush();
        expect(items()).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('uses the configured default when the message names none', async () => {
      const { toaster } = await boot([
        providePctToastConfig({ duration: 200 }),
      ]);
      vi.useFakeTimers();
      try {
        toaster.show('Draft saved.');
        flush();

        vi.advanceTimersByTime(200);
        flush();

        expect(items()).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('never runs for a standing message — an action, or an urgent one', async () => {
      const { toaster } = await boot([
        providePctToastConfig({ duration: 100 }),
      ]);
      vi.useFakeTimers();
      try {
        toaster.show({
          text: 'Deleted.',
          action: { label: 'Undo', run: () => undefined },
        });
        toaster.show({ text: 'Could not save.', urgent: true });
        toaster.show({ text: 'Connecting…', duration: null });
        flush();

        vi.advanceTimersByTime(60_000);
        flush();

        expect(texts()).toEqual(['Deleted.', 'Could not save.', 'Connecting…']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops while the pointer is in the stack and starts again when it leaves', async () => {
      const { toaster } = await boot();
      vi.useFakeTimers();
      try {
        toaster.show({ text: 'Draft saved.', duration: 1000 });
        flush();

        vi.advanceTimersByTime(600);
        region()?.dispatchEvent(new Event('pointerenter'));
        expect(toaster.paused).toBe(true);

        vi.advanceTimersByTime(60_000);
        flush();
        expect(texts()).toEqual(['Draft saved.']);

        region()?.dispatchEvent(new Event('pointerleave'));
        expect(toaster.paused).toBe(false);
        // What is left of the clock and not a fresh one: 400 ms had not run yet.
        vi.advanceTimersByTime(399);
        flush();
        expect(texts()).toEqual(['Draft saved.']);

        vi.advanceTimersByTime(1);
        flush();
        expect(items()).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops while the keyboard is in the stack, and moving within it is not a departure', async () => {
      const { toaster } = await boot();
      vi.useFakeTimers();
      try {
        toaster.show({
          text: 'Deleted.',
          action: { label: 'Undo', run: () => undefined },
        });
        toaster.show({ text: 'Draft saved.', duration: 1000 });
        flush();

        const action = items()[0].querySelector(
          '[data-pct-part="action"]',
        ) as HTMLElement;
        const close = items()[0].querySelector(
          '[data-pct-part="close"]',
        ) as HTMLElement;

        region()?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        expect(toaster.paused).toBe(true);

        // From the action to the cross: the same stack, so the clocks stay stopped.
        region()?.dispatchEvent(
          new FocusEvent('focusout', { bubbles: true, relatedTarget: close }),
        );
        expect(toaster.paused).toBe(true);
        expect(action).not.toBeNull();

        // Out of the stack altogether.
        region()?.dispatchEvent(
          new FocusEvent('focusout', {
            bubbles: true,
            relatedTarget: document.body,
          }),
        );
        expect(toaster.paused).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('is not left held by a stack that has emptied under the pointer', async () => {
      const { toaster } = await boot();
      vi.useFakeTimers();
      try {
        const ref = toaster.show({ text: 'Draft saved.', duration: 1000 });
        flush();

        region()?.dispatchEvent(new Event('pointerenter'));
        expect(toaster.paused).toBe(true);

        // The cross is pressed with the pointer still over it, and the element that would
        // have fired `pointerleave` is gone with the message.
        ref.dismiss();
        flush();

        expect(toaster.paused).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('the stack', () => {
    it('drops the oldest message over the limit', async () => {
      const { toaster } = await boot([providePctToastConfig({ limit: 2 })]);

      toaster.show({ text: 'One', duration: null });
      toaster.show({ text: 'Two', duration: null });
      toaster.show({ text: 'Three', duration: null });
      flush();

      expect(texts()).toEqual(['Two', 'Three']);
    });

    it('is emptied in one call', async () => {
      const { toaster } = await boot();
      toaster.show({ text: 'One', duration: null });
      toaster.show({ text: 'Two', duration: null });
      flush();

      toaster.clear();
      flush();

      expect(items()).toEqual([]);
    });
  });

  /**
   * The stack as a region of the page (plan 4.16, 0072).
   *
   * The cycle is FAKED here rather than installed: the real one has its own cases in
   * `@pacit/components/regions`, and what is on trial in this file is the three lines the
   * viewport spends on a mechanism that may not be there at all. Three engines already walk
   * the working cycle end to end in `apps/sandbox-e2e`; what a browser cannot enumerate is the
   * branches — a key nobody chose, a key that is not this one, a modifier held, an event
   * somebody already answered — and those are what a stack that took F6 from an application
   * would break on.
   */
  describe('the region cycle', () => {
    /** A cycle an application installed, faked down to what the stack actually asks of it. */
    function fakeCycle(over: Partial<PctRegionsApi> = {}) {
      const registered = signal<readonly PctRegion[]>([]);
      const asked: (Element | null)[] = [];
      let released = 0;

      const api: PctRegionsApi = {
        regions: registered,
        key: signal<string | null>('F6'),
        useKey: () => undefined,
        register: (place: PctRegion) => {
          registered.update((all) => [...all, place]);
          return () => {
            released += 1;
          };
        },
        next: (from: Element | null) => {
          asked.push(from);
          return true;
        },
        ...over,
      };

      return {
        providers: [{ provide: PCT_REGIONS, useValue: api }],
        places: () => registered(),
        asked,
        released: () => released,
      };
    }

    const press = (key: string, init: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      region()?.dispatchEvent(event);
      return event;
    };

    it('registers the stack, under the label a reader hears on arrival', async () => {
      const cycle = fakeCycle();
      await boot([
        ...cycle.providers,
        providePctTexts({ toastRegion: 'Alerts' }),
      ]);

      expect(cycle.places()).toHaveLength(1);
      expect(cycle.places()[0].element).toBe(region());
      // The label is a signal reading the texts service, not a string captured in a
      // constructor — so it says what the region SAYS, and both readings are the same one.
      expect(cycle.places()[0].label()).toBe('Alerts');
      expect(region()?.getAttribute('aria-label')).toBe('Alerts');
    });

    it('gives the place back when the application that opened it goes', async () => {
      const cycle = fakeCycle();
      await boot(cycle.providers);
      expect(cycle.released()).toBe(0);

      TestBed.resetTestingModule();

      expect(cycle.released()).toBe(1);
    });

    it('answers the key the consumer chose, from inside a stack the press cannot leave', async () => {
      const cycle = fakeCycle();
      await boot(cycle.providers);
      document.body.focus();

      const event = press('F6');

      // Identity, not equality: two DOM nodes compared structurally is a walk of the whole
      // document, and what the claim is about is WHICH element the cycle was handed.
      expect(cycle.asked).toHaveLength(1);
      expect(cycle.asked[0]).toBe(document.activeElement);
      expect(event.defaultPrevented).toBe(true);
    });

    it('answers no other key, and no key under a modifier', async () => {
      const cycle = fakeCycle();
      await boot(cycle.providers);

      expect(press('F7').defaultPrevented).toBe(false);
      expect(press('F6', { altKey: true }).defaultPrevented).toBe(false);
      expect(press('F6', { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(press('F6', { metaKey: true }).defaultPrevented).toBe(false);
      expect(cycle.asked).toEqual([]);
    });

    it('leaves an event somebody has already answered alone', async () => {
      const cycle = fakeCycle();
      await boot(cycle.providers);

      const event = new KeyboardEvent('keydown', {
        key: 'F6',
        bubbles: true,
        cancelable: true,
      });
      event.preventDefault();
      region()?.dispatchEvent(event);

      expect(cycle.asked).toEqual([]);
    });

    it('takes no keystroke while nobody has chosen a key', async () => {
      const cycle = fakeCycle({ key: signal<string | null>(null) });
      await boot(cycle.providers);

      expect(press('F6').defaultPrevented).toBe(false);
      expect(cycle.asked).toEqual([]);
    });

    it('leaves the event alone when the cycle had nowhere to go', async () => {
      const cycle = fakeCycle({ next: () => false });
      await boot(cycle.providers);

      expect(press('F6').defaultPrevented).toBe(false);
    });

    /**
     * The reading 0072 exists for: no `providePctRegions()` anywhere, so `PCT_REGIONS` is
     * `null`, the constructor is three lines that do nothing, and F6 does here exactly what it
     * did before any of this was written.
     */
    it('registers nothing and takes nothing when no cycle was installed', async () => {
      await boot();

      expect(region()).not.toBeNull();
      expect(press('F6').defaultPrevented).toBe(false);
    });
  });
});
