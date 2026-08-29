import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  providePctConfig,
  providePctTexts,
  PctSize,
} from '@pacit/components/core';
import { PctPagination } from './pagination';

/**
 * Two arrangements, and the second is not decoration.
 *
 * The **bound** pager has every input bound and its `page` written back by hand — that is
 * `[(page)]` with a log kept beside it, so a case can ask not only where the pager ended up
 * but how many times it said so. The **bare** pager binds `count` as a plain attribute and
 * nothing else: it is the only place the defaults of `page`, `siblingCount`, `boundaryCount`,
 * `disabled`, `ariaLabel`, `controls` and `size` are ever observed, since a host that binds an
 * input is a host that cannot see what happens without it
 * ([`lesson-123`](../../../../docs/lessons.md#lesson-123)'s neighbour, and the shape the
 * accordion's mutation run found six times over).
 *
 * `count="9"` as a written attribute rather than a binding is the second job of the bare one:
 * `numberAttribute` turns the string into a number, and a `[count]="9"` would hand it a number
 * that needed no turning.
 */
@Component({
  imports: [PctPagination],
  template: `
    <pct-pagination
      data-testid="bound"
      [page]="page()"
      (pageChange)="onPage($event)"
      [count]="count()"
      [siblingCount]="siblingCount()"
      [boundaryCount]="boundaryCount()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
      [controls]="controls()"
      [size]="size()"
    />

    <pct-pagination data-testid="bare" count="9" />
  `,
})
class Host {
  readonly page = signal(1);
  readonly count = signal(20);
  readonly siblingCount = signal(1);
  readonly boundaryCount = signal(1);
  readonly disabled = signal(false);
  readonly ariaLabel = signal('');
  readonly controls = signal('');
  readonly size = signal<PctSize>('md');

  /** Every value the pager has ever emitted, in order — the count matters as much as the last. */
  readonly emitted = signal<readonly number[]>([]);

  /** The write-back half of `[(page)]`, with the log the banana box gives no room for. */
  onPage(next: number): void {
    this.emitted.update((all) => [...all, next]);
    this.page.set(next);
  }
}

