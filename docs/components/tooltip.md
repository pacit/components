# `PctTooltip` — a sentence about a control

**Entrypoint:** `@pacit/components/tooltip`
**Selector:** `[pctTooltip]` (the panel it opens is `pct-tooltip`, `PctTooltipPanel`)
**Status:** released
**ARIA APG pattern:** [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) —
`role="tooltip"` on a panel that takes no focus, reached from the trigger by an ARIA relation,
dismissible with Escape while focus stays where it was

The component exists for one distinction a `title` attribute never makes: **what the sentence
is**. A control that already has a name gets a _description_; a control that has none — the
icon-only button — gets its _name_ from here, and a name may not come and go with the pointer
([0030](../decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md)).

## Contract

|                 |                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a tooltip holds no value and has no open state a consumer writes. It is opened by the pointer, the keyboard and the finger, and by nothing else                                                                                                                                                                             |
| **Inputs**      | `pctTooltip` (the text), `pctTooltipPlacement` (`top` \| `bottom` \| `start` \| `end`), `pctTooltipAs` (`description` \| `name`), `pctTooltipDisabled`                                                                                                                                                                             |
| **Outputs**     | none — an application that needs to know a tooltip was read is asking for analytics, not for a component API                                                                                                                                                                                                                       |
| **Naming**      | the distinction itself. `description` (the default) writes `aria-describedby` **while the panel is up**, adding to whatever list the control already had; `name` writes `aria-label` **permanently**, whether anything is open or not. Both choices are reported in dev mode when they look wrong (an unnamed control, WCAG 2.5.3) |
| **Slots**       | none — the text is a string input. Markup in a tooltip is a popover                                                                                                                                                                                                                                                                |
| **Parts**       | `panel`                                                                                                                                                                                                                                                                                                                            |
| **Tokens**      | the `--pct-tooltip-*` prefix plus one entry in `contrast.policy.json`. The surface is **inverted** — `pct.surface-inverse` and its `on-` pair, new to the semantic tier with this component: a tooltip is an annotation laid over the page for a moment, not a piece of its furniture                                              |
| **DI contract** | none of its own. `pctOverlay`, `pctPlacementPositions` and `pctAfterTransition` from `core`; the panel is created with the trigger's own injector, so the texts, the configuration and the theme of the subtree reach it                                                                                                           |
| **Strings**     | none — everything it shows is the author's                                                                                                                                                                                                                                                                                         |
| **SSR**         | the panel is attached by an event and there are no events on the server, so nothing renders and nothing hydrates. `aria-label` is the deliberate exception: a name is part of the markup, not of an interaction                                                                                                                    |

