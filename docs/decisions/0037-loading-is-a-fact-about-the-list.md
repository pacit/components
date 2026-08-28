# 0037 — Loading is a fact about the list, and a cursor names an option

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-api-texts`](../requirements/api.md#req-api-texts)
**Evidence:** `libs/components/select/src/select.spec.ts` and
`libs/components/core/src/core.spec.ts` — 17 cases over the sentence, the busy state and the
walk; `apps/sandbox-e2e/src/select.spec.ts` ("a list that is still coming", 7 cases × 3
engines) and `a11y.spec.ts` — the waiting panel audited where it stands;
[`lesson-106`](../lessons.md#lesson-106) — an empty listbox is a **critical** violation, and
`aria-busy` is the specification's own way of saying "not yet";
[`lesson-107`](../lessons.md#lesson-107) — a cursor is a number, and a list that arrives twice
moves what the number names

## Context

The select family's sixth item is **async**: a list that is not there when the control is. It
arrives from a server, it arrives again when the question changes, and between those two moments
there is a state this library has never had a name for.

Three things have to be decided, and only the first of them looks like the feature:

1. **What does the control say while the list is coming?** An empty panel already says two
   things — "no options" and "no matches" — and neither of them is true yet.
2. **What does the state take away?** `pctButton` already has an input called `loading`, and
   there it disables the button.
3. **What happens to the keyboard cursor when the list is replaced underneath it?** Every list
   change this library had seen until now was caused by a keystroke. A server's answer is not.

## The sentence: a conclusion nobody has reached

"No options" and "No matches" are **answers**. A panel that gives one while the request is in
flight is telling the user something that is not yet true, and it is not a cosmetic lie: the
user's next act — deleting the letters, giving up on the list, typing something else — is
decided by it.

So `loading` takes both sentences off the screen and puts a third in their place
(`selectLoading`, through `PCT_TEXTS` like the two it replaces —
[`req-api-texts`](../requirements/api.md#req-api-texts)), and it goes on the shared polite
channel exactly as they do: focus stays on the trigger, so nothing inside an empty panel has a
reader ([0026](0026-one-channel-per-politeness.md)).

Three sentences is also where the **withdrawal** had to change. It used to name the two
sentences it knew and retract both, because the one to withdraw is never the one the state now
names — the question dies with the panel. With a third, that shape breaks for a reason a test
records: a list can stop loading **while the panel stays open**, so one sentence replaces
another with nothing closing. What the control now retracts is what it actually said, kept
beside the effect that said it. The channel is shared, so a sentence left standing on it is
worse than stale: the next control to say the same thing is deduplicated into silence.

The same three lines are also where the mutation run earned its keep: they began with two
guards — "say nothing when there is nothing to say", "withdraw nothing when nothing was said"
— and every mutant of both survived. They are the **announcer's own contract written twice**
(it ignores an empty message, and it withdraws only what is still on the channel), so what a
control has to keep is the sentence and not the arithmetic around it.

## The busy state: the specification's own answer, and axe implements it

A panel waiting for its rows is a `role="listbox"` that owns no `role="option"`. That is not a
gap in this library's manners — it is a **critical** violation, and the audit says so in one
line ([`lesson-106`](../lessons.md#lesson-106)):

```
[critical] aria-required-children: Required ARIA children role not present: group, option
  - #pct-select-39-listbox
