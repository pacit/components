import { SBX_ROUTES } from '../src/support/views';

/**
 * The one gesture per view that OPENS something, for the half of the reading a Tab walk
 * cannot reach (position 4.71).
 *
 * Nine component cards end their reading with the same question — what a reader announces
 * when a section, a drawer, a modal, a menu, a popover, a toast, a month grid, a tab panel or
 * a listbox appears — and until this table the answer for all nine was the same: the walk pressed Tab and nothing else, so nothing in any of the three
 * logs had ever been opened. For a tree, arrival is most of the story. For a dialog it is
 * none of it — opening IS the component.
 *
 * **This is a table and not a framework, deliberately.** One act per view, no sequences, no
 * conditions, no second gesture: what it buys is the first announcement after the thing
 * appears, which is the one every card asks for. A longer script would be a second home for
 * the keyboard map the component templates and the e2e suites already own
 * ([0017](../../../docs/decisions/0017-one-home-per-fact.md)), so `owner` CITES the case that
 * owns the gesture instead of restating what it does.
 *
 * (No glob may name a directory-then-file pattern in this comment: the first version wrote one
 * out in full, the slash-star-slash in it CLOSED the block, and the prose after it was parsed
 * as code — `ReferenceError: src is not defined`, thrown at import, before a single view. The
 * apostrophe warning in `tools/at-pass.sh` is the same defect in another language.)
 *
 * The key is pressed by the READER and the control is focused outright, which is the same
 * arrangement `enter` uses for a view's first stop — a keystroke the reader did not make is a
 * keystroke it cannot report, and that is measured rather than assumed (see `Reader.press`).
 */
export interface Act {
  /** What is expected to appear. It names the row in the record and nothing else. */
  readonly what: string;
  /** The control that opens it, in the sandbox's own markup. */
  readonly on: string;
  /** The key the reader presses on that control. */
  readonly key: string;
  /** The end-to-end case that owns this gesture — cited, never restated. */
  readonly owner: string;
}

/**
 * Nine views, nine acts — every card that ends its reading with an opening question, counted
 * by grepping them rather than by remembering. A view absent from here is walked and not acted
 * on, which is the ordinary case: most components have nothing to open.
 */
export const ACTS: Readonly<Record<string, Act>> = {
  '/accordion': {
    what: 'a revealed section',
    on: '[data-testid="item-payment"] [data-pct-part="heading"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/accordion.spec.ts',
  },
  '/drawer': {
    what: 'a named region beside the page',
    on: '[data-testid="trigger-nav"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/drawer.spec.ts',
  },
  '/dialog': {
    what: 'a modal dialog',
    on: '[data-testid="open-basic"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/dialog.spec.ts',
  },
  '/menu': {
    what: 'a menu',
    on: '[data-testid="actions-trigger"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/menu.spec.ts',
  },
  '/popover': {
    what: 'a non-modal dialog',
    on: '[data-testid="panel-trigger"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/popover.spec.ts',
  },
  '/toast': {
    what: 'a message in a live region',
    on: '[data-testid="raise-notice"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/toast.spec.ts',
  },
  '/date': {
    what: 'a month grid',
    on: '[data-testid="date-starts-on"] [data-pct-part="toggle"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/date.spec.ts',
  },
  '/tabs': {
    // The odd one out, and it is the pattern's doing rather than this table's: nothing pops
    // up over a tab strip. What "opens" is the panel the arrow key reveals, so the act starts
    // on the tab that is already selected and moves off it.
    what: 'the panel behind the next tab',
    on: '[data-testid="tabs-basic"] [data-pct-part="tab"][aria-selected="true"]',
    key: 'ArrowRight',
    owner: 'apps/sandbox-e2e/src/tabs.spec.ts',
  },
  '/select': {
    what: 'a listbox',
    on: '[data-testid="select-country"] [data-pct-part="trigger"]',
    key: 'Enter',
    owner: 'apps/sandbox-e2e/src/select.spec.ts',
  },
};

/**
 * A route in this table that the walk does not visit is an act nobody performs, and it would
 * be invisible: the walk would simply never look it up. Said once, at import, because a typo
 * here costs a reader pass to find out about (`lesson-210` — a name that resolves to nothing,
 * in a file nothing had ever executed).
 */
const strays = Object.keys(ACTS).filter(
  (route) => !SBX_ROUTES.includes(route as (typeof SBX_ROUTES)[number]),
);
if (strays.length)
  throw new Error(
    `at/acts.ts names ${strays.length} route(s) the walk never visits: ` +
      `${strays.join(', ')}. The walk reads SBX_ROUTES, so an act on a route outside it is ` +
      `never performed and never reported.`,
  );
