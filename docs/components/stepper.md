# `PctStepper` — a map of a journey the application steers

**Summary:** A map of a journey: the steps behind, the step now, and the steps still to come.
**Entrypoint:** `@pacit/components/stepper`
**Selectors:** `pct-stepper`, `pct-step`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** none — none exists for a stepper, and none is invented
([0055](../decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)): the
host is a `list`, every step a `listitem` — the geometry the breadcrumb's probe measured
clean in three engines — and `aria-current="step"` stands on the step the input names.
Named in the class JSDoc.

**One number in, the whole map out.** The application owns the journey (validation,
routing, what "done" means) and hands the component a 1-based `step`; the DOM order of the
projected steps does the rest — before it done, at it current, past it upcoming. There is
no model and no event: a map does not move the traveller, and a step that answers a press
is the application's own `<a>` or `<button>` projected into the label.

**It writes `aria-current` where the breadcrumb refused to** — and the two records agree
underneath: the attribute belongs to whoever holds the truth. There the router knows; here
the application has already spoken through the input, and the stamp is the pagination's
move one component over.

## Usage

```html
<pct-stepper [step]="2" ariaLabel="Checkout">
  <pct-step>Cart</pct-step>
  <pct-step>Delivery</pct-step>
  <pct-step>Payment</pct-step>
</pct-stepper>
```

## Contract

|             |                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | none — the number is the application's, taken as an input and never written back                                                                                                                          |
| **Inputs**  | `step` (1-based, required; below 1 all upcoming, past the count all done — nothing clamped), `ariaLabel` (optional, the chips' reasoning: a nameless list is legal and a default would guess the journey) |
| **Outputs** | none — a map does not move the traveller                                                                                                                                                                  |
| **Slots**   | the steps (children of `pct-stepper`), and each step's label — the application's text, or its own link/button when a step should answer a press                                                           |
| **Parts**   | `marker` (the circle: ordinal, or the check when done), `track` (the connector; the first step's is hidden by `:first-of-type`)                                                                           |
| **Harness** | `PctStepperHarness`, `PctStepHarness`                                                                                                                                                                     |
| **Tokens**  | the `--pct-stepper-*` prefix plus seven entries in `contrast.policy.json`; the name dictionary grew the state `done`                                                                                      |
| **Strings** | `stepDone` — the word a reader gets for the drawn check, riding INSIDE the content after the label ("Payment, Completed"), never in an `aria-label` that would replace the label                          |

**Done is audible, not only drawn.** The check and the connector are `aria-hidden`
drawings; a done step carries a visually-hidden `texts().stepDone` after the projected
label. Measured as **content, not name**: a `listitem` computes no accessible name from its
contents — a reader walks the content itself ([`lesson-140`](../lessons.md#lesson-140)).

**Forced colours.** Both filled markers drop their accent; the border keeps every circle a
circle, the check keeps saying done as a `CanvasText` drawing, and the current step keeps
its label **weight** — the breadcrumb's channel, one decision old.

## Parts

| part     | what it is                    |
| -------- | ----------------------------- |
| `marker` | the numbered circle of a step |
| `track`  | the line between two markers  |

## Theming

```css
[data-theme='brand'] {
  --pct-stepper-marker-bg-current: #0f766e;
  --pct-stepper-marker-bg-done: #ccfbf1;
  --pct-stepper-marker-border-done: #0f766e;
}
```

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: the map draws no control and takes no focus. A step the application
makes pressable brings its own keyboard with the projected element
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/stepper/src/stepper.ts`                                                                                                                                                                                    |
| Keyboard map tested key by key                             | the empty map is the claim — nothing here is focusable, and the drawings are hidden from the tree outright                                                                                                                  |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/stepper` in `SBX_ROUTES`                                                                                                                                                            |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `stepper-journey` and `stepper-journey-rtl`                                                                                                                                         |
| `forced-colors: active` — no state carried by colour alone | `libs/components/stepper/src/step.scss` — the border keeps the circles, the check keeps done, the weight keeps current. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                           |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                           |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target; a pressable step is the application's projected control, which brings the floor with it                                                                                          |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: the map is not a control; the marker is its own literal with the refusal written beside it in `component.stepper.json`                                                                                    |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                      |
| RTL — no physical properties + a `dir="rtl"` screenshot    | `apps/sandbox-e2e/src/rtl.spec.ts` — the journey descends the other way, the connector changes sides with no rule to help it (a line is a line both ways). The screenshot: `stepper-journey-rtl`                            |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/stepper` in `SBX_ROUTES`                                                                                                                                                       |
| Forms                                                      | not applicable — a map holds no value a form owns                                                                                                                                                                           |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `marker`, `track`                                                                                                                                                                     |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — seven entries: three marker pairs (AA), the done fill and the upcoming edge against the page (UI), the muted label (AA), the connector (UI warn); `libs/tokens/tokens.snapshot.md` |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `stepDone`, read at render time                                                                                                                                                       |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — `./stepper` on `./core` and `./icon`                                                                                                                                                   |
| A screen-reader test log                                   | none — gap: the same one every component here has. The question for the log: that a done step reads as "label, Completed" and an upcoming one as its label alone, with no marker or connector spoken anywhere               |
| A docs page with live examples                             | `apps/sandbox/src/app/views/stepper/` (the sandbox view). The published site: `/components/stepper` — prerendered, the demo's own source is the code tab                                                                    |
| Unit + mutation                                            | `libs/components/stepper/src/stepper.spec.ts` — 13 cases; `libs/components/mutation.snapshot.md` — `stepper.ts` measured in the day's shared full run                                                                       |

## Decisions this component implements

[0055](../decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md) (the
main one — which of the two things wearing the name, the one-number contract, why
`aria-current` IS ours to write here),
[0048](../decisions/0048-a-pagination-owns-its-page-number.md) (the ownership split this
walks one component further),
[0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md) (the measured
list/listitem ground, and the other half of the `aria-current` rule),
[0013](../decisions/0013-no-headless-split.md) (tokens as the whole styling contract).

## Known limitations

- **The map cannot verify the journey.** `step=3` beside a form whose second page failed
  validation is the application lying to its users; the component renders the statement
  and checks only structure (the dev-mode warning).
- **No interactive steps of the component's own.** A pressable step is the application's
  link or button projected into the label — the component cannot know whether going back
  is allowed, so it draws no control it would then have to guard.
- **No vertical orientation.** It returns as its own decision the day a real application
  asks; a journey too wide for its line wraps.
- **No step content / panels.** A wizard's pages are routed views; a stepper that owned
  panels would be the tabs in a costume.
