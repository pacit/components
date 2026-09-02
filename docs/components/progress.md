# `PctProgress` — how far along a task is, or that it is under way at all

**Entrypoint:** `@pacit/components/progress`
**Selector:** `pct-progress`
**Status:** released
**ARIA APG pattern:** none — there is no APG pattern for a progress bar. What there is is the
[`progressbar` role](https://www.w3.org/TR/wai-aria-1.2/#progressbar), and this component does
not write it: the bar **is** a `<progress>`, so the role, the bounds, the value and the
indeterminate state are the element's. Named in the class JSDoc.

The whole component is one boundary drawn twice
([0049](../decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md)): the
platform's element for what a reader hears, our own drawing for what an eye sees. It is the
checkbox's shape one component over, and it is here for a measured reason rather than a
stylistic one — `appearance: none` is the price of painting a `<progress>`, and it takes the
engine's indeterminate animation away.

## Contract

|             |                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**   | `value: number \| null`, default `null` = **indeterminate**. Text that does not parse is `null` too. Out of range it is clamped into `[0, max]`, and the clamped number is what the element carries — a reader hears 100%, not 150%. |
| **Inputs**  | `value` (`number \| null`), `max` (default `100` — **not** the platform's `1`, see below), `ariaLabel`, `ariaLabelledby`, `size` (`sm \| md \| lg`, from config)                                                                     |
| **Outputs** | none — a progress bar reports, it does not emit. What changes the value is the task, and the task is the application's.                                                                                                              |
| **Slots**   | none — the bar draws a groove and a fill. The sentence beside it ("Copying files", "129 of 256") is the consumer's, and it is also what `ariaLabelledby` should point at.                                                            |
| **Parts**   | `track` (the `<progress>` itself, which is the groove), `fill` (the sibling drawn over it — the value in the determinate state, the travelling band in the indeterminate one)                                                        |
| **Tokens**  | the `--pct-progress-*` prefix plus three entries in `contrast.policy.json`                                                                                                                                                           |
| **Strings** | **none.** The first component in five to add nothing to `PCT_TEXTS` and therefore nothing to every other entrypoint's bytes — it draws no text at all.                                                                               |

**Why `max` defaults to 100 and not to the platform's 1.** Which mistake each default produces
decides it. With `max="1"` a consumer writing `[value]="40"` gets a **full** bar, because the
element clamps — a wrong answer wearing the look of a finished task. With `max="100"` the
mirror-image slip (`[value]="0.4"` meaning four tenths) draws an almost empty bar, which is
visibly wrong and fixed in seconds. The element never sees the difference: `max` is always
written out.

**Why there is no default accessible name.** A progress bar's name is _what_ is progressing,
and only the application knows that. A default of "Progress" would satisfy axe's
`aria-progressbar-name` rule and tell a screen-reader user nothing — a gate passing on our own
echo. Instead the component reports a bar with neither `ariaLabel` nor `ariaLabelledby` in dev
mode, the same way `pct-drawer` reports an unnamed panel.

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**, and for a stronger reason than usual: a progress bar is not a control.
Nothing is pressed, nothing is dragged, and a `<progress>` takes focus in no engine — measured
in `apps/sandbox-e2e/src/progress.spec.ts`, which asks the element to focus itself and asserts
that it does not, then walks `Tab` past it
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/progress/src/progress.ts`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Keyboard map tested key by key                             | `apps/sandbox-e2e/src/progress.spec.ts` — the empty map is the claim, so what is gated is that the element refuses focus in three engines and that `Tab` steps from one button beside the bar to the next                                                                                                                                                                                                                                                              |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/progress` in `SBX_ROUTES`, so the WCAG 2.2 AA sweep takes it. `aria-progressbar-name` is the rule that bites here, and every bar in the view is named                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `progress-sizes` and `progress-sizes-rtl`, the three thicknesses with the fill starting from the edge the writing direction gives it                                                                                                                                                                                                                                                                                           |
| `forced-colors: active` — no state carried by colour alone | `libs/components/progress/src/progress.scss` — the fill and the band are `Highlight`, the groove `Field` with a `CanvasText` outline (an outline, not a border: the fill is positioned over the groove). The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`. The mechanism this refuses is a gradient band, dropped outright in that mode                                                                                                                       |
| `prefers-reduced-motion` — duration from a token           | `apps/sandbox-e2e/src/preferences.spec.ts` — the band reads **1500 ms** (the loop token slows, it does not stop: a still band would stop saying anything is under way) and the determinate fill's transition drops below 1 ms. Neither is a media query in the component's sheet                                                                                                                                                                                       |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target. A progress bar takes no pointer and no focus, so the floor `req-a11y-touch` sets has nothing to apply to                                                                                                                                                                                                                                                                                                                    |
| Size axis aligned to `--pct-control-height-*`              | deliberately not — the axis is `--pct-progress-track-height` (4 / 8 / 12 px). A bar is not a control and lining its box up with a field's would say it were one; `libs/tokens/src/component.progress.json` says so in a comment. The reading: `apps/sandbox-e2e/src/progress.spec.ts`, three thicknesses ascending with the widths unchanged                                                                                                                           |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                 |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `libs/components/progress/src/progress.scss` — the fill sits on `inset-inline-start` and the band's keyframes animate the same property. The screenshot: `progress-sizes-rtl`; the geometry: `apps/sandbox-e2e/src/rtl.spec.ts`; and the band's DIRECTION reverses in `progress.spec.ts`, sampled over six frames in both writing directions                                                                                                                           |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/progress` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                 |
| Forms                                                      | not applicable — a progress bar holds no value a form owns and implements no `FormValueControl`. What it reports is the application's own state                                                                                                                                                                                                                                                                                                                        |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` — the **Parts** row above                                                                                                                                                                                                                                                                                                                                                                                 |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — three entries (fill against the groove, fill against the page, and the groove against the page as a `warn`, the slider's rail one component over); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                           |
| Strings through `PCT_TEXTS`                                | not applicable — the component draws no text. The name is the consumer's, through `ariaLabel` / `ariaLabelledby`, and there is no default to translate                                                                                                                                                                                                                                                                                                                 |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./progress` on `./core` alone: no CDK, no `./icon`, no `@angular/common`                                                                                                                                                                                                                                                                                                                                                         |
| A screen-reader test log                                   | none — gap: the same one the dialog, select, toast, tabs, accordion, drawer and pagination have. The question here: what a reader says about a bar with no value, which is the one state this component exists to express                                                                                                                                                                                                                                              |
| A docs page with live examples                             | `apps/sandbox/src/app/views/progress/` (the sandbox view). The published site: `/components/progress` — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                                     |
| Unit + mutation                                            | `libs/components/progress/src/progress.spec.ts` — 31 cases; `libs/components/mutation.snapshot.md` — `progress.ts` at **92.31**, zero clock-kills, and the four survivors equivalent: `isDevMode()` forced true, `value === undefined` dropped (`Number(undefined)` is `NaN` and fails `isFinite` anyway) and the two that drop `typeof value === 'number'` (`Number(n)` of a number is that number) — each proved by applying it and watching the 31 cases stay green |

## Decisions this component implements

[0049](../decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md) (the main
one — why the element, what `appearance: none` costs, why the fill is a sibling, why the band
is an element and not a gradient),
[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (no
`aria-valuenow` of ours beside the element's own),
[0034](../decisions/0034-multiplicity-is-a-tag.md) (a circular indicator would be a tag, not a
`variant` input).

## Known limitations

- **No circular variant.** A ring is a different drawing with its own tokens, and one already
  exists inside `pct-button` for a button that is working. A standalone one is a tag of its
  own when somebody needs it.
- **No buffer or second value.** The platform's element has one value. A media player's
  buffered range is a second bar, and this component does not pretend to be two.
- **No tone.** Success and failure look alike, deliberately: a tone painted in colour alone is
  a state carried by colour alone, and the second channel would be an icon — which is four
  names added to `PctIconName` at once and a decision no single component should make (the
  toast's own item, [plan 4.14](../plan.md)).
- **Nothing is announced.** A determinate bar that spoke every percent would be noise, and the
  role is one assistive technology polls. An application that needs "upload complete" said out
  loud has a sentence to announce, and the sentence is not the bar.
- **The name is required and nothing enforces it at build time.** A consumer who supplies
  neither `ariaLabel` nor `ariaLabelledby` gets a dev-mode warning and an axe violation on
  their own page; this repository's static gate can only see its own templates.
