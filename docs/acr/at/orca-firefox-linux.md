# Orca with Firefox on Linux — assistive-technology log

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

- Orca version 50.2, AT-SPI2 version: 2.60.4, Session: wayland ubuntu
- Firefox 151.0 (the Playwright build), driven on Xvfb at 1280×900, window manager: openbox
- 482 steps over 36 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 0 of 482 here. 11 view(s) hit the cap, and each says so.

**A phrase repeated at one stop is written once.** This reader's log handed back 1969
phrases, and 1966 of them are distinct within their own stop; the rest are the same
sequence read again, cycled rather than repeated, which is the poller and not the reader. The
cost of the rule is stated rather than hidden: a reader that truly said one thing twice at one
stop is recorded here saying it once.

**Every view spoke.** No view of the 36 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
11 view(s) have more stops than the 12 taken, and each says so where it bit.

### `/`

```
arrive  a "Start"                                            navigation · Sandbox views · List with 6 items · Start · visited link. · Browse mode
enter   a "Button"                                           leaving list. · leaving navigation. · main content · List with 30 items · Button The variants, sizes and states of the button. · link.
tab 1   a "Field"                                            Field The field wrapper: label, hint, error, decorations and border. · link.
tab 2   a "Text"                                             Text A text field on a native <input>, and old-forms compatibility. · link.
tab 3   a "Textarea"                                         Textarea A textarea as tall as its text — and where that height comes from. · link.
tab 4   a "Number"                                           Number A number field: locale, fractions, stepping, bounds from the schema. · link.
tab 5   a "Date"                                             Date A calendar day — the text a locale writes, and the grid beside it. · link.
tab 6   a "Checkbox"                                         Checkbox The checked state, the indeterminate one and the touch area. · link.
tab 7   a "Radio"                                            Radio A radio group: the form control is the container. · link.
tab 8   a "Slider"                                           Slider A position on a numeric continuum, on the platform's own range. · link.
tab 9   a "Switch"                                           Switch A setting that takes effect the moment it is moved. · link.
tab 10  a "Select"                                           Select A combobox with a panel of its own in a CDK overlay. · link.
tab 11  a "Dialog"                                           Dialog A modal: a focus trap, an inert background and a locked page. · link.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/button`

```
arrive  a "Button"                                           leaving list. · leaving main content. · navigation · Sandbox views · List with 30 items · Button · link.
enter   button "Solid"                                       Solid · button.
tab 1   button "Outline"                                     Outline · button.
tab 2   button "Ghost"                                       Ghost · button.
tab 3   button "Soft"                                        Soft · button.
tab 4   button "Hero"                                        Hero · button.
tab 5   input[control]                                       Theme · panel · light · selected radio button.
tab 6   button "Small"                                       leaving panel. · Small · button.
tab 7   button "Medium"                                      Medium · button.
tab 8   button "Large"                                       Large · button.
tab 9   input[control]                                       Theme · panel · light · selected radio button.
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 13  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 14  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 15  a "Get started"                                      leaving panel. · Get started · link.
tab 16  a "Hero link"                                        Hero link · link.
tab 17  a "Disabled link"                                    Disabled link · link.
tab 18  button "Get started"                                 Get started · button.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/field`

```
arrive  a "Field"                                            leaving main content. · navigation · Sandbox views · List with 30 items · Field · link.
enter   input                                                E-mail · entry · john@example.com · required. · invalid entry. · A work address. · Focus mode
tab 1   —                                                    Theme · panel · light · selected radio button. · Browse mode · alert. · The e-mail address is required
```

### `/text`

```
arrive  a "Text"                                             leaving main content. · navigation · Sandbox views · List with 30 items · Text · link.
enter   input                                                First name · entry · John. · Focus mode
tab 1   input                                                E-mail · entry · john@example.com.
tab 2   input                                                Password · password text.
tab 3   input                                                Search · entry · Search…
tab 4   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   input                                                leaving panel. · Read-only · entry · preview only · selected. · Focus mode
tab 8   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  input                                                leaving panel. · Reactive forms ([formControl]) · entry · Ada · selected. · Focus mode
tab 12  input                                                Template-driven ([(ngModel)]) · entry · Lovelace · selected.
tab 13  input                                                Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/textarea`

