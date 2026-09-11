import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctPagination } from './pagination';
import {
  pctForAll,
  pctInt,
  pctRecord,
} from '../../testing/src/property.testkit';

/**
 * The fold, swept.
 *
 * `pagination.spec.ts` says what the strip **looks like** at eleven points a person thought
 * to write down, and that is what a reader of a suite needs. This file says what is true of
 * every strip the component can draw: the input space of the fold is four integers, and the
 * rules [0048](../../../../docs/decisions/0048-a-pagination-owns-its-page-number.md) states
 * — a gap never stands for a single page, the numbers cover the count with nothing left over,
 * the window follows the page, the ends stay pinned — are statements about the whole of it
 * rather than about any point in it.
 *
 * **Read from the DOM, because that is the only honest way in.** `items` is protected, so a
 * law stated here is a law about the buttons and spans a user meets, not about an array
 * nobody outside the class can reach. The reading takes the two steppers and the stylesheet's
 * own marker as well: all three are in the DOM of every case this file already renders, so
 * covering them costs nothing but the lines that read them.
 *
 * **The page is written inside the count on purpose, and the consequence is named here rather
 * than left to be discovered.** `read` writes `Math.min(count, page)`, so the component never
 * sees a page out of range: `current()`'s clamp is the identity on every case below, and the
 * effect that writes the clamp back never fires. Neither is measurable from this file, and
 * neither is meant to be — reaching them needs a second render per case, because the
 * correction lands during the first. They are held next door, by worked cases that name what
 * they hold: `clamps a page written past the end and writes the clamp back`, `clamps a page
 * written below one the same way`, `reads page zero as page one`, `truncates a fractional page
 * rather than rounding it`. `disabled` is the same story: nothing here binds it, so the
 * `!disabled()` half of each stepper's state belongs to `refuses every press while disabled`.
 *
 * **One pass of renders for all seven laws.** The strip is a `computed` of four inputs, so a
 * reading is a function of the case and of nothing else — which is why the readings are cached
 * and why every sweep draws from the kit's one seed, and therefore from its one set of cases:
 * 120 cases collapse to 117 renders, and the seven laws share them. The cost is not
 * theoretical: every sweep in this package runs once per mutant whose file it covers, so a law
 * that needs a render of its own costs the whole run again — which is why a law that only
 * follows from the others is not worth its line here even when it is true.
 */

/**
 * Four inputs and nothing else bound: the fold is a function of exactly these, and a host
 * that bound more would invite a case to blame the wrong one.
 */
@Component({
  imports: [PctPagination],
  template: `
    <pct-pagination
      [page]="page()"
      [count]="count()"
      [siblingCount]="siblingCount()"
      [boundaryCount]="boundaryCount()"
    />
  `,
})
class SweepHost {
  readonly page = signal(1);
  readonly count = signal(1);
  readonly siblingCount = signal(1);
  readonly boundaryCount = signal(1);
}

// --- the case, and the strip it draws ---

interface Case {
  readonly count: number;
  readonly page: number;
  readonly siblingCount: number;
  readonly boundaryCount: number;
}

/**
 * The ranges. `count` reaches far enough past the widest strip these settings can produce
 * (four of each side plus the current page is nineteen items) that both gaps are reachable,
 * and stays small enough that a case is cheap to render.
 */
const cases = pctRecord<Case>({
  count: pctInt(1, 60),
  page: pctInt(1, 60),
  siblingCount: pctInt(0, 4),
  boundaryCount: pctInt(0, 4),
});

/** What a reader sees where a run of pages was folded away. */
const GAP = '…';

type Cell = number | typeof GAP;

interface Reading {
  /** The whole strip, left to right, as a reader reads it. */
  readonly strip: readonly Cell[];
  /** Every page the component announced as the current one — usually exactly one. */
  readonly marked: readonly number[];
  /** Every page carrying `data-pct-current`, the hook the stylesheet paints with. */
  readonly painted: readonly number[];
  /** The two steppers as the platform reports them, which is how a user meets them. */
  readonly previousDisabled: boolean;
  readonly nextDisabled: boolean;
}

/** The inclusive range `[from, to]`, empty when it runs backwards. */
function span(from: number, to: number): number[] {
  return to < from
    ? []
    : Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

const numbersOf = (strip: readonly Cell[]): number[] =>
  strip.filter((cell): cell is number => cell !== GAP);

/**
 * The page the component is handed, which — see the note above — is also the page it shows:
 * the sweep never writes one out of range.
 */
const pageOf = (input: Case): number => Math.min(input.count, input.page);

/**
 * A fixture belongs to the test that made it — `TestBed` is reset between them — so the
 * reference is dropped here, and the first case of a sweep that misses the cache builds a
 * new one. A sweep whose cases are all cached never builds one at all.
 */
let fixture: ComponentFixture<SweepHost> | undefined;

beforeEach(() => {
  fixture = undefined;
});

function sweepFixture(): ComponentFixture<SweepHost> {
  if (!fixture) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(SweepHost);
  }
  return fixture;
}

