# Template — a component's Definition of Done

Copy this file as `docs/components/<name>.md` and fill it in. **An empty row is a gap visible
to a machine** — `tools/check-docs.mjs` checks that every row carries either a path to
evidence or an explicit `none — <deliberately|gap>: <reason>`.

## Why this exists

Today the quality of every component comes from the same person having built it in the same
mode of attention. **That scales neither to a second person nor to a twentieth component.**

This form is the answer: the list a component has to pass to enter a release — machine-checked
to the greatest extent possible, not eyeballed. Without it the twentieth component will get
only the checks somebody happened to remember.

The order matters: **this form has to exist before the first component from the behaviour
layer** (the dialog), or the dialog will be built without some of the checks and become the
pattern for the ones after it.

---

# `PctName` — <one-sentence description>

**Entrypoint:** `@pacit/components/<name>`
**Selector:** `pct-name` / `[pctName]`
**Status:** draft | released
**ARIA APG pattern:** [pattern name](https://www.w3.org/WAI/ARIA/apg/patterns/…) — named in
the class JSDoc as well

## Contract

|                             |                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **Value**                   | type, empty value, `compareWith`                                                          |
| **Inputs**                  | list with types                                                                           |
| **Outputs**                 | list                                                                                      |
| **Slots**                   | `<ng-content select="…">`                                                                 |
| **Parts** (`data-pct-part`) | list — must match the inventory ([`req-api-parts`](../requirements/api.md#req-api-parts)) |
| **Tokens**                  | the `--pct-<name>-*` prefix plus an entry in `contrast.policy.json`                       |

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

An empty table is allowed **only** when the component has no keyboard handling of its own —
and then it has to say where the platform provides it
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                          | requirement                                                                       | evidence |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------- |
| ARIA APG pattern named in the class JSDoc                          | [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)                  |          |
| Keyboard map tested key by key                                     | [`req-api-platform`](../requirements/api.md#req-api-platform)                     |          |
| axe audit on the component's own sandbox view                      | [`req-a11y-axe`](../requirements/a11y.md#req-a11y-axe)                            |          |
| Visual screenshot                                                  | [`req-quality-e2e`](../requirements/quality.md#req-quality-e2e)                   |          |
| `forced-colors: active` — no state carried by colour alone         | [`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)        |          |
| `prefers-reduced-motion` — duration from a token, not a stylesheet | [`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)                      |          |
| Touch target ≥ 24×24 px outright                                   | [`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)                        |          |
| Size axis aligned to `--pct-control-height-*`                      | [`req-api-size`](../requirements/api.md#req-api-size)                             |          |
| Density axis                                                       | [`req-token-density`](../requirements/tokens.md#req-token-density)                |          |
| RTL — no physical properties + a `dir="rtl"` screenshot            | [`req-token-logical`](../requirements/tokens.md#req-token-logical)                |          |
| SSR + hydration with no `NG05xx`                                   | [`req-quality-hydration`](../requirements/quality.md#req-quality-hydration)       |          |
| Forms: signal forms **and** `[formControl]` **and** `[(ngModel)]`  | [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms)             |          |
| Parts registered in the inventory                                  | [`req-api-parts`](../requirements/api.md#req-api-parts)                           |          |
| Tokens registered + an entry in `contrast.policy.json`             | [`req-token-contrast`](../requirements/tokens.md#req-token-contrast)              |          |
| Strings through `PCT_TEXTS`                                        | [`req-api-texts`](../requirements/api.md#req-api-texts)                           |          |
| Entrypoint size budget                                             | [`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking) |          |
| A screen-reader test log                                           | [`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)                          |          |
| A docs page with live examples                                     | [`req-project-apps`](../requirements/project.md#req-project-apps)                 |          |

## Decisions this component implements

A list of `NNNN` from [`docs/decisions/`](../decisions/).

## Known limitations

Things the component deliberately does not do — with the reason. A limitation with no reason
is a bug nobody has filed yet.
