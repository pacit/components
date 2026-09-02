import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * A breadcrumb: the way here, told in the platform's own links.
 *
 * **The ARIA APG breadcrumb pattern**, on the elements that are really there: the host is a
 * named `navigation` landmark, inside it one `role="list"`, every step a `role="listitem"`
 * — and every anchor is the consumer's own `<a href>`, so `routerLink`, the keyboard, the
 * middle click and the status bar are all the platform's
 * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)). Measured
 * before it was written ([0054](../../../../docs/decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)):
 * links standing directly in a `role="list"` are a critical `aria-required-children`
 * violation in all three engines, which is what the `<pct-crumb>` wrapper exists to carry.
 *
 * **It writes no `aria-current`.** The current place is the router's sentence
 * (`routerLinkActive` with `ariaCurrentWhenActive="page"`) or the consumer's hand; this
 * component styles the attribute and never guesses it from position — a guess is wrong on
 * every partial trail. The current step may also be bare text in the last crumb, and both
 * spellings read correctly.
 *
 * @example
 * <pct-breadcrumb>
 *   <pct-crumb><a pctCrumbLink routerLink="/">Home</a></pct-crumb>
 *   <pct-crumb><a pctCrumbLink routerLink="/library">Library</a></pct-crumb>
 *   <pct-crumb><a pctCrumbLink routerLink="/library/data" aria-current="page">Data</a></pct-crumb>
 * </pct-breadcrumb>
 */
@Component({
  selector: 'pct-breadcrumb',
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
  host: {
    class: 'pct-breadcrumb',
    // A named `navigation` landmark — the pagination's reasoning one component over: the
    // landmark is how a screen-reader user reaches the trail and steps over it, and it has
    // to be named because two trails on one page are two landmarks.
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel() || texts().breadcrumbLabel',
  },
})
export class PctBreadcrumb {
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The accessible name of the landmark. Overrides `texts().breadcrumbLabel`, whose job is
   * only to carry a sensible default in the application's language.
   */
  readonly ariaLabel = input<string>('');
}

/**
 * One step of the trail: `role="listitem"`, and the separator drawn before its content.
 *
 * The separator is the library's chevron turned a quarter — inline-forward, so `:dir(rtl)`
 * turns it the other way — and it is silent by the icon host's own `aria-hidden`. The first
 * crumb hides its separator with `:first-of-type`: CSS answers "am I first" correctly on
 * every insert, removal and reorder, where a signal would need wiring to notice any of them
 * (0054).
 */
@Component({
  selector: 'pct-crumb',
  imports: [PctIcon],
  templateUrl: './crumb.html',
  styleUrl: './crumb.scss',
  host: {
    class: 'pct-breadcrumb__item',
    // The platform's own name for "one of these" — `pct-chip`'s move: the native `<li>` is
    // out of reach on a custom element, so the role is declared on the element that is
    // actually there (`req-a11y-built-in`).
    role: 'listitem',
  },
})
export class PctCrumb {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(PctBreadcrumb, { optional: true });

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLooseCrumb());
  }

  /**
   * A crumb outside `pct-breadcrumb`, or wrapped in something inside it, is a `listitem`
   * whose `list` is not directly above it — the arrangement the probe measured as a
   * critical violation. One check catches both, asked of the platform: the parent element
   * either carries `role="list"` or it does not. Said once, when the crumb first stands in
   * the document, and only in dev mode: the fix is in the template, not at runtime.
   */
  private warnOnLooseCrumb(): void {
    const above = this.host.nativeElement.parentElement;
    if (this.parent && above?.getAttribute('role') === 'list') return;
    // One literal, not a concatenation: the mutation run turns every joined fragment into
    // a mutant of its own, and a fragment nothing asserts on survives — one string is one
    // mutant, and any asserted word kills it.
    console.warn(
      `[pct-crumb] A crumb whose parent element is not a list. \`role="listitem"\` needs \`role="list"\` directly above it — axe counts the loose arrangement as a critical violation in every engine. Make the crumb a direct child of <pct-breadcrumb>.`,
    );
  }
}

/**
 * The trail's link, standing on the consumer's own anchor.
 *
 * A component and not a directive for `lesson-96`'s reason: projected content keeps the
 * encapsulation of the template that declared it, a directive cannot carry styles, and the
 * public styling API here is not to stand on `::ng-deep`. On the anchor itself, the
 * stylesheet owns rest, hover, focus and `aria-current` — while the navigation itself stays
 * entirely the platform's.
 */
@Component({
  selector: 'a[pctCrumbLink]',
  templateUrl: './link.html',
  styleUrl: './link.scss',
  host: {
    class: 'pct-breadcrumb__link',
  },
})
export class PctCrumbLink {
  private readonly crumb = inject(PctCrumb, { optional: true });

  constructor() {
    if (isDevMode() && !this.crumb)
      console.warn(
        `[pct-breadcrumb] A \`pctCrumbLink\` outside any \`pct-crumb\`: it will wear the trail's colours with no listitem around it and no landmark above it. Put it in the content of a <pct-crumb> inside <pct-breadcrumb>.`,
      );
  }
}
