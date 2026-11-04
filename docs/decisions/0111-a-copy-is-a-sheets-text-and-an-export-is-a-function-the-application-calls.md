# 0111 — A copy is a sheet's text, and an export is a function the application calls

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking),
[`req-project-dependencies`](../requirements/project.md#req-project-dependencies),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** the sandbox demo `demo-editing` walked by `apps/sandbox-e2e/src/datatable.spec.ts`
in three engines — a copy and a paste on the keys through the engine's own clipboard, and both
downloads read back; `libs/components/table/src/model/csv.spec.ts` and its property sweep
`csv.property.spec.ts`; `model/xlsx.spec.ts`, which reads the zip back by its central directory;
`data-table-export.spec.ts`; the copy cases of `data-table-grid.spec.ts` and the paste cases of
`data-table-editing.spec.ts`; and a pass by hand through LibreOffice, recorded in the card

## Context

Phase 11 of 0097 asks for three things a table of data is used for outside itself: a copy of
its cells to a sheet, a paste of a sheet's cells into it, and a file of its rows, CSV or
`.xlsx`. What was open is which clipboard the table speaks to, where the code lives so a table
that exports nothing carries none of it, what a cell is written as — the text the table shows or
the value it holds — and what a sheet does with the text it is given.

## Decision

**The clipboard is the platform's events, heard on the document.** `navigator.clipboard` asks
for a permission or a user's press, each engine its own way, and it is asynchronous, so a copy
could land after the user pasted. The `copy` and
`paste` events carry a `clipboardData` that needs no permission and is written in the key's
own task: measured in the three engines, Ctrl+C and Ctrl+V on a focused cell fire both, with the
data. Chromium and WebKit send them to the cell; Firefox sends them to the body. So the grid
hears `copy` and the editing hears `paste` on the document, from `afterNextRender` — a server
has no clipboard — and act only while the focus is in their table; a menu's Copy and Paste reach
them the same way.

**A copy is the range, else the rows picked, else the stop's cell.** As tab-separated values, the
text a sheet puts on the clipboard and takes back, of the columns the table draws
(`shownColumns`), since a range is drawn on them. A cell is written as another program reads it:
a number with the locale's decimal separator and no group or unit, an instant as its wall clock,
`2026-11-03 14:05:00`, or its day, a boolean as `true` or `false` — `pctPlainWriter` — and a text
as the cell shows it, after an apostrophe where a sheet would run it as a formula, which a paste here takes off again. The last line has no break after it, so one cell pasted into a field is its text. A field's own text, text the user selected, and a cell stepped into copy as the platform
copies them. Each copy is said, `Cells copied: 4`, the same count again too.

**A paste is one step of edits, never a write.** `pctTableEditing` reads the text from the stop's
cell, or a range's top left, to the right and down, each value as its column's kind reads it
(`pctPlainReader`): a number the locale's way or with a point, its groups only where they stand between thousands after a first group of one to three digits, so `1.5`, `0.125` and `1234.567` stay decimals in a German table; an instant with or without
its time and its offset; a boolean as `true`, `1` or the table's own word. One value on a range
fills the range. A text written as the copy writes the cell's value is that value, so a row pasted back onto itself changes nothing, a day's hour and a moment's milliseconds included. A cell that may not be edited, a column drawn by its own `pctEditor` — its rules, a select of the rooms, are the template's, and a paste would pass them by — a text column whose values are not texts, and a text that is no value of its column, a day the month lacks among them, are left out and counted,
`Cells pasted: 3, left out: 1`; past the last row or column nothing is written or counted. Each
row changed is an `(edit)` with its list of changes, and the paste is one step of the history,
undone at once. The cause is `edit`: 0.3.0 released `'edit' | 'undo' | 'redo'`, and a fourth
member would break a `switch` an application wrote over them, while an application that must
tell a paste apart has the event itself.

**An export is a function, not a method.** `pctTableCsv(table, options)` and
`pctTableXlsx(table, options)` take the table and return a string and a `Blob`. A method on the
table would be paid by every table; a function is dropped by the bundler when no one imports it,
and a table carries only `matchedRows` and `resolvedLocale`, two signals it computed anyway. The
rows are those the filter let through, in the table's order; the columns those the user has not
hidden — a column a narrow frame moved into the details too, since a file has room for it.
Downloading is the application's: no button, as 0097 says.

**CSV is what a sheet of the table's locale reads.** RFC 4180 — CR LF, quotes around a cell with
the delimiter, a quote or a break — with a byte-order mark by default, without which Excel reads
UTF-8 as its code page, and the delimiter `;` where the locale writes decimals with a comma,
`pl`, `de`, `fr`, so `1950,3` stays one cell. A text that begins with `=`, `+`, `-`, `@`, a tab or
a CR is one a sheet would run as a formula — CSV injection — and is written after an apostrophe,
which the sheet shows as nothing; a number is never escaped, its minus included, since its text
is the table's own. `formatted` writes the texts the cells show instead of the values.

**`.xlsx` is written here, with no library.** A workbook of one sheet is a zip of six XML parts:
`[Content_Types].xml`, two relations, the workbook, the styles and the sheet. A library to write
it would be a dependency for a few hundred lines. The zip is version 2.0 with a CRC-32 by the bit
and every file dated 1980-01-01, so the same rows make the same bytes; each part is deflated by
`CompressionStream('deflate-raw')` where the platform has it and stored where it does not. A text
is an inline string, so no table of shared strings is needed; a number is a number; a boolean is
`t="b"`; a day and a moment are serial dates, counted from 1899-12-30, in the sheet's own formats
14 and 22, which a sheet writes in its reader's locale. They are the wall clock on the column's
zone: a sheet has no zones, and a reader in another one should see the hour the table showed.
The header row is bold and frozen; a column is as wide as `widths` says in pixels at seven to a
character — the `widths` of a `pctTableColumns` layout — or its widest text and two, at most
sixty. A character XML cannot hold, a control character, is left out; a sheet's name loses
`[]:*?/\` and is cut to 31 characters.

## Consequences

- A paste of a sheet's rows into a filtered or sorted table writes the lines as drawn, not the
  application's array.
- An instant pasted without an offset is read on its column's zone; one with `Z` or `+02:00` is
  the moment it names.
- The copy writes no `text/html`: a sheet reads the tab-separated text as cells, and a rich text
  editor takes it as lines.
- The `.xlsx` has no formulas, no merged cells, no colours and no second sheet; an application
  that needs them writes its own file from `matchedRows`.
- A date before 1900-03-01 is a day off in a sheet, which counts 1900 as a leap year; the file
  writes the days as they were.
- The unit test reads both ways: deflated by the platform's stream, and stored with the stream
  taken away.
- The CI runs in Playwright's image, which is given no LibreOffice, so the pass through it is a
  run by hand, recorded in the card; the unit test unzips the file and reads its XML.
