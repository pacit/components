import {
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PCT_CONFIG } from './config';
import { PCT_FIELD, pctDescribedBy, pctFieldMessages } from './field';
import { nextPctId, PctIdCounter } from './id';
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
