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
- 445 steps over 64 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. A view with something to OPEN ends on three more:
`reach` puts focus on the control that opens it, `open` presses the key, and `close` presses
Escape — the row every card asking "what does a reader announce when this appears" was waiting
for, and the row beneath it is what leaving sounds like. A block deeper in a view than the
cap reaches is a heading of its own, `/view#block`: `enter` puts focus on its first stop,
the keys a person presses there follow under their names, then Tab stops while focus stays
inside it. `(silence)` is a stop the reader said nothing
at — 128 of 445 here. 6 view(s) hit the cap, and each says so.

**Every view spoke.** No view of the 64 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
6 view(s) have more stops than the 12 taken, and each says so where it bit.

### `/`

```
arrive  —                                                    banner
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
tab 11  button "danger"                                      You are currently on a button. To click this button, press Control-Option-Space.
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
tab 13  input[control]                                       You are currently on a selected radio button, 1 of 2.
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
arrive  —                                                    banner
enter   textarea                                             (silence)
tab 1   textarea                                             A plain textarea, for comparison This one keeps its two lines and scrolls. text entry area
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   textarea                                             Note text entry area A value that was already here at the first paint.
Four lines of it, so that the height is
visibly not the floor the rows attribute
asks for. Insertion on word: A main
tab 6   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 7   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 8   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 9   textarea                                             Comment Grows to four lines, then scrolls. text entry area main
tab 10  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 11  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 12  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 13  textarea                                             Old forms text entry area main
tab 14  button "patchValue three lines"                      patchValue three lines button
tab 15  button "patchValue empty"                            patchValue empty button
tab 16  —                                                    (silence)
```

### `/number`

```
arrive  —                                                    banner
enter   input                                                (silence)
tab 1   button[field-suffix-item] "Clear the price"          Clear the price button
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   input                                                1 Number of seats The range is 1–500; a fraction is rounded on commit required stepper main
tab 6   —                                                    (silence)
```

### `/date`

```
arrive  —                                                    banner
enter   input[control]                                       (silence)
tab 1   button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   input[control]                                       27/08/2026 Insertion on word: 27/ , between characters: and Day The sandbox runs under fr-FR, so the format hint reads jj/mm/aaaa edit text main
tab 6   button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 7   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 8   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 9   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 10  input[control]                                       27/08/2026 Insertion on word: 27/ , between characters: and Within August 2026, weekdays only edit text main
tab 11  button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 12  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 13  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 14  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 15  input[control]                                       27.08.2026 Insertion on word: 27.08.2026 , between characters: and Polish edit text main
tab 16  button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 17  input[control]                                       2026/08/27 Insertion on word: 2026/ , between characters: and Japanese edit text
tab 18  button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 19  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 20  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 21  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 22  button[nav] "Mois précédent"                         Mois précédent button main
tab 23  button[nav] "Mois suivant"                           Mois suivant button
reach   button[toggle] "Choisir une date"                    (silence)
open    td[day] "jeudi 27 août 2026"                         (silence)
close   input[control]                                       27
```

