import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  isDevMode,
} from '@angular/core';

/**
 * An application's navigation: a list of links to its screens, the current one marked.
 *
 * **The platform's landmark, on the consumer's `<nav>`.** The selector demands the element, so
 * the `navigation` role and its name are the platform's: name it with the native
 * `aria-label` when the page holds a second navigation — a breadcrumb is one. Inside it this
 * component writes the one thing `<nav>` does not give, a `role="list"`, so a reader says how
 * many screens there are; each link stands in a `pct-nav-item`, the `listitem`, because a link
 * standing directly in a list is the arrangement 0054 measured as a critical violation in every
 * engine.
 *
 * **It writes no `aria-current`.** The current screen is the router's sentence
 * (`routerLinkActive` with `ariaCurrentWhenActive="page"`) or the consumer's hand, and this
 * component draws the attribute wherever it stands — the breadcrumb's rule, one component over.
 *
 * **It does not move itself.** At the side on a wide screen and in a `pct-drawer` on a narrow
 * one is a place the application puts it, at the width the application chose: no shell here
 * picks a breakpoint
 * ([0110](../../../../docs/decisions/0110-a-frame-is-three-parts-the-application-arranges.md)).
 *
 * The APG has no pattern for a site's navigation beyond the landmark; the list inside it is
 * the shape the APG's own examples write.
 *
 * @example
 * <nav pctNav aria-label="Screens">
 *   <pct-nav-item>
 *     <a pctNavLink routerLink="/rooms" routerLinkActive ariaCurrentWhenActive="page">
 *       <pct-icon pctNavIcon name="home" />Rooms
 *     </a>
 *   </pct-nav-item>
 * </nav>
 *
 * @since next
 */
@Component({
  selector: 'nav[pctNav]',
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
  host: { class: 'pct-nav' },
})
export class PctNav {}

/**
 * One screen of the navigation: `role="listitem"`, the step `pct-crumb` is for the breadcrumb.
 *
 * @since next
 */
@Component({
  selector: 'pct-nav-item',
  templateUrl: './nav-item.html',
  styleUrl: './nav-item.scss',
  host: {
    class: 'pct-nav__item',
    // The platform's own name for "one of these" — the native `<li>` is out of reach on a
    // custom element, so the role is declared on the element that is there.
    role: 'listitem',
  },
})
export class PctNavItem {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLooseItem());
  }

  /**
   * An item whose parent element is not the list is a `listitem` with no `list` directly above
   * it — outside `nav[pctNav]`, or wrapped in something inside it. Asked of the platform once,
   * when the item first stands in the document, and only in dev mode.
   */
  private warnOnLooseItem(): void {
    // Rendered, so it has a parent: the host stands in the template that declared it.
    if (
      (this.host.nativeElement.parentElement as HTMLElement).getAttribute(
        'role',
      ) === 'list'
    )
      return;
    console.warn(
      `[pct-nav-item] An item whose parent element is not a list. \`role="listitem"\` needs \`role="list"\` directly above it — axe counts the loose arrangement as a critical violation in every engine. Make the item a direct child of <nav pctNav>.`,
    );
  }
}

/**
 * The navigation's link, on the consumer's own anchor: an icon, the screen's name, and the
 * mark of the current screen when the anchor carries `aria-current`.
 *
 * A component and not a directive for `lesson-96`'s reason: the consumer's anchor keeps the
 * encapsulation of the template it was written in, and a directive carries no stylesheet. The
 * navigation itself — `href`, `routerLink`, the middle click, the status bar — stays the
 * platform's.
 *
 * @example
 * <a pctNavLink routerLink="/rooms" routerLinkActive ariaCurrentWhenActive="page">
 *   <pct-icon pctNavIcon name="home" />Rooms
 * </a>
 *
 * @since next
 */
@Component({
  selector: 'a[pctNavLink]',
  templateUrl: './nav-link.html',
  styleUrl: './nav-link.scss',
  host: { class: 'pct-nav__link' },
})
export class PctNavLink {}
