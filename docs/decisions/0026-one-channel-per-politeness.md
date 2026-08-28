# 0026 — One channel per politeness, and a message with a home announces from it

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-project-core`](../requirements/project.md#req-project-core)
**Evidence:** [`lesson-83`](../lessons.md#lesson-83) — the CDK announcer measured on the two
stylesheets this library asks a consumer to include; the reader of the empty panel measured in
three engines before anything was written

## Context

The plan asks for a live announcer: "one `polite` channel, one `assertive`, with deduplication — not
a region per component". The overlay and the focus layer had both come out of the same shape — a
line naming several things, of which some had a consumer here and some named the modal half of a
library that has no modal ([0024](0024-the-closing-stack-is-the-dependency-s.md),
[0025](0025-a-panel-says-whether-it-takes-focus.md)) — so the question was again which of it has a
consumer today.

**A region per component already exists, and it is not the defect the line is about.** Four
templates draw their message inside `role="alert"`: the checkbox, the radio group, the select
and the field chrome. That is a live region per component in the literal sense, and it is
right where it stands. The message is **on the screen**, in the element `aria-describedby`
names, one owner for one sentence ([0022](0022-one-message-line.md)); `role="alert"` is also
the one live region an assistive technology is expected to read when it enters the document
together with its text, which is what an `@if` around an error does. Moving those sentences to
a hidden channel would put the same words in the document twice and buy nothing measurable:
errors here appear one at a time, on `touched`, and a shared region without a queue would lose
the second of two that arrive in one frame — worse than what it replaced.

**What has no reader at all is the select's empty panel**, and that was measured before
anything was built. With the panel open on an empty list, in blink, gecko and webkit alike:
focus stays on the trigger (the listbox pattern, [`lesson-18`](../lessons.md#lesson-18)), the
trigger's `aria-activedescendant` is **absent** because there is no option to name,
`aria-describedby` is **absent**, and the sentence the panel draws — `texts().selectEmpty` —
sits in a `<div>` with no role inside the listbox. A sighted user is told the list is empty;
a screen reader user hears "expanded" and then silence.

So the layer has one consumer, it is `polite`, and the message it carries is one the library
writes itself — which is why it goes through `PCT_TEXTS` and is announced in the application's
language rather than in the library's ([`req-api-texts`](../requirements/api.md#req-api-texts)).

## Decision

**A live channel is for a change with no element the reader is pointed at. Everything else
announces from where it is drawn.**

`PctAnnouncer` in `libs/components/core/src/announce.ts` is that channel: a
`providedIn: 'root'` service holding **two** regions for the whole document, one `aria-live`
value each, fixed when the region is created.

**Two regions and not one with a rewritten attribute.** An assistive technology registers a
live region when it enters the accessibility tree, and reads the politeness then. CDK's
`LiveAnnouncer` keeps a single element and sets `aria-live` per call, which asks the technology
to notice a change of urgency between two sentences; a pair of regions asks it nothing.

**The pair is opened by a render, not by the first message.** A region that enters the document
together with its text is a region nobody has registered yet, and the announcement goes
nowhere. `afterNextRender` is what says "in a browser, once there is a document" without a
platform check: on the server it never runs at all, so nothing is appended to the HTML being
sent (`req-project-ssr`), and a message with no region to land in is dropped rather than
queued — there is no reader for a document the user has not been shown.

**`announce` and `retract` are one contract, and the deduplication is what makes the second
half necessary.** A channel does not repeat what it is already saying: two components reporting
the same state are one announcement, and a signal recomputing under an unchanged message is not
a second event. The consequence is that a message has to be **withdrawn** before it can be
announced again — the select retracts as the panel closes and again if it is destroyed with the
panel open. It is the same pair as `attach` / `detach` in the field chrome, and it is missing
for the same reason ([`lesson-68`](../lessons.md#lesson-68)): the half that speaks is the half
somebody writes first.

**The hiding travels with the element.** The regions are clipped by their own declaration
block, not by a class, because a class is a promise about a stylesheet the consumer includes —
and that promise is measurably broken in the utility this would otherwise have reused
([`lesson-83`](../lessons.md#lesson-83)).

**CDK a11y is not used here, and `req-a11y-built-in` is amended rather than quietly disobeyed.**
The requirement named `LiveAnnouncer` among the mechanics to take from the CDK. Taken, it would
have painted its text across the bottom of every consumer's page.

## Consequences

- the four `role="alert"` messages stay as they are, and now say so in a document rather than
  by being the only thing anybody wrote. The rule that decides between them is the one above:
  a sentence with a home announces from the home;
- the `assertive` channel has **no consumer inside the library today**. It is not a second mechanism
  but the same one under a different attribute, and it is created with its twin because a channel
  opened at the moment of its first message is the failure this decision is built around. The first
  callers are the toast and the dialog;
- `pct-select` gained an owner it must release: a control destroyed with an empty panel open
  retracts its sentence, or the next select to open an empty panel would find the channel
  already holding those words and stay silent;
- the library creates its first DOM outside a template. Everything until now was a component
  tree; a body-level region is not, and `req-project-ssr` is why the creation is booked on a
  render rather than run in a constructor;
- an application may announce through the same channel — `PctAnnouncer` is exported from
  `./core` — which is the point of there being one pair of regions rather than one per widget.

## What this costs us

- **bytes in the shared kernel, on every entrypoint.** `./core` grows 3482 → 4440 B and the
  probe of every entrypoint that re-exports it grows by the same 939 B; `./select` pays a
  further 308 B for the wiring. The snapshot's numbers are an upper bound by construction (the
  probes import a whole namespace, [`lesson-81`](../lessons.md#lesson-81)), and this is the
  first service in `core` big enough for the difference between that bound and a real
  consumer's build to matter;
- **the announcement itself cannot be measured here.** No engine Playwright drives runs an
  assistive technology, so what the gates prove is the DOM an announcement is made of — one
  region per politeness, present before anything is said, invisible, holding the sentence and
  then not holding it. That an announcement is **heard** rests on the ARIA specification and on
  the region being built the way the specification describes;
- **a stale channel is silent, not wrong.** The deduplication means a message left behind by a
  component that forgot to retract blocks the same message from anybody else. The unit suite
  has the case, and it is the price of collapsing two owners into one announcement;
- **a message emitted before the first render is dropped.** Nothing in this library speaks that
  early — a panel cannot be open before it has been drawn — but a consumer announcing from an
  `APP_INITIALIZER` would find silence, and the contract says so out loud.

## Alternatives considered

- **CDK's `LiveAnnouncer`.** The mechanics were there, and `req-a11y-built-in` named it. It
  hides its element with `cdk-visually-hidden`, a class defined in `@angular/cdk/a11y-prebuilt.css`
  — a stylesheet neither this library's install instructions nor its `ng add` schematic mention.
  Measured on the sandbox, which loads exactly the two stylesheets a consumer is told to load:
  the announcer's element is **573 × 18 px of visible text** at the bottom of the page. Beyond
  the stylesheet, it holds one element for both politenesses and writes the text on a 100 ms
  timeout, which is a queue with one slot rather than a channel.
- **Moving the four `role="alert"` messages onto the channel**, so that "not a region per
  component" is true in the literal sense. Rejected on the measurement above: it duplicates
  text that already has a home, and a single region serialises what four regions announce in
  parallel — the improvement it promises needs a queue, and a queue needs a delay nobody can
  measure the right value for.
- **Announcing the option count on every opening** ("12 options"), the way an autocomplete
  does. Rejected: the listbox already names the active option through
  `aria-activedescendant`, so this would be a second voice over a pattern that works. The
  empty list is exactly the case where that pattern has nothing to say.
- **A region per component, hidden, created with the component.** Rejected: N components are N
  regions all speaking at once, and each of them is registered when its component renders,
  which for a component inside an `@if` is the moment it has something to say.
- **`role="status"` on the regions instead of `aria-live="polite"`.** No measurable difference
  for the polite channel, and no equivalent for the assertive one that is not `role="alert"` —
  which is the role this library uses for messages with a home. Two spellings of one thing
  would make the distinction above unreadable.