```

The way out is not a placeholder row that nobody can pick. It is the state ARIA has for
exactly this, and axe stands down on it: a container marked `aria-busy` is a container whose
content has **not arrived**, so the rule waits with it. Removing the attribute brings the
violation straight back, which is this step's sharpest control.

It goes on the **listbox** and nowhere else, because it is the listbox's content that is late:
a shut panel is not a stale reading of anything. It is written only while it is true —
`aria-busy="false"` is the default value, so spelling it out would stand in the tree of every
panel on the page — and it gets no `data-` twin: this is the platform's own name for the fact,
and `[aria-busy="true"]` is already a selector a skin can use.

## What it takes away: nothing

This is where the input parts company with `pctButton`'s input of the same name, and the
difference is not a preference. On a button the loading **is** the control's own action in
flight: a second press would send it twice, so disabling is the honest state. Here the control
is in perfect working order and its list is late — the user can type the very question that
fetches it. Disabling would take the focus with it, because a disabled element drops focus on
`body`, which is the end of the key map. So `loading` does not disable, does not close the
panel, does not touch the value, and does not take the rows already on the screen away: a
second question in flight over the answer to the first is exactly what `aria-busy` is for, and
a panel that emptied itself on every keystroke would be flashing at a user who is reading it.

The rows are also what keeps the cross honest with no extra rule: it is drawn off the
trigger's own text ([0036](0036-a-clear-takes-back-what-the-trigger-shows.md)), and a value
whose option has not arrived shows nothing, so there is nothing offering to undo nothing.

## The cursor: it names an option, so it is put back the way a value is

Until this step every change of the list was caused by a keystroke, and all three keystroke
paths set the cursor themselves. A server's answer is the first change that happens on
**nobody's** keystroke, and an index kept as a number then names a different row —
`aria-activedescendant` points at an id nothing carries, the reader falls silent, and `Enter`
picks a row nobody pointed at ([`lesson-107`](../lessons.md#lesson-107)).

So the walk in `core` learned one rule: **a cursor names an entry, not a position**. When the
list is replaced it is put back on the same entry; where the new list can no longer name it,
on the first reachable row.

What makes two entries "the same" is the control's business, and the select's answer is one it
had already given: `compareWith`. A row is rebuilt on every reading, so identity would say
that no two readings share anything — but a value maps back to an option through `compareWith`
precisely because a fetch brings back another instance of the same thing, and a cursor is
another way of naming an option. A menu, whose items are component instances that survive the
change, keeps identity and says nothing.

Two smaller readings of the same rule:

- **A cursor deliberately put nowhere stays nowhere.** `-1` over a list that HAD entries is a
  panel somebody closed, and a list arriving afterwards is not an invitation to start walking
  one nobody is looking at.
- **A cursor that had no list starts at the top when one arrives.** `-1` over an EMPTY list is
  a panel waiting for its rows, and their arrival is what it was waiting for. It is also what
  ends "Loading…" for a screen reader: `aria-activedescendant` starts naming the first option,
  which is the pattern reading the list out.

The implementation is a `linkedSignal` and not an effect, and that is the same lesson as ever:
an effect would read the index it writes, which is one consumer paying an extra pass and two
never finishing ([`lesson-94`](../lessons.md#lesson-94)).

## A question somebody else answered

A filtering control whose question goes to a server gets its answer as another `options` list —
and the control would narrow that answer a **second** time, with a predicate that knows only
the label. A server that matched a city by a code, by an old name or by a misspelling would
watch the row it found be taken out again, in a library that never said it would.

The door was already open ([0035](0035-a-filter-is-a-question-not-a-value.md): `filterWith`
"on nothing at all when a server is doing the narrowing"), so what this step adds is a name for
it: `pctKeepAll`. A constant rather than `() => true` written into the template, and that is a
cost and not a style — an arrow in a binding is a new function on every change detection pass,
so the input changes, the predicate changes, and every row of the panel is rebuilt for as long
as the page lives.

## Consequences

- **`loading` is an input on both tags** and lives in the base, so the two tags carry it
  identically — the parity of their inputs is measured, not hoped for
  ([0034](0034-multiplicity-is-a-tag.md)).
- **The walk in `core` gained one optional question** (`sameItem`) and the menu did not have to
  answer it. What the menu did gain for free is the same repair: an item list that changes no
  longer leaves its cursor on a position.
- **A list that goes empty and comes back loses the cursor**, and that is deliberate. To
  survive the gap the walk would have to remember an entry that is in no list at all — a
  memory outliving the thing it is about, and a cursor that could reappear on an option
  somebody deleted.
- **`aria-busy` is the whole of the visual state**: no spinner, and no token. The sentence in
  the panel is what a reader gets, and a drawing cannot be translated.
- **The bytes: `./select` 62106 → 62761 B (+1.1%)**, and every other entrypoint grew by 22 B,
  which is the new `PCT_TEXTS` string — a default in `core` is carried by everything that
  imports `core`.
- **What is deliberately not built**: no debounce (0035 refused it once and the reason has not
  moved — a request belongs to whoever sends it); no `displayWith` naming a value whose option
  has not arrived, because the label lives in the list and a second source for the trigger's
  text is exactly what 0035 refused; and no ordering of answers — a response that arrives after
  a newer one is the caller's to drop, and a control that tried would be repairing data it
  cannot see.

## What would overturn it

A measurement showing that a reader is better served by `aria-busy` on the **combobox** than
on the listbox — that is, a screen reader that says something useful about a shut control
whose list is late. The alternative was weighed and refused because there is nothing on the
screen for the state to be about while the panel is down.

Or a control this library has not built yet whose "loading" really does have to disable —
a list that is not a list of choices but a value being fetched. That would not overturn the
rule; it would say that the state belongs to the value rather than to the list, which is the
distinction this decision is made of.
