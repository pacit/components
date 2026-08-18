# 0018 — No Sass entry point: the token surface is custom properties and types

**Status:** accepted
**Implements:** [`req-token-artifacts`](../requirements/tokens.md#req-token-artifacts)
**Evidence:** three measurements in this repository, each reproducible from the commit that
carries this file — quoted under "Context"

## Context

`libs/tokens/build.mjs` generated `dist/_tokens.scss` (161 lines of
`$pct-button-bg: var(--pct-button-bg)`), the build copied it into `libs/components/themes/`
and `npm pack` shipped it. **Nothing read it** — not one `@use` in the workspace, and the npm
page deliberately did not mention it, because advertising it would have settled this question
by publishing it.

The one argument for keeping it was that `@use`-ing it in our own stylesheets would make a
misspelt token a **compile error**, the spirit of [`lesson-43`](../lessons.md#lesson-43).
That argument rests on a defect, so the defect was measured rather than assumed:

| measurement                                                        | result                                         |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `background: var(--pct-button-bgg)` (a colour) in `button.scss`    | fires — `check-tokens`, point 7                |
| `min-height: var(--pct-button-heigth)` (a dimension) in that sheet | **passed every gate** — it fires point 8 today |
| `--pct-*` names the 7 stylesheets read, against the skin           | 127, all real; 7 declared, all real            |

So the hole was real and **narrower than the remedy**: point 7 judges what a stylesheet
paints, and a misspelt name outside a colour slot is invisible to it, while CSS has no
undefined variable to report. What the Sass road would have bought is a name check, and a name
check does not need Sass.

## Decision

**The token surface is `pct.css` plus `tokens.ts`.** The Sass artefact is dropped — from the
generator, from the package assets and from the gate that compared it against the token list.
Its argument moves into `check-tokens` as **point 8 (NAMES)**: every `--pct-…` a stylesheet
reads or declares has to be a token of the skin, in any property, with two rules
(`read-unknown`, `declared-unknown`) and a prepared input for each.

Two reasons in that order:

1. **The check was the point, not the file.** Point 8 covers every stylesheet the library will
   ever have, needs no second styling idiom in our sources, and leaves them reading exactly
   like the contract we publish — `var(--pct-*)`, which is what a consumer overrides.
2. **Publishing is the one-way direction.** Nothing is on npm yet, so dropping costs nothing
   today; a file first published is a promise for the life of the major. A Sass entry point can
   arrive in a minor the day somebody asks for one — and then it arrives with a reader, a page
   and a gate, which is what it never had here.

## What this costs us

- **A consumer who writes Sass loses typo protection on overrides.** In TypeScript
  `PctCssVar` gives it; in a stylesheet nothing does, on their side or ours. That is the whole
  price, and it is paid by a consumer who does not exist yet.
- **One measurement fewer of the generator.** Point 2 compared two generated surfaces against
  the token list; now it compares one. The list is still read twice independently (point 1),
  so the denominator is not weaker — only the surface count is.
- **The decision has to be re-taken if a Sass surface is ever asked for**, and it should be:
  the reason recorded here is "no reader", not "never".

## Consequences

- `libs/tokens/build.mjs` emits `dist/{pct.css,tokens.ts}`; `libs/components/themes/` carries
  the skin alone, and `themes/_tokens.scss` leaves the packed archive (31 files → 30).
- `tools/check-tokens.mjs` has eight points; the negative control has 28 prepared inputs.
- [`lesson-69`](../lessons.md#lesson-69) records what the measurement above found out about
  the reach of a gate whose name is wider than its rule.
