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
- 285 steps over 36 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. A view with something to OPEN ends on three more:
`reach` puts focus on the control that opens it, `open` presses the key, and `close` presses
Escape — the row every card asking "what does a reader announce when this appears" was waiting
for, and the row beneath it is what leaving sounds like. `(silence)` is a stop the reader said nothing
at — 66 of 285 here. 3 view(s) hit the cap, and each says so.

**Every view spoke.** No view of the 36 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
3 view(s) have more stops than the 12 taken, and each says so where it bit.

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
tab 9   input                                                (silence)
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
tab 21  input[control]                                       Consents Required to open an account unchecked checkbox main
tab 22  input[control]                                       Free selected radio button, 1 of 2 Plan radio group
tab 23  —                                                    (silence)
```

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

the pointer's way to the nav stood under `div` when this view was asked for, and the link was reached through its own click event.

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
arrive  —                                                    banner
enter   button "Actions"                                     (silence)
tab 1   button "Count up"                                    Count up button
tab 2   button "File"                                        File menu pop up button
tab 3   button "Language"                                    Language menu pop up button
tab 4   —                                                    (silence)
reach   button "Actions"                                     (silence)
open    button[item] "Rename"                                Rename menu item (1 of 4)
close   button "Actions"                                     Actions menu pop up button
```

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
arrive  —                                                    1 item Skeleton · @pacit/components web content
enter   button "The content arrives"                         (silence)
tab 1   input[control]                                       You are currently on web content. To enter the web area, press Control-Option-Shift-Down Arrow.
tab 2   input[control]                                       (silence)
tab 3   input[control]                                       You are currently on a selected radio button, 2 of 3.
tab 4   input[control]                                       Playwright is not responding
tab 5   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 6   input[control]                                       (silence)
tab 7   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 8   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 9   input[control]                                       Playwright is not responding
tab 10  input[control]                                       (silence)
tab 11  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 12  input[control]                                       Playwright is not responding
tab 13  button "Stop the sheen"                              (silence)
tab 14  —                                                    Stop the sheen button main
```

### `/chips`

```
arrive  —                                                    banner
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove Under 50 button
tab 2   button[remove] "Remove"                              Remove Free shipping button
tab 3   button[remove] "Remove"                              Remove New button
tab 4   button[remove] "Remove"                              Remove Local button
tab 5   button "Restore everything"                          Restore everything button main
tab 6   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 7   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 8   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 9   button[remove] "Remove"                              Remove draft button list Statuses 3 items
tab 10  button[remove] "Remove"                              Remove archived button
tab 11  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 12  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 13  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 14  button[remove] "Remove"                              Remove Ada button list People 3 items
tab 15  button[remove] "Remove"                              Remove Grace button
tab 16  button[remove] "Remove"                              Remove Edsger button
tab 17  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 18  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 19  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 20  button[remove] "Remove"                              Remove removable button list Small 2 items
```

The cap bit here: 12 stops of this view's own were read, and it has more.

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