```
arrive  a "Textarea"                                         navigation · Sandbox views · List with 30 items · Textarea · link. · Browse mode
enter   textarea                                             About you · entry · A few words… · Type — the box follows. · Focus mode
tab 1   textarea                                             A plain textarea, for comparison · entry · This one keeps its two lines and scrolls.
tab 2   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   textarea                                             leaving panel. · Note · entry · asks for. · Focus mode
tab 6   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   textarea                                             leaving panel. · Comment · entry. · Grows to four lines, then scrolls. · Focus mode
tab 10  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 13  textarea                                             leaving panel. · Old forms · entry. · Focus mode
tab 14  button "patchValue three lines"                      patchValue three lines · button. · Browse mode
tab 15  button "patchValue empty"                            patchValue empty · button.
tab 16  button "patchValue empty"                            Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/number`

```
arrive  a "Number"                                           navigation · Sandbox views · List with 30 items · Number · visited link. · Browse mode
enter   input                                                Price · spin button · 1 499,90. · The arrows change the value by 0.5. · Focus mode
tab 1   button[field-suffix-item] "Clear the price"          Clear the price · button. · Browse mode
tab 2   input[control]                                       Theme · panel · light · selected radio button.
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   input                                                leaving panel. · Number of seats · spin button · 1 · required. · The range is 1–500; a fraction is rounded on commit. · Focus mode
tab 6   input                                                Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  a "Date"                                             navigation · Sandbox views · List with 30 items · Date · link. · Browse mode
enter   input[control]                                       Start date · entry · 27/08/2026 · required. · Type it, or pick it from the calendar. · Focus mode
tab 1   button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 2   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   input[control]                                       leaving panel. · Day · entry · 27/08/2026 · selected. · The sandbox runs under fr-FR, so the format hint reads jj/mm/aaaa. · Focus mode
tab 6   button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 7   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  input[control]                                       leaving panel. · Within August 2026, weekdays only · entry · 27/08/2026 · selected. · Focus mode
tab 11  button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 12  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 13  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 14  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 15  input[control]                                       leaving panel. · Polish · entry · 27.08.2026 · selected. · Focus mode
tab 16  button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 17  input[control]                                       Japanese · entry · 2026/08/27 · selected.
tab 18  button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 19  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 20  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 21  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 22  button[nav] "Mois précédent"                         leaving panel. · Mois précédent · button.
tab 23  button[nav] "Mois suivant"                           Mois suivant · button.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/checkbox`

```
arrive  a "Checkbox"                                         leaving main content. · navigation · Sandbox views · List with 30 items · Checkbox · visited link.
enter   input[control]                                       Consents · check box not checked required. · invalid entry. · Required to open an account.
tab 1   —                                                    Theme · panel · light · selected radio button. · alert. · You have to accept the terms
```

### `/radio`

```
arrive  a "Radio"                                            leaving main content. · navigation · Sandbox views · List with 30 items · Radio · visited link.
enter   input[control]                                       Plan · panel · Free · not selected radio button.
tab 1   —                                                    leaving panel. · Theme · panel · light · selected radio button. · alert. · Pick a plan
```

### `/slider`

```
arrive  a "Slider"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Slider · link.
enter   input[control]                                       Budget · slider · 40 · 66 percent. · Between 20 and 80. · Focus mode
tab 1   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 2   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 3   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 4   input[control]                                       leaving panel. · Volume · slider · 30 · 30 percent. · Nothing is formatted, so nothing is written. · Focus mode
tab 5   input[control]                                       Discount · slider · 15 % · 0 percent.
tab 6   input[control]                                       Size · slider · Medium · 50 percent.
tab 7   input[control]                                       Read-only — focusable, but not movable · slider · 70 · 70 percent.
tab 8   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  input[control]                                       leaving panel. · Gain · slider · 60 · 60 percent. · Focus mode
tab 12  input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/switch`

```
arrive  a "Switch"                                           navigation · Sandbox views · List with 30 items · Switch · link. · Browse mode
enter   input[control]                                       Backups · switch not pressed. · Runs every night at 03:00.
tab 1   —                                                    Theme · panel · light · selected radio button. · alert. · Backups have to stay on
```

### `/select`

