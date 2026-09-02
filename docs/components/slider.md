# `PctSlider` — slider

**Entrypoint:** `@pacit/components/slider`
**Selector:** `pct-slider`
**Status:** released
**ARIA APG pattern:** [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) — in the
variant the APG's own HTML example is: a native `<input type="range">`, which carries the
role, the value, both bounds and the whole keyboard without a line from us

## Contract

|                 |                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `number` through `value` (`model`) — never a `T`: a slider is a place on a numeric continuum, so [`req-api-generic`](../requirements/api.md#req-api-generic) is met by **not** being generic                           |
| **Inputs**      | `value` (`model`), `min`, `max`, `step`, `marks`, `orientation`, `format`, `labels`, `locale`, `label`, `hint`, `ariaLabel`, `ariaLabelledby`, plus `FormUiControl`                                                    |
| **Bounds**      | `min` / `max` belong to the `FormUiControl` contract, so `[formField]` fills them from the schema's `min()` / `max()` validators — and they are the **native attributes** at the same time. Absent, they are `0`–`100` |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are **inputs and not attributes on the tag**: the role sits on the `<input>` inside, the host carries no role, and an ARIA name on a roleless element is ignored                        |
| **Parts**       | `control`, `track`, `fill`, `mark`, `thumb`, `bubble`, `label`, `hint`, `error`                                                                                                                                        |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'bare'` — a frame around a slider looks foreign, the same call the switch made                                                                                                          |

**What it does not write, and why.** No `role`, no `aria-valuenow` / `aria-valuemin` /
`aria-valuemax` — the native range publishes all four off its own `min` / `max` / `value`.
No **`aria-orientation`**: the engine derives it from the writing mode and **ignores an
attribute that disagrees** (measured on chromium's accessibility tree — a horizontal range
told `aria-orientation="vertical"` reports `horizontal`). No **`aria-required`**: it does not
reach a range's accessibility node at all, where the very same attribute on a textbox does
([0042](../decisions/0042-a-slider-is-the-platforms-range.md),
[`lesson-112`](../lessons.md#lesson-112)'s reading met twice more). And no
**`aria-valuetext`** unless a `format` or a `labels` list gives it something to say.

## Keyboard map

| key                       | effect          | test                          |
| ------------------------- | --------------- | ----------------------------- |
| `ArrowRight` / `ArrowUp`  | one `step` up   | native `<input type="range">` |
| `ArrowLeft` / `ArrowDown` | one `step` down | native                        |
| `PageUp` / `PageDown`     | ten steps       | native                        |
| `Home` / `End`            | `min` / `max`   | native                        |

No handling of its own ([`req-api-platform`](../requirements/api.md#req-api-platform)) — the
whole map is the platform's and it is **byte-identical in three engines**, which is a claim
about three of them and so measured in three. `readonly` blocks the change **without losing
focusability**; `disabled` drops the control from the Tab order, which is again the
platform's doing.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/slider/src/slider.ts` — the pattern is named and linked in the class comment                                                                                                                                                                                |
| Keyboard map                    | `apps/sandbox-e2e/src/slider.spec.ts` — arrows, `PageUp`/`PageDown`, `Home`/`End`, in three engines                                                                                                                                                                          |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/slider` view and `/all`, in both directions                                                                                                                                                                                      |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `slider-states` and `slider-states-rtl`                                                                                                                                                                                              |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the slider repaints **more** than the others, because `appearance: none` is what lets a range be drawn at all and it takes the platform's own high-contrast rendering with it; the disabled row says `GrayText` like the rest |
| `prefers-reduced-motion`        | not applicable — **the slider has no transition at all**. A thumb that eased into place would lag the finger dragging it, so the position is written outright and there is nothing for the preference to switch off                                                          |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/slider.spec.ts` — the floor is on the ROW (`max(--pct-slider-thumb-size, --pct-slider-target-min)`), and the row is the native input, so what a finger gets is what an eye sees                                                                        |
| Size axis                       | not applicable — the `bare` variant does not align heights ([0004](../decisions/0004-explicit-height.md))                                                                                                                                                                    |
| Density axis                    | none — gap. **Elevated risk:** the row is exactly at the touch threshold, so density has nowhere to go down                                                                                                                                                                  |
| RTL                             | `apps/sandbox-e2e/src/slider.spec.ts` — the drawing mirrors as geometry AND the platform's own pointer reading mirrors with it, plus the `slider-states-rtl` baseline                                                                                                        |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/slider` view is in `SBX_ROUTES`                                                                                                                                                                                             |
| Forms                           | `libs/components/slider/src/slider.spec.ts` — signal forms (bounds from the schema's validators), `[formControl]` and `[(ngModel)]`                                                                                                                                          |
| Message announced               | `tools/check-aria.mjs` (point 7, target `check-aria`) — the error part carries `role="alert"`                                                                                                                                                                                |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                          |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — 14 pairs, `bubble` / `fill` / `mark` added to the name dictionary                                                                                                                                                                   |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own; the value in words is `Intl.NumberFormat` or the consumer's `labels`                                                                                                                                                        |
| Size budget                     | `libs/components/size.snapshot.md`, `tools/check-bundle.mjs` (target `check-bundle`)                                                                                                                                                                                         |
| Screen-reader log               | none — gap. Relevant: `aria-valuetext` is confirmed on chromium's accessibility tree and rests on HTML-AAM in the other two                                                                                                                                                  |
| docs page                       | `/components/slider` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                      |

## The rail is deliberately below 3:1, and that is written down

`--pct-slider-track-bg` against the page is **1.23:1** and it is a `warn` rather than an
`error` in `contrast.policy.json`. The reason is a measurement, not a preference: no single
colour clears 3:1 against **both** the page and the travelled part. A dark rail
(`--pct-border-strong`) passes against the page at 4.76 and fails against the fill at 1.09;
the light one passes against the fill at 4.19 and fails against the page. What
[SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) asks for is the
information needed to identify the control and its state — the **thumb** (5.17:1 against the
page) and the **fill** (5.17 against the page, 4.19 against the rail). The rail is the road
they travel, and it is the pair that gives way.

For the same reason the ticks stand **behind** the fill: a mark has one colour, and
`--pct-text-muted` clears 8.40:1 against the rail and nothing like it against the fill. Ahead
of the thumb, where a reader needs them, they are on the rail alone.

## Decisions

[0042](../decisions/0042-a-slider-is-the-platforms-range.md) (the element is the native
range, and only the value it cannot pronounce is ours),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (read twice
more, for `aria-orientation` and `aria-required`),
[0034](../decisions/0034-multiplicity-is-a-tag.md) (why `orientation` is an input and a
second thumb would be a tag), [0005](../decisions/0005-signal-forms-without-cva.md),
[0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **One thumb.** A min–max range forks the value to `[number, number]`, which is a question
  about the tag rather than about an input, and two overlaid native ranges do not compose —
  a press at the lower thumb moves the upper input in all three engines. A consumer who
  needs it today composes two `PctSlider`s and inherits that defect.
- **The marks are hidden behind the fill.** See above: the contrast pair is what decides it,
  and a tick that reappears when the thumb moves back is the price.
- **No `<datalist>`.** It draws no tick in firefox and snaps in no engine, so a consumer who
  passes one gets the browser's own behaviour and nothing of ours.
- **`aria-valuetext` is measured in one engine.** Playwright 1.61 reports `valuenow` and not
  `valuetext`, so the accessibility-tree reading is chromium's CDP; the visible bubble is
  what carries the value on screen in the other two.
