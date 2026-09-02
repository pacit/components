# `PctGrid` — a grid that finds its own column count

**Entrypoint:** `@pacit/components/grid`
**Selector:** `pct-grid`
**Status:** released
**ARIA APG pattern:** none — layout is presentational and this host carries **no ARIA at
all** (0057). In particular it is **not** `role="grid"`: that role names a keyboard-walked
widget of cells, and calling a card layout a grid widget is a claim screen-reader users pay
for. The unit suite pins the absence. Named in the class JSDoc.

The third layout primitive
([0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md)), and the whole of
it is one declaration:
`repeat(auto-fit, minmax(min(100%, var(--pct-grid-min-width)), 1fr))`. The consumer states
the one thing only they know — how narrow a card may get — and the engine derives every
"breakpoint" from it. **Responsive without a media query in consumer code**, or in this
component's own: the e2e suite watches the column count change with the viewport while the
stylesheet names no width anywhere.

## Contract

|             |                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none                                                                                                                                                        |
| **Inputs**  | **none, deliberately.** Per-instance tuning is the token scoped on the element (0057): `<pct-grid style="--pct-grid-min-width: 8rem">` packs denser columns |
| **Outputs** | none                                                                                                                                                        |
| **Slots**   | one default slot: the cards, flowed in DOM order                                                                                                            |
| **Parts**   | none — the host is the whole drawing                                                                                                                        |
| **Tokens**  | `--pct-grid-min-width`, `--pct-grid-gap`; **no entry in `contrast.policy.json`, deliberately** — the component paints no colour                             |
| **Strings** | none                                                                                                                                                        |

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: not interactive, nothing focusable added. The cards keep their own
keyboard, in DOM order — which is also the visual order, because the grid never reorders.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/grid/src/grid.ts` — including why it is not `role="grid"`                                                                                                                                                                                                                                                                               |
| Keyboard map tested key by key                             | the empty map is the claim: `grid.spec.ts › "carries no ARIA at all"` plus `layout.spec.ts › "none of the three carries a single ARIA attribute"`, three engines                                                                                                                                                                                         |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `layout-grid` and `layout-grid-rtl`: six cards, three columns at the stage width                                                                                                                                                                                                                                 |
| `forced-colors: active` — no state carried by colour alone | not applicable — `grid.scss` paints nothing                                                                                                                                                                                                                                                                                                              |
| `prefers-reduced-motion` — duration from a token           | not applicable — the column count changes at resize, but through layout, not animation; nothing here declares motion                                                                                                                                                                                                                                     |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                                                                                                                                                                                                |
| Size axis aligned to `--pct-control-height-*`              | not applicable — no height of its own                                                                                                                                                                                                                                                                                                                    |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density)); the scoped `--pct-grid-min-width` demo is what density will one day generalise                                                                                                                                                   |
| RTL — no physical properties + a `dir="rtl"` screenshot    | grid flow is writing-mode aware on its own — the component writes no direction anywhere, and the `layout-grid-rtl` baseline proves the flow flips anyway                                                                                                                                                                                                 |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                     |
| Forms                                                      | not applicable                                                                                                                                                                                                                                                                                                                                           |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — a component with no parts is itself the entry                                                                                                                                                                                                                                                                      |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/tokens.snapshot.md` — two `--pct-grid-*` names; no contrast entry, deliberately: no colour painted                                                                                                                                                                                                                                          |
| Strings through `PCT_TEXTS`                                | not applicable                                                                                                                                                                                                                                                                                                                                           |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./grid` **673 B on `@angular/core` alone**, because the whole component is one declaration (the smallest entrypoint for two hours, until the theme directive's 518 B)                                                                                                                                              |
| A screen-reader test log                                   | not applicable — nothing is added to the tree                                                                                                                                                                                                                                                                                                            |
| A docs page with live examples                             | `apps/sandbox/src/app/views/layout/` (the sandbox view). The published site: `/components/grid` — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                             |
| Unit + mutation                                            | `libs/components/grid/src/grid.spec.ts` — 2 cases; the targeted Stryker run of 2026-09-02 generates **zero mutants** for `grid.ts` — the whole component is one CSS declaration, and CSS is what the e2e ruler measures instead. In `mutation.policy.json` regardless — the day's shared full run confirmed the zero, so the snapshot owes it no row yet |

## Decisions this component implements

[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) (the main one — the
one-declaration design, the overflow guard, the token as the input, the refused prop
system), [0013](../decisions/0013-no-headless-split.md) (tokens as the styling contract).

## Known limitations

- **Equal columns only.** No spans, no featured-card-twice-as-wide, no masonry — those are
  layouts with opinions about content, and this grid has exactly one opinion: a minimum. A
  page needing spans writes its own `grid-template-areas` where it can see them.
- **A single child stretches full width.** `auto-fit` collapses the empty tracks, so one
  card in a wide grid is one wide card. That is the declaration's honest reading, recorded
  so nobody files it as a bug.
- **DOM order is visual order, always.** The grid never reorders, so the tab sequence and
  the reading sequence stay the document's — which is a limitation only for designs that
  wanted them to differ, and those pay for it in any layout system.
