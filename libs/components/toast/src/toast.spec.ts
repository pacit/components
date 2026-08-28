import {
  ApplicationRef,
  Component,
  Provider,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
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

    it('carries the cross, named through PCT_TEXTS', async () => {
      const { toaster } = await boot([
        providePctTexts({ toastDismiss: 'Take it down' }),
      ]);

      toaster.show('Draft saved.');
      flush();

      const close = items()[0].querySelector('[data-pct-part="close"]');
      expect(close?.getAttribute('aria-label')).toBe('Take it down');
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
});
