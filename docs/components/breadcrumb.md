# `PctBreadcrumb` — the way here, told in links

**Summary:** The trail to the current page, told in links, with the page itself at the end of it.
**Entrypoint:** `@pacit/components/breadcrumb`
**Selectors:** `pct-breadcrumb`, `pct-crumb`, `a[pctCrumbLink]`
**Status:** released
**Category:** Actions & navigation
**ARIA APG pattern:** [Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) —
([0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)) a named
`navigation` landmark, a list of links, `aria-current="page"` on the one you are on. Named
in the class JSDoc.

**The anchors are the consumer's; the structure is the library's.** Every step is a real
`<a href>` written by the application — `routerLink`, the middle click, the status bar and
the whole keyboard stay the platform's — and the component carries the landmark, the list
semantics, the quiet separator and the colours. It writes **no `aria-current` of its own**:
the current place is the router's sentence (`routerLinkActive` with
`ariaCurrentWhenActive="page"`) or the consumer's hand, and a guess from position would lie
on every partial trail.

## Usage

```html
<pct-breadcrumb ariaLabel="You are here">
  <pct-crumb><a pctCrumbLink href="/">Home</a></pct-crumb>
  <pct-crumb><a pctCrumbLink href="/data" aria-current="page">Data</a></pct-crumb>
</pct-breadcrumb>
```

## Contract

|             |                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — a trail holds no value                                                                                                                                         |
| **Inputs**  | `ariaLabel` on `pct-breadcrumb` (overrides `texts().breadcrumbLabel` — two trails on one page are two landmarks with two names)                                       |
| **Outputs** | none — activation is navigation, and navigation is the platform's                                                                                                     |
| **Slots**   | the crumbs (children of `pct-breadcrumb`), and each crumb's content — an anchor wearing `pctCrumbLink`, or bare text for a current step that is not a link            |
| **Parts**   | `list` (the `role="list"` box), `separator` (the chevron in every crumb; the first one is hidden by `:first-of-type`)                                                 |
| **Tokens**  | the `--pct-breadcrumb-*` prefix plus four entries in `contrast.policy.json`; the name dictionary grew the parts `link` and `separator` and the state `current` for it |
| **Strings** | `breadcrumbLabel` — the landmark's default name, the pagination's key one landmark over                                                                               |

**Why three pieces.** A custom element cannot be an `<li>`, so `pct-crumb` declares
`role="listitem"` — and the probe behind 0054 measured why the wrapper exists at all: links
standing directly in a `role="list"` are a **critical** `aria-required-children` violation
in all three engines (the `lesson-138` carve-out covers only the _empty_ list).
`a[pctCrumbLink]` is a component on the consumer's own anchor for `lesson-96`'s reason:
projected content keeps the declaring template's encapsulation, a directive cannot carry
styles, and the styling API here does not stand on `::ng-deep`.

**The current step under forced colours.** Every anchor wears `LinkText` no matter the
stylesheet, so the current step carries a **weight** — the channel that survives — and a
current step spelled as bare text is told apart by the palette itself (`CanvasText` beside
`LinkText`).

## Parts

| part        | what it is                  |
| ----------- | --------------------------- |
| `list`      | the ordered list of crumbs  |
| `separator` | the mark between two crumbs |

## Theming

```css
[data-theme='brand'] {
  --pct-breadcrumb-link-fg: #0f766e;
  --pct-breadcrumb-link-fg-hover: #134e4a;
  --pct-breadcrumb-separator-fg: #5eead4;
}
```

## Keyboard map

| key                 | effect                  | test                                                                                                        |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves between the steps | `apps/sandbox-e2e/src/breadcrumb.spec.ts` — "every step is a real tab stop"                                 |
| `Enter`             | follows the link        | none — deliberately: the anchor navigates on its own, and testing it tests the browser (`req-api-platform`) |

There are no handlers to map: nothing here listens to a key.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/breadcrumb/src/breadcrumb.ts`                                                                                                                                                                                                     |
| Keyboard map tested key by key                             | the table above — one row measured, one deliberately the platform's                                                                                                                                                                                |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/breadcrumb` in `SBX_ROUTES`; the audit put the target floor into the stylesheet ([`lesson-139`](../lessons.md#lesson-139))                                                                                 |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `breadcrumb-pattern` and `breadcrumb-pattern-rtl`                                                                                                                                                          |
| `forced-colors: active` — no state carried by colour alone | `libs/components/breadcrumb/src/link.scss` — links `LinkText`, the current step a weight, the separator `CanvasText`. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                    |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                  |
| Touch target ≥ 24×24 px outright                           | `libs/components/breadcrumb/src/link.scss` — `min-block-size: var(--pct-breadcrumb-link-target-min)` on every link, measured in by the axe audit rather than believed                                                                              |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: the trail is typography, not a control — the badge's argument one component over; it is sized by its own type token                                                                                                              |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                             |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `apps/sandbox-e2e/src/rtl.spec.ts` — the trail mirrors and every separator turns (`:dir(rtl)`, the calendar's selector). The screenshot: `breadcrumb-pattern-rtl`                                                                                  |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/breadcrumb` in `SBX_ROUTES`                                                                                                                                                                           |
| Forms                                                      | not applicable — a trail holds no value a form owns                                                                                                                                                                                                |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `list`, `separator`                                                                                                                                                                                          |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — four entries: both link states and the current word against the page (AA error), the separator's edge (UI warn — decorative, and exempt is no reason to stop measuring); `libs/tokens/tokens.snapshot.md` |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `breadcrumbLabel`, read at render time                                                                                                                                                                       |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./breadcrumb` on `./core` and `./icon`                                                                                                                                                                       |
| A screen-reader test log                                   | none — gap: the same one every component here has. The question for the log: that the trail announces as "navigation, Breadcrumb" with a counted list, and that no separator is spoken between the links                                           |
| A docs page with live examples                             | `apps/sandbox/src/app/views/breadcrumb/` (the sandbox view). The published site: `/components/breadcrumb` — prerendered, the demo's own source is the code tab (2.1.7)                                                                             |
| Unit + mutation                                            | `libs/components/breadcrumb/src/breadcrumb.spec.ts` — 12 cases; `libs/components/mutation.snapshot.md` — `breadcrumb.ts` measured in the day's shared full run                                                                                     |

## Decisions this component implements

[0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md) (the main one —
who owns which half, the probe that killed the loose arrangement, why `aria-current` is
never ours to write),
[0048](../decisions/0048-a-pagination-owns-its-page-number.md) (the ownership line drawn
from the other side: a pager emits, a trail navigates),
[0013](../decisions/0013-no-headless-split.md) (tokens as the whole styling contract).

## Known limitations

- **No collapse for long trails.** A trail too long for its line wraps; folding steps into
  an overflow menu is a composition with `pct-menu` owned by the consumer, and it returns
  as its own decision the day a real application shows the need.
- **No `items` input.** An array of `{label, url}` would regenerate anchors the router
  already owns — the markup is the consumer's, which is the component's founding split.
- **The component cannot verify the trail.** A breadcrumb that lies about the hierarchy is
  the application's sentence; the component checks structure (the dev-mode warnings), never
  truth.
- **Bare-text current steps carry no weight.** The weight rides on `[aria-current]`, and
  bare text carries no attribute; it is told apart by colour in the author palette and by
  not-being-a-link in forced colours — a consumer who wants the weight writes the current
  step as a link to itself.
