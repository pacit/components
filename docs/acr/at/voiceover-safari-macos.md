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
- 227 steps over 38 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. A view with something to OPEN ends on three more:
`reach` puts focus on the control that opens it, `open` presses the key, and `close` presses
Escape — the row every card asking "what does a reader announce when this appears" was waiting
for, and the row beneath it is what leaving sounds like. `(silence)` is a stop the reader said nothing
at — 65 of 227 here. 1 view(s) hit the cap, and each says so.

**Every view spoke.** No view of the 38 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
1 view(s) have more stops than the 12 taken, and each says so where it bit.

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
tab 11  button "danger"                                      danger button
tab 12  button "warning"                                     warning button
tab 13  button "warning"                                     (silence)
tab 14  button "warning"                                     You are currently on a button. To click this button, press Control-Option-Space.
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
open    button[close] "Close"                                (silence)
close   button[close] "Close"                                Project settings web dialog with 4 items Close button
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
open    div[panel] "Filters"                                 (silence)
close   div[panel] "Filters"                                 Filters web dialog with 5 items heading level 2 Filters
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
tab 1   button[tab] "General"                                General selected tab, 1 of 3 Account settings tab group
reach   button[tab] "General"                                (silence)
open    button[tab] "General"                                (silence)
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
tab 1   button[page] "1"                                     1 current page button list 5 items
```

Tab moved nothing — focus had left the page.

### `/progress`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   button "−10"                                         (silence)
tab 1   button "−10"                                         −10 button main
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  —                                                    In Skeleton · @pacit/components web content heading level 1 @pacit/components — sandbox banner
enter   button "The content arrives"                         (silence)
tab 1   button "The content arrives"                         The content arrives button main
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
tab 1   button "Swap the source"                             You are currently on a button. To click this button, press Control-Option-Space.
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  —                                                    heading level 1 @pacit/components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       You are currently on a selected radio button, 1 of 2.
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
