# `PctBadge` — a word wearing a tone

**Summary:** A short word wearing a tone: a status, a count, a label beside something that already has a name.
**Entrypoint:** `@pacit/components/badge`
**Selector:** `pct-badge`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** none — a badge is text and only text
([0053](../decisions/0053-a-badge-is-a-word-wearing-a-tone.md)): the word is projected,
already part of the document's sentence, and the component adds a box around it and nothing
audible to it. No role, no ARIA, no string of its own. Named in the class JSDoc.

**The tone never speaks alone.** `data-pct-tone` swaps one colour triple; it cannot verify
the word beside the colour, but it refuses the one shape where colour would be the only
channel — an empty badge is a dev-mode warning, and forced colours drop both tones to one
palette with the border carrying the box.

## Usage

```html
<pct-badge>Draft</pct-badge>
```

## Contract

|             |                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — a word holds no value                                                                                                                                                                                                                                               |
| **Inputs**  | `tone` (`'neutral' \| 'danger'`, default `'neutral'`) — a union, so a missing tone is a compile error; the ramps it was waiting for landed with the button's tone axis (0081), so what holds the union at two now is only that nothing has collapsed it onto `PctTone` yet |
| **Outputs** | none — nothing happens to a word                                                                                                                                                                                                                                           |
| **Slots**   | the content — the word, and any glyph the consumer projects beside it (the gap is a token, not a slot)                                                                                                                                                                     |
| **Parts**   | none — the host is the box                                                                                                                                                                                                                                                 |
| **Harness** | `PctBadgeHarness`                                                                                                                                                                                                                                                          |
| **Tokens**  | the `--pct-badge-*` prefix plus five entries in `contrast.policy.json`; the skin gained `on-danger`, the pair `semantic.light.json` promised back for the first component that would paint a background with the error colour                                              |
| **Strings** | **none.** The fourth component in the library to add nothing to `PCT_TEXTS` — the word is the consumer's                                                                                                                                                                   |

**Why two tones.** `neutral` stands on surfaces the skin already has; `danger` is the error
colour painting its first background. `success`, `warning` and `info` needed colour ramps the
skin did not have at all — they landed with the button's tone axis (0081) and the condition
this union named has fired — and inventing three ramps at a component's feet would have put the
skin's centre of gravity in the wrong file
([0019](../decisions/0019-primitives-are-not-the-contract.md)).

**Why not the chips' pill.** A chip looks grabbable because it is; a word of status must not
borrow that costume. The corner (`radius.md`) is the one visual cue telling a scanning eye
which small box answers the pointer.

## Theming

```css
[data-theme='brand'] {
  --pct-badge-bg: #ccfbf1;
  --pct-badge-fg: #134e4a;
  --pct-badge-border: #99f6e4;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: a badge is running text, holds no control, and takes no focus — the
platform provides nothing here because there is nothing to provide
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/badge/src/badge.ts`                                                                                                                                                                                                                                                                                                                                                            |
| Keyboard map tested key by key                             | the empty map is the claim — nothing here is focusable, and the axe sweep's `aria-hidden-focus` family has nothing to bite on a host that hides nothing and holds no control                                                                                                                                                                                                                    |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/badge` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                  |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `badge-tones` and `badge-tones-rtl`                                                                                                                                                                                                                                                                                                                     |
| `forced-colors: active` — no state carried by colour alone | `libs/components/badge/src/badge.scss` — both tones drop to `CanvasText` on `Canvas` with the border standing, which is the component's own argument made visible. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                    |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                                                                                                                                                               |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                                                                                                                                                                                                                                       |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a badge is not a control and stands on no control axis — `apps/sandbox-e2e/src/badge.spec.ts` measures the box UNDER the smallest control height, and that reading is the promise                                                                                                                                                                                             |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                          |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/badge/src/badge.scss` — logical padding and a flex gap, nothing directional. The screenshot: `badge-tones-rtl`                                                                                                                                                                                                                                                                 |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/badge` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                             |
| Forms                                                      | not applicable — a word holds no value a form owns                                                                                                                                                                                                                                                                                                                                              |
| Parts registered in the inventory                          | none — deliberately: the host is the box and there is nothing inside it to address; `tools/check-parts.mjs` counts zero and the README table carries the entrypoint                                                                                                                                                                                                                             |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — five entries: both words over their boxes (AA error), the danger box and its edge against the page (UI error — the box IS the statement), the neutral edge (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                 |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text of its own                                                                                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./badge` on `./core` alone; no `PCT_TEXTS` key, so not one other row of the snapshot moved                                                                                                                                                                                                                                                                |
| Screen-reader log                                          | Read 2026-09-16 from `docs/acr/at/` — three readers, whole sandbox, and `/badge` is the one view whose walk found **no stop of its own at all**: every stop in the three logs belongs to the sandbox scaffold. A badge takes no focus, which is the point of it, so a Tab walk cannot reach one and cannot confirm silence either. What would: a reader reading the page rather than walking it |
| A docs page with live examples                             | `apps/sandbox/src/app/views/badge/` (the sandbox view). The published site: `/components/badge` — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                            |
| Unit + mutation                                            | `libs/components/badge/src/badge.spec.ts` — 7 cases; `libs/components/mutation.snapshot.md` — `badge.ts` measured in the same full run as the avatar's row                                                                                                                                                                                                                                      |

## Decisions this component implements

[0053](../decisions/0053-a-badge-is-a-word-wearing-a-tone.md) (the main one — which of the
two things called "badge" this is, why the tone never speaks alone, why two tones today),
[0019](../decisions/0019-primitives-are-not-the-contract.md) (why the skin does not grow
three ramps at a component's feet),
[0013](../decisions/0013-no-headless-split.md) (tokens as the whole styling contract).

## Known limitations

- **Two tones.** `success` / `warning` / `info` waited for the skin's ramps, which landed with
  0081; what is owed now is the collapse onto `PctTone` itself. The union makes
  the wait a compile-time fact rather than a silently grey box.
- **No count overlay.** The `3` on a bell's corner is a different component — anchoring,
  a live region for the changing number, truncation — and it does not exist yet.
- **The tone cannot verify the word.** `tone="danger"` beside the text `OK` is a page lying
  to its users in a way no component can see; the contract is prose, and the empty-badge
  warning is its enforceable corner.
- **No `size` input.** A badge is sized by its own type token; one that wants a control's
  height is a button or a chip wanting to be quiet.
