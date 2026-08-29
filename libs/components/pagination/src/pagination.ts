import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  untracked,
} from '@angular/core';
import { PCT_CONFIG, PCT_TEXTS, PctSize } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PctPaginationItem } from './pagination.types';

/**
 * Pagination: a control that owns the current page of a collection and emits when the user
 * moves to another one.
 *
 * **There is no ARIA APG pattern for pagination.** What there is is the WAI tutorial's
 * shape — a named navigation landmark, a list of controls, and `aria-current="page"` on the
 * one you are on — and this component is that
 * ([0048](../../../../docs/decisions/0048-a-pagination-owns-its-page-number.md)). The host is
 * a `navigation` landmark so a screen-reader user can find the pager and skip it; every page
 * is a `<button>`, so the press, the keyboard and the disabled state are the platform's
 * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)).
 *
 * **It owns the page number, not the data.** `count` is a number of pages, never a number of
 * items: the thing that knows how to slice a data source into pages is the thing that holds
 * the data source, and that is not this component. What this component computes is the one
 * thing the platform has nothing for — which of the pages to show and where to fold the rest
 * ([`PctPaginationItem`](./pagination.types.ts)).
 *
 * **The links variant is a different component.** A pager built on `<a href>` takes its
 * current page from the router and "activate" means navigate, not emit — every sentence in
 * 0048 is then false. That pager, when it is written, stands beside this one rather than
 * behind a flag.
 *
 * @example
 * <pct-pagination [(page)]="page" [count]="totalPages()" />
 */
@Component({
  selector: 'pct-pagination',
  imports: [PctIcon, NgTemplateOutlet],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  host: {
    class: 'pct-pagination',
    // A `navigation` landmark and not `role="group"`: moving between pages of a collection is
    // navigation of content whether or not a page boundary is a URL, and a landmark is how a
    // screen-reader user reaches the pager and steps over it. It has to be named — two pagers
    // on one page (above and below a table) are two landmarks, and `ariaLabel` is what tells
    // them apart.
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel() || texts().paginationLabel',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctPagination {
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The current page, 1-based. A `model`, because both directions are ordinary: an
   * application sets it, and a press on a page button writes it back.
   *
   * It is 1-based because it is a number the user reads — "page 3 of 20" — and the same
   * number is the button's visible label. A 0-based value would be an index, and an index is
   * not what a pager is about.
   */
  readonly page = model<number>(1);

  /**
   * How many pages there are. **Not** how many items — see the class note. A `count` below 1
   * draws an empty landmark; a `count` of 1 draws a single current page with both steppers
   * disabled.
   */
  readonly count = input.required<number, unknown>({
    transform: numberAttribute,
  });

  /** How many page numbers to keep on each side of the current one before folding. */
  readonly siblingCount = input(1, { transform: numberAttribute });

  /** How many page numbers to keep pinned at each end of the strip. */
  readonly boundaryCount = input(1, { transform: numberAttribute });

  /** Whether the whole control is inert — every button carries `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The accessible name of the landmark. Overrides `texts().paginationLabel`, whose job is
   * only to carry a sensible default in the application's language.
   */
  readonly ariaLabel = input<string>('');

  /**
   * The `id` of the region whose content this pager moves through, written as `aria-controls`
   * on each page button. Optional: when it is empty the attribute is not written, because an
   * `aria-controls` that resolves to nothing is worse than none.
   */
  readonly controls = input<string>('');

  /** Size; taken from the global configuration by default (`req-api-config`). */
  readonly size = input<PctSize>(this.config.defaultSize);

  /** The number of pages, floored at 1: there is always a page you are on. */
  protected readonly pages = computed(() =>
    Math.max(1, Math.trunc(this.count() || 0)),
  );

  /**
   * The current page clamped into range. `page` is the source of truth and a consumer may
   * write anything into it; what the strip shows and what a press emits is this. The effect
   * below writes the clamp back so the model and the view do not disagree for longer than a
   * tick.
   */
  protected readonly current = computed(() =>
    Math.min(this.pages(), Math.max(1, Math.trunc(this.page() || 1))),
  );

  /** Whether the "previous" stepper does anything from here. */
  protected readonly hasPrevious = computed(
    () => !this.disabled() && this.current() > 1,
  );

  /** Whether the "next" stepper does anything from here. */
  protected readonly hasNext = computed(
    () => !this.disabled() && this.current() < this.pages(),
  );

  /**
   * The strip: the pinned ends, the window around the current page, and an `'ellipsis'`
   * wherever a run of two or more pages was folded away. A single hidden page is drawn as
   * itself rather than as a gap — a "…" that stands for one number wastes the reader's time.
   */
  protected readonly items = computed<readonly PctPaginationItem[]>(() => {
    const total = this.pages();
    const boundary = Math.max(0, Math.trunc(this.boundaryCount()));
    const sibling = Math.max(0, Math.trunc(this.siblingCount()));
    const page = this.current();

    // The two pinned ends.
    const startPages = range(1, Math.min(boundary, total));
    const endPages = range(Math.max(total - boundary + 1, boundary + 1), total);

    // The window of siblings around the current page, clamped so it never overlaps an end.
    const siblingsStart = Math.max(
      Math.min(page - sibling, total - boundary - sibling * 2 - 1),
      boundary + 2,
    );
    const siblingsEnd = Math.min(
      Math.max(page + sibling, boundary + sibling * 2 + 2),
      endPages.length > 0 ? endPages[0] - 2 : total - 1,
    );

    return [
      ...startPages,
      // Between the start end and the window: a gap of two or more pages folds to one
      // 'ellipsis'; a gap of exactly one is drawn as that page, because a "…" standing for a
      // single number wastes the reader's time; touching ends fold to nothing.
      ...(siblingsStart > boundary + 2
        ? (['ellipsis'] as PctPaginationItem[])
        : boundary + 1 < total - boundary
          ? [boundary + 1]
          : []),
      ...range(siblingsStart, siblingsEnd),
      ...(siblingsEnd < total - boundary - 1
        ? (['ellipsis'] as PctPaginationItem[])
        : total - boundary > boundary
          ? [total - boundary]
          : []),
      ...endPages,
    ];
  });

  constructor() {
    // Keep the model honest about its own bounds. Writing a model from an effect is a narrow
    // exception, taken here because the alternative — a view that shows page 10 while the
    // model still says 999 — is a worse contract. It writes only when the clamp really moved
    // something, so a well-behaved consumer never sees this fire.
    //
    // Both signals are read TRACKED, and `page` is the one that matters: `current` is the
    // clamp's RESULT, and a clamp maps many wrong values onto one right one. Watching the
    // result alone, an effect never learns that 0 or -5 arrived while the view already showed
    // page 1 — nothing recomputed, so nothing ran, and the consumer kept the number the card
    // promised to correct ([`lesson-131`](../../../../docs/lessons.md#lesson-131)).
    effect(() => {
      const written = this.page();
      const clamped = this.current();
      if (written === clamped) return;
      untracked(() => this.page.set(clamped));
    });
  }

  /**
   * Moves to a page. Clamped, and a no-op when it would not move or when the control is
   * disabled — a press on the page you are already on is not an event.
   */
  protected go(target: number): void {
    if (this.disabled()) return;
    const next = Math.min(this.pages(), Math.max(1, Math.trunc(target)));
    if (next === this.current()) return;
    this.page.set(next);
  }
}

/** The inclusive integer range `[start, end]`, or `[]` when `end < start`. */
function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return length > 0 ? Array.from({ length }, (_, i) => start + i) : [];
}
