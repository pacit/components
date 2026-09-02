import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctTab } from './tab';
import { PctTabs } from './tabs';
import { PctTabsActivation, PctTabsOrientation } from './tabs.types';

/**
 * A strip of three, the middle one optionally disabled — enough for every question the walk
 * asks: an end to come round from, a gap to skip, and a neighbour on both sides.
 */
@Component({
  imports: [PctTabs, PctTab],
  template: `
    <pct-tabs
      [(value)]="value"
      [orientation]="orientation()"
      [activation]="activation()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
    >
      @for (tab of tabs(); track tab.value) {
        <pct-tab
          [value]="tab.value"
          [label]="tab.label"
          [disabled]="tab.disabled"
        >
          <p>{{ tab.value }} content</p>
        </pct-tab>
      }
    </pct-tabs>
  `,
})
class Host {
  readonly value = signal('');
  readonly orientation = signal<PctTabsOrientation>('horizontal');
  readonly activation = signal<PctTabsActivation>('automatic');
  readonly ariaLabel = signal('Settings');
  readonly ariaLabelledby = signal('');
  readonly tabs = signal([
    { value: 'one', label: 'One', disabled: false },
    { value: 'two', label: 'Two', disabled: false },
    { value: 'three', label: 'Three', disabled: false },
  ]);
}

async function boot() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

const list = () =>
  document.querySelector('[data-pct-part="list"]') as HTMLElement;

const buttons = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-pct-part="tab"]'),
  );

const panels = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-pct-part="panel"]'));

const hiddenStates = () => panels().map((p) => p.getAttribute('hidden'));

/**
 * A key delivered the way a browser delivers one: to the element that has focus. The walk's
 * handler sits on the tab itself — a listener on the strip around it would be a handler on
 * something that cannot take focus — so a spec that dispatched on the container would be
 * testing a path no keyboard uses.
 */
const press = (key: string) =>
  (document.activeElement ?? list()).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );

const focused = () => document.activeElement as HTMLElement | null;