const readings = new Map<string, Reading>();

/**
 * The strip for a case: written into the one fixture, rendered, and read back off the
 * buttons. `detectChanges()` is synchronous under zoneless change detection — it is an
 * `ApplicationRef.tick()` — which is what lets a sweep body stay synchronous, as the kit
 * requires.
 */
function read(input: Case): Reading {
  const page = pageOf(input);
  const key = `${input.count}:${page}:${input.siblingCount}:${input.boundaryCount}`;
  const cached = readings.get(key);
  if (cached) return cached;

  const settled = sweepFixture();
  const host = settled.componentInstance;
  host.count.set(input.count);
  host.page.set(page);
  host.siblingCount.set(input.siblingCount);
  host.boundaryCount.set(input.boundaryCount);
  settled.detectChanges();

  const root = settled.nativeElement as HTMLElement;
  const cells = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-pct-part="page"], [data-pct-part="ellipsis"]',
    ),
  );
  const label = (el: HTMLElement) => Number(el.textContent?.trim());
  // A stepper that is not in the DOM at all reads as disabled — the reading that BREAKS the
  // law below on every case with somewhere to go, so a deleted button is caught rather than
  // excused by an absent `?.`.
  const stepper = (part: 'previous' | 'next'): boolean =>
    root.querySelector<HTMLButtonElement>(`[data-pct-part="${part}"]`)
      ?.disabled ?? true;

  const fresh: Reading = {
    strip: cells.map((el) =>
      el.dataset['pctPart'] === 'ellipsis' ? GAP : label(el),
    ),
    marked: cells
      .filter((el) => el.getAttribute('aria-current') === 'page')
      .map(label),
    painted: cells
      .filter((el) => el.hasAttribute('data-pct-current'))
      .map(label),
    previousDisabled: stepper('previous'),
    nextDisabled: stepper('next'),
  };
  readings.set(key, fresh);
  return fresh;
}

/** What a broken law prints beside the smallest case: the strip that broke it. */
const shown = (strip: readonly Cell[]) => `strip: ${strip.join(', ')}`;

/**
 * How many cases a sweep draws. Chosen against the ends of the space rather than by feel: the
 * page is drawn and then clamped into the count, which crowds the cases towards `page ===
 * count` and leaves the other edges thin. On this seed 80 cases reach `page === 1` three
 * times, `page === count - 1` once and `count === 1` never; 120 reach them five, three and
 * once — and 120 cases are 117 renders, fewer than this file used to pay for six laws and a
 * seventh that followed from one of them.
 */
const RUNS = 120;

