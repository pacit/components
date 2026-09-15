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
- 272 steps over 36 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 51 of 272 here. 3 view(s) hit the cap, and each says so.

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
tab 6   button "Small"                                       Small button main
tab 7   button "Medium"                                      Medium button
tab 8   button "Large"                                       Large button
tab 9   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 10  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 11  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 12  input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 13  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 14  input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 15  button "Get started"                                 Get started button main
tab 16  button "Solid"                                       Solid button
tab 17  button "Outline"                                     Outline button
tab 18  button "Solid"                                       You are currently on a button. To click this button, press Control-Option-Space.
```

the cap bit: 12 stops of this view's own, and it has more.
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
```

the cap bit: 12 stops of this view's own, and it has more.
The cap bit here: 12 stops of this view's own were read, and it has more.

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
```

the cap bit: 12 stops of this view's own, and it has more.
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
```

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
```

### `/menu`

```
arrive  —                                                    heading level 2 Menu
enter   button "Actions"                                     (silence)
tab 1   button "Actions"                                     Actions menu pop up button
```

Tab moved nothing — focus had left the page.

### `/drawer`

```
arrive  —                                                    heading level 2 Drawer
enter   button "Sections"                                    (silence)
tab 1   button "Sections"                                    Sections collapsed button
```

Tab moved nothing — focus had left the page.

### `/accordion`

```
arrive  —                                                    heading level 2 Accordion
enter   summary[heading] "Shipping"                          (silence)
tab 1   summary[heading] "Shipping"                          Shipping expanded summary
```

Tab moved nothing — focus had left the page.

### `/tabs`

```
arrive  —                                                    heading level 2 Tabs
enter   button[tab] "General"                                (silence)
tab 1   button[tab] "General"                                General selected tab, 1 of 3 Account settings tab group
```

Tab moved nothing — focus had left the page.

### `/toast`

```
arrive  —                                                    heading level 2 Toast
enter   button "Save the draft"                              (silence)
tab 1   button "Save the draft"                              Save the draft button
```

Tab moved nothing — focus had left the page.

### `/pagination`

```
arrive  —                                                    heading level 2 Pagination
enter   button[page] "1"                                     (silence)
tab 1   button[page] "1"                                     1 current page button list 5 items
```

Tab moved nothing — focus had left the page.

### `/progress`

```
arrive  —                                                    heading level 2 Progress
enter   button "−10"                                         (silence)
tab 1   button "−10"                                         −10 button
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  —                                                    1 item Skeleton · @pacit/components web content
enter   button "The content arrives"                         (silence)
tab 1   input[control]                                       You are currently on web content. To enter the web area, press Control-Option-Shift-Down Arrow.
tab 2   input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 3   input[control]                                       ltr selected radio button, 1 of 2 Direction radio group
tab 4   input[control]                                       (silence)
tab 5   input[control]                                       light selected radio button, 1 of 2 Theme radio group
tab 6   input[control]                                       Playwright is not responding
tab 7   input[control]                                       (silence)
tab 8   input[control]                                       Playwright is not responding
tab 9   input[control]                                       (silence)
tab 10  input[control]                                       md selected radio button, 2 of 3 Size radio group
tab 11  input[control]                                       Playwright is not responding
tab 12  input[control]                                       (silence)
tab 13  button "Stop the sheen"                              Playwright is not responding
tab 14  —                                                    (silence)
```

### `/chips`

```
arrive  —                                                    heading level 2 Chips
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove button list Active filters 5 items
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
tab 1   button "Solid"                                       Solid button
```

Tab moved nothing — focus had left the page.