describe('PctTabs', () => {
  describe('what it renders', () => {
    it('draws one tab per panel, with the pattern wired both ways', async () => {
      await boot();

      expect(list().getAttribute('role')).toBe('tablist');
      expect(list().getAttribute('aria-orientation')).toBe('horizontal');
      expect(list().getAttribute('aria-label')).toBe('Settings');

      const [tab] = buttons();
      const [panel] = panels();
      expect(buttons().map((b) => b.textContent?.trim())).toEqual([
        'One',
        'Two',
        'Three',
      ]);
      expect(tab.getAttribute('role')).toBe('tab');
      expect(tab.getAttribute('type')).toBe('button');
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
      expect(panel.getAttribute('role')).toBe('tabpanel');
      expect(panel.getAttribute('tabindex')).toBe('0');
    });

    it('gives every panel an id of its own, and two of them to itself', async () => {
      await boot();

      const ids = panels().map((panel) => panel.id);
      const named = buttons().map((button) => button.id);
      // A generated id that is empty, or shared between the two ends of one relation, would
      // point `aria-controls` and `aria-labelledby` at each other and at nothing.
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(named.every((id) => id.length > 0)).toBe(true);
      expect(new Set([...ids, ...named]).size).toBe(6);
    });

    it('names the strip by `ariaLabelledby` when that is what the page has', async () => {
      const fixture = await boot();
      fixture.componentInstance.ariaLabel.set('');
      fixture.componentInstance.ariaLabelledby.set('heading-1');
      fixture.detectChanges();

      expect(list().getAttribute('aria-label')).toBeNull();
      expect(list().getAttribute('aria-labelledby')).toBe('heading-1');
    });

    it('says which axis it runs along, and the panels do not move', async () => {
      const fixture = await boot();
      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();

      expect(list().getAttribute('aria-orientation')).toBe('vertical');
      expect(
        fixture.nativeElement
          .querySelector('pct-tabs')
          .getAttribute('data-pct-orientation'),
      ).toBe('vertical');
    });
  });

  describe('a strip written with nothing but its panels', () => {
    @Component({
      imports: [PctTabs, PctTab],
      template: `
        <pct-tabs>
          <pct-tab value="a" label="A">first</pct-tab>
          <pct-tab value="b" label="B">second</pct-tab>
        </pct-tabs>
      `,
    })
    class Bare {}

    const bare = async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Bare);
      fixture.detectChanges();
      await TestBed.inject(ApplicationRef).whenStable();
      return fixture;
    };

    it('is horizontal, unnamed and chooses as it walks', async () => {
      const fixture = await bare();

      expect(list().getAttribute('aria-orientation')).toBe('horizontal');
      expect(list().getAttribute('aria-label')).toBeNull();
      expect(list().getAttribute('aria-labelledby')).toBeNull();

      const tabs = fixture.debugElement.children[0]
        .componentInstance as PctTabs;
      // The model starts empty — the fallback below is a READING of that emptiness, not a
      // value written into it.
      expect(tabs.value()).toBe('');
      expect(tabs.chosen()).toBe('a');

      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();
      expect(tabs.value()).toBe('b');
    });

    it('has nothing to show when it holds no panels at all', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.set([]);
      fixture.detectChanges();

      const tabs = fixture.debugElement.children[0]
        .componentInstance as PctTabs;
      expect(tabs.chosen()).toBe('');
      expect(buttons()).toEqual([]);
    });
  });

  describe('which panel shows', () => {
    it('falls back to the first reachable panel when the value names none', async () => {
      const fixture = await boot();

      expect(buttons()[0].getAttribute('aria-selected')).toBe('true');
      expect(hiddenStates()).toEqual([null, 'until-found', 'until-found']);
      // The fallback is a reading and not a repair: the consumer's signal is left alone.
      expect(fixture.componentInstance.value()).toBe('');
    });

    it('skips a disabled first panel when it is falling back', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'one' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();

      expect(buttons()[1].getAttribute('aria-selected')).toBe('true');
      expect(hiddenStates()).toEqual(['', null, 'until-found']);
    });

    it('shows a panel the consumer named even when it is disabled', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'two' ? { ...t, disabled: true } : t)),
      );
      fixture.componentInstance.value.set('two');
      fixture.detectChanges();

      expect(buttons()[1].getAttribute('aria-selected')).toBe('true');
      expect(hiddenStates()).toEqual(['until-found', null, 'until-found']);
    });

    it('shows a disabled FIRST panel the consumer named, rather than the one after it', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'one' ? { ...t, disabled: true } : t)),
      );
      fixture.componentInstance.value.set('one');
      fixture.detectChanges();

      // The fallback would answer `two` here, so this is the one arrangement in which
      // "a value that names a panel wins" can be told from "the first reachable panel wins".
      expect(buttons()[0].getAttribute('aria-selected')).toBe('true');
      expect(hiddenStates()).toEqual([null, 'until-found', 'until-found']);
    });

    it('shows nothing at all when every panel is out of reach', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => ({ ...t, disabled: true })),
      );
      fixture.detectChanges();

      expect(buttons().map((b) => b.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'false',
      ]);
      expect(hiddenStates()).toEqual(['', '', '']);
      // Nothing focusable, so the strip is not a Tab stop either.
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, -1, -1]);
    });

    it('hides an unreachable panel OUTRIGHT and a reachable one findably', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'three' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();

      // `until-found` is a promise of a way in; a disabled tab has none, so its panel is
      // hidden the ordinary way and find-in-page never offers it.
      expect(hiddenStates()).toEqual([null, 'until-found', '']);
    });

    it('marks the showing panel for a stylesheet as well', async () => {
      await boot();

      expect(panels().map((p) => p.getAttribute('data-pct-chosen'))).toEqual([
        '',
        null,
        null,
      ]);
    });
  });

  describe('the roving tabindex', () => {
    it('puts the one stop on the tab that is showing', async () => {
      const fixture = await boot();
      fixture.componentInstance.value.set('three');
      fixture.detectChanges();

      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
    });

    it('moves the stop off a disabled tab, so the strip stays reachable', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'two' ? { ...t, disabled: true } : t)),
      );
      fixture.componentInstance.value.set('two');
      fixture.detectChanges();

      // The disabled tab is the one showing, and it is the one tab that must not carry the
      // stop: `aria-disabled` leaves it focusable, but a walk that starts there cannot move.
      expect(buttons()[1].getAttribute('aria-selected')).toBe('true');
      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    });

    it('stays on the tab the walk reached, even when that is the first one', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.componentInstance.value.set('three');
      fixture.detectChanges();
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, -1, 0]);

      buttons()[2].focus();
      press('Home');
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    });

    it('never puts the stop on a disabled tab the user focused', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'three' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();

      // `aria-disabled` leaves the tab focusable, so a user really can land on it — and the
      // stop must not follow, or the strip loses its place in the page's tab order.
      buttons()[2].focus();
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    });

    it('is not moved by focus arriving on the strip rather than on a tab', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();

      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);

      // The strip is a scroll container, which two engines of three let take focus
      // (`lesson-126`). It names no tab, so the walk has nothing to be told by it.
      list().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('follows the walk while the strip has focus', async () => {
      await boot();
      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('goes back to the showing tab when focus leaves the strip', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();

      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);

      const outside = document.createElement('button');
      document.body.append(outside);
      list().dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: outside, bubbles: true }),
      );
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
      outside.remove();
    });

    it('does not treat a move INSIDE the strip as leaving it', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();

      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();

      list().dispatchEvent(
        new FocusEvent('focusout', {
          relatedTarget: buttons()[2],
          bubbles: true,
        }),
      );
      TestBed.inject(ApplicationRef).tick();

      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    });
  });

  describe('the keyboard', () => {
    it('walks the strip and comes round at both ends', async () => {
      await boot();
      buttons()[0].focus();

      press('ArrowRight');
      expect(focused()).toBe(buttons()[1]);
      press('ArrowRight');
      press('ArrowRight');
      expect(focused()).toBe(buttons()[0]);
      press('ArrowLeft');
      expect(focused()).toBe(buttons()[2]);
    });

    it('jumps to the ends', async () => {
      await boot();
      buttons()[0].focus();

      press('End');
      expect(focused()).toBe(buttons()[2]);
      press('Home');
      expect(focused()).toBe(buttons()[0]);
    });

    it('steps over a disabled tab', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'two' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();
      buttons()[0].focus();

      press('ArrowRight');
      expect(focused()).toBe(buttons()[2]);
    });

    it('reads the vertical axis with the vertical arrows', async () => {
      const fixture = await boot();
      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      buttons()[0].focus();

      press('ArrowDown');
      expect(focused()).toBe(buttons()[1]);
      press('ArrowUp');
      expect(focused()).toBe(buttons()[0]);
      // The horizontal arrows are the page's on a vertical strip: nothing is taken.
      press('ArrowRight');
      expect(focused()).toBe(buttons()[0]);
    });

    it('turns the arrows round under `rtl`', async () => {
      await boot();
      // The direction is read off the strip as it RESOLVES, so an inline value on that very
      // element is what a unit test can set; the page-level inheritance is measured in the
      // browser (`apps/sandbox-e2e/src/tabs.spec.ts`).
      list().style.direction = 'rtl';
      buttons()[0].focus();

      press('ArrowLeft');
      expect(focused()).toBe(buttons()[1]);
      press('ArrowRight');
      expect(focused()).toBe(buttons()[0]);
    });

    it('leaves a key it does not use to the page', async () => {
      await boot();
      buttons()[0].focus();

      const event = new KeyboardEvent('keydown', {
        key: 'PageDown',
        bubbles: true,
        cancelable: true,
      });
      document.activeElement?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(focused()).toBe(buttons()[0]);
    });

    it('takes the keys it does use', async () => {
      await boot();
      buttons()[0].focus();

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      document.activeElement?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('does nothing when there is no tab the walk may land on', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => ({ ...t, disabled: true })),
      );
      fixture.detectChanges();

      // A disabled tab keeps `aria-disabled` and therefore keeps its focusability, so the key
      // really arrives — and the walk has nowhere to go with it.
      buttons()[0].focus();
      expect(() => press('ArrowRight')).not.toThrow();
      // `Home` is the movement that really puts the cursor nowhere: it asks for the first
      // REACHABLE tab and there is none, so what follows has no tab to act on.
      expect(() => press('Home')).not.toThrow();
      expect(focused()).toBe(buttons()[0]);
      expect(fixture.componentInstance.value()).toBe('');
    });
  });

  describe('choosing', () => {
    it('chooses as the walk moves, when that is free', async () => {
      const fixture = await boot();
      buttons()[0].focus();

      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('two');
      expect(hiddenStates()).toEqual(['until-found', null, 'until-found']);
    });

    it('only moves the focus when choosing is not free', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();
      buttons()[0].focus();

      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();

      expect(focused()).toBe(buttons()[1]);
      expect(fixture.componentInstance.value()).toBe('');
      expect(buttons()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('is chosen by a press, in both modes', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();

      buttons()[2].click();
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('three');
      expect(hiddenStates()).toEqual(['until-found', 'until-found', null]);
    });

    it('refuses a press on a disabled tab', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'three' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();

      buttons()[2].click();
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('');
      expect(buttons()[2].getAttribute('aria-disabled')).toBe('true');
      expect(buttons()[2].getAttribute('data-pct-disabled')).toBe('');
      // And the walk did not follow the press either: `select` refuses the value, this
      // refuses the cursor, and the two are different halves of one refusal.
      expect(buttons().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    });

    it('refuses a value naming no panel', async () => {
      const fixture = await boot();
      const tabs = fixture.debugElement.children[0]
        .componentInstance as PctTabs;

      tabs.select('nothing-here');
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('');
      expect(tabs.chosen()).toBe('one');
    });
  });

  describe('a panel the browser found text in', () => {
    it('is chosen, so the reveal is not taken back a frame later', async () => {
      const fixture = await boot();

      panels()[2].dispatchEvent(new Event('beforematch', { bubbles: true }));
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('three');
      expect(hiddenStates()).toEqual(['until-found', 'until-found', null]);
    });

    it('is not chosen when the tab is disabled', async () => {
      const fixture = await boot();
      fixture.componentInstance.tabs.update((tabs) =>
        tabs.map((t) => (t.value === 'three' ? { ...t, disabled: true } : t)),
      );
      fixture.detectChanges();

      panels()[2].dispatchEvent(new Event('beforematch', { bubbles: true }));
      TestBed.inject(ApplicationRef).tick();

      expect(fixture.componentInstance.value()).toBe('');
      expect(hiddenStates()).toEqual([null, 'until-found', '']);
    });
  });

  describe('the list changing under a walk', () => {
    it('keeps the cursor on the tab it was standing on, not on the index', async () => {
      const fixture = await boot();
      fixture.componentInstance.activation.set('manual');
      fixture.detectChanges();

      buttons()[0].focus();
      press('ArrowRight');
      TestBed.inject(ApplicationRef).tick();
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, 0, -1]);

      // A panel arrives ABOVE the one the walk stands on, so every index below it moves.
      fixture.componentInstance.tabs.update((tabs) => [
        { value: 'zero', label: 'Zero', disabled: false },
        ...tabs,
      ]);
      fixture.detectChanges();

      expect(buttons().map((b) => b.textContent?.trim())).toEqual([
        'Zero',
        'One',
        'Two',
        'Three',
      ]);
      expect(buttons().map((b) => b.tabIndex)).toEqual([-1, -1, 0, -1]);
    });
  });

  describe('a panel with no strip', () => {
    it('says so, once, and renders its content all the same', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      @Component({
        imports: [PctTab],
        template: `<pct-tab value="lonely" label="Lonely">text</pct-tab>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Orphan);
      fixture.detectChanges();

      // The whole sentence, not a word of it: a message assembled from four strings can lose
      // any one of them and still contain the word somebody happened to assert on.
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toBe(
        '[pct-tab] A `pct-tab` outside any `pct-tabs`: it will carry ' +
          '`role="tabpanel"` with no tab naming it, which is a role the accessibility ' +
          'tree drops, and nothing will ever show it. Put it in the content of a ' +
          '`<pct-tabs>`.',
      );
      // Nobody is showing it, so it is hidden — findably, since it is not disabled.
      expect(
        fixture.nativeElement.querySelector('pct-tab').getAttribute('hidden'),
      ).toBe('until-found');

      // And the browser finding text in it has nobody to tell, which must not be a crash.
      expect(() =>
        fixture.nativeElement
          .querySelector('pct-tab')
          .dispatchEvent(new Event('beforematch', { bubbles: true })),
      ).not.toThrow();
      warn.mockRestore();
    });

    it('is the only case that says anything: a panel in a strip is silent', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await boot();

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('a panel with no name', () => {
    it('is reported, because the compiler cannot ask for one here', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      @Component({
        imports: [PctTabs, PctTab],
        template: `
          <pct-tabs ariaLabel="Nameless">
            <pct-tab label="Anonymous">text</pct-tab>
          </pct-tabs>
        `,
      })
      class Nameless {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Nameless);
      fixture.detectChanges();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
        '[pct-tab] A `pct-tab` with no `value`: two of them are then the same ' +
          'panel as far as the strip is concerned, and the second can never be shown. ' +
          'Give each panel a name of its own.',
      ]);
      warn.mockRestore();
    });
  });

  describe('a strip inside a strip', () => {
    it('walks only its own panels', async () => {
      @Component({
        imports: [PctTabs, PctTab],
        template: `
          <pct-tabs ariaLabel="Outer">
            <pct-tab value="a" label="A">
              <pct-tabs ariaLabel="Inner">
                <pct-tab value="a1" label="A1">inner one</pct-tab>
                <pct-tab value="a2" label="A2">inner two</pct-tab>
              </pct-tabs>
            </pct-tab>
            <pct-tab value="b" label="B">outer two</pct-tab>
          </pct-tabs>
        `,
      })
      class Nested {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Nested);
      fixture.detectChanges();
      await TestBed.inject(ApplicationRef).whenStable();

      const strips = Array.from(
        document.querySelectorAll<HTMLElement>('[data-pct-part="list"]'),
      );
      const labels = (strip: HTMLElement) =>
        Array.from(
          strip.querySelectorAll<HTMLElement>('[data-pct-part="tab"]'),
        ).map((b) => b.textContent?.trim());

      expect(labels(strips[0])).toEqual(['A', 'B']);
      expect(labels(strips[1])).toEqual(['A1', 'A2']);
    });
  });
});
