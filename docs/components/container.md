# `PctContainer` — a reading column capped by a token

**Entrypoint:** `@pacit/components/container`
**Selector:** `pct-container`
**Status:** released
**ARIA APG pattern:** none — layout is presentational and this host carries **no ARIA at
all**: no role, no label, not one `aria-*` attribute. The unit suite pins the absence
itself, so a future "helpful" attribute is a red test. Named in the class JSDoc.

The first of the three layout primitives
([0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md)): content capped
at `--pct-container-max-width`, centred, with a gutter that follows the viewport through a
`clamp()`. The host also declares `container-type: inline-size`, so everything projected
into the column can measure against **this column** with a container query instead of
guessing at a viewport a sidebar may have eaten half of.

## Contract

|             |                                                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — a column holds no value                                                                                                                                                |
| **Inputs**  | **none, deliberately.** Both lengths are tokens, and a token scoped on the element is the per-instance API (0057): `<pct-container style="--pct-container-max-width: 60rem">` |
| **Outputs** | none — nothing happens to a column                                                                                                                                            |
| **Slots**   | one default slot: the column's content                                                                                                                                        |
| **Parts**   | none — the host is the whole drawing, and there is nothing inside it but the consumer's own content                                                                           |
| **Tokens**  | `--pct-container-max-width`, `--pct-container-padding-x`; **no entry in `contrast.policy.json`, deliberately** — the component paints no colour at all                        |
| **Strings** | none — the component draws no text                                                                                                                                            |

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: the container is not interactive and adds nothing focusable. The
projected content keeps its own keyboard, untouched — there is no handler in the component
to intercept anything with.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/container/src/container.ts` — "no ARIA at all", and the reason                                                                                                                                                                                                                                                                                                                                 |
| Keyboard map tested key by key                             | the empty map is the claim: `container.spec.ts › "carries no ARIA at all"` plus `layout.spec.ts › "none of the three carries a single ARIA attribute"` — no role, no `aria-*`, nothing focusable added, in three engines                                                                                                                                                                                        |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                 |
| Visual screenshot                                          | deliberately none of its own: the cap, the centring and the clamp are ruler readings in `apps/sandbox-e2e/src/layout.spec.ts`, and pixels would re-prove the same numbers blurrier. The `/layout` view's baseline is the grid card's                                                                                                                                                                            |
| `forced-colors: active` — no state carried by colour alone | not applicable — the component paints nothing: no colour, no border, no background stands in `container.scss`, so forced colours has nothing to replace                                                                                                                                                                                                                                                         |
| `prefers-reduced-motion` — duration from a token           | not applicable — nothing moves                                                                                                                                                                                                                                                                                                                                                                                  |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                                                                                                                                                                                                                                                       |
| Size axis aligned to `--pct-control-height-*`              | not applicable — a column is not a control and has no height of its own                                                                                                                                                                                                                                                                                                                                         |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                          |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `container.scss` is logical throughout (`max-inline-size`, `margin-inline`, `padding-inline` — `req-token-logical`, enforced by `check-styles`); nothing directional is drawn, so no RTL baseline of its own                                                                                                                                                                                                    |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                            |
| Forms                                                      | not applicable — implements no `FormValueControl`                                                                                                                                                                                                                                                                                                                                                               |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — a component with no parts is itself the entry                                                                                                                                                                                                                                                                                                                             |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/tokens.snapshot.md` — two `--pct-container-*` names; the contrast policy deliberately holds no entry, because the component paints no colour                                                                                                                                                                                                                                                       |
| Strings through `PCT_TEXTS`                                | not applicable — no text at all                                                                                                                                                                                                                                                                                                                                                                                 |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./container` **717 B on `@angular/core` alone**: no `./core`, no config, no texts — a column is one class and one stylesheet                                                                                                                                                                                                                                              |
| A screen-reader test log                                   | not applicable — the component adds nothing to the accessibility tree; a reader hears only the projected content                                                                                                                                                                                                                                                                                                |
| A docs page with live examples                             | `apps/sandbox/src/app/views/layout/` (the sandbox view). The published documentation site: none — gap: `apps/docs` (plan §2.1)                                                                                                                                                                                                                                                                                  |
| Unit + mutation                                            | `libs/components/container/src/container.spec.ts` — 2 cases; the targeted Stryker run of 2026-09-02 generates **zero mutants** for `container.ts` — a class with no logic offers nothing to break. The file stays in `mutation.policy.json`, so the day it grows logic the report owes a row — the day's shared full run confirmed it: zero mutants, and the snapshot owes no row to a file that generates none |

## Decisions this component implements

[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) (the main one — why
three entrypoints, why no probe, why no inputs, why `container-type` costs nothing),
[0013](../decisions/0013-no-headless-split.md) (tokens as the whole styling contract — which
is why the cap and the gutter are two tokens and not two inputs).

## Known limitations

- **The gutter's `clamp()` lives in one token.** A theme overriding
  `--pct-container-padding-x` owns the whole expression — floor, slope and ceiling — not a
  parameter of it. Recorded in 0057's costs.
- **`container-type: inline-size` makes the host a query container, not a positioning
  ancestor.** Size containment does not change what `position: absolute` resolves against;
  the two are unrelated, and the name reads scarier than what it does.
- **The cap follows the root font size.** `72rem` widens with a reader's larger type on
  purpose; a fixed-pixel column is one token override away, not a second component.
- **No nesting rule.** A container inside a container simply caps twice; nothing warns,
  because nothing breaks — the inner one just has no effect until the outer one is wider.
