# `PctTheme` — the theme, spelled from a template

**Entrypoint:** `@pacit/components/theme`
**Selector:** `[pctTheme]`
**Status:** released
**ARIA APG pattern:** none — the directive writes one `data-*` attribute and touches
nothing the accessibility tree carries. Named in the class JSDoc.

Sugar over the cascade
([0059](../decisions/0059-a-theme-is-an-attribute-the-skin-reads.md)): `[pctTheme]="'dark'"`
writes `data-theme="dark"` — the attribute the generated skin keys its theme blocks on —
and `null` removes it, so the system preference speaks again. The mechanism stays the
cascade itself; the sandbox measures a hand-written panel and a directive panel reading
the same computed surface.

## Contract

|             |                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none                                                                                                                                    |
| **Inputs**  | `pctTheme` (`'light' \| 'dark' \| null`, **required**) — `null` hands the subtree back to the system preference                         |
| **Outputs** | none                                                                                                                                    |
| **Slots**   | not applicable — an attribute directive on the consumer's own element                                                                   |
| **Parts**   | none — it draws nothing                                                                                                                 |
| **Tokens**  | **none of its own, deliberately** — the tokens are the skin's; this directive only writes the attribute their theme blocks are keyed on |
| **Strings** | none                                                                                                                                    |

**What it deliberately does not do (0059):** no persistence, no toggle state, no
`matchMedia` — which theme to pin and where to remember it is application policy, written
in the application.

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: not interactive, adds nothing focusable, intercepts nothing.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/theme/src/theme.ts`                                                                                                                                                    |
| Keyboard map tested key by key                             | the empty map is the claim: `theme.spec.ts › "writes nothing else"` — one attribute is the whole surface                                                                                |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — the directive drives the demo stage on **every** view of the sweep, and the kitchen-sink's directive panel sits in `/all`                         |
| Visual screenshot                                          | deliberately none of its own: the directive paints nothing — every dark-stage baseline in `visual.spec.ts` is already a picture of its effect                                           |
| `forced-colors: active` — no state carried by colour alone | not applicable — it paints nothing                                                                                                                                                      |
| `prefers-reduced-motion` — duration from a token           | not applicable — nothing moves                                                                                                                                                          |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                               |
| Size axis aligned to `--pct-control-height-*`              | not applicable                                                                                                                                                                          |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                  |
| RTL — no physical properties + a `dir="rtl"` screenshot    | not applicable — no stylesheet at all                                                                                                                                                   |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — the stage carries the directive on every route of the sweep                                                                                  |
| Forms                                                      | not applicable                                                                                                                                                                          |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — a component with no parts is itself the entry                                                                                                     |
| Tokens registered + an entry in `contrast.policy.json`     | not applicable — no tokens of its own; the pairs it switches between are the skin's, measured per theme by every `tokens:build`                                                         |
| Strings through `PCT_TEXTS`                                | not applicable                                                                                                                                                                          |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./theme` **518 B on `@angular/core` alone** — the smallest entrypoint in the package: one host binding is one host binding                        |
| A screen-reader test log                                   | not applicable — nothing is announced; the attribute changes colours, and the colours are the contrast policy's business                                                                |
| A docs page with live examples                             | `apps/sandbox/src/app/views/kitchen-sink/` (the `/all` view: the raw panel and the directive panel side by side). The published documentation site: none — gap: `apps/docs` (plan §2.1) |
| Unit + mutation                                            | `libs/components/theme/src/theme.spec.ts` — 3 cases; in `mutation.policy.json` from day one; the snapshot row lands with the day's shared full run                                      |

## Decisions this component implements

[0059](../decisions/0059-a-theme-is-an-attribute-the-skin-reads.md) (the main one — sugar,
not a second mechanism; the refusals of persistence and `matchMedia`),
[0013](../decisions/0013-no-headless-split.md) (the attribute-and-tokens contract it rides).

## Known limitations

- **The app root keeps writing `data-theme` by hand** — a bootstrap component has no
  template around it to bind an input on. One writer the directive cannot replace (0059).
- **Two theme names, no registry of skins.** `'light' | 'dark'` mirrors the blocks the
  skin actually ships; a third theme is a token-build feature first, and the union widens
  the day the build emits it.
- **No `'system'` value.** Following the system is the _absence_ of the attribute, so it
  is spelled `null` — a `'system'` string would be a third state pretending the attribute
  can express it.
