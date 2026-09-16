# `PctSwitch` — switch

**Summary:** A setting that takes effect the moment it is flipped, with no Save button beside it.
**Entrypoint:** `@pacit/components/switch`
**Selector:** `pct-switch`
**Status:** released
**Category:** Choices
**ARIA APG pattern:** [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) — the
`role="switch"` variant built on a native checkbox, which the APG's own HTML example is

## Usage

```html
<pct-switch label="Wi-Fi" [(checked)]="wifi" />
```

## Contract

|                 |                                                                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `boolean` through `checked` — the same `FormCheckboxControl` contract as the checkbox, which **forbids defining `value`** ([`lesson-12`](../lessons.md#lesson-12))                                                                              |
| **Inputs**      | `checked` (`model`), `label`, `hint`, `ariaLabel`, `ariaLabelledby`, plus `FormUiControl`                                                                                                                                                       |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are **inputs and not attributes on the tag**: the role sits on the `<input>` inside, the host carries no role, and an ARIA name on a roleless element is ignored. Both win over `label` (`tools/check-aria.mjs`) |
| **Binding**     | `model()` does not accept `booleanAttribute`, so `[checked]="true"` in brackets — a bare attribute does not compile                                                                                                                             |
| **Parts**       | `control`, `track`, `thumb`, `label`, `hint`, `error`                                                                                                                                                                                           |
| **Harness**     | `PctSwitchHarness`                                                                                                                                                                                                                              |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'bare'` — a frame around a switch looks alien, exactly as around a checkbox                                                                                                                                      |

**What it does not have, and why.** No `aria-checked` and no `indeterminate` — both follow
from the role rather than from taste
([0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)). The
checked state of `role="switch"` over a native checkbox is the element's **own checkedness**,
measured in three engines; an `aria-checked` beside it is ignored even when it disagrees
([`lesson-112`](../lessons.md#lesson-112)). And ARIA gives `switch` two states with no third,
which **no audit checks** — so the type is the whole gate: the input does not exist.

## Parts

| part      | what it is                                                                 |
| --------- | -------------------------------------------------------------------------- |
| `control` | the native input                                                           |
| `track`   | the pill the thumb travels                                                 |
| `thumb`   | the knob — painted over the control, and it lets the pointer through to it |
| `label`   | the label beside the switch                                                |
| `hint`    | the hint under the label                                                   |
| `error`   | the message when invalid                                                   |

## Theming

```css
[data-theme='brand'] {
  --pct-switch-track-bg-checked: #0f766e;
  --pct-switch-thumb-bg: #ffffff;
}
```

## Keyboard map

| key     | effect | test                             |
| ------- | ------ | -------------------------------- |
| `Space` | toggle | native `<input type="checkbox">` |

No handling of its own ([`req-api-platform`](../requirements/api.md#req-api-platform)) — and
that is the point of the native road: the APG lists `Space` for the pattern and the platform
already implements it. `readonly` blocks the change **without losing focusability**.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/switch/src/switch.ts` — the pattern is named and linked in the class comment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Keyboard map                    | `apps/sandbox-e2e/src/switch.spec.ts` — `Space` measured in three engines, because "the platform does it" is a claim about three of them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/switch` view and `/all`, in both directions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `switch-states` and `switch-states-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the state is the thumb's **position**, so the two states are deliberately the same colour after the swap and the case asserts exactly that; plus the disabled row, which says `GrayText` like the rest                                                                                                                                                                                                                                                                                                                                                                              |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts` — the thumb's travel is a transition, so it joins the cross-control case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/switch.spec.ts` — the track is 40×24 and carries the floor itself (`max(…, --pct-switch-target-min)`), so what a finger gets is what an eye sees less the 1 px border, at every size; the checkbox needs the other technique because its box is 18 px ([`lesson-14`](../lessons.md#lesson-14)). The knob painted over the control is no hole in that area: it takes no pointer events, and the same spec presses its centre and watches the state turn — before that line the one part that looked most like the thing to press was the one part that did nothing ([`lesson-158`](../lessons.md#lesson-158)) |
| Size axis                       | not applicable — the `bare` variant does not align heights ([0004](../decisions/0004-explicit-height.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Density axis                    | none — gap. **Elevated risk:** the track is exactly at the touch threshold, so density has nowhere to go down                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RTL                             | `apps/sandbox-e2e/src/switch.spec.ts` — the thumb's travel measured as geometry in both directions, plus the `switch-states-rtl` baseline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/switch` view is in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Forms                           | `libs/components/switch/src/switch.spec.ts` — signal forms, `[formControl]` and `[(ngModel)]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Message announced               | `tools/check-aria.mjs` (point 7, target `check-aria`) — the error part carries `role="alert"`, over every template of the library                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — 13 pairs, `track`/`thumb` added to the name dictionary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Size budget                     | `libs/components/size.snapshot.md`, `tools/check-bundle.mjs` (target `check-bundle`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Screen-reader log               | Read 2026-09-16 from `docs/acr/at/` — three readers, whole sandbox. All three give the role and the hint; **they disagree about the words for the state**. NVDA `Wi-Fi, switch, on, Turns off when you leave the house`; VoiceOver `Wi-Fi Turns off when you leave the house on switch`; Orca `Backups · switch not pressed. · Runs every night at 03:00.` — pressed/not pressed, the toggle-button vocabulary, where the other two say on. And the READ-ONLY switch is announced `switch, on` with no mention of read-only, by both readers that reach it — the same hole the checkbox has                                        |
| docs page                       | `/components/switch` on the published site — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Decisions

[0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) (the role
goes on a native checkbox and the state stays the platform's),
[0005](../decisions/0005-signal-forms-without-cva.md),
[0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **No third state.** ARIA gives `switch` `true` and `false` and nothing else, so there is no
  `indeterminate` here — and no audit would have said so, which is why the absence of the
  input is the gate rather than a rule somebody has to remember.
- **No on/off text inside the track.** A word drawn there would have to be `aria-hidden`
  (the role already says the state) and would need a string per language for something the
  position already tells the eye. It is a limitation rather than a decision: a consumer who
  wants it today has to draw it themselves.