the act: `Enter` on `[data-testid="date-standalone"] [data-pct-part="toggle"]`, to open a month grid (the gesture belongs to `apps/sandbox-e2e/src/date.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

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

### `/time#demo-wheel`

```
enter   div[list] "Heures"                                   (silence)
down    div[list] "Heures"                                   06 selected (7 of 24) Alarm group
home    div[list] "Heures"                                   Heures list box 06 selected (7 of 24) 1 item selected.
up      div[list] "Heures"                                   (silence)
tab 1   div[list] "Heures"                                   Heures list box 06 selected (7 of 24) 1 item selected.
```

the section: `ArrowDown`, `Home`, `ArrowUp` in `demo-wheel`, to read an hour a key brings to the line of its wheel (the keys belong to `time.spec.ts › the keys are the columns’ own — an arrow comes round, a digit goes to its row, Enter takes the time`).

### `/datetime`

```
arrive  —                                                    heading level 2 Datetime
enter   input[date-control]                                  (silence)
tab 1   input[date-control]                                  2026
reach   button[toggle] "Choisir une date et une heure"       (silence)
open    td[day] "mardi 1 décembre 2026"                      (silence)
close   input[date-control]                                  2026
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="datetime-standalone"] [data-pct-part="toggle"]`, to open a calendar and the columns of a time (the gesture belongs to `apps/sandbox-e2e/src/datetime.spec.ts`).

### `/checkbox`

```
arrive  —                                                    heading level 2 Checkbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       Consents Required to open an account required invalid data unchecked checkbox
```

Tab moved nothing — focus had left the page.

### `/radio`

```
arrive  —                                                    heading level 2 Radio
enter   input[control]                                       (silence)
tab 1   input[control]                                       Free radio button, 1 of 3 Plan You can change it at any time required radio group
```

Tab moved nothing — focus had left the page.

### `/slider`

```
arrive  —                                                    heading level 2 Slider
enter   input[control]                                       (silence)
tab 1   input[control]                                       40 Budget Between 20 and 80 slider
```

Tab moved nothing — focus had left the page.

### `/wheel`

```
arrive  —                                                    heading level 2 Wheel
enter   div[list] "Monday"                                   (silence)
tab 1   div[list] "Monday"                                   Wednesday selected (3 of 7)
```

Tab moved nothing — focus had left the page.

### `/wheel#demo-list`

```
enter   div[list] "Monday"                                   (silence)
down    div[list] "Monday"                                   (silence)
down    div[list] "Monday"                                   Wednesday selected (3 of 7)
end     div[list] "Monday"                                   Monday selected (1 of 7)
tab 1   —                                                    (silence)
```

the section: `ArrowDown`, `ArrowDown`, `End` in `demo-list`, to read the row a key brings to the line (the keys belong to `wheel.spec.ts › a key moves the line, the row becomes the value, and the scroll follows`).

### `/wheel#demo-ring`

```
enter   div[list] "Hour"                                     (silence)
home    div[list] "Hour"                                     0:30 0:30
up      div[list] "Hour"                                     23:30 23:30
tab 1   div[list] "Minute"                                   30 selected (31 of 60)
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

the section: `Home`, `ArrowUp` in `demo-ring`, to read a ring coming round at its ends (the keys belong to `wheel.spec.ts › the keys come round at the ends, and the scroll is put back on the middle turn`).

### `/switch`

```
arrive  —                                                    heading level 2 Switch
enter   input[control]                                       (silence)
tab 1   input[control]                                       Backups Runs every night at 03:00 required invalid data off switch
```

Tab moved nothing — focus had left the page.

### `/select`

```
arrive  —                                                    heading level 2 Select
enter   button[trigger] "Sélectionner…"                      (silence)
tab 1   button[trigger] "Sélectionner…"                      , Sélectionn Country A list with a panel of its own (CDK Overlay) list box pop up collapsed combo box
reach   button[trigger] "Sélectionner…"                      (silence)
open    button[trigger] "Sélectionner…"                      (silence)
close   button[trigger] "Sélectionner…"                      (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="select-country"] [data-pct-part="trigger"]`, to open a listbox (the gesture belongs to `apps/sandbox-e2e/src/select.spec.ts`).

### `/dialog`

```
arrive  —                                                    heading level 2 Dialog
enter   button "Open the dialog"                             (silence)
tab 1   button "Open the dialog"                             Open the dialog button
reach   button "Open the dialog"                             (silence)
open    button[close] "Close"                                Project settings web dialog with 4 items Close button
close   button[close] "Close"                                (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="open-basic"]`, to open a modal dialog (the gesture belongs to `apps/sandbox-e2e/src/dialog.spec.ts`).

### `/tooltip`

```
arrive  —                                                    heading level 2 Tooltip
enter   button "Delete the project"                          (silence)
tab 1   button "Delete the project"                          Delete the project Removes the project and everything in it button
```

the pointer's way to the nav stood under `div` when this view was asked for, and the link was reached through its own click event.

Tab moved nothing — focus had left the page.

### `/popover`

```
arrive  —                                                    heading level 2 Popover
enter   button "Filters"                                     (silence)
tab 1   button "Filters"                                     Filters dialog pop up button
reach   button "Filters"                                     (silence)
open    div[panel] "Filters"                                 Filters web dialog with 5 items heading level 2 Filters
close   div[panel] "Filters"                                 (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

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
arrive  —                                                    banner
enter   button "Sections"                                    (silence)
tab 1   button "Sections, from further down"                 Sections, from further down collapsed button
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 3   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 4   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 5   button "From the end edge"                           From the end edge collapsed button main
tab 6   button "From the bottom"                             From the bottom collapsed button
tab 7   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 8   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 9   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 10  button "Open the bare one"                           Open the bare one collapsed button main
tab 11  —                                                    (silence)
reach   button "Sections"                                    (silence)
open    button "Sections"                                    Sections expanded button
close   button "Sections"                                    (silence)
```

the act: `Enter` on `[data-testid="trigger-nav"]`, to open a named region beside the page (the gesture belongs to `apps/sandbox-e2e/src/drawer.spec.ts`).

### `/accordion`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   summary[heading] "Shipping"                          (silence)
tab 1   summary[heading] "Shipping"                          Shipping expanded summary main
reach   summary[heading] "Payment"                           (silence)
open    summary[heading] "Payment"                           expanded
close   summary[heading] "Payment"                           You are currently on a summary. To expand or collapse the contents of this item, press Control-Option-Space.
```

the pointer's way to the nav stood under `pct-drawer (drawer-nav)` when this view was asked for, and the link was reached through its own click event.

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="item-payment"] [data-pct-part="heading"]`, to open a revealed section (the gesture belongs to `apps/sandbox-e2e/src/accordion.spec.ts`).

### `/tabs`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button[tab] "General"                                (silence)
tab 1   button[tab] "General"                                You are currently on a selected tab, 1 of 3.
reach   button[tab] "General"                                (silence)
open    button[tab] "General"                                General selected tab, 1 of 3 Account settings tab group
close   button[tab] "General"                                You are currently on a selected tab, 1 of 3.
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `ArrowRight` on `[data-testid="tabs-basic"] [data-pct-part="tab"][aria-selected="true"]`, to open the panel behind the next tab (the gesture belongs to `apps/sandbox-e2e/src/tabs.spec.ts`).

### `/toast`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "Save the draft"                              (silence)
tab 1   button "Save the draft"                              Save the draft button main
reach   button "Copy (a shorter clock)"                      (silence)
open    button "Copy (a shorter clock)"                      (silence)
close   button "Copy (a shorter clock)"                      You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="raise-brief"]`, to open a message in a live region (the gesture belongs to `apps/sandbox-e2e/src/toast.spec.ts`).

### `/pagination`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button[page] "1"                                     (silence)
tab 1   button[page] "1"                                     You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/progress`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "−10"                                         (silence)
tab 1   button "−10"                                         −10 button main
```

Tab moved nothing — focus had left the page.

### `/sparkline`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "Next hour"                                   (silence)
tab 1   button "Next hour"                                   Next hour button main
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  —                                                    Skeleton · @pacit/components web content
enter   button "The content arrives"                         (silence)
tab 1   button "The content arrives"                         You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/chips`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove In stock button list Active filters 5 items
```

Tab moved nothing — focus had left the page.

### `/avatar`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "Swap the source"                             (silence)
tab 1   button "Swap the source"                             Swap the source button main
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

Tab moved nothing — focus had left the page.

### `/icon`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       Done checked checkbox main
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   a "Home"                                             (silence)
tab 1   a "Home"                                             link Home list 3 items
```

Tab moved nothing — focus had left the page.

### `/chart`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   input[range] "Heat recovery on 25 October 2026"      (silence)
tab 1   input[range] "Heat recovery on 25 October 2026"      No reading selected Heat recovery on 25 October 2026 Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. slider main
```

Tab moved nothing — focus had left the page.

### `/chart#demo-pattern`

```
enter   input[range] "Heat recovery on 25 October 2026"      (silence)
right   input[range] "Heat recovery on 25 October 2026"      No reading selected Heat recovery on 25 October 2026 Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. slider
right   input[range] "Heat recovery on 25 October 2026"      (silence)
end     button "Recount"                                     Recount button
tab 1   —                                                    (silence)
```

the section: `ArrowRight`, `ArrowRight`, `End` in `demo-pattern`, to read the cursor moved by the arrows (the keys belong to `chart.spec.ts › the arrows walk the cursor from reading to reading, Home and End go to the ends`).

### `/chart#demo-bars`

```
enter   input[range] "Heat pump energy by day, March 2026"   (silence)
right   input[range] "Heat pump energy by day, March 2026"   Sun 1: March 14.7 kWh, February 12.3 kWh, Difference +19.5%
right   input[range] "Heat pump energy by day, March 2026"   Mon 2: March 16.4 kWh, February 15.1 kWh, Difference +8.6%
Enter   input[range] "Heat pump energy by day, March 2026"   Mon 2: March 16.4 kWh, February 15.1 kWh, Difference +8.6%, selected
tab 1   button[zoom] "Zoom in"                               Zoom in button
tab 2   input[control]                                       (silence)
```

the section: `ArrowRight`, `ArrowRight`, `Enter` in `demo-bars`, to read a bar's band picked at the cursor (the keys belong to `chart.spec.ts › a press selects a bar's band, and Enter at the cursor does the same`).

### `/chart#demo-pie`

```
enter   input[range] "Energy by use, October 2026"           (silence)
right   input[range] "Energy by use, October 2026"           Heat pump: 412 kWh, 46%, selected
end     button "Recount"                                     Recount button
tab 1   —                                                    You are currently on a slider. Press Control-Option-Command-Slash to bring up the more content menu.To start interacting with the slider, press Control-Option-Shift-Down Arrow.
```

the section: `ArrowRight`, `End` in `demo-pie`, to read the slices of a pie (the keys belong to `chart.spec.ts › the range is the one stop: the arrow keys walk the slices and read each, the legend hides one and the turn is shared among the rest`).

### `/chart#demo-brush`

```
enter   input[handle] "Start of the selection"               (silence)
right   input[handle] "Start of the selection"               25 Oct 2026 at 00:15
PageDown input[handle] "Start of the selection"               25 Oct 2026 at 00:00
tab 1   input[handle] "End of the selection"                 26 Oct 2026 at 00:00 End of the selection Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. slider
tab 2   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

the section: `ArrowRight`, `PageDown` in `demo-brush`, to read an edge of a navigator's selection (the keys belong to `chart.spec.ts › the keys move an edge of the navigator, and the window above follows`).

### `/chart#demo-live`

```
enter   button "Add a minute"                                (silence)
act     button "Add a minute"                                (silence)
tab 1   button "Recount"                                     Recount button
tab 2   —                                                    You are currently on a button. To click this button, press Control-Option-Space.
```

the section: `activate` in `demo-live`, to read a reading added to a live chart (the keys belong to `chart.spec.ts › a reading added at the end is drawn, and the window follows the meter`).

### `/card`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       You are currently on a switch. To toggle this switch, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/frame`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "Sign out"                                    (silence)
tab 1   button "Sign out"                                    You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/table`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
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

### `/datatable`

```
arrive  —                                                    Data table · @pacit/components web content
enter   input                                                (silence)
tab 1   pct-table-frame "Polling rules"                      Filter rules search text field
tab 2   button[toggle] "Name"                                Polling rules region
tab 3   button[toggle] "Room"                                Name button Polling rules table 6 columns, 21 rows
tab 4   button[toggle] "Address"                             You are currently on a button, inside of a cell. To click this button, press Control-Option-Space.
tab 5   button[toggle] "Energy"                              Address button
tab 6   button[toggle] "Next run"                            You are currently on a button, inside of a cell. To click this button, press Control-Option-Space.
tab 7   input[control] "Enabled: Supply fan"                 Next run button
tab 8   input[control] "Enabled: Heater"                     You are currently on a switch, inside of a cell. To toggle this switch, press Control-Option-Space.
tab 9   input[control] "Enabled: Bypass"                     Enabled: Heater off switch
tab 10  input[control] "Enabled: Exhaust fan"                Enabled: Bypass on switch
tab 11  input[control] "Enabled: Boiler"                     You are currently on a switch, inside of a cell. To toggle this switch, press Control-Option-Space.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-filters`

```
enter   button[filter] "Filter Name"                         (silence)
act     button[filter] "Filter Name"                         Playwright is not responding
escape  button[filter] "Filter Name"                         Filter Name dialog pop up button Rules table 6 columns, 21 rows
tab 1   button[toggle] "Room"                                (silence)
tab 2   button[filter] "Filter Room"                         Filter Room dialog pop up button
tab 3   button[toggle] "Address"                             (silence)
tab 4   button[filter] "Filter Address"                      You are currently on a button, inside of a cell. To click this button, press Control-Option-Space.
tab 5   button[toggle] "Energy"                              Filter Address dialog pop up button
tab 6   button[filter] "Filter Energy"                       Filter Energy dialog pop up button
tab 7   button[toggle] "Next run"                            Next run button
tab 8   button[filter] "Filter Next run"                     (silence)
tab 9   button[toggle] "Enabled"                             You are currently on a button, inside of a cell. To display a list of options, press Control-Option-Space.
tab 10  button[filter] "Filter Enabled"                      Filter Enabled dialog pop up button
tab 11  input[control]                                       (silence)
enter   input[control]                                       (silence)
space   input[control]                                       on A row of filters switch
tab 1   pct-table-frame "Rules"                              (silence)
tab 2   button[toggle] "Name"                                You are currently on a region.
tab 3   button[filter] "Filter Name"                         Filter Name dialog pop up button
tab 4   button[toggle] "Room"                                (silence)
tab 5   button[filter] "Filter Room"                         Filter Room dialog pop up button
tab 6   button[toggle] "Address"                             (silence)
tab 7   button[filter] "Filter Address"                      Filter Address dialog pop up button
tab 8   button[toggle] "Energy"                              (silence)
tab 9   button[filter] "Filter Energy"                       You are currently on a button, inside of a cell. To display a list of options, press Control-Option-Space.
tab 10  button[toggle] "Next run"                            Next run button
tab 11  button[filter] "Filter Next run"                     Filter Next run dialog pop up button
tab 12  button[toggle] "Enabled"                             Enabled button
enter   input "Filter Name"                                  (silence)
tab 1   button[trigger] "Filter Room"                        (silence)
tab 2   button "Below 4128"                                  You are currently on a combo box, inside of a cell. Type text or, to display a list of choices, press Control-Option-Space.
tab 3   button "From 4128"                                   From 4128 toggle button
tab 4   input "Energy from"                                  50% Energy from stepper Rules table 6 columns, 22 rows
tab 5   input "Energy to"                                    50% Energy to stepper
tab 6   input[control] "Next run from"                       (silence)
tab 7   button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 8   input[control] "Next run to"                         Next run to jj/mm/aaaa edit text
tab 9   button[toggle] "Choisir une date"                    Choisir une date dialog pop up button
tab 10  button[trigger] "Filter Enabled"                     (silence)
tab 11  input[control]                                       (silence)
```

the section: `activate`, `Escape` in `demo-filters`, to read a column's filter (the keys belong to `datatable.spec.ts › a header’s button opens its filter, a text keeps the rows it is found in, and Escape goes back to the button`).

the section: `Space` in `demo-filters`, to read the switch that draws the row of filters (the keys belong to `datatable.spec.ts › a row of filters under the headers, each control named by its column`).

the section: in `demo-filters`, to read the row of filters (the keys belong to `datatable.spec.ts › a row of filters under the headers, each control named by its column`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-layout`

```
enter   div[separator] "Resize Name"                         (silence)
right   div[separator] "Resize Name"                         208 pixels
back    button[options] "Options for Name"                   Options for Name menu pop up button
tab 1   div[separator] "Resize Name"                         vertical splitter 208 pixels Resize Name
tab 2   button[toggle] "Room"                                Room button
tab 3   button[options] "Options for Room"                   You are currently on a button, inside of a cell. To click this button, press Control-Option-Space.
tab 4   div[separator] "Resize Room"                         vertical splitter 150 pixels Resize Room
tab 5   button[toggle] "Address"                             (silence)
tab 6   button[options] "Options for Address"                Options for Address menu pop up button
tab 7   div[separator] "Resize Address"                      vertical splitter 150 pixels Resize Address
tab 8   button[toggle] "Energy"                              Energy button
tab 9   button[options] "Options for Energy"                 Options for Energy menu pop up button
tab 10  div[separator] "Resize Energy"                       vertical splitter 140 pixels Resize Energy
tab 11  button[toggle] "Next run"                            (silence)
tab 12  button[options] "Options for Next run"               Options for Next run menu pop up button
```

the section: `ArrowRight`, `Shift+Tab` in `demo-layout`, to read a column's separator and its menu (the keys belong to `datatable.spec.ts › a separator widens its column by the arrows, by 32 with Shift, and stops at its narrowest`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-grid`

```
enter   input[select]                                        (silence)
right   button[disclosure] "Show details"                    Select Supply fan unchecked checkbox Rules table 9 columns, 21 rows
down    button[disclosure] "Show details"                    Show details collapsed button
end     input[control] "Enabled: Heater"                     Enabled: Heater off switch
tab 1   input[control]                                       (silence)
```

the section: `ArrowRight`, `ArrowDown`, `End` in `demo-grid`, to read the grid (the keys belong to `datatable.spec.ts › the arrows move cell to cell, Home and End along the row, Ctrl with them to the ends`).

### `/datatable#demo-editing`

```
enter   td "Supply fan"                                      (silence)
Enter   input "Edit Name"                                    Supply fan Insertion on word: Supply , between characters: and Edit Name edit text
escape  td "Supply fan"                                      Supply fan
down    td "Heater"                                          Heater
tab 1   input[control]                                       You are currently on a cell, inside of a table. To navigate the cells within this table press Control-Option, and then Up Arrow, Down Arrow, Left Arrow, or Right Arrow.
```

the section: `Enter`, `Escape`, `ArrowDown` in `demo-editing`, to read a cell's editor (the keys belong to `datatable.spec.ts › opens a cell on Enter, commits on Enter and goes a row down, and the page applies it`).

### `/datatable#demo-tree`

```
enter   button[disclosure] "Collapse Ground floor"           (silence)
down    button[disclosure] "Expand Kitchen"                  Collapse Ground floor expanded button Home table 3 columns, 6 rows
right   button[disclosure] "Collapse Kitchen"                row 3 expanded
down    td "Kettle"                                          Kettle
left    button[disclosure] "Collapse Kitchen"                You are currently on a cell, inside of a table. To navigate the cells within this table press Control-Option, and then Up Arrow, Down Arrow, Left Arrow, or Right Arrow.
tab 1   input[control]                                       light selected radio button, 1 of 2 Theme radio group
```

the section: `ArrowDown`, `ArrowRight`, `ArrowDown`, `ArrowLeft` in `demo-tree`, to read the treegrid (the keys belong to `datatable.spec.ts › on a first cell the arrow out of the line closes a branch or goes to the parent, the arrow into it opens one`).

### `/datatable#demo-remote-tree`

```
enter   button[disclosure] "Expand Meter 1"                  (silence)
right   button[disclosure] "Collapse Meter 1"                row 3 expanded
down    button[disclosure] "Expand 2017"                     Collapse Meter 1 expanded button
right   button[disclosure] "Collapse 2017"                   row 4 expanded
down    td "January"                                         January
tab 1   input[control]                                       You are currently on a cell, inside of a table. To navigate the cells within this table press Control-Option, and then Up Arrow, Down Arrow, Left Arrow, or Right Arrow.
```

the section: `ArrowRight`, `ArrowDown`, `ArrowRight`, `ArrowDown` in `demo-remote-tree`, to read a tree the server holds (the keys belong to `datatable.spec.ts › a branch asks the server for its children when it opens, a placeholder standing in for them`).

### `/datatable#demo-remote-groups`

```
enter   button[disclosure] "Meter 1 (120)"                   (silence)
act     button[disclosure] "Meter 1 (120)"                   (silence)
tab 1   button[disclosure] "Meter 2 (120)"                   Meter 1 (120) collapsed button
tab 2   input[control]                                       Meter 2 (120) expanded button
```

the section: `activate` in `demo-remote-groups`, to read the groups a server made (the keys belong to `datatable.spec.ts › a collapsed group asks nothing, and shows its readings when it opens`).

### `/datatable#demo-row-menu`

```
enter   button[actions]                                      (silence)
act     button[item] "Duplicate"                             (silence)
down    button[item] "Remove"                                Remove menu item (2 of 2)
escape  button[actions]                                      (silence)
tab 1   input[select]                                        Actions Supply fan menu pop up button
tab 2   button[actions]                                      Actions Heater menu pop up button
tab 3   input[select]                                        Select Bypass unchecked checkbox
tab 4   button[actions]                                      (silence)
tab 5   input[select]                                        Select Exhaust fan unchecked checkbox
tab 6   button[actions]                                      Actions Exhaust fan menu pop up button
tab 7   input[select]                                        (silence)
tab 8   button[actions]                                      Select Boiler unchecked checkbox
tab 9   input[select]                                        Select Floor heating unchecked checkbox
tab 10  button[actions]                                      (silence)
tab 11  input[select]                                        Actions Floor heating menu pop up button
tab 12  button[actions]                                      Select Lamp unchecked checkbox
```

the section: `activate`, `ArrowDown`, `Escape` in `demo-row-menu`, to read a row's menu (the keys belong to `datatable.spec.ts › Shift+F10 opens a row’s menu at its first item, and Escape gives the focus back to the row’s button`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-tree-picks`

```
enter   input[select]                                        (silence)
space   input[select]                                        checked Select Kettle checkbox
back    button[disclosure] "Collapse Kitchen"                (silence)
back    input[select]                                        Select Kitchen mixed checkbox
tab 1   button[disclosure] "Collapse Kitchen"                Collapse Kitchen expanded button
tab 2   input[select]                                        (silence)
tab 3   input[select]                                        Select Fridge unchecked checkbox
tab 4   input[select]                                        (silence)
tab 5   input[select]                                        Select Lamp unchecked checkbox
tab 6   button[disclosure] "Expand Hall"                     Expand Hall collapsed button
tab 7   input[select]                                        Select Garage unchecked checkbox
tab 8   input[select]                                        (silence)
tab 9   button[disclosure] "Expand Upstairs"                 Expand Upstairs collapsed button
tab 10  input[control]                                       (silence)
```

the section: `Space`, `Shift+Tab`, `Shift+Tab` in `demo-tree-picks`, to read a branch's mixed checkbox (the keys belong to `datatable.spec.ts › a device half picks its room and floor, a room picks its devices, and a floor all it holds`).

### `/datatable#demo-col-span`

```
enter   td "Kitchen"                                         (silence)
right   td "Fine"                                            Fine
right   td "21.5 °C"                                         21.5 °C
down    td "No sensor fitted"                                No sensor fitted
down    td "23.0 °C"                                         You are currently on a cell, inside of a table. To navigate the cells within this table press Control-Option, and then Up Arrow, Down Arrow, Left Arrow, or Right Arrow.
tab 1   input[control]                                       (silence)
```

the section: `ArrowRight`, `ArrowRight`, `ArrowDown`, `ArrowDown` in `demo-col-span`, to read a cell over its neighbours (the keys belong to `datatable.spec.ts › the arrows step over the cell as one, and come back to the column they left`).

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
