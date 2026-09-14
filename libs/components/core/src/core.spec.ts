import { OverlayModule } from '@angular/cdk/overlay';
import {
  Component,
  contentChild,
  createEnvironmentInjector,
  Directive,
  effect,
  EnvironmentInjector,
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctAnnouncer } from './announce';
import { PCT_CONFIG } from './config';
import { PCT_FIELD, pctDescribedBy, pctFieldMessages } from './field';
import { PctFocusStays } from './focus';
import { nextPctId, PctIdCounter } from './id';
import { pctListNavigation, PctListSource } from './list';
import { PctModalBackground } from './modal';
import { pctAfterTransition } from './motion';
import { pctOverlay, PctOverlayInherited, PctOverlayPanel } from './overlay';
import { pctPlacementPositions } from './placement';
import { pctReportOrphanSlot } from './template';
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

    /**
     * The second channel (0070): what the control knows and the form cannot goes first,
     * and needs no touch — it is written on commit, which is the field being left.
     */
    it("the control's own error comes first, and is gated by nothing", () => {
      const own = signal<readonly { message?: string }[]>([]);
      const { errorText, showInvalid, showError } = pctFieldMessages({
        ...source({ invalid: true, errors: [{ message: 'Required' }] }),
        own,
      });

      expect(errorText()).toBe('Required');
      expect(showInvalid()).toBe(false);

      own.set([{ message: 'Not a date' }]);
      expect(errorText()).toBe('Not a date');
      expect(showInvalid()).toBe(true);
      expect(showError()).toBe(true);

      own.set([]);
      expect(errorText()).toBe('Required');
      expect(showInvalid()).toBe(false);
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

    it('move does not wrap by default, and a delta wider than the list stops at the edge', () => {
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

    it('with wrap a step from the edge comes round, and the disabled ends are still skipped', () => {
      const { nav } = walk({
        items: signal([
          { label: 'Alpha', disabled: true },
          { label: 'Beta' },
          { label: 'Gamma' },
          { label: 'Delta', disabled: true },
        ]),
        wrap: true,
      });

      nav.last();
      expect(nav.activeIndex()).toBe(2);
      nav.move(1);
      // Round to the first REACHABLE entry, not to index 0 — wrapping is a movement
      // over the same domain every other movement walks.
      expect(nav.activeIndex()).toBe(1);
      nav.move(-1);
      expect(nav.activeIndex()).toBe(2);
    });

    /**
     * The distinction the `wrap` flag would be wrong without. `PageDown` is `move(10)`, and
     * a wrapping list that took a modulo of it would answer a request for "ten rows down"
     * with a lap round the menu — so a delta that merely runs PAST the end still clamps,
     * and only one made FROM the end comes round.
     */
    it('with wrap a delta wider than the list still stops at the edge', () => {
      const { nav } = walk({ wrap: true });

      nav.first();
      nav.move(10);
      expect(nav.activeIndex()).toBe(3);
      nav.move(1);
      expect(nav.activeIndex()).toBe(0);
      nav.move(-10);
      expect(nav.activeIndex()).toBe(0);
      nav.move(-1);
      expect(nav.activeIndex()).toBe(3);
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

    /**
     * A list that changes on nobody's keystroke — the one an async control has. Every
     * movement below says where the cursor stands in the list it was walking; these say what
     * happens to it when that list is replaced underneath, which is the only case in which
     * the walk has to decide something by itself
     * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
     */
    describe('a list replaced under the cursor', () => {
      /** Two readings of one list: another instance of the same entries, as a fetch brings. */
      const again = (labels: readonly string[]): Item[] =>
        labels.map((label) => ({ label }));

      const sameLabel = (a: Item, b: Item) => a.label === b.label;

      it('the cursor follows its entry to the position it now holds', () => {
        const items = signal(again(['Poland', 'Germany', 'Slovakia']));
        const { nav } = walk({
          items,
          sameItem: sameLabel,
          isDisabled: undefined,
        });

        nav.move(1);
        nav.move(1);
        expect(nav.activeIndex()).toBe(1);

        // The same three entries, another instance of each, one more in front: an index kept
        // as a number would now be naming Poland.
        items.set(again(['Austria', 'Poland', 'Germany', 'Slovakia']));

        expect(nav.activeIndex()).toBe(2);
      });

      it('an entry the new list cannot name puts the cursor at the top', () => {
        const items = signal(again(['Poland', 'Germany', 'Slovakia']));
        const { nav } = walk({
          items,
          sameItem: sameLabel,
          isDisabled: undefined,
        });

        nav.last();
        expect(nav.activeIndex()).toBe(2);

        items.set(again(['Austria', 'Belgium']));

        expect(nav.activeIndex()).toBe(0);
      });

      it('a list that arrives into an empty one starts the walk at the top', () => {
        const items = signal<Item[]>([]);
        const { nav } = walk({ items, sameItem: sameLabel });

        // Nowhere, because there was nowhere to stand — an open panel waiting for its rows.
        nav.first();
        expect(nav.activeIndex()).toBe(-1);

        items.set(again(['Poland', 'Germany']));

        expect(nav.activeIndex()).toBe(0);
      });

      it('a cursor put nowhere over a list that had entries stays nowhere', () => {
        const items = signal(again(['Poland', 'Germany']));
        const { nav } = walk({ items, sameItem: sameLabel });

        nav.first();
        // What a control does when its panel closes — and a list arriving afterwards is not
        // an invitation to start walking a list nobody is looking at.
        nav.clear();
        items.set(again(['Poland', 'Germany', 'Slovakia']));

        expect(nav.activeIndex()).toBe(-1);
      });

      it('without sameItem two readings of one list share no entry', () => {
        const items = signal(again(['Poland', 'Germany', 'Slovakia']));
        const { nav } = walk({ items, isDisabled: undefined });

        nav.last();
        // Identity is the default, and it is the right answer wherever the entries themselves
        // survive the change: here they do not, so the cursor goes to the top rather than
        // pretending to have found its entry.
        items.set(again(['Poland', 'Germany', 'Slovakia']));

        expect(nav.activeIndex()).toBe(0);

        // The same list, the very same objects: nothing has been replaced, so nothing moves.
        const kept = again(['Poland', 'Germany', 'Slovakia']);
        const stable = signal(kept);
        const walked = walk({ items: stable, isDisabled: undefined }).nav;
        walked.last();
        stable.set([...kept]);
        expect(walked.activeIndex()).toBe(2);
      });

      it('an entry gone disabled keeps the cursor, exactly as setActive leaves it', () => {
        const items = signal<Item[]>([
          { label: 'Poland' },
          { label: 'Germany' },
        ]);
        const { nav } = walk({ items, sameItem: sameLabel });

        nav.last();
        expect(nav.activeIndex()).toBe(1);

        // Germany comes back FIRST and disabled. `setActive` already lets the cursor stand on
        // a disabled entry — a selected option gone disabled is still where the keyboard
        // starts — so a list that disables the entry under the cursor is not a reason to move
        // it, and "the first reachable row" is not where it goes: that would be Poland.
        items.set([{ label: 'Germany', disabled: true }, { label: 'Poland' }]);

        expect(nav.activeIndex()).toBe(0);
        // The MOVEMENTS decide what may be landed on, and the next one leaves it.
        nav.move(1);
        expect(nav.activeIndex()).toBe(1);
      });

      it('a list with nothing to stand in leaves the cursor nowhere', () => {
        const items = signal<Item[]>(again(['Poland', 'Germany']));
        const { nav } = walk({ items, sameItem: sameLabel });

        nav.first();
        expect(nav.activeIndex()).toBe(0);

        // The answer came back empty. `-1`, and not "the first of none" — an index into a
        // list that has no entries is what `aria-activedescendant` would then name.
        items.set([]);
        expect(nav.activeIndex()).toBe(-1);

        // A list every entry of which is out of reach is the same fact arrived at from the
        // other side, and it is reached through the branch above: the previous list was
        // empty, so this one is the arrival it was waiting for.
        items.set([{ label: 'Austria', disabled: true }]);
        expect(nav.activeIndex()).toBe(-1);
      });
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
  describe('pctPlacementPositions', () => {
    /**
     * The four sides, and the gap between the panel and what it hangs on. The offsets are the
     * whole content of this helper — the box itself is the dependency's to resolve — so what
     * is checked is the sign of the gap on each side and in each direction.
     */
    it('opens on the side that was asked for, at the distance it was given', () => {
      const [top] = pctPlacementPositions('top', 8);
      expect(top).toMatchObject({
        originY: 'top',
        overlayY: 'bottom',
        offsetY: -8,
      });

      const [bottom] = pctPlacementPositions('bottom', 8);
      expect(bottom).toMatchObject({
        originY: 'bottom',
        overlayY: 'top',
        offsetY: 8,
      });

      const [start] = pctPlacementPositions('start', 8);
      expect(start).toMatchObject({
        originX: 'start',
        overlayX: 'end',
        offsetX: -8,
      });

      const [end] = pctPlacementPositions('end', 8);
      expect(end).toMatchObject({
        originX: 'end',
        overlayX: 'start',
        offsetX: 8,
      });
    });

    /**
     * The one thing about this that a screenshot would not catch. `start` and `end` are
     * resolved by the dependency against the writing direction, and `offsetX` is NOT — it is
     * added as plain pixels afterwards. The same number therefore opens a gap in an English
     * page and closes one in an Arabic page, laying the panel over the control it belongs to.
     */
    it('the inline gap changes sign with the writing direction, the block gap does not', () => {
      expect(pctPlacementPositions('end', 8, 'rtl')[0]).toMatchObject({
        originX: 'end',
        overlayX: 'start',
        offsetX: -8,
      });
      expect(pctPlacementPositions('start', 8, 'rtl')[0]).toMatchObject({
        offsetX: 8,
      });
      expect(pctPlacementPositions('top', 8, 'rtl')[0]).toMatchObject({
        offsetY: -8,
      });
    });

    it('falls back across the control first, and only then onto the other axis', () => {
      const positions = pctPlacementPositions('top', 8);

      expect(positions).toHaveLength(4);
      // A tooltip asked for `top` and shown below is still a tooltip about the same control;
      // one shown at its side has moved to an axis nobody chose.
      expect(positions[1]).toMatchObject({
        originY: 'bottom',
        overlayY: 'top',
      });
      expect(positions.slice(2).map((p) => p.originX)).toEqual([
        'end',
        'start',
      ]);
    });
  });

  describe('pctAfterTransition', () => {
    /**
     * An element that answers whatever computed style the test asks for. The real
     * `getComputedStyle` in jsdom returns an empty string for every duration — which is one of
     * the cases here, and exactly why the other ones cannot be measured through it.
     */
    const element = (duration: string | undefined, delay = '0s') => {
      const listeners = new Set<(event: TransitionEvent) => void>();
      // The event NAME is honoured, not ignored: a fake that answers to every name would let
      // a listener registered for the wrong event look exactly like a working one.
      const node = {
        addEventListener: (
          type: string,
          fn: (event: TransitionEvent) => void,
        ) => {
          if (type === 'transitionend') listeners.add(fn);
        },
        removeEventListener: (
          type: string,
          fn: (event: TransitionEvent) => void,
        ) => {
          if (type === 'transitionend') listeners.delete(fn);
        },
        ownerDocument: {
          defaultView: {
            getComputedStyle: () => ({
              transitionDuration: duration,
              transitionDelay: delay,
            }),
          },
        },
      };
      return {
        node: node as unknown as HTMLElement,
        end: (target: unknown = node) =>
          listeners.forEach((fn) => fn({ target } as TransitionEvent)),
        listeners,
      };
    };

    it('calls back at once when there is nothing to wait for', () => {
      const done = vi.fn();
      // The user who asked for less motion, and jsdom, arrive here by different roads: the
      // token build answers the preference with `0.01ms`, and jsdom answers with nothing at
      // all. Both have to end with the panel gone rather than with a wait.
      pctAfterTransition(element('0s').node, done);

      expect(done).toHaveBeenCalledTimes(1);
    });

    it('waits for the transition of the element itself, not of what is inside it', () => {
      vi.useFakeTimers();
      try {
        const done = vi.fn();
        const el = element('150ms');
        pctAfterTransition(el.node, done);

        el.end({});
        expect(done).not.toHaveBeenCalled();

        el.end();
        expect(done).toHaveBeenCalledTimes(1);
        // And once the callback has run, nothing is left listening or ticking.
        expect(el.listeners.size).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('the longest time in the value decides, and the delay counts', () => {
      vi.useFakeTimers();
      try {
        const done = vi.fn();
        pctAfterTransition(element('50ms, 0.3s', '0s, 100ms').node, done);

        // `transitionend` never comes — a panel hidden or repainted mid-flight is the
        // ordinary case, and a leave waiting on the event alone would never end.
        vi.advanceTimersByTime(400);
        expect(done).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(done).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('an element in no window, or with nothing to read, is not waited for', () => {
      const done = vi.fn();
      // A detached element has no view to compute a style from, and a style with no
      // transition in it answers `undefined`. Neither is an error and neither is a duration:
      // the panel goes now rather than in a made-up number of milliseconds.
      pctAfterTransition({} as HTMLElement, done);
      pctAfterTransition(element(undefined).node, done);

      expect(done).toHaveBeenCalledTimes(2);
    });

    it('an unreadable part of the value is passed over, not guessed at', () => {
      vi.useFakeTimers();
      try {
        const done = vi.fn();
        // `auto` is not a time. The longest of what CAN be read decides, and the rest is
        // simply not there — the alternative is a wait built on a number nobody wrote.
        pctAfterTransition(element('auto, 300ms, 50ms').node, done);

        vi.advanceTimersByTime(300);
        expect(done).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(done).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('whichever ending comes first, it comes once', () => {
      vi.useFakeTimers();
      try {
        const done = vi.fn();
        const el = element('150ms');
        pctAfterTransition(el.node, done);

        el.end();
        el.end();
        vi.advanceTimersByTime(1000);

        expect(done).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('a cancelled wait calls nobody back', () => {
      vi.useFakeTimers();
      try {
        const done = vi.fn();
        const el = element('150ms');
        const cancel = pctAfterTransition(el.node, done);

        cancel();
        el.end();
        vi.advanceTimersByTime(1000);

        expect(done).not.toHaveBeenCalled();
        expect(el.listeners.size).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

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
   * The live channels (`req-a11y-built-in`). The cases are about the two properties a shared
   * region has and a per-component one does not: there is exactly ONE of each politeness in
   * the document, and a sentence already on a channel is not said twice.
   *
   * What the unit suite cannot see is whether anything was ANNOUNCED — jsdom has no assistive
   * technology, and neither has a browser to Playwright. What it can see is the DOM the
   * announcement is made of, and that is what these measure; the rest is the e2e's
   * (`select.spec.ts › the empty panel`) and, past it, a decision written down rather than
   * gated ([0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)).
   */
  describe('PctAnnouncer', () => {
    @Component({ template: '' })
    class Bare {}

    /**
     * The service first and the render after it, in that order: `afterNextRender` books the
     * NEXT render, so a service created once everything has already been drawn waits for a
     * render that may never come. A component injecting it is created during one, which is why
     * `pct-select` needs no such care.
     */
    const rendered = async (): Promise<PctAnnouncer> => {
      const announcer = TestBed.inject(PctAnnouncer);
      const fixture = TestBed.createComponent(Bare);
      fixture.detectChanges();
      await fixture.whenStable();
      return announcer;
    };

    const region = (politeness: string): HTMLElement | null =>
      document.querySelector(`[data-pct-live="${politeness}"]`);

    const regions = (): number =>
      document.querySelectorAll('[data-pct-live]').length;

    it('the first render opens one region per politeness, empty', async () => {
      await rendered();

      expect(regions()).toBe(2);
      for (const politeness of ['polite', 'assertive'] as const) {
        const element = region(politeness);
        expect(element?.getAttribute('aria-live')).toBe(politeness);
        // Read as a sentence rather than from the first changed word.
        expect(element?.getAttribute('aria-atomic')).toBe('true');
        expect(element?.textContent).toBe('');
      }
    });

    it('a message goes to the channel it names and to no other', async () => {
      const announcer = await rendered();

      announcer.announce('No options');
      announcer.announce('The form has errors', 'assertive');

      expect(region('polite')?.textContent).toBe('No options');
      expect(region('assertive')?.textContent).toBe('The form has errors');
    });

    it('polite is what a message with no politeness gets', async () => {
      const announcer = await rendered();

      announcer.announce('No options');

      expect(region('assertive')?.textContent).toBe('');
    });

    /**
     * The deduplication, measured where it happens: `textContent = x` on a
     * region already holding `x` replaces the text node all the same, and a replaced text node
     * is a change the assistive technology is entitled to read out again.
     */
    it('the same sentence twice is one write to the region', async () => {
      const announcer = await rendered();
      const element = region('polite') as HTMLElement;
      const writes: string[] = [];
      const observer = new MutationObserver((records) =>
        writes.push(...records.map((record) => record.type)),
      );
      observer.observe(element, { childList: true, characterData: true });

      announcer.announce('No options');
      announcer.announce('No options');
      await Promise.resolve();
      observer.disconnect();

      expect(writes).toEqual(['childList']);
    });

    it('two owners of the same state are one announcement', async () => {
      const announcer = await rendered();
      const second = TestBed.inject(PctAnnouncer);

      announcer.announce('No options');
      second.announce('No options');

      // The same service, and the same region: `providedIn: 'root'` is what makes "one
      // channel for the document" true of two components as well as of two calls.
      expect(second).toBe(announcer);
      expect(regions()).toBe(2);
    });

    it('an empty message is not an announcement', async () => {
      const announcer = await rendered();
      announcer.announce('No options');

      announcer.announce('');

      expect(region('polite')?.textContent).toBe('No options');
    });

    it('a retracted sentence can be announced again', async () => {
      const announcer = await rendered();

      announcer.announce('No options');
      announcer.retract('No options');
      expect(region('polite')?.textContent).toBe('');

      announcer.announce('No options');
      expect(region('polite')?.textContent).toBe('No options');
    });

    /**
     * The reason `retract` takes the message rather than the channel: a component whose state
     * has passed cannot know whether the channel still holds ITS sentence, and a blanket clear
     * would take the next one down with it.
     */
    it('a retraction of what is no longer there changes nothing', async () => {
      const announcer = await rendered();

      announcer.announce('No options');
      announcer.announce('Loading', 'assertive');
      announcer.retract('No options', 'assertive');
      announcer.retract('Nothing anybody said');

      expect(region('assertive')?.textContent).toBe('Loading');
      expect(region('polite')?.textContent).toBe('No options');
    });

    /**
     * The consequence of the regions being opened by a render: on the server there is none, so
     * nothing is appended to the document being sent (`req-project-ssr`), and a message with no
     * document to land in is dropped rather than queued. Nothing in this library speaks before
     * its first render — a panel cannot be open before it has been drawn.
     */
    it('with no render there is no region, and no message either', () => {
      const announcer = TestBed.inject(PctAnnouncer);

      announcer.announce('No options');

      expect(regions()).toBe(0);
    });

    it('the regions leave with the application that opened them', async () => {
      await rendered();
      expect(regions()).toBe(2);

      TestBed.resetTestingModule();

      expect(regions()).toBe(0);
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

  /**
   * The modal half of the overlay layer, under its own name. `inert` itself is the platform's
   * and jsdom implements none of it — so what is measurable here is WHICH elements the service
   * marks and whether it hands back exactly what it took. That the mark does anything at all
   * is measured in a browser, in `apps/sandbox-e2e/src/dialog.spec.ts`; the split is the same
   * one `PctFocusStays` lives with, and for the same reason (0025).
   */
  describe('PctModalBackground', () => {
    const service = () => TestBed.inject(PctModalBackground);
    const root = () => document.documentElement;
    const added: HTMLElement[] = [];

    const child = (): HTMLElement => {
      const element = document.createElement('div');
      document.body.append(element);
      added.push(element);
      return element;
    };

    afterEach(() => {
      for (const element of added.splice(0)) element.remove();
      root().style.overflow = '';
      root().style.paddingInlineEnd = '';
    });

    it('everything that does not hold the live element goes inert', () => {
      const background = child();
      const live = child();
      const inside = document.createElement('span');
      live.append(inside);

      service().hold(inside);

      expect(background.hasAttribute('inert')).toBe(true);
      // The child that CONTAINS the panel keeps answering — the overlay container is one
      // element and every panel of this library is inside it, the select's included.
      expect(live.hasAttribute('inert')).toBe(false);
    });

    it('a live region goes on speaking', () => {
      const region = child();
      region.setAttribute('aria-live', 'polite');
      const live = child();

      service().hold(live);

      // This library's own channels are children of `body`, and a select opened inside a
      // dialog announces an empty list on one of them. Inert content is hidden from
      // assistive technology, so a region marked inert is a sentence nobody hears.
      expect(region.hasAttribute('inert')).toBe(false);
      service().release();
    });

    it('what it did not take, it does not give back', () => {
      const already = child();
      already.setAttribute('inert', '');
      const live = child();

      service().hold(live);
      service().release();

      // Somebody else's `inert` is still somebody else's.
      expect(already.hasAttribute('inert')).toBe(true);
    });

    it('the page comes back only once the last holder lets go', () => {
      const background = child();
      const live = child();

      service().hold(live);
      service().hold(live);
      expect(service().depth()).toBe(2);

      service().release();
      expect(background.hasAttribute('inert')).toBe(true);
      expect(root().style.overflow).toBe('hidden');

      service().release();
      expect(background.hasAttribute('inert')).toBe(false);
      expect(root().style.overflow).toBe('');
    });

    it('a release with nothing held changes nothing', () => {
      service().release();
      expect(service().depth()).toBe(0);

      // The count cannot go below zero: were it to, the next `hold()` would raise it to zero
      // and engage nothing at all — a modal with a live page behind it.
      const background = child();
      service().hold(child());
      expect(background.hasAttribute('inert')).toBe(true);
      service().release();
    });

    it('the lock puts back the overflow it found, not an empty one', () => {
      root().style.overflow = 'clip';
      const live = child();

      service().hold(live);
      expect(root().style.overflow).toBe('hidden');

      service().release();
      expect(root().style.overflow).toBe('clip');
    });

    it('a document with no layout is not compensated for a scrollbar', () => {
      // `clientWidth` is 0 here, and `innerWidth` is not — the difference between them is the
      // whole viewport, and writing it as padding would push the page off its own edge.
      service().hold(child());
      expect(root().style.paddingInlineEnd).toBe('');
      service().release();
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
  describe('a slot that stands where nothing reads it', () => {
    @Directive({ selector: 'ng-template[pctProbeSlot]' })
    class ProbeSlot {
      readonly read = pctReportOrphanSlot('pctProbeSlot');
    }

    /** A slot of another name, so a host can offer slots and not this one. */
    @Directive({ selector: 'ng-template[pctProbeOther]' })
    class ProbeOtherSlot {
      readonly read = pctReportOrphanSlot('pctProbeOther');
    }

    /** A component that reads the slot — the shape `pct-select` has. */
    @Component({
      selector: 'pct-probe-host',
      template: `<i>host</i>`,
    })
    class ProbeHost {
      // The claim, and the whole of it: the query finding a template is the statement that
      // the template will be rendered.
      private readonly slot = contentChild(ProbeSlot);
      constructor() {
        effect(() => this.slot()?.read());
      }
    }

    /** One that reads slots, but not this one. */
    @Component({
      selector: 'pct-probe-other',
      template: `<i>other</i>`,
    })
    class ProbeOther {
      private readonly slot = contentChild(ProbeOtherSlot);
      constructor() {
        effect(() => this.slot()?.read());
      }
    }

    @Component({
      imports: [ProbeHost, ProbeSlot],
      template: `<pct-probe-host
        ><ng-template pctProbeSlot>a</ng-template></pct-probe-host
      >`,
    })
    class AtHome {}

    @Component({
      imports: [ProbeOther, ProbeSlot],
      template: `<pct-probe-other
        ><ng-template pctProbeSlot>a</ng-template></pct-probe-other
      >`,
    })
    class WrongHost {}

    @Component({
      imports: [ProbeSlot],
      template: `<ng-template pctProbeSlot>a</ng-template>`,
    })
    class NoHost {}

    @Component({
      imports: [ProbeHost, ProbeSlot],
      template: `<pct-probe-host>
        @if (shown()) {
          <ng-template pctProbeSlot>a</ng-template>
        }
      </pct-probe-host>`,
    })
    class WrappedInControlFlow {
      readonly shown = signal(true);
    }

    const ORPHAN =
      '[pctProbeSlot] This template fills a slot of a component that does not read it. ' +
      'A slot is read by the component it stands directly inside, and this one is ' +
      'rendered by nobody.';

    const silenced = () =>
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const render = async <T>(type: Type<T>) => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(type);
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    };

    it('says nothing when the component above it offers the slot', async () => {
      const warn = silenced();
      try {
        await render(AtHome);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('says nothing when control flow stands between it and the component', async () => {
      // The case the counting report would have fired on: an `@if` in the content is itself
      // a `TemplateRef`, so "templates present minus slots claimed" reads 1 here on markup
      // that is entirely right (`lesson-84`).
      const warn = silenced();
      try {
        await render(WrappedInControlFlow);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('fires when the component above it reads other slots and not this one', async () => {
      // The host is there, it queries slots, and none of them is this one — so nothing
      // calls the claim and the report stands. The message no longer names that host:
      // an unclaimed slot has no way to ask who it stood under (`lesson-176`).
      const warn = silenced();
      try {
        await render(WrongHost);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toBe(ORPHAN);
      } finally {
        warn.mockRestore();
      }
    });

    it('says so plainly when there is no component above it at all', async () => {
      const warn = silenced();
      try {
        await render(NoHost);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toBe(ORPHAN);
      } finally {
        warn.mockRestore();
      }
    });
  });
});
