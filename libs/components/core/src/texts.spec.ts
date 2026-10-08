import {
  createEnvironmentInjector,
  EnvironmentInjector,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  PCT_DEFAULT_TEXTS,
  PCT_TEXTS,
  PctTexts,
  providePctTexts,
} from './texts';

/**
 * The texts token and its provider, under their own name. Until 2026-10-08 `providePctTexts`
 * had no case here: twelve component specs call it and each reads back the one key it needs,
 * so the contract — the keys named override, the rest stay, a signal is merged on every read,
 * a subtree starts from the defaults and not from its parent — was asserted by nobody and
 * held by accident. The mutation run priced that: every mutant of this file ran the specs of
 * those twelve components before one of them noticed, 13 469 tests of the full run of
 * 2026-10-06 for 37 mutants ([`lesson-250`](../../../../docs/lessons.md#lesson-250)).
 */

/**
 * The English the components speak until an application provides its own — written out in
 * full, because this IS the contract: a translation is a copy of this object with the values
 * replaced, and `providePctTexts` fills every key it is not given from here. Compared with
 * `toEqual`, so that a key added to the interface without a default, or a default without a
 * key, fails here before a component meets an `undefined` where a sentence should be.
 */
const ENGLISH: PctTexts = {
  selectPlaceholder: 'Select…',
  selectEmpty: 'No options',
  selectNoMatches: 'No matches',
  selectLoading: 'Loading…',
  selectSeparator: ', ',
  selectClear: 'Clear',
  dialogClose: 'Close',
  dateOpen: 'Choose date',
  datePreviousMonth: 'Previous month',
  dateNextMonth: 'Next month',
  dateDayLetter: 'd',
  dateMonthLetter: 'm',
  dateYearLetter: 'y',
  dateMalformed: 'Not a date',
  numberMalformed: 'Not a number',
  fieldWarning: 'Warning:',
  toastDismiss: 'Dismiss',
  toastRegion: 'Notifications',
  drawerClose: 'Close',
  paginationLabel: 'Pagination',
  paginationPrevious: 'Previous page',
  paginationNext: 'Next page',
  chipRemove: 'Remove',
  breadcrumbLabel: 'Breadcrumb',
  stepDone: 'Completed',
};

describe('PCT_TEXTS', () => {
  it('with no provider the texts are the English defaults, every key of them', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    expect(TestBed.inject(PCT_TEXTS)()).toEqual(ENGLISH);
    expect(PCT_DEFAULT_TEXTS).toEqual(ENGLISH);
  });
});

describe('providePctTexts', () => {
  it('an object overrides the keys it names and the rest stay English', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ selectEmpty: 'Keine Optionen' }),
      ],
    });
    expect(TestBed.inject(PCT_TEXTS)()).toEqual({
      ...ENGLISH,
      selectEmpty: 'Keine Optionen',
    });
  });

  it('a signal is merged on every read, so a language changes without a reload', () => {
    const language = signal<Partial<PctTexts>>({
      selectEmpty: 'Keine Optionen',
    });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), providePctTexts(language)],
    });
    const texts = TestBed.inject(PCT_TEXTS);
    expect(texts()).toEqual({ ...ENGLISH, selectEmpty: 'Keine Optionen' });

    language.set({ selectEmpty: 'Aucune option', selectClear: 'Effacer' });
    expect(texts()).toEqual({
      ...ENGLISH,
      selectEmpty: 'Aucune option',
      selectClear: 'Effacer',
    });
  });

  it('a subtree merges against the defaults, not against its parent', () => {
    // A subtree declares a language, not a difference from its neighbour — the same
    // `providePctTexts` means the same thing wherever in the tree it stands.
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ selectPlaceholder: 'Sélectionner…' }),
      ],
    });
    const parent = TestBed.inject(EnvironmentInjector);
    const child = createEnvironmentInjector(
      [providePctTexts({ selectEmpty: 'Keine Optionen' })],
      parent,
    );
    expect(child.get(PCT_TEXTS)()).toEqual({
      ...ENGLISH,
      selectEmpty: 'Keine Optionen',
    });
    expect(parent.get(PCT_TEXTS)().selectPlaceholder).toBe('Sélectionner…');
  });
});
