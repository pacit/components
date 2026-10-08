# 0089 — One value, more than one control, and the consumer chooses which

**Status:** accepted
**Implements:** [`req-api-generic`](../requirements/api.md#req-api-generic),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)
**Evidence:** the author's word of 2026-10-08, written down outright as this file's own rule
asks; the time panel of `dd0f02fa` read in chromium the same day (six rows of 32 px in a column
of 192, the chosen row centred once and then held by `nearest`, a wheel tick moving the minutes
and leaving the value); and a dozen lines of Playwright asking each of the lockfile's three
engines what it supports — the table under "The measurement"

## Context

The time field landed on 2026-10-08 with one shape of panel: a listbox per field, which a
scroll browses and a click or the walk picks
([0086](0086-a-time-of-day-is-a-wall-clock.md) §4). Read on `main` that evening, the shape
had three defects that are one: the column holds an even number of rows, so there is no
middle row for the chosen one to stand on; the chosen row is centred when the panel opens and
only kept in view after that, so three arrows put it on the column's edge; and a wheel tick
scrolls the rows freely under a selection that does not move. The panel looks like a list
because it is drawn as one.

The question that came with the reading was larger than the defects: should the chosen row
stand on a centre line, should a scroll snap by rows, should the column be a wheel, should the
wheel be a ring — and should the consumer choose between those shapes? The library's practice
up to this record was one measured shape per component: 0086 measured seven readings, E1 to
E7, five of them of a column, and chose the listbox. The first answer given here was that practice — one shape, no option,
no wheel of its own — on the cost of measuring three shapes in three engines and three readers.

The author refused it. **The library should give the choice: for a field with an enum of ten
values, a select, a wheel picker, or something not yet invented — that other libraries do not
is no reason, and the choice is a strength of this one.** This record writes that down as the
rule it is, and what it costs.

## The measurement

What the three engines of the lockfile support, asked on 2026-10-08 through `CSS.supports` and
`'on<event>' in window` from a page each of them opened:

| Feature                                                     | chromium 153 | firefox 155 | webkit 26.6 |
| ----------------------------------------------------------- | ------------ | ----------- | ----------- |
| `scrollend`                                                 | yes          | yes         | yes         |
| `scroll-snap-type: y mandatory`, `scroll-snap-stop: always` | yes          | yes         | yes         |
| `scrollbar-color`, `scrollbar-width: none`                  | yes          | yes         | yes         |
| `overscroll-behavior: contain`, `scroll-behavior: smooth`   | yes          | yes         | yes         |
| `animation-timeline: view()` (scroll-driven animations)     | yes          | no          | yes         |
| `scrollsnapchange`                                          | yes          | no          | no          |

Two of the rows decide something below. A scroll that has settled is an event in all three
engines, so a wheel can write its value from the platform's own scroll and needs no scroller
of its own; and a scrollbar is a colour and a width in all three, so a themed one is a token
and not a component. Two more rows say what is not yet to be promised: the drum look, rows
turned by their distance to the line, is a stylesheet in two engines and a script in the third;
and the event that names the snapped row is chromium's alone, so the wheel reads the row under
the line itself.

## Decision

1. **One value, more than one control, and the consumer chooses which — in the template.**
   For one kind of value the library offers more than one control, each measured as a control
   of its own, and which one a form uses is the consumer's choice and not the library's. It
   was already so for a choice from a list — the select, the radio group, the chips — and it
   is now the rule rather than the accident. That another library offers one shape is not an
   argument against a second; a price is, and it is paid in full (below).

2. **A shape is a component where the value is its own, and an input where only the gesture
   differs.** A wheel picker for a list of values is a component, `PctWheel<T>` in
   `@pacit/components/wheel`, in the Choices category beside the select, with the select's own
   item shape, `compareWith` and `T | null`
   ([`req-api-generic`](../requirements/api.md#req-api-generic)), `[formField]` and
   `warnings`, and a label and a hint of its own outside a wrapper. The shape of the time panel
   is an input, `picker`, on `PctTime` and `PctTimeColumns`, because its columns are the same
   fields either way and what differs is what a scroll means: in a `list` it browses, and a
   click or the walk picks; in a `wheel` the row under the centre line is the value, and a
   scroll that settles writes it — the columns' own rule, the row the walk stands on is that
   field of the value, extended to the pointer. The settle that writes is one a gesture
   started — a pointer, a wheel, a finger or a key: the centring a panel does when it opens
   writes nothing, and with no value the line holds the first row, or `now` as the columns
   open today, active and not chosen until a gesture. The union is open: a third shape, a
   dial, adds a value to it and nothing to the field. The default is `list`: it is the shape
   that shipped, and a scroll that writes a form value is a gesture a consumer opts into.

3. **The wheel is a listbox on the platform's scroll.** The role and the walk are the
   column's — `role="listbox"`, `aria-activedescendant`, one tab stop, `pctListNavigation`
   with `wrap` — so the reading 0086 measured (E1, E2) holds
   ([`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)) and the readers' walk
   is not measured again for the role. The rows snap to the centre under a mandatory snap,
   the band is drawn by the wheel and not by the row and the rows fade towards its edges, the
   row count is odd and comes from the row-height token, the bar is hidden by
   `scrollbar-width`, and the centring the walk asks for is scripted, smooth or not as the
   motion duration says, read the way `core/src/motion.ts` reads it — so reduced motion
   reaches it with no rule in a stylesheet
   ([`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)). There is no scroll panel
   component: the platform scrolls, snaps, settles and paints the bar
   ([`req-api-platform`](../requirements/api.md#req-api-platform)).

4. **The ring is a runway, and the runway is measured before it is written.** `wrap` on a
   wheel rings on scroll as it rings on keys: the rows are a window over a runway of many
   cycles, and `scrollend` moves the scroll to the same row in the middle cycle — a change no
   pixel shows. Whether the runway is the CDK's viewport (`@angular/cdk/scrolling`, a third
   CDK entrypoint under the dependency policy) or a hundred lines of the wheel's own is not
   decided here: it is measured by the bytes on `./wheel`, by a fling across the re-centring
   in three engines and by three readers on a listbox whose rows are a window, and written as
   a record of its own before the wheel's code — 0086's order. What that record owes is what
   a reader is told of the rows the window does not hold — whether the copies carry no id and
   `aria-hidden`, whether `aria-setsize` and `aria-posinset` say the cycle's count, and where
   `End`, `Home` and a typed digit land when the row they want is not in the tree — per
   runway, since a window that holds the cycle whole owes none of it.

5. **The wheel comes first, and the time columns compose it.** `PctWheel` lands before the
   time panel takes `picker`, and the `wheel` shape of a column is a `PctWheel` per field with
   `wrap` on and the bounds as disabled rows — one mechanism, for 0086's reason: a wheel that
   lived only inside the time columns would be built twice. The datetime field does not wait:
   it composes the columns with `list` alone and takes `picker` when 1.7 lands. The `list`
   shape is polished in the same pull request as `picker`: an odd row count at every size,
   derived from the row-height token — which retires `--pct-time-column-height`, shipped in
   no release, and the columns card's sentence that the window is a height and not a count
   — a snap to the row's start, and the walk kept centred.

## Consequences

- Two plan items: **1.6**, the wheel, with the runway's record as its first step; **1.7**, the
  time panel's `picker`, after it. **1.4** composes the columns with `list` alone and takes
  `picker` when 1.7 lands.
- A card for the wheel under Choices on the APG listbox, the tier `--pct-wheel-*`, its keys in
  `PCT_TEXTS`, and the readers' walk on its view; a row on the time card and on the columns
  card for `picker`.
- `scroll-snap-stop: always` — one row per tick of a wheel and per flick of a finger — is in
  all three engines, and the measure that decides it is rows per flick on a column of sixty:
  under `always` a flick is one row and the minutes are sixty flicks, and that number is the
  case, either way.
- The drum look is a later variant of the wheel, measured where scroll-driven animations are
  and scripted where they are not — or not shipped in firefox; the card says which.
- The select's long list is the runway's second consumer or it is not; 1.6 ends by saying
  which, so that the runway moves to `./core` only when somebody pays for it there.

## What this costs us

- **Every shape is measured in full, and no shape is a discount on another.** A second shape
  of the time panel is a second pass of `time.spec` in three engines, a second set of
  baselines, a second walk of three readers, and its own rows in the mutation record. The rule
  of point 1 is a bill, and this record accepts it with eyes open.
- **A value can change under a scroll.** In the `wheel` shape a tick over an open panel writes
  the time. That is the shape's meaning and the consumer's choice, and the default keeps the
  form that did not ask for it safe.
- **A ring may show a reader a window.** A listbox whose rows are rendered around the line is
  walked by a reader's virtual cursor only as far as the window reaches, unless the window
  holds the cycle whole; which it is, and what `aria-setsize` has to say then, is the runway's
  record's to measure in three readers before the runway is chosen.
- **A public union to keep.** `picker` is API, `@since next`, and a third shape adds to it
  under the same `@since`; nothing is renamed.
- **The datetime field ships with one shape first.** 1.4 composes the columns with `list`
  alone, and its card grows the `picker` row when 1.7 lands — a second pass of its readers'
  walk on the `wheel` shape, paid then.

## Alternatives considered

- **One measured shape, no option, no wheel of its own.** The first answer, and the author's
  refusal is this record's context. What it had going for it — a third of the measuring — is
  what point 1 pays.
- **A wheel of spinbuttons.** The role has one number to say and a wheel of labels has a text;
  `aria-valuetext` would carry it, but the listbox is the reading 0086 measured in three readers
  and axe.
- **A scroller of the library's own — transforms and hand-written momentum.** It owns the
  ring and the drum outright, and it pays with `touch-action: none` against the page's own
  scroll, with physics tuned by hand in three engines, and with no scrollable region for a
  reader. The platform's scroll gives momentum, snap, a settled event and the region for
  nothing, and the drum can come later from a stylesheet in two engines of three.
- **A scroll panel component with a themed bar.** The platform paints the bar from
  `scrollbar-color` and `scrollbar-width` in all three engines
  ([`req-api-platform`](../requirements/api.md#req-api-platform)); a themed bar is two tokens.
- **The ring as three copies of the rows in the DOM.** The simplest runway, and the one that
  puts every row in the tree three times; the window of point 4 renders what the line can
  reach, and what the reader is told of the rest, like whether the window is the CDK's or
  the wheel's own, is the runway's record.
