# 0044 — A toast is a change in a region that was already there, and its place is the top layer

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-config`](../requirements/api.md#req-api-config),
[`req-project-core`](../requirements/project.md#req-project-core)
**Evidence:** four probes over three engines, plus chromium's own accessibility tree read
through CDP. `role="log"` publishes `live=polite`, `atomic=false`, `relevant="additions text"`
with **no attribute written**, where `role="status"` — the reflex — publishes `atomic=true`;
an `alert` nested in a `log` publishes `assertive` and `atomic` for **itself** while the log
around it stays polite; a subtree under `inert`, and a popover the user agent has closed, are
**absent** from that tree rather than ignored; a viewport stretched across the window takes the
hit test away from the whole page in all three engines; focus removed with its element lands on
`body` in all three; and toggling a popover's place in the top layer leaves the messages already
inside it at `opacity: 1` while only the new one runs its `@starting-style`
([`lesson-121`](../lessons.md#lesson-121), [`lesson-122`](../lessons.md#lesson-122))

## Context

The first of the remaining components is the toast, and the plan's own note about it was written two
phases earlier: [0026](0026-one-channel-per-politeness.md) said the `assertive` channel of
`PctAnnouncer` has no consumer inside the library yet and that **"the first callers are the toast
and the dialog"**. The dialog came and was not one. The toast is not one either, and the reason is
the rule 0026 itself settled: **a live channel is for a change with no element the reader is pointed
at; everything else announces from where it is drawn.** A toast is drawn. It has a place on the
screen, a sentence in it and sometimes a button — it is the most _homed_ message this library has.
Announcing it through a hidden region as well would put the same words in the document twice, which
is the thing 0026 refused for the four `role="alert"` errors.

So the prediction in 0026 is wrong and this decision says so out loud rather than quietly
leaving the channel unused. What is **right** in 0026 is its second half, and it turns out to
be the whole shape of this component: **a region that enters the document together with its
text is a region an assistive technology has not registered yet.**

## Decision

### The region is a place, opened empty by a render

`PctToaster` is a `providedIn: 'root'` service. Its constructor books an `afterNextRender`,
that render creates `PctToastViewport` and appends it to `document.body`, and the first render
of that component is a render of an **empty** region — the list it draws is gated on a
`mounted` signal set after the first pass. A message raised before there was a screen waits and
appears in the pass after. On a server no render ever comes, so nothing is appended to the HTML
being sent and no clock is ever armed (`req-project-ssr`).

There is no `<pct-toast>` a consumer writes. A message about something that has just happened
is raised by the code that made it happen, so the surface is a service and the view is a
private consequence of it.

### The region is `role="log"`, and it writes nothing else

Read off chromium's own accessibility tree, with no ARIA attribute on the element at all:

| element              | `live`      | `atomic` | `relevant`       |
| -------------------- | ----------- | -------- | ---------------- |
| `role="status"`      | `polite`    | **true** | `additions text` |
| `role="log"`         | `polite`    | false    | `additions text` |
| `role="alert"`       | `assertive` | **true** | `additions text` |
| `aria-live="polite"` | `polite`    | false    | `additions text` |

`role="status"` is the reflex, and it is the wrong one for a **stack**: `atomic=true` means the
whole region is re-read every time anything inside it changes, so the third message arriving
re-reads the first two. `log` is the role whose definition is this component's — new
information added in meaningful order, old information disappearing — and it publishes exactly
the three values wanted. So the region writes no `aria-live`, no `aria-atomic` and no
`aria-relevant`: [0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md)'s rule
read a fourth time, and the first time it has decided a **role** rather than an attribute.

`PctAnnouncer`'s regions ARE `aria-atomic="true"`, and that is not an inconsistency: they hold
one sentence at a time and a sentence is read whole. The same attribute, opposite values, and
the engine says which is which.

### Urgency belongs to the message, not to the place

An urgent message carries `role="alert"` on its own element inside the log. Measured: the inner
node publishes `live=assertive, atomic=true` for itself and the log around it stays
`polite, atomic=false` — so one stack in one place holds both kinds, in the order they arrived,
and each is announced as what it is. This does not contradict 0026's "politeness is a property
of the region": an `alert` **enters the document with its text**, which is the one case where a
live region is registered and read on arrival. 0026 refused a region whose `aria-live` is
rewritten between messages; nothing is rewritten here.

Urgency is deliberately **not** a colour. A tone drawn in colour alone is a state carried by
colour alone (`req-a11y-forced-colors`), and the channel that would repair it is an icon per
tone — a public name, a promise about a drawing, and the kind of set one consumer cannot judge.
What urgency does change besides the announcement is the clock: it stops there being one.

### The viewport is a child of `body`, in the top layer, and it is as big as its messages

Three separate measurements decide the box.

**A child of `body`, because that is where a modal leaves it speaking.** `PctModalBackground` makes
every child of `body` inert except the one holding the modal, and inert is not a courtesy: in
chromium's own accessibility tree a `role="status"` under `inert` is **absent**, the same as under
`aria-hidden`, and it returns when the attribute goes. A stack inside `<app-root>` would therefore
go silent behind the application's own dialog, which is precisely the moment a "could not save" has
to be heard. `modal.ts` already exempted children carrying `aria-live` — and had to learn the
**roles**, since a `log` carries no such attribute. That is the list walk's rule arriving on a
second consumer: one consumer cannot tell a shared property from an accident of the only case.

**In the top layer, because a number cannot get above it.** The CDK renders every overlay
inside a shown popover, so a modal's veil is in the top layer, and a stack ordered by
`z-index: 1100` sits under it whatever the number says — the container still carries
`z-index: 1000`, which is what makes the defect read as an ordinary stacking bug
([`lesson-122`](../lessons.md#lesson-122)). The viewport is therefore a `popover="manual"`,
shown when it is created and shown again as each message is raised. The order in the top layer
is the order things were shown in, so "shown last" is the platform's own way of saying "the
most recent thing on the screen" — and it is why a message raised from inside a modal stands
over it while a modal opened later stands over an older message. The toggle is free: measured
in three engines, the cards already in the stack keep their opacity across it and only the one
being added runs its `@starting-style`.

**As big as its messages, because a full-bleed box eats the page.** Measured in three engines:
a viewport with `inset: 0` takes the hit test away from everything under it — a button 40 px
from the corner answers as the viewport. The usual repair is `pointer-events: none` on the box
and `auto` on the cards; a box that hugs its content needs no repair, and the distance from the
window's edge is a **margin**, since a margin area answers no pointer at all. It is also what
makes `pointerenter` / `pointerleave` on the host mean "the pointer is in the stack".

### A clock is stopped by a pointer or by focus, and a standing message has none

Measured in three engines: **when the element holding focus is removed, focus goes to `body`.**
A message expiring under a user who has tabbed into it therefore takes away their place on the
page — so nothing expires while a pointer is over the stack or focus is inside it, and what is
left of a clock is resumed rather than restarted.

Beyond stopping it, the **type** decides whether there is a clock at all:

- `PctToastNotice` — `text`, and a `duration` that may be `null`. It goes away by itself;
- `PctToastStanding` — `text`, `urgent`, `action`. It has **no `duration` field**, so a
  standing message with a clock is a compile error rather than a rule in a service.

An action makes a message standing because of where the control is: an element appended to
`body` is last in the page's tab order, so a user reaching it by keyboard passes every control
on the page first, and a clock running underneath that walk is a promise the library cannot
keep (WCAG 2.2.1). Urgency makes a message standing for the reader's sake: something worth
interrupting a screen reader for is worth waiting to be read.

## Consequences

- the library gets its **first service that renders a component**. `PctAnnouncer` creates raw
  DOM; this creates a view, attaches it to `ApplicationRef` and owns its lifetime;
- `core` grows one exported function, `pctInheritedFrom`, which was three lines inside
  `pctOverlay.show()`. A body-level box severs the theme, the typeface, the size and the
  direction exactly as an overlay does (`lesson-35`), and the list of severed properties has to
  be **one** list. The toast has no trigger to read them off, so it reads the application's own
  root element — `body` would find neither the typeface the application writes in nor a
  `data-theme` an application puts on its root component;
- the reading is taken **per message** and not once at the opening, for the reason `pctOverlay`
  reads per open: a theme or a direction switched at runtime would otherwise leave the stack
  showing the page as it was at bootstrap;
- `PctModalBackground` now knows the five live **roles** as well as the attribute. Nothing else
  in the library draws a `marquee` or a `timer`; an application's own is exactly what that loop
  must not silence;
- **the `assertive` channel of `PctAnnouncer` still has no consumer inside the library**, and
  0026's note about it stands corrected here rather than in that document. It remains exported
  for an application to use;
- a fifth entrypoint depends on `./icon` (the cross) and on `./core`.

## What this costs us

- **the announcement itself still cannot be measured here**, and 0026's sentence about it
  applies unchanged: no engine Playwright drives runs an assistive technology. What the gates
  prove is the DOM an announcement is made of — a `log` in the document before anything is in
  it, an `alert` for an urgent message, the region present in the accessibility tree while a
  modal is up. That it is **heard** rests on the specification and on the engines' own reading
  of the roles, which is at least measured;
- **no tone.** No colour for success, warning or failure, for the reason above — which is a
  real thing a consumer will ask for, and the honest answer is that the repair is an icon set
  and the icon set is a decision of its own. **That condition fired**: the four names landed
  together and the toast carries tones today —
  [0076](0076-a-tone-is-two-channels-and-four-names.md). The clause stays as the record of a
  refusal that was closed rather than abandoned;
- **no leave transition.** A message fades in with `@starting-style` and goes at once. A leave would
  mean the card outliving its own removal while every card under it moves up — a layout animation,
  which is a different thing from a fade and one this library has no machinery for. The dialog
  shipped on the same reasoning;
- **the stack drops the oldest message over the limit.** Four is the default; a burst taller
  than the window would cover the page it is reporting on, and something has to give. Only the
  application knows how tall its window is, so the number is configuration;
- **a message is at the end of the page's tab order and the library installs no shortcut to
  it.** A key that jumps to the stack (F6 in some implementations) is a global listener and a
  promise about a keystroke this repository has not measured against anything;
- **`--pct-toast-z-index` orders nothing while the top layer is there.** It is what a browser
  without `showPopover` has instead, and the moment before the first show in every other. A
  token whose job is a fallback is a token with a reason written next to it, not a live one.

## Alternatives considered

- **Announcing through `PctAnnouncer` and drawing a silent card.** Rejected on 0026's own
  rule and on the measurement behind it: the words would stand in the document twice, and the
  channel deduplicates — two components reporting the same state are one announcement, while
  two toasts saying the same thing are two messages on the screen.
- **`role="status"` on the viewport**, which is what most implementations reach for. Rejected
  on the table above: `atomic=true` re-reads the whole stack on every arrival.
- **Two regions in the viewport, one per politeness**, mirroring `PctAnnouncer`'s pair.
  Rejected because it splits the ORDER: the messages would be grouped by urgency rather than
  by when they arrived, and a stack is a log — meaningful order is what the role is about.
  Nesting an `alert` inside the log gets both, and the engines say so.
- **A CDK overlay, like every other panel here.** Rejected twice over: an overlay is attached
  at the moment of the message, which is exactly the region-with-its-text failure; and it is
  positioned against an anchor, which a toast has none of.
- **`pointer-events: none` on a full-bleed viewport.** Works, and is what most implementations
  do. Refused because it repairs a problem the box need not have: hugging the content leaves
  the page answering everywhere the stack is not, with no rule about pointers at all.
- **A `<pct-toast>` component the consumer puts in a template**, with `@if` deciding when it
  shows. Rejected: the place a message is raised from is a service call in a handler, not a
  template, and a component would put the region's lifetime in the consumer's hands — the one
  thing this decision is about is that the region is there **before** anybody needs it.