**What arrives from somewhere else, and what is written here.** The positioning is the CDK's
flexible strategy, given a list of positions by `pctPlacementPositions`; the Escape ordering is
the CDK dispatcher's ([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md)); the
answer to "was this focus a keyboard focus" is `:focus-visible`, the platform's
([`req-api-platform`](../requirements/api.md#req-api-platform)). Written here: the
describes/names distinction, the three gestures and the grace periods between them, and the
**leave** — an element removed from the DOM takes its transition with it, so the panel is held
in place, marked, until the fade has run.

## Keyboard map

| key      | effect                                                             | test                                   |
| -------- | ------------------------------------------------------------------ | -------------------------------------- |
| `Escape` | dismisses it, focus stays where it was (WCAG 1.4.13)               | `apps/sandbox-e2e/src/tooltip.spec.ts` |
| `Tab`    | opens it on arrival, closes it on leaving — never enters the panel | `apps/sandbox-e2e/src/tooltip.spec.ts` |

The panel is not in the Tab order and holds nothing focusable: it is read where it stands, and
the control keeps focus the whole time.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARIA APG pattern in the JSDoc   | `libs/components/tooltip/src/tooltip.ts` — the pattern named in the class comment                                                                                                                                                                                                                                  |
| Keyboard map tested             | `apps/sandbox-e2e/src/tooltip.spec.ts` — Escape and the Tab arrival in three engines; `libs/components/tooltip/src/tooltip.spec.ts` for what a focus that is not visible does                                                                                                                                      |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/tooltip` view, and separately **an open tooltip over the icon-only button**: the one place a violation would be real rather than a sandbox artefact ([`lesson-65`](../lessons.md#lesson-65))                                                                           |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `tooltip-open`, the card rather than the panel: what this component draws is a surface answering the page's own, and a picture of the panel alone would say nothing about the contrast between them                                                                        |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the mode takes the inversion away (both surfaces become `Canvas`), so the panel draws a `CanvasText` edge there and only there                                                                                                                                      |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/tooltip.spec.ts` — the duration read from the panel is the reduced one, and the leave still ends. The first component here with a real enter/leave, which is what E1's card said would arrive with it                                                                                        |
| Touch target ≥ 24×24 px         | none — deliberately: the tooltip draws no target. It hangs on somebody else's control, and that control's size is that control's promise                                                                                                                                                                           |
| Size axis                       | none — deliberately: a tooltip has no control height. `req-api-size` is about `--pct-control-height-*`; the only width here is `--pct-tooltip-max-width`, which a consumer overrides                                                                                                                               |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density), G4)                                                                                                                                                                                         |
| RTL                             | `apps/sandbox-e2e/src/tooltip.spec.ts` — `end` measured on both sides of the writing direction. The inline gap is the one thing a screenshot would not catch: the dependency resolves `start`/`end` by direction and adds the offset as plain pixels afterwards, so the sign is flipped in `pctPlacementPositions` |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/tooltip` view renders and hydrates with no `NG05xx`; a closed tooltip contributes no markup                                                                                                                                                                       |
| Forms                           | none — deliberately: a tooltip is not a form control. It holds no value and implements no `FormValueControl`                                                                                                                                                                                                       |
| Hover, focus and touch parity   | `apps/sandbox-e2e/src/tooltip.spec.ts` — the pointer, the keyboard (and a click, which opens nothing) and a long press; `libs/components/tooltip/src/tooltip.spec.ts` for the gestures' timers                                                                                                                     |
| WCAG 1.4.13 — hoverable         | `apps/sandbox-e2e/src/tooltip.spec.ts` — the pointer travels onto the panel and it stays. The panel stands 8 px from the control, so reaching it means leaving the control, and the grace period is what keeps the text there                                                                                      |
| The leave is waited out         | `apps/sandbox-e2e/src/tooltip.spec.ts` (the panel outlives the decision to close, measured in three engines) + `libs/components/core/src/core.spec.ts` (`pctAfterTransition`: the event, the timeout floor and the cancel)                                                                                         |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — one pair, and the only measurement `pct.surface-inverse` gets anywhere in the skin                                                                                                                                                                                        |
| Strings through `PCT_TEXTS`     | none — deliberately: the component writes no string of its own                                                                                                                                                                                                                                                     |
| Size budget                     | `libs/components/size.snapshot.md` — `./tooltip` at 12597 B, with the `./core` row beside it                                                                                                                                                                                                                       |
| Screen-reader log               | none — gap. The same one the dialog and the select have. What a reader really says when a described control takes focus is a question axe does not answer — axe examines structure, it does not listen                                                                                                             |
| docs page                       | none — gap. F1                                                                                                                                                                                                                                                                                                     |

## Decisions

[0030](../decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md) (the main one —
why a name is an attribute and a description a reference, and what an audit says about the other
road), [0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md) (Escape comes from the
stack), [0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md) (this is a panel of the
kind that takes none), [0013](../decisions/0013-no-headless-split.md) (the inputs are ours, the
mechanisms the dependency's)

## Known limitations

- **A description exists only while the panel does.** A screen-reader user who never focuses the
  control — reading the page with a virtual cursor — is not given it. The alternative is a
  hidden copy of the text living in the DOM for good, which is a second rendering of the same
  string to keep in step; the road chosen is written down in
  [0030](../decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md), and it is
  the reason a tooltip may never carry something the page says nowhere else.
- **A disabled control does not answer.** `<button disabled>` fires no pointer events in any
  engine, so a tooltip on one never opens. A control that has to explain why it is disabled
  needs a wrapper around it — the wrapper is the trigger.
- **The long press cannot suppress the platform's own gesture.** Holding a finger on a control
  may still raise the system's text-selection callout, because the trigger is the consumer's
  element and this library has no stylesheet that reaches it.
- **No arrow.** A pointer drawn from the panel to the control is one more thing to position and
  to repaint on every flip; the 8 px gap and the placement say the same thing more cheaply.
- **One tooltip at a time per trigger, and no delay knobs.** The waits (150 ms in, 150 ms grace,
  500 ms long press, 1500 ms after a finger) are constants. They are the numbers a hover feels
  right at, and an input for each would be four more things to get wrong for a case nobody has
  yet.
