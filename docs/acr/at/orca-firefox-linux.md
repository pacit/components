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
- 426 steps over 36 views, at most 12 tab stops each

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 0 of 426 here. 23 view(s) hit the cap, and each says so.

**Every view spoke.** No view of the 36 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
23 view(s) have more stops than the 12 taken, and each says so where it bit.

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
tab 12  a "Tooltip"                                          Tooltip A sentence about a control — a description, or the name it has none of. · link.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/button`

```
arrive  a "Button"                                           leaving list. · leaving main content. · navigation · Sandbox views · List with 30 items · Button · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Solid"                                       leaving panel. · Solid · button.
tab 4   button "Outline"                                     Outline · button.
tab 5   button "Ghost"                                       Ghost · button.
tab 6   button "Soft"                                        Soft · button.
tab 7   button "Hero"                                        Hero · button.
tab 8   input[control]                                       Theme · panel · light · selected radio button.
tab 9   button "Small"                                       leaving panel. · Small · button.
tab 10  button "Medium"                                      Medium · button.
tab 11  button "Large"                                       Large · button.
tab 12  input[control]                                       Theme · panel · light · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/field`

```
arrive  a "Field"                                            leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Field · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input                                                leaving panel. · E-mail · entry · john@example.com · required. · invalid entry. · A work address. · Focus mode
tab 4   —                                                    Theme · panel · light · selected radio button. · Browse mode · alert. · The e-mail address is required
```

### `/text`

```
arrive  a "Text"                                             leaving main content. · navigation · Sandbox views · List with 30 items · Text · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input                                                leaving panel. · First name · entry · John. · Focus mode
tab 4   input                                                E-mail · entry · john@example.com.
tab 5   input                                                Password · password text.
tab 6   input                                                Search · entry · Search…
tab 7   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  input                                                leaving panel. · Read-only · entry · preview only · selected. · Focus mode
tab 11  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/textarea`

```
arrive  a "Textarea"                                         leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Textarea · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   textarea                                             leaving panel. · About you · entry · A few words… · Type — the box follows. · Focus mode
tab 4   textarea                                             A plain textarea, for comparison · entry · This one keeps its two lines and scrolls.
tab 5   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   textarea                                             leaving panel. · Note · entry · asks for. · Focus mode
tab 9   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  textarea                                             leaving panel. · Comment · entry. · Grows to four lines, then scrolls. · Focus mode
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/number`

```
arrive  a "Number"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Number · visited link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input                                                leaving panel. · leaving panel. · Price · spin button · 1 499,90. · The arrows change the value by 0.5. · Focus mode
tab 4   button[field-suffix-item] "Clear the price"          Clear the price · button. · Browse mode
tab 5   input[control]                                       Theme · panel · light · selected radio button.
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   input                                                leaving panel. · leaving panel. · Number of seats · spin button · 1 · required. · The range is 1–500; a fraction is rounded on commit. · Focus mode
tab 9   input                                                Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  a "Date"                                             navigation · Sandbox views · List with 30 items · Date · link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Start date · entry · 27/08/2026 · selected required. · Type it, or pick it from the calendar. · Focus mode
tab 4   button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 5   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   input[control]                                       leaving panel. · Day · entry · 27/08/2026 · selected. · The sandbox runs under fr-FR, so the format hint reads jj/mm/aaaa. · Focus mode
tab 9   button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 10  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/checkbox`

```
arrive  a "Checkbox"                                         leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Checkbox · visited link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Consents · check box not checked required. · invalid entry. · Required to open an account.
tab 4   —                                                    Theme · panel · light · selected radio button. · alert. · You have to accept the terms
```

### `/radio`

```
arrive  a "Radio"                                            leaving main content. · navigation · Sandbox views · List with 30 items · Radio · visited link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Plan · panel · Free · not selected radio button.
tab 4   —                                                    leaving panel. · Theme · panel · light · selected radio button. · alert. · Pick a plan
```

### `/slider`

```
arrive  a "Slider"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Slider · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Budget · slider · 40 · 66 percent. · Between 20 and 80. · Focus mode
tab 4   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   input[control]                                       leaving panel. · Volume · slider · 30 · 30 percent. · Nothing is formatted, so nothing is written. · Focus mode
tab 8   input[control]                                       Discount · slider · 15 % · 0 percent.
tab 9   input[control]                                       Size · slider · Medium · 50 percent.
tab 10  input[control]                                       Read-only — focusable, but not movable · slider · 70 · 70 percent.
tab 11  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/switch`

```
arrive  a "Switch"                                           leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Switch · visited link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Backups · switch not pressed. · Runs every night at 03:00.
tab 4   —                                                    Theme · panel · light · selected radio button. · alert. · Backups have to stay on
```

### `/select`

```
arrive  a "Select"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Select · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button[trigger] "Sélectionner…"                      leaving panel. · Country · combo box. · A list with a panel of its own (CDK Overlay) · opens listbox · Focus mode
tab 4   button[trigger] "Polish"                             field (the default) · combo box. · opens listbox
tab 5   button[trigger] "Polish"                             auto — out to the longest option · combo box. · opens listbox
tab 6   button[trigger] "Polish"                             320px, aligned to the end · combo box. · opens listbox
tab 7   button[trigger] "Sélectionner…"                      Country (in the dark theme) · combo box. · opens listbox
tab 8   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  button[trigger] "Poland"                             leaving panel. · Country · combo box. · opens listbox · Focus mode
tab 12  button[trigger] "Sélectionner…"                      Country (nothing to pick) · combo box. · opens listbox
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/dialog`

```
arrive  a "Dialog"                                           leaving main content. · navigation · Sandbox views · List with 30 items · Dialog · visited link. · Browse mode
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
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Sections"                                    leaving panel. · Sections · collapsed button. · Focus mode
tab 4   button "Sections, from further down"                 Sections, from further down · collapsed button.
tab 5   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   button "From the end edge"                           leaving panel. · From the end edge · collapsed button. · Focus mode
tab 9   button "From the bottom"                             From the bottom · collapsed button.
tab 10  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/accordion`

```
arrive  a "Accordion"                                        leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Accordion · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   summary[heading] "Shipping"                          leaving panel. · Shipping · expanded button. · Focus mode
tab 4   summary[heading] "Payment"                           Payment · collapsed button.
tab 5   summary[heading] "Returns"                           Returns · collapsed button.
tab 6   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   summary[heading] "First"                             leaving panel. · First · collapsed button. · Focus mode
tab 10  summary[heading] "Second"                            Second · collapsed button.
tab 11  summary[heading] "Third"                             Third · collapsed button.
tab 12  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/tabs`

```
arrive  a "Tabs"                                             leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Tabs · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button[tab] "General"                                General · page tab. · Focus mode
tab 4   pct-tab[panel] "The general settings, and a word that…" General · scroll pane clickable. · Browse mode
tab 5   pct-tab[panel]                                       Network · scroll pane clickable.
tab 6   input[control]                                       Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   button[tab] "Overview"                               Overview · page tab. · Focus mode
tab 10  pct-tab[panel] "A summary nobody had to fetch."      Overview · scroll pane clickable. · Browse mode
tab 11  pct-tab[panel]                                       Details · scroll pane clickable.
tab 12  input[control]                                       Theme · panel · light · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/toast`

```
arrive  a "Toast"                                            leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Toast · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Save the draft"                              leaving panel. · Save the draft · button.
tab 4   button "Copy (a shorter clock)"                      Copy (a shorter clock) · button.
tab 5   button "Report something that waits"                 Report something that waits · button.
tab 6   button "Clear the stack"                             Clear the stack · button.
tab 7   input[control]                                       Theme · panel · light · selected radio button.
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  button "Fail to save"                                leaving panel. · Fail to save · button.
tab 11  input[control]                                       Theme · panel · light · selected radio button.
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/pagination`

```
arrive  a "Pagination"                                       leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Pagination · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button[page] "1"                                     leaving panel. · navigation · Pagination · List with 5 items · 1 · button. · (Current page)
tab 4   button[page] "2"                                     2 · button.
tab 5   button[page] "3"                                     3 · button.
tab 6   button[next] "Next page"                             Next page · button.
tab 7   input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  button[previous] "Previous page"                     leaving panel. · navigation · Pagination · List with 9 items · Previous page · button.
tab 11  button[page] "1"                                     1 · button.
tab 12  button[page] "6"                                     6 · button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/progress`

```
arrive  a "Progress"                                         leaving list. · leaving navigation. · leaving main content. · navigation · Sandbox views · List with 30 items · Progress · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "−10"                                         leaving panel. · −10 · button.
tab 4   button "+10"                                         +10 · button.
tab 5   input[control]                                       Theme · panel · light · selected radio button.
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/skeleton`

```
arrive  a "Skeleton"                                         leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Skeleton · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "The content arrives"                         leaving panel. · The content arrives · button.
tab 4   input[control]                                       Theme · panel · light · selected radio button.
tab 5   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 6   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 7   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/chips`

```
arrive  a "Chips"                                            leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Chips · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button[remove] "Remove"                              leaving panel. · Active filters · List with 5 items · Remove · button.
tab 4   button[remove] "Remove"                              Remove · button.
tab 5   button[remove] "Remove"                              Remove · button.
tab 6   button[remove] "Remove"                              Remove · button.
tab 7   button[remove] "Remove"                              Remove · button.
tab 8   button "Restore everything"                          leaving list. · Restore everything · button.
tab 9   input[control]                                       Theme · panel · light · selected radio button.
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  button[remove] "Remove"                              leaving panel. · Statuses · List with 3 items · Remove · button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/avatar`

```
arrive  a "Avatar"                                           leaving list. · leaving main content. · navigation · Sandbox views · List with 30 items · Avatar · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   button "Swap the source"                             leaving panel. · Swap the source · button.
tab 7   input[control]                                       Theme · panel · light · selected radio button.
tab 8   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 9   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 10  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 11  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 12  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/badge`

```
arrive  a "Badge"                                            leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Badge · visited link.
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
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   a "Home"                                             leaving panel. · navigation · Breadcrumb · List with 3 items · Home · link.
tab 4   a "Library"                                          Library · link.
tab 5   a "Data"                                             Data · link. · (Current page)
tab 6   input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   a "Reports"                                          leaving panel. · navigation · Reports trail · List with 3 items · Reports · link.
tab 10  a "Finance"                                          Finance · link.
tab 11  input[control]                                       leaving list. · leaving navigation. · Theme · panel · light · selected radio button.
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/hero`

```
arrive  a "Hero"                                             leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Hero · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   a "Under attention"                                  leaving panel. · Under attention The rim is drawn and hidden, so the reveal is an opacity. · visited link.
tab 7   a "Read the case"                                    Read the case · visited link.
tab 8   input[control]                                       Theme · panel · light · selected radio button.
tab 9   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 10  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 11  input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 12  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/stepper`

```
arrive  a "Stepper"                                          leaving panel. · leaving main content. · navigation · Sandbox views · List with 30 items · Stepper · visited link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Back"                                        leaving panel. · Back · button.
tab 4   button "Next"                                        Next · button.
tab 5   input[control]                                       Theme · panel · light · selected radio button.
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   input[control]                                       Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/tree`

```
arrive  a "Tree"                                             navigation · Sandbox views · List with 30 items · Tree · visited link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   pct-tree-item "README.md"                            leaving panel. · README.md. · tree level 1 · Focus mode
tab 4   pct-tree-item "README.md"                            Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
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
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/size`

```
arrive  a "Size"                                             leaving panel. · leaving main content. · navigation · Sandbox views · List with 6 items · Size · link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input                                                leaving panel. · Field sm · entry · Text sm · selected. · Focus mode
tab 2   button "Button sm"                                   Button sm · button. · Browse mode
tab 3   button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
tab 4   input                                                Field md · entry · Text md · selected.
tab 5   button "Button md"                                   Button md · button. · Browse mode
tab 6   button[trigger] "Poland"                             List md · combo box. · opens listbox · Focus mode
tab 7   input                                                Field lg · entry · Text lg · selected.
tab 8   button "Button lg"                                   Button lg · button. · Browse mode
tab 9   button[trigger] "Poland"                             List lg · combo box. · opens listbox · Focus mode
tab 10  input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 11  input                                                leaving panel. · leaving panel. · Number sm · spin button · 1 499,9. · Focus mode
tab 12  input[control]                                       Date sm · entry · 27/08/2026 · selected.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/density`

```
arrive  a "Density"                                          leaving main content. · navigation · Sandbox views · List with 6 items · Density · link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input                                                leaving panel. · Field sm · entry · Text sm · selected. · Focus mode
tab 2   button "Button sm"                                   Button sm · button. · Browse mode
tab 3   button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
tab 4   input                                                Field md · entry · Text md · selected.
tab 5   button "Button md"                                   Button md · button. · Browse mode
tab 6   button[trigger] "Poland"                             List md · combo box. · opens listbox · Focus mode
tab 7   input                                                Field lg · entry · Text lg · selected.
tab 8   button "Button lg"                                   Button lg · button. · Browse mode
tab 9   button[trigger] "Poland"                             List lg · combo box. · opens listbox · Focus mode
tab 10  input                                                Field sm · entry · Text sm · selected.
tab 11  button "Button sm"                                   Button sm · button. · Browse mode
tab 12  button[trigger] "Poland"                             List sm · combo box. · opens listbox · Focus mode
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/states`

```
arrive  a "States"                                           leaving main content. · navigation · Sandbox views · List with 6 items · States · link. · Browse mode
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input                                                leaving panel. · Text · entry · Text · selected. · Focus mode
tab 3   input                                                Number · spin button · 1 499,9.
tab 4   button[trigger] "Poland"                             List · combo box. · opens listbox
tab 5   input[control]                                       Consent · check box checked. · Browse mode
tab 6   input[control]                                       Plan · panel · A · selected radio button.
tab 7   input[control]                                       leaving panel. · Backups · switch pressed.
tab 8   input[control]                                       Budget · slider · 40 · 40 percent. · Focus mode
tab 9   input[control]                                       Starts on · entry · 27/08/2026 · selected.
tab 10  button[toggle] "Choisir une date"                    Choisir une date · collapsed button. · opens dialog
tab 11  button "Button"                                      Button · button. · Browse mode
tab 12  input[control]                                       Theme · panel · light · selected radio button.
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/announce`

```
arrive  a "Live regions"                                     leaving panel. · leaving main content. · navigation · Sandbox views · List with 6 items · Live regions · visited link.
enter   input[control]                                       Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Announce politely"                           leaving panel. · Announce politely · button.
tab 4   button "Interrupt"                                   Interrupt · button.
tab 5   button "Interrupt"                                   Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
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
tab 12  button "Button lg"                                   Button lg · button. · Browse mode
```

The cap bit here: 12 stops read inside `main`, and the view has more.
