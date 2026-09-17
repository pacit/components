import { inject, Injectable } from '@angular/core';

/**
 * An id counter held in DI rather than in the module.
 *
 * A module-level counter is not SSR-safe: the server renders many requests in one process,
 * so the numbering grows with every render while the client starts from zero. The second
 * request and every one after it gets HTML with different ids from the ones the client will
 * count — after hydration some attributes keep the server's values and some get the client's,
 * and the ARIA relations (`aria-labelledby`, `aria-describedby`, `<label for>`) point into
 * the void.
 *
 * A `providedIn: 'root'` instance lives as long as the application injector — that is, one
 * request on the server side and one page load on the client side. Both sides therefore
 * count from zero and render the same ids (req-project-ssr).
 *
 * @since 0.1.0
 */
@Injectable({ providedIn: 'root' })
export class PctIdCounter {
  private n = 0;

  next(): number {
    return ++this.n;
  }
}

/**
 * Generates stable, unique ids for ARIA relations (req-a11y-built-in). Needs an injection
 * context — call it in a component field initialiser.
 *
 * @since 0.1.0
 */
export function nextPctId(prefix = 'pct'): string {
  return `${prefix}-${inject(PctIdCounter).next()}`;
}
