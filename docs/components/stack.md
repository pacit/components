# `PctStack` — the space between blocks, from the scale

**Entrypoint:** `@pacit/components/stack`
**Selector:** `pct-stack`
**Status:** released
**ARIA APG pattern:** none — layout is presentational and this host carries **no ARIA at
all** (0057). The unit suite pins the absence itself. Named in the class JSDoc.

The second layout primitive
([0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md)): a flex column
whose blocks stand one chosen step apart. The step comes from the spacing scale through the
shared `sm | md | lg` axis, so rhythm is picked, not typed — and because it is a flex `gap`,
it cannot collapse, spaces **between** blocks only, and leaves the first and last block
flush with the host: three properties margins never manage together.

## Contract

|             |                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none                                                                                                                                                 |
| **Inputs**  | `gap` (`'sm' \| 'md' \| 'lg'`, default `'md'`) — reflected as `data-pct-gap`, the hook the stylesheet's size selectors read                          |
| **Outputs** | none                                                                                                                                                 |
| **Slots**   | one default slot: the blocks, spaced in DOM order                                                                                                    |
| **Parts**   | none — the host is the whole drawing                                                                                                                 |
| **Tokens**  | `--pct-stack-gap`, `--pct-stack-gap-sm`, `--pct-stack-gap-lg`; **no entry in `contrast.policy.json`, deliberately** — the component paints no colour |
| **Strings** | none                                                                                                                                                 |

**Why `gap` is not `PCT_CONFIG.defaultSize`.** That default names how big _controls_ are,
and a page's rhythm is not a control height — a `compact` form is no reason for sections to
touch. For the same reason the attribute is `data-pct-gap`, not `data-pct-size`: the size
axis of [`req-api-size`](../requirements/api.md#req-api-size) promises equal _heights_, and
a stack has none to promise.

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: not interactive, nothing focusable added, no handler anywhere.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/stack/src/stack.ts`                                                                                                                                                                                                  |
| Keyboard map tested key by key                             | the empty map is the claim: `stack.spec.ts › "carries no ARIA at all"` plus `layout.spec.ts › "none of the three carries a single ARIA attribute"`, three engines                                                                     |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                       |
| Visual screenshot                                          | deliberately none of its own: the three gaps are ruler readings — `layout.spec.ts` measures 8, 16 and 24 px between real boxes AND the flush first edge, which pixels would only restate                                              |
| `forced-colors: active` — no state carried by colour alone | not applicable — `stack.scss` paints nothing                                                                                                                                                                                          |
| `prefers-reduced-motion` — duration from a token           | not applicable — nothing moves                                                                                                                                                                                                        |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                                                                             |
| Size axis aligned to `--pct-control-height-*`              | deliberately not — the `gap` axis reuses the scale's three words but measures distance, not height; the reasoning is the card's own paragraph above and 0057                                                                          |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `stack.scss` holds one `flex-direction: column` and three gaps — nothing directional exists to flip, and `check-styles` enforces the logical rule over the file anyway                                                                |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/layout` in `SBX_ROUTES`                                                                                                                                                                  |
| Forms                                                      | not applicable                                                                                                                                                                                                                        |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — a component with no parts is itself the entry                                                                                                                                                   |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/tokens.snapshot.md` — three `--pct-stack-*` names; no contrast entry, deliberately: no colour painted                                                                                                                    |
| Strings through `PCT_TEXTS`                                | not applicable                                                                                                                                                                                                                        |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./stack` **879 B on `@angular/core` alone** — the `PctSize` import is a type, so even the shared axis costs no `./core` at runtime                                                              |
| A screen-reader test log                                   | not applicable — nothing is added to the tree                                                                                                                                                                                         |
| A docs page with live examples                             | `apps/sandbox/src/app/views/layout/` (the sandbox view). The published documentation site: none — gap: `apps/docs` (plan §2.1)                                                                                                        |
| Unit + mutation                                            | `libs/components/stack/src/stack.spec.ts` — 4 cases; targeted Stryker run 2026-09-02: **1 mutant, 1 killed — 100.00** (the `'md'` default swapped away dies on the default-gap case). The snapshot row lands with the shared full run |

## Decisions this component implements

[0057](../decisions/0057-layout-is-three-entrypoints-not-a-framework.md) (the main one — the
scale as the only input, the refused config default, the refused `data-pct-size`),
[0013](../decisions/0013-no-headless-split.md) (tokens as the styling contract).

## Known limitations

- **No horizontal mode.** A wrapping row is a different primitive (`pct-cluster`), refused
  in 0057 until something in the repository needs it twice — the extraction law of
  [`lesson-21`](../lessons.md#lesson-21).
- **The scale is the only input.** An arbitrary length is not a `gap` value; a consumer who
  truly needs 13px overrides `--pct-stack-gap` in a scope and owns the deviation.
- **Foreign margins still apply.** The stack does not reset the margins its blocks bring;
  `gap` adds to them. Resetting other people's styles is a thing this library does not do
  anywhere, and starting here would be the surprise.