describe('PctPagination, the fold swept', () => {
  it('the strip always shows the page you are on, marks it once, and paints what it marks', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip, marked, painted } = read(input);
        const page = pageOf(input);

        // A strip you cannot find yourself in is broken twice over: there is nowhere to
        // read "here", and the press that would bring you back is missing.
        expect(numbersOf(strip), shown(strip)).toContain(page);
        expect(marked, shown(strip)).toEqual([page]);
        // The current page carries its state on two channels — `aria-current` for the reader,
        // `data-pct-current` for the stylesheet — and they are two bindings on one button in
        // `pagination.html`. Inverting either is an edit no other law in this file rejects,
        // and a pager that paints one page while announcing another is wrong twice.
        expect(painted, shown(strip)).toEqual(marked);
      },
      { runs: RUNS },
    );
  });

  it('every page within siblingCount of the one you are on is on the strip', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip } = read(input);
        const page = pageOf(input);
        const numbers = numbersOf(strip);

        // What `siblingCount` MEANS, and the one thing the laws below cannot see between
        // them: a window of the right size in the wrong place. Slide the window one step off
        // its centre — `page - sibling` and `page + sibling` both a step higher — and for
        // count 20, page 10, siblingCount 4, boundaryCount 2 the strip reads
        // 1, 2, …, 7 … 15, …, 19, 20: every page accounted for, the width the bound allows,
        // page 10 still marked, page 6 gone. This is the only law here that fires on it.
        for (const near of span(
          Math.max(1, page - input.siblingCount),
          Math.min(input.count, page + input.siblingCount),
        )) {
          expect(numbers, shown(strip)).toContain(near);
        }
      },
      { runs: RUNS },
    );
  });

  it('boundaryCount pages stay pinned at each end, that many and in order', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip } = read(input);
        const numbers = numbersOf(strip);
        // A collection shorter than the pin is pinned as far as it goes.
        const pinned = Math.min(input.boundaryCount, input.count);

        // What `boundaryCount` MEANS: the DEPTH of the pin. "Page 1 is somewhere on the strip"
        // is the weaker claim, and it needs a `boundaryCount < 1` guard that throws away every
        // unpinned case; this states the promise for 0 as well, where the prefix is empty and
        // every strip keeps it. It catches `range(1, Math.min(boundary, total))` losing its
        // head or its depth — and it is the only law here that rejects a pin that moved rather
        // than shrank: 1, 2, 3, …, 9, 10, 11, …, 20 at count 20, page 10, siblingCount 1,
        // boundaryCount 2 conserves every page, is exactly as wide as the bound allows and
        // keeps the window — it has three pinned at the head and one at the tail.
        expect(numbers.slice(0, pinned), shown(strip)).toEqual(span(1, pinned));
        expect(numbers.slice(numbers.length - pinned), shown(strip)).toEqual(
          span(input.count - pinned + 1, input.count),
        );
      },
      { runs: RUNS },
    );
  });

  it('a gap stands for two hidden pages at least', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip } = read(input);

        strip.forEach((cell, at) => {
          if (cell !== GAP) return;

          // The run the gap stands for is everything between its neighbours — and past the
          // ends of the strip, everything before the first number or after the last.
          const before = numbersOf(strip.slice(0, at)).at(-1) ?? 0;
          const after = numbersOf(strip.slice(at + 1)).at(0) ?? input.count + 1;
          // A "…" that hides one number costs the reader a press to find out it was 6.
          expect(after - before - 1, shown(strip)).toBeGreaterThanOrEqual(2);
        });
      },
      { runs: RUNS },
    );
  });

  it('the numbers and the runs the gaps stand for are 1 to count, each page exactly once', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip } = read(input);

        // Conservation: unfold every gap back into the pages it swallowed and the strip has
        // to read as the whole collection, in order, with nothing doubled and nothing lost.
        //
        // It is also why two gaps side by side need no line of their own. A pair that hides
        // something resolves to the same run twice, and the doubled page breaks this; a pair
        // that hides nothing is a gap standing for no page at all, and the law above rejects
        // it. (A gap at an END of the strip, on the other hand, is legitimate: `boundaryCount`
        // of 0 opens with one.)
        const unfolded = strip.flatMap((cell, at) => {
          if (cell !== GAP) return [cell];
          const before = numbersOf(strip.slice(0, at)).at(-1) ?? 0;
          const after = numbersOf(strip.slice(at + 1)).at(0) ?? input.count + 1;
          return span(before + 1, after - 1);
        });

        expect(unfolded, shown(strip)).toEqual(span(1, input.count));
      },
      { runs: RUNS },
    );
  });

  it('the strip is exactly as wide as the ends and the window allow, and no wider', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip } = read(input);

        // Two pinned ends, the current page with its siblings on both sides, and one gap on
        // each side of the window: that is the whole of the room a pager reserves, and it
        // is a bound a layout can be built against. Below it the collection itself is the
        // limit, because a strip never draws a page that is not there.
        //
        // The bound names no page, which is what makes it the only law here that fires on a
        // one-step change to either clamp of the window — `total - boundary - sibling * 2 - 1`
        // and `boundary + sibling * 2 + 2`: those move the window's width without moving what
        // it covers past the page, so conservation, the pins and the marking all stay green.
        const room = 2 * input.boundaryCount + 2 * input.siblingCount + 3;
        expect(strip.length, shown(strip)).toBe(Math.min(input.count, room));
      },
      { runs: RUNS },
    );
  });

  it('the steppers are live exactly where there is a page to step to', () => {
    pctForAll(
      cases,
      (input) => {
        const { strip, previousDisabled, nextDisabled } = read(input);
        const page = pageOf(input);

        // `hasPrevious` and `hasNext` are one comparison each, and the reading used to walk
        // straight past both buttons. The worked cases next door read the two buttons at the
        // ends and one step in — page 1, page 2 and page 20 of 20, a count of 1, a bare pager
        // at page 1 of 9 — which leaves `current() < pages()` narrowed to `< pages() - 1`, a
        // "next" that dies one page early, green in the whole suite. Over these cases it is
        // not. The margin is thin, though: three of the 120 stand at `count - 1`, and that is
        // the number to raise if this side of the law is to stop resting on them.
        expect(previousDisabled, shown(strip)).toBe(page === 1);
        expect(nextDisabled, shown(strip)).toBe(page === input.count);
      },
      { runs: RUNS },
    );
  });
});
