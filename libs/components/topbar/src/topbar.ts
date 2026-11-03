import { Component } from '@angular/core';

/**
 * The screen's title in the top bar: the consumer's heading, at the level the page's outline
 * needs, in the bar's type, on one line that ends in an ellipsis when the bar runs out of room.
 *
 * The cut is the eye's alone: the whole title stays in the document, so a reader and the
 * browser's find-in-page meet all of it.
 *
 * @example
 * <h1 pctTopbarTitle>Living room</h1>
 *
 * @since 0.3.0
 */
@Component({
  selector: '[pctTopbarTitle]',
  templateUrl: './topbar-title.html',
  styleUrl: './topbar-title.scss',
  host: { class: 'pct-topbar-title' },
})
export class PctTopbarTitle {}

/**
 * An application's top bar: three slots on one row — the start (the button that opens the
 * navigation on a narrow screen, a brand), the screen's title, and the end (actions, the
 * signed-in user, sign-out).
 *
 * **The platform's banner, on the consumer's `<header>`.** The selector demands the element: a
 * `<header>` that is not inside an `<article>`, an `<aside>`, a `<main>`, a `<nav>` or a
 * `<section>` is the page's `banner` landmark in every engine, and inside one of them it is
 * not — which is the answer the page's outline gives, not one this bar could guess. It writes
 * no role of its own
 * ([0110](../../../../docs/decisions/0110-a-frame-is-three-parts-the-application-arranges.md)).
 *
 * **No breakpoint.** The bar draws one row at every width: the title gives way first, cut to an
 * ellipsis, and the start and the end keep their size. What the bar holds on a narrow screen —
 * a menu button in place of the navigation, an avatar in place of the user's name — is the
 * application's decision, made where it decides the rest of its layout
 * ([0057](../../../../docs/decisions/0057-layout-is-three-entrypoints-not-a-framework.md)).
 *
 * @example
 * <header pctTopbar>
 *   <button pctButton pctTopbarStart [pctDrawerTrigger]="menu">Menu</button>
 *   <h1 pctTopbarTitle>Living room</h1>
 *   <button pctButton pctTopbarEnd variant="ghost">Sign out</button>
 * </header>
 *
 * @since 0.3.0
 */
@Component({
  selector: 'header[pctTopbar]',
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  host: { class: 'pct-topbar' },
})
export class PctTopbar {}