```
arrive  a "Select"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Select · link.
enter   button[trigger] "Sélectionner…"                      Country · combo box. · A list with a panel of its own (CDK Overlay) · opens listbox · Focus mode
tab 1   button[trigger] "Polish"                             field (the default) · combo box. · opens listbox
tab 2   button[trigger] "Polish"                             auto — out to the longest option · combo box. · opens listbox
tab 3   button[trigger] "Polish"                             320px, aligned to the end · combo box. · opens listbox
tab 4   button[trigger] "Sélectionner…"                      Country (in the dark theme) · combo box. · opens listbox
tab 5   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   button[trigger] "Poland"                             leaving panel. · Country · combo box. · opens listbox · Focus mode
tab 9   button[trigger] "Sélectionner…"                      Country (nothing to pick) · combo box. · opens listbox
tab 10  button[trigger] "Poland"                             Country · combo box. · opens listbox
tab 11  button[trigger] "Poland, Slovakia"                   Countries · combo box. · opens listbox
tab 12  input[trigger]                                       Country · editable combo box. · opens listbox
tab 13  input[trigger]                                       Countries · editable combo box. · opens listbox
tab 14  button[trigger] "Poland"                             Country · combo box. · opens listbox
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/dialog`

```
arrive  a "Dialog"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Dialog · link. · Browse mode
enter   button "Open the dialog"                             Open the dialog · button.
tab 1   button "Delete the project"                          Delete the project · button.
tab 2   button "Open the insistent one"                      Open the insistent one · button.
tab 3   button "Open a form dialog"                          Open a form dialog · button.
tab 4   button "Open a long one"                             Open a long one · button.
tab 5   button "Open a long one"                             Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/tooltip`

```
arrive  a "Tooltip"                                          navigation · Sandbox views · List with 30 items · Tooltip · visited link. · Browse mode
enter   button "Delete the project"                          Delete the project · button.
tab 1   button "Publish"                                     Publish · button. · Runs every check before publishing.
tab 2   button "Approve the release"                         Approve the release · button.
tab 3   button "Close the panel"                             Close the panel · button.
tab 4   button "start"                                       start · button. · On the starting side.
tab 5   button "top"                                         top · button. · Above the control.
tab 6   button "bottom"                                      bottom · button. · Below the control.
tab 7   button "end"                                         end · button. · On the ending side.
tab 8   input                                                Release note · entry. · Shown in the changelog Markdown is allowed here. · Focus mode
tab 9   button "Hover me"                                    Hover me · button. · This one can be taken away. · Browse mode
tab 10  button "Take it away"                                Take it away · button.
tab 11  button "Take it away"                                Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/popover`

```
arrive  a "Popover"                                          navigation · Sandbox views · List with 30 items · Popover · visited link. · Browse mode
enter   button "Filters"                                     Filters · collapsed button. · opens dialog · Focus mode
tab 1   button "start"                                       start · collapsed button. · opens dialog
tab 2   button "top"                                         top · collapsed button. · opens dialog
tab 3   button "bottom"                                      bottom · collapsed button. · opens dialog
tab 4   button "end"                                         end · collapsed button. · opens dialog
tab 5   button "Open the panel"                              Open the panel · collapsed button. · opens dialog
tab 6   button "Count up"                                    Count up · button. · Browse mode
tab 7   button "Count up"                                    Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/menu`

```
arrive  a "Menu"                                             navigation · Sandbox views · List with 30 items · Menu · visited link. · Browse mode
enter   button "Actions"                                     Actions · collapsed button. · opens menu · Focus mode
tab 1   button "Count up"                                    Count up · button. · Browse mode
tab 2   button "File"                                        File · collapsed button. · opens menu · Focus mode
tab 3   button "Language"                                    Language · collapsed button. · opens menu
tab 4   button "Language"                                    Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/drawer`

```
arrive  a "Drawer"                                           navigation · Sandbox views · List with 30 items · Drawer · link. · Browse mode
enter   button "Sections"                                    Sections · collapsed button. · Focus mode
tab 1   button "Sections, from further down"                 Sections, from further down · collapsed button.
tab 2   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   button "From the end edge"                           leaving panel. · From the end edge · collapsed button. · Focus mode
tab 6   button "From the bottom"                             From the bottom · collapsed button.
tab 7   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  button "Open the bare one"                           leaving panel. · Open the bare one · collapsed button. · Focus mode
tab 11  button "Open the bare one"                           Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/accordion`

