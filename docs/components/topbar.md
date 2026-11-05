# `PctTopbar` — a start, the screen's title and an end

**Summary:** The bar across the top of an application: a start for the menu button or a brand, the screen's title, and an end for actions, the signed-in user and sign-out, on one row at every width.
**Entrypoint:** `@pacit/components/topbar`
**Selectors:** `header[pctTopbar]`, `[pctTopbarTitle]`
**Status:** released
**Category:** Layout & theming
**ARIA APG pattern:** none — the bar is the consumer's `<header>`, which the platform makes the
page's `banner` landmark when it stands outside an `<article>`, `<aside>`, `<main>`, `<nav>` or
`<section>`. The bar writes no role. Named in the class JSDoc.

**Three slots on one row.** `[pctTopbarStart]` holds what comes before the title — the button
that opens the navigation on a narrow screen, a brand; the default slot holds the title, the
consumer's heading dressed by `pctTopbarTitle`; `[pctTopbarEnd]` holds the actions, the user
and sign-out. They read in that order, and a region nothing was projected into takes no room.

**No breakpoint.** The bar never changes shape: the title takes what is left between the start
and the end and gives way first, cut to an ellipsis for the eye while the whole of it stays in
the document. What the bar holds on a narrow screen — a menu button in place of the navigation,
initials in place of a name — is the application's to decide, at the width it chose
([0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md), the edge
[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) drew).

## Usage

```html
<header pctTopbar>
  <h1 pctTopbarTitle>Living room</h1>
  <button pctButton pctTopbarEnd variant="outline">Sign out</button>
</header>
```

## Contract

|             |                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Value**   | none                                                                                           |
| **Inputs**  | none — the bar's lengths and colours are tokens, scoped on the element when one bar differs    |
| **Outputs** | none — the controls are the consumer's                                                         |
| **Slots**   | `[pctTopbarStart]`; the title by default (`[pctTopbarTitle]` on the heading); `[pctTopbarEnd]` |
| **Parts**   | `start`, `heading`, `end`                                                                      |
| **Harness** | `PctTopbarHarness`, `PctTopbarTitleHarness`                                                    |
| **Tokens**  | the `--pct-topbar-*` prefix plus two entries in `contrast.policy.json`                         |
| **Strings** | none — every word in the bar is the consumer's                                                 |

**The heading is yours.** Write `pctTopbarTitle` on the heading the page's outline needs —
`h1` when the bar names the screen — and the bar takes its margins off and gives it its type.

**A narrow screen is a template branch.** Put the drawer's trigger in the start only while the
navigation is in the drawer, and read the width after the first render (`afterNextRender` and
`matchMedia`): a branch the server did not take is a hydration mismatch.

## Parts

| part      | what it is                                   |
| --------- | -------------------------------------------- |
| `start`   | the region before the title                  |
| `heading` | the region of the title, taking what is left |
| `end`     | the region after the title, at the bar's end |

## Theming

```css
[data-theme='brand'] {
  --pct-topbar-bg: #f0fdfa;
  --pct-topbar-fg: #134e4a;
  --pct-topbar-border: #99f6e4;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: the bar handles no key. `Tab` walks its controls in the reading order of
its slots — start, title, end — measured in `apps/sandbox-e2e/src/frame.spec.ts`, "Tab walks
the bar in its reading order, then the navigation".

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/topbar/src/topbar.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Keyboard map tested key by key                             | not applicable — no handler; the reading order is measured in `apps/sandbox-e2e/src/frame.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `frame-app` and `frame-app-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `forced-colors: active` — no state carried by colour alone | `libs/components/topbar/src/topbar.scss` — the edge `CanvasText`; the bar has no state. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                |
| `prefers-reduced-motion` — duration from a token           | not applicable — the bar moves nothing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Touch target ≥ 24×24 px outright                           | not applicable — the bar's targets are the consumer's controls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: the bar is not a control; its height is a floor of its own (`--pct-topbar-height`), above the tallest control it holds                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Density axis                                               | `libs/tokens/src/component.topbar.json` — the padding and the gap stand on `space.3` and `space.5`, which the compact scope re-points                                                                                                                                                                                                                                                                                                                                                                                                                            |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot `frame-app-rtl`, where the end stands at the left                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/frame` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Forms                                                      | not applicable — the bar holds no value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — the three parts above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — the text on the bar (AA error), the edge (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Strings through `PCT_TEXTS`                                | not applicable — the component writes no word of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./topbar` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Screen-reader log                                          | Read 2026-11-02 from `docs/acr/at/` — three readers, whole sandbox. **The bar's controls are read as themselves, in the bar's order**: Orca `Sign out · button.` and, on the long title's bar, `Edit · button.`; NVDA `Edit, button`; VoiceOver `Sign out button` (`8c89e2f9`; its hint for a button on 2026-11-05), and lost the page after it. The bars of `/frame` stand inside the sandbox's `<main>`, so none of the three is a banner and no reader said one — the landmark is the platform's answer where the outline makes the `<header>` the page's own |
| A docs page with live examples                             | `apps/sandbox/src/app/views/frame/` (the sandbox view). The published site: `/components/topbar`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Unit + mutation                                            | `libs/components/topbar/src/topbar.spec.ts`; the narrow Stryker run of 2026-11-02 generates **zero mutants** for `topbar.ts` — two classes with no logic offer nothing to break. The file stays in `mutation.policy.json`, so the day it grows logic the report owes a row                                                                                                                                                                                                                                                                                       |

## Decisions this component implements

[0110](../decisions/0110-a-frame-is-three-parts-the-application-arranges.md) (the main one —
three parts and no shell, the platform's `<header>`),
[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) (no breakpoint in the
library),
[0095](../decisions/0095-every-component-is-mit-and-the-order-is-what-a-consumer-needs.md)
(why the frame is built now).

## Known limitations

- **Not sticky.** The bar scrolls with the page. `position: sticky` and `inset-block-start: 0`
  on the consumer's `<header>` keep it up; the bar does not choose for every application.
- **One row only.** There is no second row for tabs or a search field under the title; a row
  of the application's own under the bar is one.
- **The title is cut, not wrapped.** A long title ends in an ellipsis; its full text is in the
  document for a reader and find-in-page, and for the eye only through a tooltip the
  application adds.
- **A banner only where the platform says.** Inside a `<main>` or a `<section>` the `<header>`
  is no landmark, and the bar does not force one.
