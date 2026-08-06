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
 * Wnętrze `@pacit/components/core` sprawdzane WPROST, a nie przez komponenty,
 * które go używają.
 *
 * Powód: te funkcje są publicznym API entrypointu `./core` i do 2026-08-06
 * nie miały ani jednego testu pod własnym nazwiskiem — mierzyły je wyłącznie
 * specyfikacje kontrolek, i to na jednej ścieżce. Przebieg mutacyjny pokazał
 * to jako pierwszy: warunek `ids.length > 0` dawało się przestawić na `>= 0`,
 * a `errors()?.[0]?.message` rozbroić z opcjonalności — bez ani jednego
 * czerwonego testu (`lekcja-57`).
 */
describe('@pacit/components/core', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('pctFieldMessages', () => {
    const zrodlo = (opcje?: {
      invalid?: boolean;
      touched?: boolean;
      errors?: readonly { message?: string }[];
    }) => ({
      invalid: signal(opcje?.invalid ?? false),
      touched: signal(opcje?.touched ?? false),
      errors: signal(opcje?.errors ?? []),
    });

    it('tekstem błędu jest komunikat PIERWSZEGO błędu', () => {
      const { errorText } = pctFieldMessages(
        zrodlo({ errors: [{ message: 'Za mało' }, { message: 'I jeszcze' }] }),
      );

      expect(errorText()).toBe('Za mało');
    });

    it('brak błędów to pusty tekst, a nie undefined', () => {
      const { errorText } = pctFieldMessages(zrodlo());

      // Pusty napis, bo wartość jedzie do szablonu: `undefined` wypisałoby się
      // jako słowo „undefined" w miejscu komunikatu.
      expect(errorText()).toBe('');
    });

    it('błąd bez komunikatu też daje pusty tekst', () => {
      const { errorText } = pctFieldMessages(zrodlo({ errors: [{}] }));

      // Walidator ma prawo nie nieść zdania — schemat opisuje wtedy sam fakt
      // naruszenia, a napis dokłada aplikacja.
      expect(errorText()).toBe('');
    });

    it('stan błędu zapala się dopiero po dotknięciu', () => {
      const src = zrodlo({ invalid: true, errors: [{ message: 'Wymagane' }] });
      const { showInvalid, showError } = pctFieldMessages(src);

      expect(showInvalid()).toBe(false);
      expect(showError()).toBe(false);

      src.touched.set(true);
      expect(showInvalid()).toBe(true);
      expect(showError()).toBe(true);
    });

    it('błąd bez zdania maluje kontrolkę, ale nie wypisuje pustego komunikatu', () => {
      const { showInvalid, showError } = pctFieldMessages(
        zrodlo({ invalid: true, touched: true, errors: [{}] }),
      );

      // Dwa różne pytania: „czy jest źle" (ramka, aria-invalid) i „czy jest co
      // pokazać" (obszar komunikatu). Zlanie ich w jedno daje albo pusty
      // czerwony wiersz, albo kontrolkę wyglądającą na poprawną.
      expect(showInvalid()).toBe(true);
      expect(showError()).toBe(false);
    });
  });

  describe('pctDescribedBy', () => {
    it('składa identyfikatory aktywnych części, w podanej kolejności', () => {
      expect(
        pctDescribedBy([
          ['hint-1', true],
          ['err-1', false],
          ['aux-1', true],
        ]),
      ).toBe('hint-1 aux-1');
    });

    it('brak aktywnych części daje null, a nie pusty napis', () => {
      // To jest cała różnica między BRAKIEM atrybutu a atrybutem pustym:
      // `aria-describedby=""` jest w drzewie dostępności odwołaniem donikąd.
      expect(pctDescribedBy([['hint-1', false]])).toBeNull();
      expect(pctDescribedBy([])).toBeNull();
    });
  });

  describe('nextPctId', () => {
    it('numeruje kolejno w obrębie jednego injectora', () => {
      const injector = TestBed.inject(Injector);
      const [a, b] = runInInjectionContext(injector, () => [
        nextPctId('pct-text'),
        nextPctId('pct-text'),
      ]);

      expect(a).toBe('pct-text-1');
      expect(b).toBe('pct-text-2');
    });

    it('bez przedrostka numeruje pod nazwą biblioteki', () => {
      const injector = TestBed.inject(Injector);

      // Wartość domyślna jest częścią publicznej sygnatury — w bibliotece nie
      // korzysta z niej dziś ani jedno wywołanie, więc bez tego testu nikt jej
      // nie mierzy.
      expect(runInInjectionContext(injector, () => nextPctId())).toBe('pct-1');
    });

    it('licznik żyje w injectorze aplikacji, więc każda liczy od zera', () => {
      // Licznik modułowy rósłby przez wszystkie żądania SSR w jednym procesie,
      // a klient zaczynałby od zera — po hydracji powiązania ARIA wskazywałyby
      // w próżnię (wym-projekt-ssr).
      expect(TestBed.inject(PctIdCounter).next()).toBe(1);
      expect(TestBed.inject(PctIdCounter).next()).toBe(2);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(TestBed.inject(PctIdCounter).next()).toBe(1);
    });
  });

  describe('tokeny nazywają się w komunikacie o braku dostawcy', () => {
    it.each([
      ['PCT_FIELD', PCT_FIELD],
      ['PCT_CONFIG', PCT_CONFIG],
      ['PCT_TEXTS', PCT_TEXTS],
    ])('%s', (nazwa, token) => {
      // Opis tokenu jest jedyną rzeczą, jaką konsument dostaje w NG0201 —
      // token bez opisu daje komunikat o „InjectionToken" bez wskazania,
      // KTÓREGO brakuje.
      expect(String(token)).toContain(nazwa);
    });
  });

  describe('PCT_CONFIG i PCT_TEXTS mają wartość domyślną', () => {
    it('konfiguracja bez dostawcy daje rozmiar md', () => {
      expect(TestBed.inject(PCT_CONFIG).defaultSize).toBe('md');
    });

    it('teksty bez dostawcy są angielskie', () => {
      expect(TestBed.inject(PCT_TEXTS)().selectPlaceholder).toBe('Select…');
    });
  });
});