```
arrive  a "Accordion"                                        navigation · Sandbox views · List with 30 items · Accordion · link. · Browse mode
enter   summary[heading] "Shipping"                          Shipping · expanded button. · Focus mode
tab 1   summary[heading] "Payment"                           Payment · collapsed button.
tab 2   summary[heading] "Returns"                           Returns · collapsed button.
tab 3   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   summary[heading] "First"                             leaving panel. · First · collapsed button. · Focus mode
tab 7   summary[heading] "Second"                            Second · collapsed button.
tab 8   summary[heading] "Third"                             Third · collapsed button.
tab 9   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  summary[heading] "Open to anyone"                    leaving panel. · Open to anyone · collapsed button. · Focus mode
tab 13  summary[heading] "Not yours to open"                 Not yours to open · collapsed button grayed.
tab 14  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 15  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 16  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 17  summary[heading] "An h4 section"                     leaving panel. · An h4 section · collapsed button. · Focus mode
tab 18  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 19  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 20  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 21  summary[heading] "More about this"                   leaving panel. · More about this · collapsed button. · Focus mode
tab 22  summary[heading] "More about this"                   Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/tabs`

```
arrive  a "Tabs"                                             navigation · Sandbox views · List with 30 items · Tabs · link. · Browse mode
enter   button[tab] "General"                                General · page tab. · Focus mode
tab 1   pct-tab[panel] "The general settings, and a word that…" General · scroll pane clickable. · Browse mode
tab 2   pct-tab[panel]                                       Network · scroll pane clickable.
tab 3   input[control]                                       Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   button[tab] "Overview"                               Overview · page tab. · Focus mode
tab 7   pct-tab[panel] "A summary nobody had to fetch."      Overview · scroll pane clickable. · Browse mode
tab 8   pct-tab[panel]                                       Details · scroll pane clickable.
tab 9   input[control]                                       Theme · panel · light · selected radio button.
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  button[tab] "Profile"                                Profile · page tab. · Focus mode
tab 13  pct-tab[panel] "Who you are."                        Profile · scroll pane clickable. · Browse mode
tab 14  pct-tab[panel]                                       Keys · scroll pane clickable.
tab 15  input[control]                                       Theme · panel · light · selected radio button.
tab 16  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 17  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 18  button[tab] "Week"                                   Week · page tab. · Focus mode
tab 19  pct-tab[panel]                                       Day · scroll pane clickable. · Browse mode
tab 20  pct-tab[panel] "Seven days side by side."            Week · scroll pane clickable.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/toast`

```
arrive  a "Toast"                                            leaving main content. · navigation · Sandbox views · List with 30 items · Toast · link.
enter   button "Save the draft"                              Save the draft · button.
tab 1   button "Copy (a shorter clock)"                      Copy (a shorter clock) · button.
tab 2   button "Report something that waits"                 Report something that waits · button.
tab 3   button "Clear the stack"                             Clear the stack · button.
tab 4   input[control]                                       Theme · panel · light · selected radio button.
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   button "Fail to save"                                leaving panel. · Fail to save · button.
tab 8   input[control]                                       Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  button "Success"                                     leaving panel. · Success · button.
tab 12  button "Warning"                                     Warning · button.
tab 13  button "Danger"                                      Danger · button.
tab 14  button "Info"                                        Info · button.
tab 15  input[control]                                       Theme · panel · light · selected radio button.
tab 16  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 17  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 18  button "Delete the message"                          leaving panel. · Delete the message · button.
tab 19  input[control]                                       Theme · panel · light · selected radio button.
tab 20  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 21  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 22  button "Open the settings"                           leaving panel. · Open the settings · button.
tab 23  button "Open the settings"                           Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/pagination`

```
arrive  a "Pagination"                                       navigation · Sandbox views · List with 30 items · Pagination · link. · Browse mode
enter   button[page] "1"                                     navigation · Pagination · List with 5 items · 1 · button. · (Current page)
tab 1   button[page] "2"                                     2 · button.
tab 2   button[page] "3"                                     3 · button.
tab 3   button[next] "Next page"                             Next page · button.
tab 4   input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   button[previous] "Previous page"                     leaving panel. · navigation · Pagination · List with 9 items · Previous page · button.
tab 8   button[page] "1"                                     1 · button.
tab 9   button[page] "6"                                     6 · button.
tab 10  button[page] "7"                                     7 · button. · (Current page)
tab 11  button[page] "8"                                     8 · button.
tab 12  button[page] "20"                                    20 · button.
tab 13  button[next] "Next page"                             Next page · button.
tab 14  input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 15  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 16  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 17  button[page] "1"                                     leaving panel. · navigation · Rows · List with 7 items · 1 · button. · (Current page)
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/progress`

