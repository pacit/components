# VoiceOver with Safari on macOS — assistive-technology log

> **This file is generated.** Do not edit it by hand — `tools/at-pass.sh`.

What a screen reader SAYS on arriving at each sandbox view, and at each stop of the Tab key
after it. The automatic audit in `a11y.spec.ts` reads the DOM and the composed colours; it
cannot read this, and neither can any gate in `tools/`
([`req-a11y-acr`](../requirements/a11y.md#req-a11y-acr)).

**What this is evidence of, and what it is not.** It is evidence of what was said, and of
what the browser had given focus to when it was said — the two columns are separate on
purpose, because an announcement that does not match the focus is the defect this file exists
to make visible. It is **not** a judgement that the announcement is adequate: that is a
person's reading of this file, and `docs/acr/claims.json` stays `"recorded": false` until a
person has made it.

**Taken with**, because a reading is only ever true of one stack:

- VoiceOver with Safari on macOS
- 381 steps over 41 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. A view with something to OPEN ends on three more:
`reach` puts focus on the control that opens it, `open` presses the key, and `close` presses
Escape — the row every card asking "what does a reader announce when this appears" was waiting
for, and the row beneath it is what leaving sounds like. `(silence)` is a stop the reader said nothing
at — 74 of 381 here. 4 view(s) hit the cap, and each says so.

**Every view spoke.** No view of the 41 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
4 view(s) have more stops than the 12 taken, and each says so where it bit.

### `/`

```
arrive  —                                                    In Start · @pacit/components web content Guidepup Marker Guidepup Marker clickable text
enter   a "Button"                                           (silence)
tab 1   —                                                    link Button The variants, sizes and states of the button. main
```

### `/button`

```
arrive  —                                                    banner
enter   button "Solid"                                       (silence)
tab 1   button "Outline"                                     Outline button
tab 2   button "Ghost"                                       Ghost button
tab 3   button "Soft"                                        Soft button
tab 4   button "Hero"                                        Hero button
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 7   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 8   button "danger"                                      danger button main
tab 9   button "danger"                                      danger button
tab 10  button "danger"                                      (silence)
tab 11  button "danger"                                      danger button
tab 12  button "warning"                                     warning button
tab 13  button "warning"                                     (silence)
tab 14  button "warning"                                     warning button
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/field`

```
arrive  —                                                    banner
enter   input                                                (silence)
tab 1   input[control]                                       The e-mail address is required
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   button[field-label-aux-item] "The description appears on your profile" The description appears on your profile button main
tab 5   input                                                A short description Briefly — write at least 10 characters edit text
tab 6   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 7   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 8   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 9   input                                                1 499,90 Price The unit tile is a surface of its own; the clear button sits in the border padding stepper main
tab 10  button[field-suffix-item] "Clear the price"          Clear the price button
tab 11  input                                                Search the catalogue The icon belongs to the surface of the field; the button is welded into the corner of the border edit text
tab 12  button[field-suffix-item] "Search"                   Search button
tab 13  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 14  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 15  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 16  button[trigger] "Sélectionner…"                      , Sélectionn Country A click in the padding opens the list list box pop up collapsed combo box main
tab 17  input                                                preview only Read-only clickable text
tab 18  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 19  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 20  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 21  input                                                25 000 Amount Transfers above 10 000 are reviewed by hand stepper main
tab 22  input                                                Phone Optional — the form would rather have it telephone number field
tab 23  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 24  input[control]                                       md selected radio button, 2 of 3 Size radio group
```

24 presses reached, 11 of them this view's own.

### `/text`

```
arrive  —                                                    banner
enter   input                                                (silence)
tab 1   input                                                E-mail john@example.com email field
tab 2   input                                                Password secure text field
tab 3   input                                                Search… search text field blank
tab 4   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 5   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 6   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 7   input                                                preview only Read-only clickable text main
tab 8   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 9   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 10  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 11  input                                                Ada Insertion on word: Ada , between characters: and Reactive forms ([formControl]) edit text main
tab 12  input                                                Lovelace Insertion on word: Lovelace , between characters: and Template-driven ([(ngModel)]) edit text
tab 13  —                                                    (silence)
```

### `/textarea`

```
arrive  —                                                    heading level 2 Textarea
enter   textarea                                             (silence)
tab 1   textarea                                             About you Type — the box follows. text entry area
```

Tab moved nothing — focus had left the page.

### `/number`

```
arrive  —                                                    heading level 2 Number
enter   input                                                (silence)
tab 1   input                                                1 499,90
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  —                                                    heading level 2 Date
enter   input[control]                                       (silence)
tab 1   input[control]                                       2026
reach   button[toggle] "Choisir une date"                    (silence)
open    td[day] "jeudi 27 août 2026"                         (silence)
close   input[control]                                       2026
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="date-standalone"] [data-pct-part="toggle"]`, to open a month grid (the gesture belongs to `apps/sandbox-e2e/src/date.spec.ts`).

### `/time`

```
arrive  —                                                    heading level 2 Time
enter   input[control]                                       (silence)
tab 1   input[control]                                       You are currently on a text field. To enter text in this field, type. Press Control-Option-Command-Slash to bring up the more content menu.
reach   button[toggle] "Choisir une heure"                   (silence)
open    div[column] "Heures"                                 Choisir une heure web dialog 13 selected (14 of 24)
close   div[column] "Heures"                                 (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="time-standalone"] [data-pct-part="toggle"]`, to open columns of a time (the gesture belongs to `apps/sandbox-e2e/src/time.spec.ts`).

### `/datetime`

```
arrive  —                                                    heading level 2 Datetime
enter   input[date-control]                                  (silence)
tab 1   input[date-control]                                  2026
reach   button[toggle] "Choisir une date et une heure"       (silence)
open    td[day] "mardi 1 décembre 2026"                      Choisir une date et une heure web dialog with 5 items mardi 1 décembre 2026 1 décembre 2026 table 7 columns, 7 rows
close   input[date-control]                                  2026
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="datetime-standalone"] [data-pct-part="toggle"]`, to open a calendar and the columns of a time (the gesture belongs to `apps/sandbox-e2e/src/datetime.spec.ts`).

### `/checkbox`

```
arrive  —                                                    banner
enter   input[control]                                       (silence)
tab 1   input[control]                                       You have to accept the terms
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   input[control]                                       The indeterminate state, read as mixed mixed checkbox main
tab 5   input[control]                                       Read-only — focusable, but not changeable checked checkbox
tab 6   —                                                    (silence)
```

### `/radio`

```
arrive  —                                                    banner
enter   input[control]                                       (silence)
tab 1   input[control]                                       Pick a plan
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   input[control]                                       Option A selected radio button, 1 of 2 Horizontal layout radio group
tab 5   —                                                    (silence)
```

### `/slider`

```
arrive  —                                                    banner
enter   input[control]                                       (silence)
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   input[control]                                       30 Volume Nothing is formatted, so nothing is written slider main
tab 5   input[control]                                       15 % Discount slider
tab 6   input[control]                                       Medium Size slider
tab 7   input[control]                                       70 Read-only — focusable, but not movable slider
tab 8   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 9   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 10  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 11  input[control]                                       60 Gain slider main
tab 12  —                                                    (silence)
```

### `/switch`

```
arrive  —                                                    banner
enter   input[control]                                       (silence)
tab 1   input[control]                                       Backups have to stay on
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   input[control]                                       Wi-Fi Turns off when you leave the house on switch main
tab 5   input[control]                                       Read-only — focusable, but not changeable on switch
tab 6   —                                                    (silence)
```

### `/select`

```
arrive  —                                                    banner
enter   button[trigger] "Sélectionner…"                      (silence)
tab 1   button[trigger] "Polish"                             , Pol field (the default) list box pop up collapsed combo box
tab 2   button[trigger] "Polish"                             , Pol auto — out to the longest option list box pop up collapsed combo box
tab 3   button[trigger] "Polish"                             , Pol 320px, aligned to the end list box pop up collapsed combo box
tab 4   button[trigger] "Sélectionner…"                      , Sélectionn Country (in the dark theme) list box pop up collapsed combo box
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 7   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 8   button[trigger] "Poland"                             , Pol Country list box pop up collapsed combo box main
tab 9   button[trigger] "Sélectionner…"                      , Sélectionn Country (nothing to pick) list box pop up collapsed combo box
tab 10  button[trigger] "Poland"                             , Pol Country list box pop up collapsed combo box
tab 11  button[trigger] "Poland, Slovakia"                   , Poland, Slova Countries list box pop up collapsed combo box
tab 12  input[trigger]                                       Lithuania Country list box pop up collapsed combo box
tab 13  input[trigger]                                       Poland, Slovakia Countries list box pop up collapsed combo box
tab 14  button[trigger] "Poland"                             , Pol Country list box pop up collapsed combo box
reach   button[trigger] "Sélectionner…"                      (silence)
open    —                                                    expanded list 6 items
close   —                                                    (silence)
```

the act: `Enter` on `[data-testid="select-country"] [data-pct-part="trigger"]`, to open a listbox (the gesture belongs to `apps/sandbox-e2e/src/select.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/dialog`

```
arrive  —                                                    banner
enter   button "Open the dialog"                             (silence)
tab 1   button "Delete the project"                          Delete the project button
tab 2   button "Open the insistent one"                      Open the insistent one button
tab 3   button "Open a form dialog"                          Open a form dialog button
tab 4   button "Open a long one"                             Open a long one button
tab 5   —                                                    (silence)
reach   button "Open the dialog"                             (silence)
open    button[close] "Close"                                (silence)
close   button "Open the dialog"                             Open the dialog button main
```

the act: `Enter` on `[data-testid="open-basic"]`, to open a modal dialog (the gesture belongs to `apps/sandbox-e2e/src/dialog.spec.ts`).

### `/tooltip`

```
arrive  —                                                    banner
enter   button "Delete the project"                          (silence)
tab 1   button "Publish"                                     Publish Runs every check before publishing button
tab 2   button "Approve the release"                         Approve the release button
tab 3   button "Close the panel"                             Close the panel button
tab 4   button "start"                                       start On the starting side button
tab 5   button "top"                                         top Above the control button
tab 6   button "bottom"                                      bottom Below the control button
tab 7   button "end"                                         end On the ending side button
tab 8   input                                                Release note Shown in the changelog Markdown is allowed here edit text
tab 9   button "Hover me"                                    Hover me This one can be taken away button
tab 10  button "Take it away"                                Take it away button
tab 11  —                                                    (silence)
```

### `/popover`

```
arrive  —                                                    banner
enter   button "Filters"                                     (silence)
tab 1   button "start"                                       start dialog pop up button
tab 2   button "top"                                         top dialog pop up button
tab 3   button "bottom"                                      bottom dialog pop up button
tab 4   button "end"                                         end dialog pop up button
tab 5   button "Open the panel"                              Open the panel dialog pop up button
tab 6   button "Count up"                                    Count up button
tab 7   —                                                    You are currently on a button. To click this button, press Control-Option-Space.
reach   button "Filters"                                     (silence)
open    div[panel] "Filters"                                 Filters web dialog with 5 items heading level 2 Filters
close   button "Filters"                                     Filters dialog pop up button
```

the act: `Enter` on `[data-testid="panel-trigger"]`, to open a non-modal dialog (the gesture belongs to `apps/sandbox-e2e/src/popover.spec.ts`).

### `/menu`

```
arrive  —                                                    heading level 2 Menu
enter   button "Actions"                                     (silence)
tab 1   button "Actions"                                     Actions menu pop up button
reach   button "Actions"                                     (silence)
open    button[item] "Rename"                                Rename menu item (1 of 4)
close   button[item] "Rename"                                (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="actions-trigger"]`, to open a menu (the gesture belongs to `apps/sandbox-e2e/src/menu.spec.ts`).

### `/drawer`

```
arrive  —                                                    heading level 2 Drawer
enter   button "Sections"                                    (silence)
tab 1   button "Sections"                                    Sections collapsed button
reach   button "Sections"                                    (silence)
open    button "Sections"                                    Sections expanded button
close   button "Sections"                                    (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="trigger-nav"]`, to open a named region beside the page (the gesture belongs to `apps/sandbox-e2e/src/drawer.spec.ts`).

### `/accordion`

```
arrive  —                                                    banner
enter   summary[heading] "Shipping"                          (silence)
tab 1   summary[heading] "Payment"                           Payment collapsed summary
tab 2   summary[heading] "Returns"                           Returns collapsed summary
tab 3   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 4   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 5   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 6   summary[heading] "First"                             First collapsed summary main
tab 7   summary[heading] "Second"                            Second collapsed summary
tab 8   summary[heading] "Third"                             Third collapsed summary
tab 9   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 10  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 11  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 12  summary[heading] "Open to anyone"                    Open to anyone collapsed summary main
tab 13  summary[heading] "Not yours to open"                 Not yours to open dimmed collapsed summary
tab 14  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 15  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 16  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 17  summary[heading] "An h4 section"                     An h4 section collapsed summary main
tab 18  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 19  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 20  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 21  summary[heading] "More about this"                   More about this collapsed summary main
tab 22  —                                                    (silence)
reach   summary[heading] "Payment"                           (silence)
open    summary[heading] "Payment"                           expanded
close   summary[heading] "Payment"                           You are currently on a summary. To expand or collapse the contents of this item, press Control-Option-Space.
```

the pointer's way to the nav stood under `pct-drawer (drawer-nav)` when this view was asked for, and the link was reached through its own click event.

the act: `Enter` on `[data-testid="item-payment"] [data-pct-part="heading"]`, to open a revealed section (the gesture belongs to `apps/sandbox-e2e/src/accordion.spec.ts`).

### `/tabs`

```
arrive  —                                                    banner
enter   button[tab] "General"                                (silence)
tab 1   pct-tab[panel] "The general settings, and a word that…" main General tab panel
tab 2   pct-tab[panel]                                       Network tab panel
tab 3   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 4   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 5   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 6   button[tab] "Overview"                               Overview selected tab, 1 of 2 Report tab group
tab 7   pct-tab[panel] "A summary nobody had to fetch."      main Overview tab panel
tab 8   pct-tab[panel]                                       Details tab panel
tab 9   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 10  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 11  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 12  button[tab] "Profile"                                Profile selected tab, 1 of 2 Profile tab group
tab 13  pct-tab[panel] "Who you are."                        main Profile tab panel
tab 14  pct-tab[panel]                                       Keys tab panel
tab 15  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 16  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 17  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 18  button[tab] "Week"                                   Week selected tab, 2 of 3 Period tab group
tab 19  pct-tab[panel]                                       Day tab panel main
tab 20  pct-tab[panel] "Seven days side by side."            Week tab panel
reach   button[tab] "General"                                (silence)
open    button[tab] "Network"                                Network selected tab, 2 of 3
close   button[tab] "Network"                                You are currently on a selected tab, 2 of 3.
```

the act: `ArrowRight` on `[data-testid="tabs-basic"] [data-pct-part="tab"][aria-selected="true"]`, to open the panel behind the next tab (the gesture belongs to `apps/sandbox-e2e/src/tabs.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/toast`

```
arrive  —                                                    banner
enter   button "Save the draft"                              (silence)
tab 1   button "Copy (a shorter clock)"                      Copy (a shorter clock) button
tab 2   button "Report something that waits"                 Report something that waits button
tab 3   button "Clear the stack"                             Clear the stack button
tab 4   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 5   input[control]                                       (silence)
tab 6   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 7   button "Fail to save"                                Fail to save button main
tab 8   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 9   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 10  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 11  button "Success"                                     Success button main
tab 12  button "Warning"                                     Warning button
tab 13  button "Danger"                                      Danger button
tab 14  button "Info"                                        Info button
tab 15  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 16  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 17  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 18  button "Delete the message"                          Delete the message button main
tab 19  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 20  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 21  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 22  button "Open the settings"                           Open the settings button main
tab 23  —                                                    (silence)
reach   button "Copy (a shorter clock)"                      (silence)
open    button "Copy (a shorter clock)"                      Copied to the clipboard. Dismiss Dismiss
close   button "Copy (a shorter clock)"                      (silence)
```

the act: `Enter` on `[data-testid="raise-brief"]`, to open a message in a live region (the gesture belongs to `apps/sandbox-e2e/src/toast.spec.ts`).

### `/pagination`

```
arrive  —                                                    banner
enter   button[page] "1"                                     (silence)
tab 1   button[page] "2"                                     2 button
tab 2   button[page] "3"                                     3 button
tab 3   button[next] "Next page"                             Next page button
tab 4   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 5   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 6   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 7   button[previous] "Previous page"                     Previous page button list 7 items
tab 8   button[page] "1"                                     1 button
tab 9   button[page] "6"                                     6 button
tab 10  button[page] "7"                                     7 current page button
tab 11  button[page] "8"                                     8 button
tab 12  button[page] "20"                                    20 button
tab 13  button[next] "Next page"                             Next page button
tab 14  input[control]                                       You are currently on a selected radio button, 1 of 2.
tab 15  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 16  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 17  button[page] "1"                                     1 current page button list 7 items
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/progress`

```
arrive  —                                                    banner
enter   button "−10"                                         (silence)
tab 1   button "+10"                                         +10 button
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 7   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 8   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 9   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 10  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 11  button "A number arrives"                            A number arrives button main
tab 12  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 13  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 14  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 15  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 16  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 17  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 18  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 19  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 20  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 21  —                                                    (silence)
```

### `/skeleton`

```
arrive  —                                                    Skeleton · @pacit/components web content
enter   button "The content arrives"                         (silence)
tab 1   input[control]                                       The content arrives button main
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       (silence)
tab 7   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 8   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 9   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 10  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 11  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 12  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 13  button "Stop the sheen"                              ltr selected radio button, 1 of 2 Direction radio group
tab 14  —                                                    Stop the sheen button main
```

### `/chips`

```
arrive  —                                                    heading level 2 Chips
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove In stock button list Active filters 5 items
```

Tab moved nothing — focus had left the page.

### `/avatar`

```
arrive  —                                                    heading level 2 Avatar
enter   button "Swap the source"                             (silence)
tab 1   button "Swap the source"                             Swap the source button
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  —                                                    heading level 2 Badge
enter   input[control]                                       (silence)
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

Tab moved nothing — focus had left the page.

### `/icon`

```
arrive  —                                                    heading level 2 Icon
enter   input[control]                                       (silence)
tab 1   input[control]                                       Done checked checkbox
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  —                                                    heading level 2 Breadcrumb
enter   a "Home"                                             (silence)
tab 1   a "Home"                                             link Home list 3 items
```

Tab moved nothing — focus had left the page.

### `/chart`

```
arrive  —                                                    heading level 2 Chart
enter   input[control]                                       (silence)
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

Tab moved nothing — focus had left the page.

### `/table`

```
arrive  —                                                    heading level 2 Table
enter   button[toggle] "Name"                                (silence)
tab 1   button[toggle] "Address"                             Address button
tab 2   input[control]                                       You are currently on a selected radio button, 1 of 2.
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 7   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 8   pct-table-frame "Registers"                          main Registers region
tab 9   —                                                    (silence)
```

### `/hero`

```
arrive  —                                                    heading level 2 Hero
enter   a "Under attention"                                  (silence)
tab 1   a "Under attention"                                  link heading level 3 Under attention The rim is drawn and hidden, so the reveal is an opacity.
```

Tab moved nothing — focus had left the page.

### `/stepper`

```
arrive  —                                                    heading level 2 Stepper
enter   button "Back"                                        (silence)
tab 1   button "Back"                                        You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/tree`

```
arrive  —                                                    heading level 2 Tree
enter   pct-tree-item "README.md"                            (silence)
tab 1   —                                                    README.md outline row (1 of 5)
```

### `/layout`

```
arrive  —                                                    heading level 2 Layout
enter   input[control]                                       (silence)
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

Tab moved nothing — focus had left the page.

### `/size`

```
arrive  —                                                    heading level 2 Size
enter   input                                                (silence)
tab 1   input                                                You are currently on a text field. To enter text in this field, type.
```

Tab moved nothing — focus had left the page.

### `/density`

```
arrive  —                                                    heading level 2 Density
enter   input                                                (silence)
tab 1   input                                                You are currently on a text field. To enter text in this field, type.
```

Tab moved nothing — focus had left the page.

### `/states`

```
arrive  —                                                    heading level 2 States
enter   input                                                (silence)
tab 1   input                                                You are currently on a text field. To enter text in this field, type.
```

Tab moved nothing — focus had left the page.

### `/announce`

```
arrive  —                                                    heading level 2 Live regions
enter   button "Announce politely"                           (silence)
tab 1   button "Announce politely"                           Announce politely button
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  —                                                    Form controls built as a pct-field wrapper with a control inside.
enter   button "Solid"                                       (silence)
tab 1   button "Solid"                                       You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.
