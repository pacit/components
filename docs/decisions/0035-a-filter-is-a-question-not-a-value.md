# 0035 — A filter is a question, not a value

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** `libs/components/select/src/select.spec.ts` and `multi-select.spec.ts` — 26
cases over the two tags; `apps/sandbox-e2e/src/select.spec.ts` ("a question typed into the
trigger", 7 cases × 3 engines) and `a11y.spec.ts` — the narrowed panel audited whole-page,
because what is new is a reference crossing between two trees;
[`lesson-101`](../lessons.md#lesson-101) — folding accents is a question of language, so the
library does not answer it

## Context

The next item of the select family is **filtering**, and it arrives with three questions that look
like one:

1. is `filterable` a tag, as multiplicity is ([0034](0034-multiplicity-is-a-tag.md)), or an
   input?
2. where does the user type — into the trigger, or into a field inside the panel?
3. what does the typing change — the panel, or the value?

The first is settled by the rule 0034 wrote down rather than by a second measurement. **A tag
is what the type cannot say otherwise.** `multiple` had to be a tag because `value` is `T[]`
there and `T | null` here, and no input can carry that. Filtering changes no type at all: the
value of a filtering select is the value of a select. As a tag it would have multiplied the
family instead of extending it — `pct-filter-select`, `pct-multi-filter-select`, four tags for
two questions — and every one of them the same implementation. So it is an input, and the rule
has an edge now: **the tag is for the type, the input is for the behaviour.**

The second was settled a step earlier, in [0032](0032-a-menu-moves-focus-a-listbox-points-at-it.md):
a combobox is a value being edited with a list behind it, and the caret belongs to the control
the panel hangs off. A search field _inside_ a panel is the other kind of panel — the one that
takes focus ([0025](0025-a-panel-says-whether-it-takes-focus.md)) — and it will arrive with
the command palette, whose items are commands rather than a value.

The third is the one this record is named for, and it is where the defects live.

## The two states that look like one

A combobox with a text field holds **two** things that both look like "what the control says":
the answer, and the question being typed. Every filtering select that misbehaves conflates
them, and the misbehaviour is never a crash — it is a field that lies:

- the trigger goes blank while the user types, because the label was read off the rows the
  panel is drawing and the question has just hidden the chosen one;
- a many-choice value loses the choices the question hid, because the pick rebuilt the array
  from the visible rows;
- a reopened panel comes up narrowed by three letters typed a minute ago and no longer on
  screen;
- the browser submits the question: on an `<input>`, `name` is what a form sends the field's
  **text** under, and the text is `Pol` where the value is `pl`.

So the rule is one sentence, and every item of the implementation is a reading of it: **the
question narrows the panel, never the value, and it does not outlive the panel it was asked
in.**

## Decision

**`filterable` is an input on both tags; the query is panel-scoped state; the value is read
against the whole list.**

What follows from it, in full:

- **The trigger changes element with the role.** A select-only combobox is a `<button>`, a
  filtering one an `<input role="combobox" aria-autocomplete="list">` — the APG's two combobox
  patterns, and the element each one needs. The two are written as the two branches of one
  `@if`, so exactly one is ever in the tree.
- **While the panel is open the field holds the question.** Always: there is no third state to
  keep in step with the letters on the screen. The chosen label moves to the `placeholder`,
  which is the one string a reader announces as a hint and never as the field's value; when the
  panel closes, the field holds the answer again.
- **`close()` clears the query**, and so does a pick on a many-choice list — where the panel
  stays open, the cursor is put back on the row the pick landed on **by identity**, because the
  list has just widened underneath it.
- **`allOptions` and `rows` are two lists.** The first is what the value is read against — the
  trigger's label, the many-choice write-back, the duplicate report; the second is what the
  panel draws and the walk moves over. With no question they are the same list.
- **The key map splits with the element.** The arrows, `Enter`, `Escape` and `Tab` belong to
  the list; the letters, the space bar and `Home`/`End` belong to the caret. There is no
  typeahead on a filtering control — the letters are already going somewhere, and a walk that
  jumped to a prefix _within_ the list those letters had just narrowed would be two answers to
  one keystroke.
- **A press on a text field opens and never closes.** A click between two letters of a typed
  question is a caret being placed, not a switch being flipped. What closes the panel is
  `Escape`, `Tab`, a pick, or a click outside it.
- **The default predicate folds case and stops there.** Whether an accent is a letter of its
  own is a question of language — `Intl.Collator` at `sensitivity: 'base'` answers it one way
  for German and the other for Swedish, on the same pair of letters — and the application is
  where the language is known ([`lesson-101`](../lessons.md#lesson-101)). `filterWith` is the
  door out, and it takes the option rather than the label, so a list can match on a code, on a
  second field, or on nothing at all when a server is doing the narrowing.
- **`filterText` is a `model`.** An application filtering on a server reads the question and
  answers it with another `options` list. The control still owns the clearing, because the
  clearing is the rule above.

## Consequences

- **`name` does not reach the filtering trigger**, and that is the only binding the two
  branches do not share. It is a difference with a reason a reader can check: on a `<button>`
  the attribute submits nothing, on an `<input>` it submits the text.
- **The parts `value` and `placeholder` do not exist on a filtering control.** They are the
  input's own `value` and `placeholder` properties, and an element carries one part. `trigger`
  is still the element with the role, with the border and with the ring, in both branches.
- **`fieldCursor` became a getter.** Over a filtering control a click places the caret, over a
  select-only one it opens the list, and the chrome reads that inside a `computed` — where a
  getter that reads a signal is itself a signal. The contract every other control implements
  did not have to widen.
- **`check-aria` counts naming carriers per DOM state.** Two elements binding both name inputs
  used to be a violation by arithmetic; two branches of one conditional are not two names for
  one control. The gate already knew how to ask the question — point 6 asks it about the hint
  and the error — and now points 4 and 6 read the same tree
  ([`lesson-102`](../lessons.md#lesson-102) is the coverage exception the same change made
  stale).
- **The bytes: `./select` 46749 → 55713 B (+19.1%)**, the second trigger and the machinery
  behind it. Every other entrypoint grew by 29 B, which is the new `PCT_TEXTS` string — a
  default in `core` is carried by everything that imports `core`, including the entrypoints
  that never read it.
- **What is deliberately not built**: no debounce (a predicate over an array in memory needs
  none, and a server-side one belongs to whoever calls the server), no highlighting of the
  matched letters inside a row (the option row is a slot, so a consumer who wants it has the
  query and the template), and no announcement of the number of matches — a count needs a
  plural rule, which is the same thing the many-choice trigger refused to promise.

## What would overturn it

A measurement showing that the placeholder is the wrong place for the chosen label — a reader
that announces it as the value, or users who read a greyed label as "cleared". The alternative
is the road MUI takes: keep the label as the field's text on opening and treat the query as
"the text since the first keystroke", which is a second state and a dirty flag, and the reason
it is not here rather than a reason it could not be.
