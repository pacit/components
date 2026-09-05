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

**Summary:** <one or two plain sentences, and the page's own lead — what the component is,
for somebody deciding whether to use it. No links, no requirement or decision numbers: the
reasoning has its own place further down this card, and the site puts it under Evidence.>
**Entrypoint:** `@pacit/components/<name>`
**Selector:** `pct-name` / `[pctName]`
**Status:** draft | released
**Category:** Foundations | Actions & navigation | Inputs | Overlays | Feedback & display —
the group the site's index files the component under
**ARIA APG pattern:** [pattern name](https://www.w3.org/WAI/ARIA/apg/patterns/…) — named in
the class JSDoc as well

<!-- The page states this field as a sentence under the component's name, so its HEAD — the
     part before the first `—` — has to be one of exactly three shapes, and the content pass
     refuses a card whose head is none of them:

       [Name](https://www.w3.org/WAI/…)   a pattern is implemented, and the page links it
       the grid of [Name](https://…)      the same, for a component that implements PART of
                                          a pattern: the words before the link survive into
                                          the sentence, so the claim stays honest
       a native `<button>`                the platform's element carries the semantics
       none                               no pattern applies, and none was invented

     Everything after the first `—` is prose and goes under Accessibility, links and all. -->

The prose between the header and the first section is the design note: why the component is
built the way it is, what it refuses to do, which decision it stands on. Links belong here —
this is where a reader who wants the reasoning is sent. The site renders it under **Evidence**,
below the running component and the API, because somebody choosing a component reads the
Summary and the preview first.

## Usage

The shortest possible use, as a fence the site renders under the import line — one element
where one element is enough:

```html
<pct-name>…</pct-name>
```

## Contract

|                             |                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Value**                   | type, empty value, `compareWith`                                                                                          |
| **Inputs**                  | list with types                                                                                                           |
| **Outputs**                 | list                                                                                                                      |
| **Slots**                   | `<ng-content select="…">`                                                                                                 |
| **Parts** (`data-pct-part`) | list — must match the inventory ([`req-api-parts`](../requirements/api.md#req-api-parts))                                 |
| **Harness**                 | `PctNameHarness` — from `@pacit/components/testing`; one per class the card names, held to the package by `check-harness` |
| **Tokens**                  | the `--pct-<name>-*` prefix plus an entry in `contrast.policy.json`                                                       |

## Parts

| part   | what it is                      |
| ------ | ------------------------------- |
| `name` | one line: which box the part is |

## Theming

A brand override in a few declarations — the site applies it to a second instance of the
preview, so the reader sees the tokens move:

```css
[data-theme='brand'] {
  --pct-name-bg: #0f766e;
}
```

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
