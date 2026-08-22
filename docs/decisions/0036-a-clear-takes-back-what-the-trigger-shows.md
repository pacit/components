# 0036 — A clear takes back what the trigger shows

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** `libs/components/select/src/select.spec.ts` and `multi-select.spec.ts` — 22
cases over the two tags; `apps/sandbox-e2e/src/select.spec.ts` ("a cross that takes the answer
back", 8 cases × 3 engines) and `a11y.spec.ts` — the cross audited where it stands, beside a
trigger whose references cross into an overlay;
[`lesson-104`](../lessons.md#lesson-104) — a `<button>` inside a `<button>` is two buttons the
moment something parses it; [`lesson-105`](../lessons.md#lesson-105) — a positioning context
costs the text inside it its subpixel antialiasing

## Context

E4's fifth item is **clearing**, and written down as a feature it is one line: a cross that
puts the value back to empty. Three questions sit under that line, and two of them were
settled by a measurement rather than by taste.

1. **Where does the cross go?** Inside the trigger is where every library draws it.
2. **Is it a stop in the tab order?** Every keyboard user needs a way to it, and a form of ten
   clearable selects is then a form of twenty tab stops.
3. **What does it clear?** On a filtering control the trigger holds two things at once — the
   answer, and the question being typed ([0035](0035-a-filter-is-a-question-not-a-value.md)) —
   and "clear" names both.

## The first question is answered by the parser

The select-only trigger **is** a `<button>`, so a cross inside it is a `<button>` inside a
`<button>`. HTML says a button may hold no interactive content, and that is usually filed
under "a validator will complain". It is worse than that, and the measurement is two lines:

```js
// what the HTML parser does with the nesting — the server's answer, the browser's own parse
new JSDOM('<div><button>text<button>x</button></button></div>');
// → <button>text</button><button>x</button>   two siblings; the first lost its arrow

// what the DOM API does with the same tree — which is how Angular builds a template
a.appendChild(b);
// → <button>text<button>x</button></button>   the nesting stands
```

Angular's own template parser agrees with the second: `parseTemplate` reports no error and
returns the nested tree, because it builds through the DOM rather than through the HTML
fragment parser. So the same template is **two different trees** depending on who read it —
and the place they meet is server rendering, where Angular serialises a tree the browser then
parses back. A control that works in the browser and rearranges itself under SSR is not a
validator's complaint; it is a hydration mismatch nobody can read.

So the cross is a **sibling** of the trigger, and a sibling needs a box to stand in. The
filtering branch already had one — an `<input>` holds no children either, so its arrow was
already standing beside it — and the box now wraps both branches. Nothing about the control's
look moves there: the border, the padding, the ring and `data-pct-part="trigger"` stay on the
element with the role.

The box brought two consequences of its own, both measured rather than expected.

**It has to be the panel's origin.** The CDK reads "a click outside the panel" as "a click
outside the origin", so with the trigger as origin a press on the cross — a sibling — would
arrive as an outside click and shut the panel underneath the user. The box is the same width
as the trigger, so nothing the panel measures changes.

**It is a positioning context only where something is positioned in it.** A `position:
relative` wrapper is a paint layer, and Chromium hands the text inside one greyscale
antialiasing instead of subpixel: an unchanged card came out with 82 pixels in different
colours at identical geometry, and the visual gate caught it
([`lesson-105`](../lessons.md#lesson-105)).

## The second question is answered by the platform

The platform draws exactly one clear control of its own — the one in `<input type="search">` —
so the question has an answer that is not ours to invent. Measured in the three engines this
library supports:

| engine   | Tab from the field lands on | Escape in the field  |
| -------- | --------------------------- | -------------------- |
| chromium | the next control            | clears it            |
| firefox  | the next control            | clears it            |
| webkit   | the next control            | leaves it alone      |

Unanimous on the part that matters: **the platform's clear control is in no engine's tab
order**, and where the platform gives the keyboard a way to the same thing, that way is
Escape. So the cross carries `tabindex="-1"` — it stays a `<button>`, so a reader's virtual
cursor still reaches and presses it; the tab order is the only thing it is kept out of — and
**Escape over a shut panel is the keyboard's cross**.

Escape is spent only when it did something. A control with nothing to take back leaves the
event alone, so the key travels on to whatever the select is standing inside — a dialog, above
all, where swallowing it would read as "Escape stopped working".

## The third question is answered by 0035, again

A filtering trigger holds the answer and the question in one field. A cross that always
cleared the value would, mid-question, wipe a choice the user cannot see while leaving the
letters they can; a cross that always cleared the question would do nothing at all on the
select-only trigger. Both are the same defect 0035 is about: the two states treated as one.

**Decision: the cross takes back what the trigger is showing.** While a filtering panel is up
the trigger shows the question, so the cross takes the question and leaves the value, the
panel and the chosen labels behind it alone. In every other state the trigger shows the
answer, so the cross takes the answer. One sentence, and the keyboard reads the same way:
Escape over an open panel closes it and the question dies with it, Escape over a shut one
takes the answer.

It follows that **the cross is drawn only where there is something to take back** — a button
that does nothing is a lie about the state — and that "something" is read off the **text the
trigger draws** rather than off the value. A value no option carries names nothing on the
trigger, and offering to undo something invisible is the same defect one floor down.

## Consequences

- `clearable` is an **input on both tags**, not a third tag: 0034's rule read the same way
  filtering was read — an emptied `pct-select` is `emptyValue` and an emptied
  `pct-multi-select` is `[]`, both of them states the value could already reach, so the type
  says nothing new.
- Off by default. A required field whose answer goes in one press is a form that can be left
  invalid by accident, and only its author knows whether that road is worth having.
- The press is answered on `mousedown` as well, with the default refused: the cross removes
  itself the moment it works, and focus taken by an element that then leaves the tree lands on
  `body` — the end of the key map.
- `reset()` and the cross are now one thing plus the panel. What the empty state **is** stayed
  with the subclass (`clearValue`); what a reset **means** moved to the base, where it is
  written once.
- The space the cross needs is reserved by the **input** (`data-pct-clearable` on the host),
  not by the cross standing: a trigger whose words reflowed the moment an answer appeared
  under them would move while being read.
- One new string (`selectClear`) and one new part (`clear`). One name for both jobs the button
  does, because a user pressing it sees one button in one place.

## What would overturn it

- **A screen-reader log** saying that taking the answer back goes unannounced. Focus stays on
  the trigger and its accessible name changes underneath, which no reader promises to speak;
  the honest answer would then be a sentence on the polite channel, and this library has no
  measurement of what is spoken yet — the gap is already recorded on the card.
- **A second clear control on a control that is not a select.** The rule here is written about
  a trigger that shows one of two things; a control that shows only one would not need the
  distinction, and repeating the machinery for it would be the moment to move it into `core`.
- **An engine giving its native clear control a place in the tab order.** The table above is
  the reason the cross has none, and it is a measurement with a date on it.
