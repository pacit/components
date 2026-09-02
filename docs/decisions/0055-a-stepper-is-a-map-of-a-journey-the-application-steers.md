# 0055 — A stepper is a map of a journey the application steers

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** `libs/components/stepper/`, the unit suite in
`libs/components/stepper/src/stepper.spec.ts`, `/stepper` in the sandbox audits, the RTL
and forced-colours readings in `apps/sandbox-e2e/`

## The question

Two different things wear the name "stepper" and they share nothing at all:

- **a number stepper** — the two small arrows beside a numeric field. That control lives
  where its value lives, in the number field, and it is not this component;
- **a map of a journey** — "step 2 of 4": the row above a checkout that says what is done,
  where you stand, and what is still to come.

This decision builds the second. Its centre of gravity is one split, the pagination's
([0048](0048-a-pagination-owns-its-page-number.md)) walked one component further: **the
application owns the journey, the component owns the picture of it.** Whether step 3 is
reachable, what "done" means, whether a press on a finished step may go back — all of that
is validation and routing, which is to say the application's own state machine. The
component takes one number and draws the map.

## One number in, the whole map out

`step` is a 1-based input — a number the user reads, "step 2 of 4", exactly the
pagination's argument for its `page` — and the DOM order of the projected `<pct-step>`
children numbers the steps. Everything else is computed: a step before the pointer is
**done**, the step at it is **current**, a step after it is **upcoming**. There is no
model and no event: a map does not move the traveller, and a two-way `step` would promise
that pressing the picture steers the journey, which is exactly what this component
refuses to know how to do.

**The component writes `aria-current="step"` itself — and the breadcrumb, one decision
back, refused to write `aria-current="page"`.** The two records disagree on the surface
and agree underneath: the attribute belongs to whoever holds the truth. For a trail of
links the router holds it, and a component guessing from position lies on every partial
trail; here the application has already spoken — the `step` input **is** the statement —
and the component only renders it, the same way the pagination stamps `aria-current` on
the page its own model names.

## The structure, standing on measured ground

The host is the `role="list"` itself — the chips' arrangement, not the breadcrumb's,
because there is no landmark here: a map of status is not navigation, and a `navigation`
role would promise links this component does not draw. Every `<pct-step>` is a
`role="listitem"`; the probe behind [0054](0054-a-breadcrumb-is-the-way-here-told-in-links.md)
measured this exact geometry (custom listitems directly under a list — clean in three
engines; anything looser — a critical violation), so it is cited here rather than run
again.

Inside a step, in order: the **connector** (a drawn line, `aria-hidden`, hidden on the
first step by `:first-of-type` — the breadcrumb's line, for the breadcrumb's reason), the
**marker** (a circle wearing the step's ordinal, or the library's `check` when the step
is done — `aria-hidden` either way, a drawing), and the projected **label**, whose text
is the application's.

**Done is audible, not only drawn.** The check is hidden from the tree, so a done step
carries a visually-hidden suffix — `texts().stepDone`, "Completed" — the calendar's
clipped-box declarations, and a reader hears "Payment, Completed" where the eye sees the
check. Upcoming steps add nothing: unmarked is the base state, and a suffix on every row
would be noise pretending to be information.

## Forced colours: the fills go, the drawing and the weight stay

Both filled markers (done and current) drop their accent with every other author colour.
What survives is written out (`lesson-70`): the marker's **border** keeps every circle a
circle, the check keeps saying done because it is a drawing in `CanvasText`, and the
current step keeps its label **weight** — the breadcrumb's channel, one decision old.
The ordinal in the marker tells current from upcoming the rest of the way.

## What is refused, and why

- **the number stepper** — a different thing wearing the name; it lives beside the value
  it steps, in the number field.
- **interactive steps** — a step that answers a press is the application's `<a>` or
  `<button>` projected into the label, wearing the application's own guard logic; the
  component draws no control and takes no click, because it cannot know whether going
  back is allowed (`req-api-platform`: the projected element brings its own keyboard).
- **step content / panels** — a wizard's pages are routed views or the application's own
  markup; a stepper that owned panels would be the tabs with a costume on. The map is the
  whole component.
- **a `linear` flag** — linearity is validation, and validation is the application's
  state machine; a flag here would be a promise the component cannot keep.
- **vertical orientation** — it returns as its own decision the day a real application
  asks; a trail too wide for its line wraps, which is already readable.
- **writing `stepDone` into `aria-label`** — a label on the listitem would REPLACE the
  projected text in the accessible name instead of following it; the suffix rides inside
  the content, so the name stays "Payment, Completed" with the application's word first.

## Consequences

- `PCT_TEXTS` grows `stepDone` — the one string the component says by itself.
- The name dictionary grows the state `done`; `marker` and `track` it already had.
- Tokens: the marker triple per state (upcoming, done, current), the connector's colour
  and length, the gap, the muted label of an upcoming step and the current label's
  weight.
- Dev-mode warnings, the chips' shape: a step whose parent element is not the list warns
  once and names the fix.
- The mutation surface is the state arithmetic and one warning's guard — the first
  component since the pagination with a computed worth killing mutants over.
