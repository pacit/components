import { OverlayModule } from '@angular/cdk/overlay';
import {
  Component,
  createEnvironmentInjector,
  EnvironmentInjector,
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PCT_CONFIG } from './config';
import { PCT_FIELD, pctDescribedBy, pctFieldMessages } from './field';
import { PctFocusStays } from './focus';
import { nextPctId, PctIdCounter } from './id';
import { pctListNavigation, PctListSource } from './list';
import { pctOverlay, PctOverlayInherited, PctOverlayPanel } from './overlay';
import { PCT_TEXTS } from './texts';

/**
 * The inside of `@pacit/components/core` checked DIRECTLY, not through the
 * components that use it.
 *
 * The reason: these functions are the public API of the `./core` entrypoint and
 * until 2026-08-06 had not one test under their own name — only the control
 * specs measured them, and along a single path at that. The mutation run was
 * the first to show it: the condition `ids.length > 0` could be moved to
 * `>= 0` and `errors()?.[0]?.message` stripped of its optionality — without a
 * single red test (`lesson-57`).
 */
describe('@pacit/components/core', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('pctFieldMessages', () => {
    const source = (opts?: {
      invalid?: boolean;
      touched?: boolean;
      errors?: readonly { message?: string }[];
    }) => ({
      invalid: signal(opts?.invalid ?? false),
      touched: signal(opts?.touched ?? false),
      errors: signal(opts?.errors ?? []),
    });

    it('the error text is the message of the FIRST error', () => {
      const { errorText } = pctFieldMessages(
        source({
          errors: [{ message: 'Too short' }, { message: 'And one more' }],
        }),
      );

      expect(errorText()).toBe('Too short');
    });

    it('no errors is empty text, not undefined', () => {
      const { errorText } = pctFieldMessages(source());

      // An empty string, because the value goes into the template: `undefined`
      // would print as the word "undefined" where the message belongs.
      expect(errorText()).toBe('');
    });

    it('an error with no message also gives empty text', () => {
      const { errorText } = pctFieldMessages(source({ errors: [{}] }));

      // A validator may carry no sentence — the schema then describes the fact of
      // the violation, and the application supplies the wording.
      expect(errorText()).toBe('');
    });

    it('the error state lights up only after a touch', () => {
      const src = source({ invalid: true, errors: [{ message: 'Required' }] });
      const { showInvalid, showError } = pctFieldMessages(src);

      expect(showInvalid()).toBe(false);
      expect(showError()).toBe(false);

      src.touched.set(true);
      expect(showInvalid()).toBe(true);
      expect(showError()).toBe(true);
    });

    it('an error with no sentence paints the control but writes no empty message', () => {
      const { showInvalid, showError } = pctFieldMessages(
        source({ invalid: true, touched: true, errors: [{}] }),
      );

      // Two different questions: "is something wrong" (the border, aria-invalid)
      // and "is there anything to show" (the message area). Merging them gives
      // either an empty red line or a control that looks valid.
      expect(showInvalid()).toBe(true);
      expect(showError()).toBe(false);
    });
  });

  describe('pctDescribedBy', () => {
    it('joins the ids of the active parts, in the given order', () => {
      expect(
        pctDescribedBy([
          ['hint-1', true],
          ['err-1', false],
          ['aux-1', true],
        ]),
      ).toBe('hint-1 aux-1');
    });

    it('no active parts gives null, not an empty string', () => {
      // This is the whole difference between NO attribute and an empty one:
      // `aria-describedby=""` is a reference to nowhere in the accessibility tree.
      expect(pctDescribedBy([['hint-1', false]])).toBeNull();
      expect(pctDescribedBy([])).toBeNull();
    });
  });

  describe('nextPctId', () => {
    it('numbers in sequence within one injector', () => {
      const injector = TestBed.inject(Injector);
      const [a, b] = runInInjectionContext(injector, () => [
        nextPctId('pct-text'),
        nextPctId('pct-text'),
      ]);

      expect(a).toBe('pct-text-1');
      expect(b).toBe('pct-text-2');
    });

    it('with no prefix it numbers under the library name', () => {
      const injector = TestBed.inject(Injector);

      // The default is part of the public signature — not one call in the library
      // uses it today, so without this test nobody measures it.
      expect(runInInjectionContext(injector, () => nextPctId())).toBe('pct-1');
    });

    it('the counter lives in the application injector, so each one counts from zero', () => {
      // A module-level counter would grow across every SSR request in one process
      // while the client started from zero — after hydration the ARIA bindings would
      // point into the void (req-project-ssr).
      expect(TestBed.inject(PctIdCounter).next()).toBe(1);
      expect(TestBed.inject(PctIdCounter).next()).toBe(2);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(TestBed.inject(PctIdCounter).next()).toBe(1);
    });
  });

  describe('pctListNavigation', () => {
    interface Item {
      readonly label: string;
      readonly disabled?: boolean;
    }

    const ITEMS: readonly Item[] = [
      { label: 'Poland' },
      { label: 'Germany' },
      { label: 'Czechia', disabled: true },
      { label: 'Slovakia' },
    ];

    /**
     * The walk needs an injection context (the typeahead timer is released with the
     * component that owns it), so every case builds it in an injector of its own —
     * `destroy()` is then a case in its own right rather than a side effect of the
     * next test.
     */
    const walk = (
      src: Partial<PctListSource<Item>> = {},
      injector = createEnvironmentInjector(
        [],
        TestBed.inject(EnvironmentInjector),
      ),
    ) => ({
      injector,
      nav: runInInjectionContext(injector, () =>
        pctListNavigation<Item>({
          items: signal(ITEMS),
          isDisabled: (item) => item.disabled === true,
          label: (item) => item.label,
          ...src,
        }),
      ),
    });

    it('starts with no active entry', () => {
      expect(walk().nav.activeIndex()).toBe(-1);
    });

    it('first and last skip what cannot be reached', () => {
      const disabledEnds = [
        { label: 'Alpha', disabled: true },
        { label: 'Beta' },
        { label: 'Gamma' },
        { label: 'Delta', disabled: true },
      ];
      const { nav } = walk({ items: signal(disabledEnds) });

      nav.first();
      expect(nav.activeIndex()).toBe(1);
      nav.last();
      expect(nav.activeIndex()).toBe(2);
    });

    it('on a list with nothing reachable first and last activate nothing', () => {
      // TWO disabled entries, because with one "nothing active" and "active outside
      // the list" look the same and the test would pass for a walk landing on index 1.
      const { nav } = walk({
        items: signal([
          { label: 'Alpha', disabled: true },
          { label: 'Beta', disabled: true },
        ]),
      });

      nav.first();
      expect(nav.activeIndex()).toBe(-1);
      nav.last();
      expect(nav.activeIndex()).toBe(-1);
    });

    it('without an isDisabled predicate every entry is reachable', () => {
      const { nav } = walk({ isDisabled: undefined });

      nav.first();
      expect(nav.activeIndex()).toBe(0);
      nav.move(2);
      // Index 2 is `disabled: true` in the data — with no predicate that field is
      // just a field, and the walk has no opinion about it.
      expect(nav.activeIndex()).toBe(2);

      // Typeahead asks the same question along a path of its own, so it needs the
      // absent predicate measured separately: "Czechia" is reachable here.
      nav.clear();
      nav.typeahead('c');
      expect(nav.activeIndex()).toBe(2);
    });

    it('move steps over the disabled entries', () => {
      const { nav } = walk();

      nav.first();
      nav.move(1);
      expect(nav.activeIndex()).toBe(1);
      nav.move(1);
      // 2 is disabled — the step lands on 3.
      expect(nav.activeIndex()).toBe(3);
      nav.move(-1);
      expect(nav.activeIndex()).toBe(1);
    });

    it('move does not wrap, and a delta wider than the list stops at the edge', () => {
      const { nav } = walk();

      nav.last();
      nav.move(1);
      expect(nav.activeIndex()).toBe(3);
      nav.move(10);
      expect(nav.activeIndex()).toBe(3);
      nav.move(-10);
      expect(nav.activeIndex()).toBe(0);
      nav.move(-1);
      expect(nav.activeIndex()).toBe(0);
    });

    it('move from outside the reachable list jumps to the edge it comes from', () => {
      const down = walk();
      down.nav.move(1);
      expect(down.nav.activeIndex()).toBe(0);

      const up = walk();
      up.nav.move(-1);
      expect(up.nav.activeIndex()).toBe(3);

      // The same from an entry that IS in the list but cannot be reached: a control
      // activates what is selected, and a selected entry may have gone disabled.
      const fromDisabled = walk();
      fromDisabled.nav.setActive(2);
      fromDisabled.nav.move(1);
      expect(fromDisabled.nav.activeIndex()).toBe(0);
    });

    it('move over an empty list leaves the active entry alone', () => {
      const { nav } = walk({ items: signal([]) });

      nav.setActive(1);
      nav.move(1);
      expect(nav.activeIndex()).toBe(1);
    });

    it('setActive asks no questions, clear goes back to nothing', () => {
      const { nav } = walk();

      // Index 2 is disabled: opening a list activates the SELECTED entry, and a
      // selected entry that has since been disabled is still where the keyboard starts.
      nav.setActive(2);
      expect(nav.activeIndex()).toBe(2);
      nav.clear();
      expect(nav.activeIndex()).toBe(-1);
    });

    it('the list is read as a signal, so an entry added mid-walk is seen', () => {
      const items = signal<readonly Item[]>([{ label: 'Poland' }]);
      const { nav } = walk({ items });

      nav.last();
      expect(nav.activeIndex()).toBe(0);
      items.set([{ label: 'Poland' }, { label: 'Germany' }]);
      nav.last();
      expect(nav.activeIndex()).toBe(1);
    });

    it('typeahead activates the first match and skips the disabled ones', () => {
      const { nav } = walk();

      nav.typeahead('G');
      expect(nav.activeIndex()).toBe(1);
      // Czechia is disabled, so "c" looks further — and finds nothing.
      nav.clear();
      nav.typeahead('c');
      expect(nav.activeIndex()).toBe(-1);
    });

    it('the letters accumulate into one prefix', () => {
      const { nav } = walk({
        items: signal([
          { label: 'Sweden' },
          { label: 'Switzerland' },
          { label: 'Slovakia' },
        ]),
      });

      nav.typeahead('s');
      expect(nav.activeIndex()).toBe(0);
      nav.typeahead('w');
      expect(nav.activeIndex()).toBe(0);
      nav.typeahead('i');
      expect(nav.activeIndex()).toBe(1);
    });

    it('a prefix matching nothing leaves the active entry where it was', () => {
      const { nav } = walk();

      nav.first();
      nav.typeahead('x');
      expect(nav.activeIndex()).toBe(0);
    });

    it('the prefix dies out after a pause, and the delay is the caller’s to set', () => {
      vi.useFakeTimers();
      try {
        const { nav } = walk({ typeaheadDelay: 100 });

        nav.typeahead('g');
        vi.advanceTimersByTime(99);
        // Still one prefix: "gp" matches nothing, so the active entry does not move.
        nav.typeahead('p');
        expect(nav.activeIndex()).toBe(1);

        vi.advanceTimersByTime(100);
        nav.typeahead('p');
        expect(nav.activeIndex()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('the default delay is half a second, as in a native select', () => {
      vi.useFakeTimers();
      try {
        const { nav } = walk();

        nav.typeahead('g');
        vi.advanceTimersByTime(499);
        nav.typeahead('p');
        expect(nav.activeIndex()).toBe(1);

        vi.advanceTimersByTime(500);
        nav.typeahead('p');
        expect(nav.activeIndex()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('without a label there is no typeahead at all', () => {
      const { nav } = walk({ label: undefined });

      nav.first();
      nav.typeahead('g');
      // A list with no text to match against (icons, colour swatches) does not walk on
      // letters — and it says so by leaving `label` out, rather than by matching
      // every letter against `undefined`.
      expect(nav.activeIndex()).toBe(0);
    });

    it('the timer dies with the injector that created the walk', () => {
      vi.useFakeTimers();
      try {
        const { nav, injector } = walk();
        nav.typeahead('g');

        injector.destroy();
        // A scheduled call outliving the component keeps it in memory, and in tests
        // hands work over to the next one: the clearing has to happen on destroy.
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  /**
   * The overlay layer, checked here rather than through the select: what a panel outside the
   * host tree stops inheriting is a property of overlays, and the control that opens one is
   * only the first consumer (`lesson-57`, one floor down).
   *
   * jsdom lays nothing out, so `offsetWidth` is `0` for every element it holds. The two
   * widths are therefore defined on the elements themselves — and they are the numbers from
   * the measurement that produced the rule: a 301 px field around a 275 px trigger
   * (`lesson-35`).
   */
  describe('pctOverlay', () => {
    const withWidth = (element: HTMLElement, width: number) => {
      Object.defineProperty(element, 'offsetWidth', {
        value: width,
        configurable: true,
      });
      return element;
    };

    /**
     * A control in the document: a themed ancestor, the visible edge (what a field chrome
     * would draw) and the trigger inside it.
     */
    const control = (theme: string | null = 'dark') => {
      const themed = document.createElement('div');
      if (theme !== null) themed.setAttribute('data-theme', theme);
      const edge = withWidth(document.createElement('div'), 301);
      const trigger = withWidth(document.createElement('button'), 275);
      trigger.style.fontFamily = 'Inter, system-ui';
      trigger.style.fontSize = '16px';
      trigger.style.direction = 'rtl';
      edge.append(trigger);
      themed.append(edge);
      document.body.append(themed);
      return { themed, edge, trigger, destroy: () => themed.remove() };
    };

    it('before the first opening it is closed and carries nothing', () => {
      const { trigger, destroy } = control();
      const panel = pctOverlay({ from: () => trigger });

      expect(panel.open()).toBe(false);
      // Not an empty reading but no reading at all: nothing has been opened yet, and a
      // panel described by defaults would be a panel described by a guess.
      expect(panel.inherited()).toBeNull();
      expect(panel.anchorWidth()).toBe(0);
      destroy();
    });

    it('opening reads the theme, the typeface, the size and the direction off the control', () => {
      const { trigger, destroy } = control();
      const panel = pctOverlay({ from: () => trigger });

      panel.show();

      expect(panel.open()).toBe(true);
      expect(panel.inherited()).toEqual({
        theme: 'dark',
        fontFamily: 'Inter, system-ui',
        fontSize: '16px',
        direction: 'rtl',
      });
      destroy();
    });

    it('with no themed ancestor the theme is null, not the string "null"', () => {
      const { trigger, destroy } = control(null);
      const panel = pctOverlay({ from: () => trigger });

      panel.show();

      // The value goes into an attribute binding: anything other than `null` writes
      // `data-theme` onto the panel and takes it out of the page's theme.
      expect(panel.inherited()?.theme).toBeNull();
      destroy();
    });

    it('the width is the anchor’s, because the anchor is the visible edge', () => {
      const { edge, trigger, destroy } = control();
      const panel = pctOverlay({ from: () => trigger, anchor: () => edge });

      panel.show();

      // The measurement of `lesson-35`: anchored to the trigger the panel came out 275 px
      // wide against a 301 px field, inset by the padding of the control column.
      expect(panel.anchorWidth()).toBe(301);
      destroy();
    });

    it('a control with no chrome is its own edge', () => {
      const { trigger, destroy } = control();
      const noChrome = pctOverlay({ from: () => trigger, anchor: () => null });
      const noAnchorAtAll = pctOverlay({ from: () => trigger });

      noChrome.show();
      noAnchorAtAll.show();

      // Two ways of saying the same thing: a wrapper that is absent, and a wrapper the
      // control never asks about.
      expect(noChrome.anchorWidth()).toBe(275);
      expect(noAnchorAtAll.anchorWidth()).toBe(275);
      destroy();
    });

    it('every opening reads again, because the page moves under a control that stays', () => {
      const { themed, edge, trigger, destroy } = control();
      const panel = pctOverlay({ from: () => trigger, anchor: () => edge });

      panel.show();
      panel.hide();
      themed.setAttribute('data-theme', 'light');
      trigger.style.fontSize = '14px';
      withWidth(edge, 240);
      panel.show();

      expect(panel.inherited()).toMatchObject({
        theme: 'light',
        fontSize: '14px',
      });
      expect(panel.anchorWidth()).toBe(240);
      destroy();
    });

    it('hide closes and leaves the last reading where it was', () => {
      const { trigger, destroy } = control();
      const panel = pctOverlay({ from: () => trigger });

      panel.show();
      panel.hide();

      expect(panel.open()).toBe(false);
      // A closing panel is still on screen for as long as it takes to leave; a reading
      // cleared here would repaint it on the way out.
      expect(panel.inherited()?.theme).toBe('dark');
      destroy();
    });
  });

  /**
   * The panel side of the same rule: one binding puts on the element whatever the reading
   * holds. The four properties are not named in the template of any control, so a fifth one
   * is an entry in `PctOverlayInherited` rather than an edit in every component that opens
   * a panel.
   */
  describe('PctOverlayPanel', () => {
    @Component({
      imports: [PctOverlayPanel],
      template: `<div id="panel" [pctOverlayPanel]="inherited()"></div>`,
    })
    class PanelHost {
      readonly inherited = signal<PctOverlayInherited | null>(null);
    }

    const render = async () => {
      const fixture = TestBed.createComponent(PanelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement.querySelector(
        '#panel',
      ) as HTMLElement;
      return { fixture, element };
    };

    const apply = async (
      fixture: ComponentFixture<PanelHost>,
      inherited: PctOverlayInherited,
    ) => {
      fixture.componentInstance.inherited.set(inherited);
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const INHERITED: PctOverlayInherited = {
      theme: 'dark',
      fontFamily: 'Inter, system-ui',
      fontSize: '16px',
      direction: 'rtl',
    };

    it('with nothing read yet it writes nothing on the element', async () => {
      const { element } = await render();

      expect(element.getAttribute('data-theme')).toBeNull();
      expect(element.getAttribute('dir')).toBeNull();
      expect(element.style.fontFamily).toBe('');
      expect(element.style.fontSize).toBe('');
    });

    it('a reading puts all four onto the element at once', async () => {
      const { fixture, element } = await render();

      await apply(fixture, INHERITED);

      expect(element.getAttribute('data-theme')).toBe('dark');
      expect(element.getAttribute('dir')).toBe('rtl');
      expect(element.style.fontFamily).toBe('Inter, system-ui');
      expect(element.style.fontSize).toBe('16px');
    });

    it('a control with no theme leaves the attribute off rather than writing an empty one', async () => {
      const { fixture, element } = await render();

      await apply(fixture, { ...INHERITED, theme: null });

      // `data-theme=""` is a theme in the stylesheets — the empty string selects the
      // default skin, which is not the same as answering to the page.
      expect(element.hasAttribute('data-theme')).toBe(false);
      expect(element.getAttribute('dir')).toBe('rtl');
    });
  });

  /**
   * What a unit suite can say about focus, and what it cannot.
   *
   * The defect this directive was written from is a browser one: pressing a panel that takes
   * no focus moves focus to `body`, and the control's keys — arrows, Home, End, Enter, the
   * typeahead — go with it, because their handler sits on the trigger. jsdom implements no
   * such default action: nothing here moves focus on a `mousedown`, so a test asserting that
   * the trigger kept it would pass with the directive deleted.
   *
   * So the two halves are measured in the two places that can see them. Here: the event is
   * cancelled, wherever inside the panel it started, and the `click` that carries a pick is
   * not. In the browser: `apps/sandbox-e2e/src/select.spec.ts`, where focus and a dead
   * keyboard are readable facts (`req-api-overlay`).
   */
  describe('PctFocusStays', () => {
    @Component({
      imports: [PctFocusStays],
      template: `<div id="panel" pctFocusStays>
        <div id="option">Poland</div>
      </div>`,
    })
    class PanelHost {}

    const render = async () => {
      const fixture = TestBed.createComponent(PanelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      const at = (id: string) =>
        fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
      return { fixture, at };
    };

    const press = (element: HTMLElement, type = 'mousedown') => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event;
    };

    it('a press on the panel itself is refused', async () => {
      const { at } = await render();

      expect(press(at('panel')).defaultPrevented).toBe(true);
    });

    it('a press that starts inside the panel is refused as well', async () => {
      const { at } = await render();

      // The padding, the gap between options, the empty-list text and the options themselves
      // are one case: the event bubbles to the panel, and that is where the guard reads it.
      expect(press(at('option')).defaultPrevented).toBe(true);
    });

    it('the click that follows is untouched, so a pick still arrives', async () => {
      const { at } = await render();

      // `click` is not the default action being prevented — the whole point of guarding
      // `mousedown` rather than the pointer event above it.
      expect(press(at('option'), 'click').defaultPrevented).toBe(false);
    });
  });

  /**
   * The order in which overlays close, measured rather than assumed — the layer rests on it
   * and writes not a line of it. An overlay is a child of `body`, so DOM propagation cannot
   * express nesting: a panel opened from inside a dialog is that dialog's SIBLING in the
   * tree, and a key travelling up from the control would reach the dialog first. What orders
   * them is the CDK dispatcher, which delivers a keydown to the top-most attached overlay
   * and to no other — that is the closing stack this repository would otherwise write for a
   * second time.
   *
   * The rule it leaves for our components: **an overlay closes from the stack, never from a
   * listener above the control.** A control may answer for its own key (the select eats
   * Escape on its trigger, and its panel is the top of the stack whenever it is open); a
   * component listening one floor up would answer for the overlays above it as well.
   */
  describe('the closing stack', () => {
    @Component({
      imports: [OverlayModule],
      template: `<button cdkOverlayOrigin #origin="cdkOverlayOrigin">o</button>
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="origin"
          [cdkConnectedOverlayOpen]="lower()"
          (detach)="lower.set(false)"
        >
          <div data-overlay="lower">lower</div>
        </ng-template>
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="origin"
          [cdkConnectedOverlayOpen]="upper()"
          (detach)="upper.set(false)"
        >
          <div data-overlay="upper">upper</div>
        </ng-template>`,
    })
    class NestedHost {
      readonly lower = signal(false);
      readonly upper = signal(false);
    }

    const shown = () =>
      Array.from(document.querySelectorAll('[data-overlay]')).map((element) =>
        element.getAttribute('data-overlay'),
      );

    it('Escape closes the top-most overlay alone, and the next one after it', async () => {
      const fixture = TestBed.createComponent(NestedHost);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.lower.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.upper.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(shown()).toEqual(['lower', 'upper']);

      const escape = async () => {
        // On `body`, where the dispatcher listens — not on an element inside an overlay:
        // the point is that the delivery is decided by the stack and not by the target.
        // `keyCode` alongside `key` because that is what the CDK reads.
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true,
          }),
        );
        fixture.detectChanges();
        await fixture.whenStable();
      };

      await escape();
      expect(shown()).toEqual(['lower']);

      await escape();
      expect(shown()).toEqual([]);
    });
  });

  describe('tokens name themselves in the missing-provider message', () => {
    it.each([
      ['PCT_FIELD', PCT_FIELD],
      ['PCT_CONFIG', PCT_CONFIG],
      ['PCT_TEXTS', PCT_TEXTS],
    ])('%s', (name, token) => {
      // A token's description is the only thing the consumer gets in NG0201 — a
      // token without one gives a message about "InjectionToken" with no hint as to
      // WHICH one is missing.
      expect(String(token)).toContain(name);
    });
  });

  describe('PCT_CONFIG and PCT_TEXTS have a default', () => {
    it('the config with no provider gives size md', () => {
      expect(TestBed.inject(PCT_CONFIG).defaultSize).toBe('md');
    });

    it('the texts with no provider are English', () => {
      expect(TestBed.inject(PCT_TEXTS)().selectPlaceholder).toBe('Select…');
    });
  });
});