async function render<T>(
  type: Type<T>,
  providers: unknown[] = [],
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/**
 * Two passes. The clamp is written to the model from an effect and read back by the strip, so
 * a case that sets `page` out of range needs the render that follows the correction as well as
 * the one that provoked it.
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
}

const pager = (testid: string) =>
  document.querySelector(
    `pct-pagination[data-testid="${testid}"]`,
  ) as HTMLElement;

const bound = () => pager('bound');

const partsOf = (name: string, host: HTMLElement = bound()) =>
  Array.from(host.querySelectorAll<HTMLElement>(`[data-pct-part="${name}"]`));

const step = (direction: 'previous' | 'next', host: HTMLElement = bound()) =>
  host.querySelector<HTMLButtonElement>(
    `[data-pct-part="${direction}"]`,
  ) as HTMLButtonElement;

/**
 * The strip as a reader would read it: a number for a page, `'…'` for a gap. Asserting this
 * one array rather than a length and a spot check is what makes the folding cases legible —
 * and the folding is the only thing this component computes.
 */
const strip = (host: HTMLElement = bound()): (number | '…')[] =>
  Array.from(
    host.querySelectorAll<HTMLElement>(
      '[data-pct-part="page"], [data-pct-part="ellipsis"]',
    ),
  ).map((el) =>
    el.dataset['pctPart'] === 'ellipsis' ? '…' : Number(el.textContent?.trim()),
  );

/** The page button carrying a given number; throws rather than returning `null`. */
const pageButton = (n: number, host: HTMLElement = bound()) => {
  const button = partsOf('page', host).find(
    (el) => el.textContent?.trim() === String(n),
  );
  if (!button) {
    throw new Error(
      `No page button "${n}". The strip reads ${strip(host).join(', ')}.`,
    );
  }
  return button as HTMLButtonElement;
};

describe('PctPagination', () => {
  describe('what the tag carries', () => {
    it('is a named navigation landmark holding one list', async () => {
      await render(Host);

      const host = bound();
      expect(host.getAttribute('role')).toBe('navigation');
      expect(host.getAttribute('aria-label')).toBe('Pagination');
      expect(host.getAttribute('data-pct-disabled')).toBeNull();

      const lists = partsOf('list');
      expect(lists).toHaveLength(1);
      expect(lists[0].tagName).toBe('UL');
      // Every control in the strip is a real button — the whole of `req-api-platform` here.
      expect(partsOf('page').every((el) => el.tagName === 'BUTTON')).toBe(true);
      expect(step('previous').tagName).toBe('BUTTON');
      expect(step('next').tagName).toBe('BUTTON');
    });

    it('takes the landmark name from the consumer when there is one', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ariaLabel.set('Results, top');
      await settle(fixture);

      expect(bound().getAttribute('aria-label')).toBe('Results, top');
    });

    it('providePctTexts swaps the default name and both steppers', async () => {
      await render(Host, [
        providePctTexts({
          paginationLabel: 'Pages',
          paginationPrevious: 'One back',
          paginationNext: 'One on',
        }),
      ]);

      expect(bound().getAttribute('aria-label')).toBe('Pages');
      expect(step('previous').getAttribute('aria-label')).toBe('One back');
      expect(step('next').getAttribute('aria-label')).toBe('One on');
    });

    it('names the steppers out of PCT_TEXTS by default', async () => {
      await render(Host);

      expect(step('previous').getAttribute('aria-label')).toBe('Previous page');
      expect(step('next').getAttribute('aria-label')).toBe('Next page');
    });

    /**
     * The size axis, from both sides: the bare pager takes the configured default without
     * anybody binding anything, and a bound one overrides it.
     */
    it('takes its size from the configuration, and a binding overrides it', async () => {
      const fixture = await render(Host, [
        providePctConfig({ defaultSize: 'lg' }),
      ]);

      expect(pager('bare').getAttribute('data-pct-size')).toBe('lg');

      fixture.componentInstance.size.set('sm');
      await settle(fixture);
      expect(bound().getAttribute('data-pct-size')).toBe('sm');
    });

    it('writes aria-controls only when there is an id to point at', async () => {
      const fixture = await render(Host);

      // Nobody set one: the attribute is absent rather than empty, because an `aria-controls`
      // that resolves to nothing is worse than none.
      for (const el of [...partsOf('page'), step('previous'), step('next')]) {
        expect(el.getAttribute('aria-controls')).toBeNull();
      }

      fixture.componentInstance.controls.set('rows');
      await settle(fixture);

      for (const el of [...partsOf('page'), step('previous'), step('next')]) {
        expect(el.getAttribute('aria-controls')).toBe('rows');
      }
    });

    /**
     * The current page carries its state on two channels, and only one of them is ours: a
     * reader gets `aria-current="page"`, the stylesheet gets `data-pct-current`. Exactly one
     * button has either.
     */
    it('marks the current page for a reader and for the stylesheet, once each', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(7);
      await settle(fixture);

      const current = partsOf('page').filter(
        (el) => el.getAttribute('aria-current') === 'page',
      );
      expect(current).toHaveLength(1);
      expect(current[0].textContent?.trim()).toBe('7');
      expect(current[0].hasAttribute('data-pct-current')).toBe(true);

      expect(
        partsOf('page').filter((el) => el.hasAttribute('data-pct-current')),
      ).toHaveLength(1);
    });

    /**
     * A page button's accessible name is its number and nothing else — enough inside a named
     * landmark, and the whole of what the card records as a limitation.
     */
    it('gives a page button its own number as its name', async () => {
      await render(Host);

      const three = pageButton(3);
      expect(three.textContent?.trim()).toBe('3');
      expect(three.getAttribute('aria-label')).toBeNull();
    });

    it('hides the ellipsis from the reader and gives it nothing to press', async () => {
      await render(Host);

      const gaps = partsOf('ellipsis');
      expect(gaps.length).toBeGreaterThan(0);
      for (const gap of gaps) {
        expect(gap.tagName).toBe('SPAN');
        expect(gap.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('marks the host disabled and hands every button the attribute', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.disabled.set(true);
      await settle(fixture);

      expect(bound().getAttribute('data-pct-disabled')).toBe('');
      expect(
        partsOf('page').every((el) => (el as HTMLButtonElement).disabled),
      ).toBe(true);
      expect(step('previous').disabled).toBe(true);
      expect(step('next').disabled).toBe(true);
    });
  });

  /**
   * The fold is the one thing the platform has nothing for, so it is the surface that most
   * needs measuring. Every case reads the whole strip rather than a length and a spot check.
   */
  describe('the fold', () => {
    it('draws every page while they all fit', async () => {
      const fixture = await render(Host);

      for (const total of [1, 2, 3, 5, 7]) {
        fixture.componentInstance.count.set(total);
        await settle(fixture);
        expect(strip()).toEqual(Array.from({ length: total }, (_, i) => i + 1));
      }
    });

    /**
     * The rule the card states and the sandbox repeats: a run of **two or more** hidden pages
     * folds to one gap, a run of exactly one is drawn as that page. Seven pages and eight, on
     * the same settings, are the two sides of it — at seven, page 6 is the single hidden one
     * and appears; at eight, 6 and 7 go together and a gap takes their place.
     */
    it('folds a run of two, and draws a single hidden page as itself', async () => {
      const fixture = await render(Host);

      fixture.componentInstance.count.set(7);
      await settle(fixture);
      expect(strip()).toEqual([1, 2, 3, 4, 5, 6, 7]);

      fixture.componentInstance.count.set(8);
      await settle(fixture);
      expect(strip()).toEqual([1, 2, 3, 4, 5, '…', 8]);
    });

    it('pins the ends and walks the window along with the current page', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);

      const walk: [number, (number | '…')[]][] = [
        [1, [1, 2, 3, 4, 5, '…', 20]],
        [4, [1, 2, 3, 4, 5, '…', 20]],
        [5, [1, '…', 4, 5, 6, '…', 20]],
        [10, [1, '…', 9, 10, 11, '…', 20]],
        [16, [1, '…', 15, 16, 17, '…', 20]],
        [17, [1, '…', 16, 17, 18, 19, 20]],
        [20, [1, '…', 16, 17, 18, 19, 20]],
      ];

      for (const [page, expected] of walk) {
        fixture.componentInstance.page.set(page);
        await settle(fixture);
        expect(strip()).toEqual(expected);
      }
    });

    it('boundaryCount=0 unpins the ends and leaves the window alone', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.boundaryCount.set(0);
      await settle(fixture);

      expect(strip()).toEqual(['…', 9, 10, 11, '…']);
    });

    /**
     * The clamp on the far end of the window, and the only arrangement that reaches it: with
     * the ends unpinned there is no `endPages[0]` to stop at, so the window is held by `total`
     * itself. Taken off, the strip offers **page 21 of 20** and repeats page 20 beside it — a
     * mutant that survived every other case here, because every other case pins an end.
     */
    it('never names a page past the count when the ends are unpinned', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.boundaryCount.set(0);

      fixture.componentInstance.page.set(20);
      await settle(fixture);
      expect(strip()).toEqual(['…', 17, 18, 19, 20]);

      // And the same at the other end, where the window runs into 1 rather than into `total`.
      fixture.componentInstance.page.set(1);
      await settle(fixture);
      expect(strip()).toEqual([1, 2, 3, 4, '…']);
    });

    it('boundaryCount=2 pins two at each end', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.boundaryCount.set(2);
      await settle(fixture);

      expect(strip()).toEqual([1, 2, '…', 9, 10, 11, '…', 19, 20]);
    });

    it('siblingCount=0 leaves the current page alone between the gaps', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.siblingCount.set(0);
      await settle(fixture);

      expect(strip()).toEqual([1, '…', 10, '…', 20]);
    });

    it('siblingCount=2 widens the window on both sides', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.siblingCount.set(2);
      await settle(fixture);

      expect(strip()).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20]);
    });

    /**
     * A negative or fractional count of siblings is a consumer's slip and not a reason to draw
     * nothing: both are floored at zero and truncated, so the strip stays the one a `0` gives.
     */
    it('floors a negative sibling or boundary count at zero', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.siblingCount.set(-3);
      fixture.componentInstance.boundaryCount.set(-3);
      await settle(fixture);

      expect(strip()).toEqual(['…', 10, '…']);
    });

    it('truncates a fractional sibling count rather than rounding it', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(20);
      fixture.componentInstance.page.set(10);
      fixture.componentInstance.siblingCount.set(1.9);
      await settle(fixture);

      // 1.9 truncated is 1, so this is the default strip and not the `siblingCount=2` one.
      expect(strip()).toEqual([1, '…', 9, 10, 11, '…', 20]);
    });

    it('the bare pager folds on the defaults nobody bound', async () => {
      await render(Host);

      // Nine pages, page 1, one sibling and one boundary: 3, 4, 5 are the window, 2 is the
      // single page that would otherwise be a gap, and 6 to 8 fold.
      expect(strip(pager('bare'))).toEqual([1, 2, 3, 4, 5, '…', 9]);
    });

    /**
     * The three defaults the bare pager RENDERS but nothing asked about until the mutation run
     * did: `disabled`, `ariaLabel` and `controls` all survived their mutants, because a strip
     * drawn by a pager that thinks it is disabled looks exactly like one drawn by a pager that
     * does not — until somebody reads the buttons. This is the shape the accordion's run found
     * six times over, one arrangement later: the bare host existed, the questions did not.
     */
    it('and answers for them: live buttons, the default name, no aria-controls', async () => {
      await render(Host);
      const bare = pager('bare');

      // `ariaLabel` defaults to '', so the landmark falls back to PCT_TEXTS.
      expect(bare.getAttribute('aria-label')).toBe('Pagination');

      // `disabled` defaults to false: no state on the host and nothing inert inside it.
      expect(bare.getAttribute('data-pct-disabled')).toBeNull();
      expect(
        partsOf('page', bare).some((el) => (el as HTMLButtonElement).disabled),
      ).toBe(false);
      expect(step('next', bare).disabled).toBe(false);

      // `controls` defaults to '': the attribute is absent, not empty.
      for (const el of [
        ...partsOf('page', bare),
        step('previous', bare),
        step('next', bare),
      ]) {
        expect(el.getAttribute('aria-controls')).toBeNull();
      }
    });
  });

  describe('the page it owns', () => {
    it('starts at page one when nobody says otherwise', async () => {
      await render(Host);

      const current = partsOf('page', pager('bare')).filter(
        (el) => el.getAttribute('aria-current') === 'page',
      );
      expect(current).toHaveLength(1);
      expect(current[0].textContent?.trim()).toBe('1');
    });

    it('a press moves the page and says so exactly once', async () => {
      const fixture = await render(Host);

      pageButton(3).click();
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(3);
      expect(fixture.componentInstance.emitted()).toEqual([3]);
      expect(pageButton(3).getAttribute('aria-current')).toBe('page');
    });

    /** A press on the page you are already on is not an event — nothing moved. */
    it('says nothing when the press lands on the current page', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(4);
      await settle(fixture);
      fixture.componentInstance.emitted.set([]);

      pageButton(4).click();
      await settle(fixture);

      expect(fixture.componentInstance.emitted()).toEqual([]);
      expect(fixture.componentInstance.page()).toBe(4);
    });

    it('the steppers move by exactly one', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(10);
      await settle(fixture);
      fixture.componentInstance.emitted.set([]);

      step('next').click();
      await settle(fixture);
      expect(fixture.componentInstance.page()).toBe(11);

      step('previous').click();
      await settle(fixture);
      expect(fixture.componentInstance.page()).toBe(10);

      expect(fixture.componentInstance.emitted()).toEqual([11, 10]);
    });

    it('the steppers sit disabled at the ends and nowhere else', async () => {
      const fixture = await render(Host);

      expect(step('previous').disabled).toBe(true);
      expect(step('next').disabled).toBe(false);

      fixture.componentInstance.page.set(2);
      await settle(fixture);
      expect(step('previous').disabled).toBe(false);
      expect(step('next').disabled).toBe(false);

      fixture.componentInstance.page.set(20);
      await settle(fixture);
      expect(step('previous').disabled).toBe(false);
      expect(step('next').disabled).toBe(true);
    });

    it('a single page disables both steppers at once', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(1);
      await settle(fixture);

      expect(strip()).toEqual([1]);
      expect(step('previous').disabled).toBe(true);
      expect(step('next').disabled).toBe(true);
    });

    /**
     * The clamp, and the half of it that is a contract rather than a computation: the
     * corrected number is written **back** to the model, so a consumer who set 999 does not
     * keep a value the view disagrees with.
     */
    it('clamps a page written past the end and writes the clamp back', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(999);
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(20);
      expect(fixture.componentInstance.emitted()).toEqual([20]);
      expect(pageButton(20).getAttribute('aria-current')).toBe('page');
    });

    it('clamps a page written below one the same way', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(-5);
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(1);
      expect(fixture.componentInstance.emitted()).toEqual([1]);
    });

    /** Zero is the interesting one: `page || 1` has to answer 1 and not fall through to 0. */
    it('reads page zero as page one', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(0);
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(1);
    });

    it('truncates a fractional page rather than rounding it', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(4.9);
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(4);
      expect(pageButton(4).getAttribute('aria-current')).toBe('page');
    });

    /**
     * Shrinking the collection under a pager standing past its new end: the clamp catches it
     * from the other side, which is the case an application really meets — a filter applied
     * while the user is on page 18 of 20.
     */
    it('follows the count down when the collection shrinks', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(18);
      await settle(fixture);
      fixture.componentInstance.emitted.set([]);

      fixture.componentInstance.count.set(3);
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(3);
      expect(fixture.componentInstance.emitted()).toEqual([3]);
      expect(strip()).toEqual([1, 2, 3]);
    });

    /** A count below one is still one page: there is always a page you are on. */
    it('draws one page for a count of zero or less', async () => {
      const fixture = await render(Host);

      for (const count of [0, -4]) {
        fixture.componentInstance.count.set(count);
        await settle(fixture);
        expect(strip()).toEqual([1]);
        expect(fixture.componentInstance.page()).toBe(1);
      }
    });

    it('truncates a fractional count rather than rounding it', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.count.set(3.9);
      await settle(fixture);

      expect(strip()).toEqual([1, 2, 3]);
    });

    it('refuses every press while disabled, and emits nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.page.set(10);
      await settle(fixture);
      fixture.componentInstance.disabled.set(true);
      await settle(fixture);
      fixture.componentInstance.emitted.set([]);

      // `disabled` on the element already stops a real press, and `.click()` never reaches
      // the handler because of it — which is why this uses `dispatchEvent`: the guard in `go`
      // is a SECOND refusal, and the only way to ask whether it is there is to deliver the
      // event the platform would have swallowed. Without it the mutant survives, and the case
      // measures the browser rather than the component.
      for (const el of [pageButton(11), step('previous'), step('next')]) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      await settle(fixture);

      expect(fixture.componentInstance.page()).toBe(10);
      expect(fixture.componentInstance.emitted()).toEqual([]);
    });
  });
});
