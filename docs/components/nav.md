# `PctNav` — the screens of an application, the current one marked

**Summary:** A list of links to an application's screens, each with an icon and a name, and the current one marked — at the side on a wide screen and in a drawer on a narrow one, wherever the application puts it.
**Entrypoint:** `@pacit/components/nav`
**Selectors:** `nav[pctNav]`, `pct-nav-item`, `a[pctNavLink]`
**Status:** released
**Category:** Actions & navigation
**ARIA APG pattern:** none — the APG has no pattern for a site's navigation beyond the
`navigation` landmark, which is the consumer's `<nav>`; inside it a `role="list"` and a
`listitem` per link, the shape the APG's own examples write, and `aria-current="page"` on the
current screen. Named in the class JSDoc.

**The landmark is the platform's, the list is the library's.** The consumer writes the `<nav>`
and names it with `aria-label` when the page holds another; the component writes the list in
it, so a reader is told how many screens there are, and `pct-nav-item` carries the `listitem`
around each link — a link standing directly in a list is a critical violation in every engine
([0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md) measured it for the
breadcrumb). Every link is the consumer's own `<a>`: `routerLink`, the middle click and the
status bar stay the platform's.

**The current screen is `aria-current`.** The component writes none: the router writes it
(`routerLinkActive` with `ariaCurrentWhenActive="page"`), or the consumer binds it (`null` or
`"false"` for the others), and the
link draws it three ways — a tint, a bar at the start edge and a weight — so the forced-colours
mode, which drops the tint, keeps the bar and the weight.

**It does not move itself.** At the side on a wide screen and in a `pct-drawer` on a narrow one
is the application's arrangement: one `<ng-template>` of the navigation rendered in a column or
in the drawer, at the width the application chose, read after the first render
([0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md)).

## Usage

```html
<nav pctNav aria-label="Screens">
  <pct-nav-item>
    <a pctNavLink routerLink="/rooms" routerLinkActive ariaCurrentWhenActive="page">Rooms</a>
  </pct-nav-item>
</nav>
```

## Contract

|             |                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| **Value**   | none                                                                                                         |
| **Inputs**  | none — the name is the native `aria-label` on `<nav>`, the current screen the native `aria-current` on `<a>` |
| **Outputs** | none — a link is the consumer's anchor                                                                       |
| **Slots**   | `pct-nav-item` in `nav[pctNav]`; the link in the item; `[pctNavIcon]` and the screen's name in the link      |
| **Parts**   | `list`, `icon`, `label`                                                                                      |
| **Harness** | `PctNavHarness`, `PctNavItemHarness`, `PctNavLinkHarness`                                                    |
| **Tokens**  | the `--pct-nav-*` prefix plus five entries in `contrast.policy.json`                                         |
| **Strings** | none — the landmark's name is the consumer's `aria-label`, so `PCT_TEXTS` grows no key                       |

**Close the drawer yourself.** In a drawer, a link pressed should shut it: call
`drawer.close('api')` beside your own navigation. The drawer gives the keyboard back to the
button that opened it. Shut it too before a widening takes the navigation out of it — an open
drawer with nothing in it stays open — and give the keyboard to the menu button when a
narrowing takes away the column that held it (`apps/sandbox/src/app/views/frame/`).

## Parts

| part    | what it is                                  |
| ------- | ------------------------------------------- |
| `list`  | the `role="list"` inside the landmark       |
| `icon`  | the region of the link's icon, at its start |
| `label` | the region of the screen's name             |

## Theming

```css
[data-theme='brand'] {
  --pct-nav-link-bg-current: #ccfbf1;
  --pct-nav-link-fg-current: #115e59;
  --pct-nav-marker-color: #0f766e;
}
```

## Keyboard map

| key                 | effect                                       | test                                                                                                 |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves from link to link, in the list's order | `apps/sandbox-e2e/src/frame.spec.ts` — "Tab walks the bar in its reading order, then the navigation" |
| `Enter`             | on a link, follows it                        | the same case; the following is the platform's                                                       |

There are no handlers to map: every link is an anchor and answers the keyboard on its own. A
roving tab stop would be the menu's pattern, and a navigation is not a menu.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/nav/src/nav.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/frame.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `frame-app` and `frame-app-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `forced-colors: active` — no state carried by colour alone | `libs/components/nav/src/nav-link.scss` — the current screen is a bar and a weight besides the tint; the bar `Highlight`, the links `LinkText`. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `prefers-reduced-motion` — duration from a token           | not applicable — the navigation moves nothing; the drawer it may stand in follows its own card                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Touch target ≥ 24×24 px outright                           | `libs/tokens/src/component.nav.json` — a link's height is `--pct-control-height-md`, 36 px (32 px compact), over the whole width of the row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Size axis aligned to `--pct-control-height-*`              | `libs/tokens/src/component.nav.json` — `--pct-nav-link-height` is the `md` control height                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Density axis                                               | `libs/tokens/src/component.nav.json` — the link's padding and the gap inside it stand on `space.3` and `space.4`, which the compact scope re-points, and its height on `control.height.md`, which it lowers; the gap between links stands on `space.2`, which the compact scope leaves                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot `frame-app-rtl`, where the bar of the current screen stands at the right                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Forms                                                      | not applicable — a navigation holds no value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — the three parts above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — a link at rest, under the pointer and current (AA error), the bar of the current screen (UI error), the icon (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Strings through `PCT_TEXTS`                                | not applicable — the component writes no word of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./nav` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Screen-reader log                                          | Read 2026-11-02 from `docs/acr/at/` — three readers, whole sandbox. **The landmark, its name, the count and the current screen**: Orca on entering `navigation · Screens · List with 4 items · Rooms · link.`, then `Devices · link. · (Current page)`; NVDA `Screens, navigation landmark, list, with 4 items, Rooms, same page, link` on the first link — NVDA's words are from the walk of 2026-11-10, its count of items new since the walk of 2026-11-05, the first to hear it whole after a key ([`lesson-258`](../lessons.md#lesson-258)) — then `Devices, same page, link, current page`. VoiceOver reached the bar's `Sign out` and lost the page before the navigation, so it has not read it |
| A docs page with live examples                             | `apps/sandbox/src/app/views/frame/` (the sandbox view). The published site: `/components/nav`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Unit + mutation                                            | `libs/components/nav/src/nav.spec.ts`; `libs/components/mutation.snapshot.md` — `nav.ts`, measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Decisions this component implements

[0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md) (the main one —
the consumer's `<nav>`, the list in it, and no breakpoint),
[0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md) (`aria-current` the
consumer writes, and the wrapper a link needs in a list),
[0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) (the drawer
the navigation moves into).

## Known limitations

- **No groups and no nesting.** One flat list of screens; a heading between groups, or a screen
  with screens under it, is not drawn. A second `nav[pctNav]` under a heading of the
  application's is a group.
- **No rail.** There is no narrow form of icons alone between the column and the drawer.
- **A forgotten `aria-current` is silent.** A page with no current screen is legitimate, so
  nothing can warn about a link the consumer forgot to mark.
- **It does not close the drawer it stands in.** A link pressed in a drawer leaves it open
  until the application closes it.