```
arrive  a "Progress"                                         leaving list. · leaving navigation. · leaving main content. · navigation · Sandbox views · List with 30 items · Progress · link.
enter   button "−10"                                         −10 · button.
tab 1   button "+10"                                         +10 · button.
tab 2   input[control]                                       Theme · panel · light · selected radio button.
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  button "A number arrives"                            leaving panel. · A number arrives · button.
tab 12  input[control]                                       Theme · panel · light · selected radio button.
tab 13  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 14  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 15  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 16  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 17  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 18  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 19  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 20  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 21  input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  a "Skeleton"                                         navigation · Sandbox views · List with 30 items · Skeleton · link. · Browse mode
enter   button "The content arrives"                         The content arrives · button.
tab 1   input[control]                                       Theme · panel · light · selected radio button.
tab 2   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 3   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 4   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 13  button "Stop the sheen"                              leaving panel. · Stop the sheen · button.
tab 14  button "Stop the sheen"                              Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/chips`

```
arrive  a "Chips"                                            navigation · Sandbox views · List with 30 items · Chips · link. · Browse mode
enter   button[remove] "Remove"                              Active filters · List with 5 items · Remove In stock · button.
tab 1   button[remove] "Remove"                              Remove Under 50 · button.
tab 2   button[remove] "Remove"                              Remove Free shipping · button.
tab 3   button[remove] "Remove"                              Remove New · button.
tab 4   button[remove] "Remove"                              Remove Local · button.
tab 5   button "Restore everything"                          leaving list. · Restore everything · button.
tab 6   input[control]                                       Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   button[remove] "Remove"                              leaving panel. · Statuses · List with 3 items · Remove draft · button.
tab 10  button[remove] "Remove"                              Remove archived · button.
tab 11  input[control]                                       leaving list. · Theme · panel · light · selected radio button.
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 13  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 14  button[remove] "Remove"                              leaving panel. · People · List with 3 items · Remove Ada · button.
tab 15  button[remove] "Remove"                              Remove Grace · button.
tab 16  button[remove] "Remove"                              Remove Edsger · button.
tab 17  input[control]                                       leaving list. · Theme · panel · light · selected radio button.
tab 18  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 19  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 20  button[remove] "Remove"                              leaving panel. · Small · List with 2 items · Remove removable · button.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/avatar`

```
arrive  a "Avatar"                                           leaving list. · leaving main content. · navigation · Sandbox views · List with 30 items · Avatar · link.
enter   button "Swap the source"                             Swap the source · button.
tab 1   input[control]                                       Theme · panel · light · selected radio button.
tab 2   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 3   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 4   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   button "A control of the same size"                  leaving panel. · A control of the same size · button.
tab 8   input[control]                                       Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  button "Account: Ada Lovelace"                       leaving panel. · Account: Ada Lovelace · button.
tab 12  button "Account: Ada Lovelace"                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  a "Badge"                                            navigation · Sandbox views · List with 30 items · Badge · visited link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  a "Breadcrumb"                                       navigation · Sandbox views · List with 30 items · Breadcrumb · visited link. · Browse mode
enter   a "Home"                                             navigation · Breadcrumb · List with 3 items · Home · link.
tab 1   a "Library"                                          Library · link.
tab 2   a "Data"                                             Data · link. · (Current page)
tab 3   input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   a "Reports"                                          leaving panel. · navigation · Reports trail · List with 3 items · Reports · link.
tab 7   a "Finance"                                          Finance · link.
tab 8   input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  a "Organisation"                                     leaving panel. · navigation · Deep trail · List with 5 items · Organisation · link.
tab 12  a "Departments"                                      Departments · link.
tab 13  a "Engineering"                                      Engineering · link.
tab 14  a "Platform"                                         Platform · link.
tab 15  a "Observability"                                    Observability · link. · (Current page)
tab 16  a "Observability"                                    Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/hero`

```
arrive  a "Hero"                                             navigation · Sandbox views · List with 30 items · Hero · visited link. · Browse mode
enter   a "Under attention"                                  Under attention The rim is drawn and hidden, so the reveal is an opacity. · visited link.
tab 1   a "Read the case"                                    Read the case · visited link.
tab 2   input[control]                                       Theme · panel · light · selected radio button.
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   button "Stop the sweep"                              leaving panel. · Stop the sweep · button.
tab 9   button "Stop the sweep"                              Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/stepper`

```
arrive  a "Stepper"                                          navigation · Sandbox views · List with 30 items · Stepper · visited link. · Browse mode
enter   button "Back"                                        Back · button.
tab 1   button "Next"                                        Next · button.
tab 2   input[control]                                       Theme · panel · light · selected radio button.
tab 3   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 4   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 5   input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/tree`

