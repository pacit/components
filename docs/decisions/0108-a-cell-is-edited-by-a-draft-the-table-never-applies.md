# 0108 — A cell is edited by a draft the table never applies

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** the sandbox demo `demo-editing` walked by `apps/sandbox-e2e/src/datatable.spec.ts`
in three engines; `libs/components/table/src/data-table-editing.spec.ts`, and the grid's case
of a cell left by the focus in `data-table-grid.spec.ts`

## Context

0097, D9, named the shape of editing in a cell before the grid had keys: a directive that
needs `pctTableGrid`, a `pctEditor` slot, editors of the columns' kinds, and an `(edit)`
output, because the table no more changes its rows than a sort reorders the application's
array. The grid of 0107 gave the cells one stop and Enter to step into a cell's controls. What
was left open is where the value being typed lives while the editor is open, which key belongs
to whom when the grid and the editor both want Enter, how an edit of a whole row and an undo are
said, and what a table that edits nothing pays for it.

## Decision

**A draft, in a signal, begun at the row's value.** Opening a cell makes a draft of its value
and draws an editor on it: a column's `pctEditor` template is handed the draft as a writable
signal, `value`, with `invalid`, `commit()` and `cancel()`; a column of a number kind is drawn
a number field of its kind's fraction digits, and a column of text whose values are strings a
text field. Any other column, a boolean or an instant, needs a template, and a column made
editable without one is told so once in development and opens nothing. The draft lives in the
directive, not in the field, so a render that redraws the cell redraws the same draft. A
number's field takes no fewest fraction digits, so a draft of `7` is written `7`, and the
commit hands the focus back to the cell before it reads the drafts: the field rounds its text
as it loses the focus, and the edit carries the rounded number. Keys typed on a cell before its
editor has the focus go into the draft, and the field is given them as typed, so `7.25` typed
fast is `7.25` and not `7`.

**A commit is a proposal.** Enter commits and the stop goes a row down, Shift+Enter a row up;
Tab commits and goes to the next cell, Shift+Tab to the one before; F2 commits and stays;
Escape lets the draft go; the focus leaving the editor for anywhere else on the page commits
it — or for a popup one of its controls owns by `aria-controls` or `aria-owns`, a calendar the
page draws outside the table, which is heard as the editor is while the focus is in it. A
commit emits `(edit)` with the row's id, the row, the changes — each cell's value and
the one it held — and a cause, and closes the editor; the table draws the rows it is given, so
the cell shows the new value when the application writes it. An edit that changed nothing is
none. A template that refuses its draft sets `invalid`, and a commit then keeps the editor open
with the focus in it, so a value the template refuses never leaves the table; the focus taken
elsewhere is the user's, and the editor waits for it without taking it back. Only the columns
the table draws are edited — `shownColumns`, which a column the user hid or a narrow frame hid
is not in — and a row the table no longer holds lets its draft go, rather than propose an edit
of a row that is not there.

**The changes are a list, every time.** D9 wrote the output as one cell's value. An edit of a
whole row (`rowEdit`) commits every cell it opened at once, and an undo of it asks all of them
back, so the output is the row and a list of changes, typed by the column each names: one
change for a cell, several for a row, the same shape for an undo. The cause, `edit`, `undo` or
`redo`, is what an application that keeps its own history reads.

**Undo asks, as an edit does.** `undo()` and `redo()` — Ctrl+Z and Ctrl+Shift+Z or Ctrl+Y on
the grid — take the last committed edit off a history of `history` edits and emit it again with
the values turned round, and the stop goes to the cell it changed. The table holds no copy of
the rows, so it cannot undo by itself; the application applies the undo as it applied the edit.
A new edit forgets what was undone. In an editor, and in a field of the application's own in a
cell, the keys are the field's.

**Enter is the editing's before the grid's.** The grid steps into a cell's controls on Enter;
on an editable cell Enter opens the editor instead. The editing listens on the table's element
in the capture phase, which runs before the grid's listener on the same element, and acts only
on a key whose target is a cell, so a key in an editor reaches its field first, then the
editor, and the grid last. A key the field took (`preventDefault()`), a key an input method is
composing, and a key on a control whose popup is open, `aria-expanded="true"`, are not the
editor's, so Escape closes a select's
list before it closes the editor. The grid, for its part, leaves a cell stepped into when the
focus comes back to the cell itself, by a script or a click beside its controls; that is how
the focus returns to the stop when an editor closes. And a cell stepped into that the focus
leaves, for the next editor of a row or for a press on the page, no longer takes it back to the
stop: while the focus moves the page holds it for a moment, which the grid had read as a focus
lost with its element.

**The table pays one branch for it.** The editor is drawn by parts the table makes in its own
view, as the selection's and the filters' are (0097), so a table that edits nothing carries none
of them, nor the fields of `./field`. The structure the table draws grows by one branch in each
data cell, a question to the editing that a table without it answers with `null`.

**Signal forms are the template's, not the built-in field's.** The plan had the built-in
editor make a `form()` of signal forms with `pctWarn`. A built-in field holds no rule a form
would check: its value is the column's, and the column names no rules. A `form()` there would
be paid by every table that edits, rules or not, so the rules stay where they are written — a
`pctEditor` template whose own form sets `invalid` from its errors, and whose `pctWarn` speaks
in its own field.

## Consequences

- A letter typed on a cell opens a text editor with the letter, a digit a number editor with the
  digit; a template's editor takes no letter, since what it means is the template's. A space,
  and a key with Ctrl, ⌘ or Alt, are the grid's — but AltGr, which Windows reports as Ctrl and
  Alt, writes a character, `€`, and the character opens the cell.
- A change's `value` and `previous` are the column's type or `null`: an emptied number field is
  `null`, and its undo gives `null` back.
- An empty text field commits `''`, an empty number field `null`: a column whose value cannot be
  empty gives its editor a template that refuses it.
- A draft refused stays open while the focus is elsewhere; another cell opened lets it go.
- Under a window, an editor whose row the scroll takes away loses its focus and is committed,
  as a press elsewhere commits it.
- Delete does not clear a cell, and there is no fill handle (0097, 1a).
- The editor's outline is `--pct-table-editor-border`, the primary colour, held to the non-text
  floor on the surface; forced colours draw it in `Highlight`.
- The readers' walk of an editor in the grid is not recorded; the card says so.
