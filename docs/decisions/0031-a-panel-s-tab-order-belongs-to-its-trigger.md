# 0031 — A panel's tab order belongs to its trigger

**Status:** accepted
**Implements:** [`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-overlay`](../requirements/api.md#req-api-overlay)
**Evidence:** measured in the sandbox with the popover open — the CDK overlay container is
`document.body`'s **last element child**, so the panel's content is the last thing in the
document's tab order however near the trigger it is drawn;
[`lesson-93`](../lessons.md#lesson-93) — the dismissal paths of a panel and the press on its
trigger are one event

## Context

A modal has no such problem: everything outside it is `inert`, so there is nowhere for Tab to
go and a focus trap is the whole answer. A **non-modal** panel has the opposite situation — the
page behind it is live, Tab is supposed to leave the panel, and the question is _where to_.

The DOM answers badly. An overlay is a child of `body`, appended after the application root, so
the panel's content sits at the end of the document in tab order while it is drawn against a
control somewhere in the middle of the page. Left alone:

- Tab from the last control in the panel leaves the **page** — the browser's own chrome is next,
  because there is nothing after the overlay container;
- Shift+Tab out of the first control lands on whatever the page happens to end with, which is
  as far from the trigger as it is possible to get;
- and the panel stays open behind all of it, hanging off a control the user has left.

Three roads were open. **Trap the focus** — that is a modal with the word filed off, and it takes
away the one thing this component exists for. **Close on `focusout`** — refused on what the event
really reports: `relatedTarget` is `null` both for focus going nowhere in the page and for the
whole **window** losing it, so a panel that closed on that would be gone when the user came back
from another application, and one that ignored it would miss the ordinary case. **Splice the
order** — treat Tab out of the panel as the way out and put focus back where the panel came from.

## Decision

**Tab out of the panel closes it and returns focus to the trigger, in both directions.**

The panel is a detour, and the page's own order carries on from the control the detour started
at: the next Tab moves from the trigger to whatever follows it, the next Shift+Tab to whatever
precedes it. The close carries the reason `away`, so an application can tell a user who walked
out of a panel from one who answered it.

What Tab can reach inside the panel is the dependency's `InteractivityChecker` and not a
selector list of our own — which elements are tabbable is a question about disabled states,
`contenteditable`, media elements and four engines' disagreements about them
([0013](0013-no-headless-split.md)). With no tabbable content at all, focus is on the panel
itself and any Tab is a Tab out.

Focus goes **in** to the panel rather than to its first control, and the reason is the same
sentence read the other way: the panel is what carries the role and the name, so it is what a
screen reader announces on arrival. And it comes back **only if it was inside** — the page
behind is live, so Escape may be pressed by somebody who has already clicked into it, and a
restore that did not ask would take focus off what they were doing.

## Consequences

**A popover is not a place to park.** Tab is a way out, so a panel whose content the user is
expected to leave and come back to — a docked filter panel, a side sheet — is not this component.
That is the honest boundary of a non-modal overlay panel, and the drawer is where the other shape
belongs.

**One trigger per panel.** Focus returns to "the trigger", so two controls opening one popover
would make that "whichever registered last" — reported in dev mode rather than repaired, because
the fix is a popover each and the library cannot know which of the two the author meant.

**The rule outlives this component.** The menu and the select family open panels from controls in
the same way, and both inherit this line and [`lesson-93`](../lessons.md#lesson-93) with it. The
select is the exception that proves it: its panel takes no focus at all
([0025](0025-a-panel-says-whether-it-takes-focus.md)), so there is no tab order to splice — which is
why this decision is written down at the first component that _does_ have one.

**What it costs.** A keystroke the browser would have handled is handled here, so a page that
wanted the browser's own answer cannot have it. The measurement is `preventDefault` on a Tab,
and that is a thing to be careful with: it is switched on only while a popover is open, only
inside its panel, and only at the edge of the panel's own tabbable list — every other Tab in the
document is the browser's.