```
arrive  a "Tree"                                             navigation · Sandbox views · List with 30 items · Tree · visited link. · Browse mode
enter   pct-tree-item "README.md"                            README.md. · tree level 1 · Focus mode
tab 1   pct-tree-item "README.md"                            Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/layout`

```
arrive  a "Layout"                                           navigation · Sandbox views · List with 30 items · Layout · link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 13  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 14  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 15  input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/size`

```
arrive  a "Size"                                             navigation · Sandbox views · List with 6 items · Size · link. · Browse mode
enter   input                                                Field sm · entry · Text sm. · Focus mode
tab 1   button "Button sm"                                   Button sm · button. · Browse mode
tab 2   button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
tab 3   input                                                Field md · entry · Text md · selected.
tab 4   button "Button md"                                   Button md · button. · Browse mode
tab 5   button[trigger] "Poland"                             List md · combo box. · opens listbox · Focus mode
tab 6   input                                                Field lg · entry · Text lg · selected.
tab 7   button "Button lg"                                   Button lg · button. · Browse mode
tab 8   button[trigger] "Poland"                             List lg · combo box. · opens listbox · Focus mode
tab 9   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 10  input                                                leaving panel. · Number sm · spin button · 1 499,9. · Focus mode
tab 11  input[control]                                       Date sm · entry · 27/08/2026 · selected.
tab 12  button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/density`

```
arrive  a "Density"                                          leaving main content. · navigation · Sandbox views · List with 6 items · Density · link. · Browse mode
enter   input                                                Field sm · entry · Text sm. · Focus mode
tab 1   button "Button sm"                                   Button sm · button. · Browse mode
tab 2   button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
tab 3   input                                                Field md · entry · Text md · selected.
tab 4   button "Button md"                                   Button md · button. · Browse mode
tab 5   button[trigger] "Poland"                             List md · combo box. · opens listbox · Focus mode
tab 6   input                                                Field lg · entry · Text lg · selected.
tab 7   button "Button lg"                                   Button lg · button. · Browse mode
tab 8   button[trigger] "Poland"                             List lg · combo box. · opens listbox · Focus mode
tab 9   input                                                Field sm · entry · Text sm · selected.
tab 10  button "Button sm"                                   Button sm · button. · Browse mode
tab 11  button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/states`

```
arrive  a "States"                                           leaving main content. · navigation · Sandbox views · List with 6 items · States · link. · Browse mode
enter   input                                                Text · entry · Text. · Focus mode
tab 1   input                                                Number · spin button · 1 499,9.
tab 2   button[trigger] "Poland"                             List · combo box. · opens listbox
tab 3   input[control]                                       Consent · check box checked. · Browse mode
tab 4   input[control]                                       Plan · panel · A · selected radio button.
tab 5   input[control]                                       leaving panel. · Backups · switch pressed.
tab 6   input[control]                                       Budget · slider · 40 · 40 percent. · Focus mode
tab 7   input[control]                                       Starts on · entry · 27/08/2026 · selected.
tab 8   button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 9   button "Button"                                      Button · button. · Browse mode
tab 10  input[control]                                       Theme · panel · light · selected radio button.
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 13  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 14  input                                                leaving panel. · Text · entry · selected. · Focus mode
tab 15  input                                                Number · spin button · 1 499,9.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/announce`

```
arrive  a "Live regions"                                     leaving main content. · navigation · Sandbox views · List with 6 items · Live regions · visited link. · Browse mode
enter   button "Announce politely"                           Announce politely · button.
tab 1   button "Interrupt"                                   Interrupt · button.
tab 2   button "Interrupt"                                   Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  a "Everything at once"                               navigation · Sandbox views · List with 6 items · Everything at once · link. · Browse mode
enter   button "Solid"                                       Solid · button.
tab 1   button "Outline"                                     Outline · button.
tab 2   button "Small"                                       Small · button.
tab 3   button "Medium"                                      Medium · button.
tab 4   button "Large"                                       Large · button.
tab 5   input                                                Field sm · entry · Text sm · selected. · Focus mode
tab 6   button "Button sm"                                   Button sm · button. · Browse mode
tab 7   button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
tab 8   input                                                Field md · entry · Text md · selected.
tab 9   button "Button md"                                   Button md · button. · Browse mode
tab 10  button[trigger] "Poland"                             List md · combo box. · opens listbox · Focus mode
tab 11  input                                                Field lg · entry · Text lg · selected.
```

The cap bit here: 12 stops of this view's own were read, and it has more.
