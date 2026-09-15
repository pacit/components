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
- 277 steps over 36 views, at most 12 tab stops each

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the load, `enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 54 of 277 here. 11 view(s) hit the cap, and each says so.

**This reading is incomplete, and here is where.** 18 of the 36 views
produced no speech at all: `/button`, `/text`, `/number`, `/checkbox`, `/slider`, `/select`, `/tooltip`, `/menu`, `/accordion`, `/toast`, `/progress`, `/chips`, `/badge`, `/hero`, `/tree`, `/size`, `/states`, `/all`. Those views are
**unread**, which is a different thing from read and found silent, and nothing below should
be quoted as evidence about them.

What this pass can say about that set is where it SITS, and it is not a statement about the
components it names: they are views 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36 of the walk, every other one in an unbroken run — a phase of the pass, which the next pass can
name the other half of. No cause is written here, because none was measured; the stack it was taken on is above.

### `/`

```
arrive  —                                                    Nightly · Finished loading Start · @pacit/components.
enter   a "Button"                                           main content · List with 30 items · The variants, sizes and states of the button. · link. · Browse mode · Button The variants, sizes and states of the button. · link.
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
arrive  —                                                    Loading.  Please wait. · leaving list. · Button · @pacit/components · document web · Finished loading Button · @pacit/components. · Page has 3 landmarks, 11 headings, 2 visited links, 37 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/field`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Field · @pacit/components. · Page has 3 landmarks, 9 headings, 3 visited links, 33 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input                                                leaving panel. · E-mail · entry · john@example.com · required. · invalid entry. · A work address. · Focus mode
tab 4   —                                                    Theme · panel · light · selected radio button. · Browse mode · alert. · The e-mail address is required
```

### `/text`

```
arrive  —                                                    Loading.  Please wait. · Text · @pacit/components · document web · Finished loading Text · @pacit/components. · Page has 3 landmarks, 7 headings, 4 visited links, 32 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/textarea`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Textarea · @pacit/components. · Page has 3 landmarks, 8 headings, 5 visited links, 31 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   textarea                                             leaving panel. · About you · entry · A few words… · Type — the box follows. · Focus mode
tab 4   textarea                                             A plain textarea, for comparison · entry · This one keeps its two lines and scrolls.
tab 5   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 6   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 7   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 8   textarea                                             leaving panel. · Note · entry · Focus mode
tab 9   input[control]                                       Theme · panel · light · selected radio button. · Browse mode
tab 10  input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 11  input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 12  textarea                                             leaving panel. · Comment · entry. · Grows to four lines, then scrolls. · Focus mode
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/number`

```
arrive  —                                                    Loading.  Please wait. · Number · @pacit/components · document web · Browse mode · Finished loading Number · @pacit/components. · Page has 3 landmarks, 6 headings, 6 visited links, 30 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/date`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Date · @pacit/components. · Page has 3 landmarks, 9 headings, 1 table, 7 visited links, 29 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Checkbox · @pacit/components · document web · Finished loading Checkbox · @pacit/components. · Page has 3 landmarks, 6 headings, 8 visited links, 28 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/radio`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Radio · @pacit/components. · Page has 3 landmarks, 6 headings, 9 visited links, 27 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Plan · panel · Free · not selected radio button.
tab 4   —                                                    leaving panel. · Theme · panel · light · selected radio button. · alert. · Pick a plan
```

### `/slider`

```
arrive  —                                                    Loading.  Please wait. · Slider · @pacit/components · document web · Finished loading Slider · @pacit/components. · Page has 3 landmarks, 7 headings, 10 visited links, 26 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/switch`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Switch · @pacit/components. · Page has 3 landmarks, 6 headings, 11 visited links, 25 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Backups · switch not pressed. · Runs every night at 03:00.
tab 4   —                                                    Theme · panel · light · selected radio button. · alert. · Backups have to stay on
```

### `/select`

```
arrive  —                                                    Loading.  Please wait. · Select · @pacit/components · document web · Finished loading Select · @pacit/components. · Page has 3 landmarks, 17 headings, 12 visited links, 24 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/dialog`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Dialog · @pacit/components. · Page has 3 landmarks, 9 headings, 13 visited links, 23 unvisited links.
enter   button "Open the dialog"                             leaving panel. · main content · last close: · Open the dialog · button.
tab 1   button "Delete the project"                          Delete the project · button.
tab 2   button "Open the insistent one"                      Open the insistent one · button.
tab 3   button "Open a form dialog"                          Open a form dialog · button.
tab 4   button "Open a long one"                             Open a long one · button.
tab 5   button "Open a long one"                             Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/tooltip`

```
arrive  —                                                    Loading.  Please wait. · Tooltip · @pacit/components · document web · Browse mode · Finished loading Tooltip · @pacit/components. · Page has 3 landmarks, 9 headings, 14 visited links, 22 unvisited links.
enter   button "Delete the project"                          (silence)
tab 1   button "Publish"                                     (silence)
tab 2   input[control]                                       (silence)
```

### `/popover`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Popover · @pacit/components. · Page has 3 landmarks, 7 headings, 15 visited links, 21 unvisited links.
enter   button "Filters"                                     leaving panel. · main content · Owner: — · Filters · collapsed button. · opens dialog · Focus mode
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
arrive  —                                                    Loading.  Please wait. · Menu · @pacit/components · document web · Browse mode · Finished loading Menu · @pacit/components. · Page has 3 landmarks, 7 headings, 16 visited links, 20 unvisited links.
enter   button "Actions"                                     (silence)
tab 1   button "Count up"                                    (silence)
tab 2   input[control]                                       (silence)
```

### `/drawer`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Drawer · @pacit/components. · Page has 7 landmarks, 7 headings, 17 visited links, 19 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Accordion · @pacit/components · document web · Finished loading Accordion · @pacit/components. · Page has 3 landmarks, 19 headings, 18 visited links, 18 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/tabs`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Tabs · @pacit/components. · Page has 3 landmarks, 10 headings, 19 visited links, 17 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Toast · @pacit/components · document web · Finished loading Toast · @pacit/components. · Page has 3 landmarks, 9 headings, 20 visited links, 16 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/pagination`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Pagination · @pacit/components. · Page has 12 landmarks, 10 headings, 21 visited links, 15 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving list. · Progress · @pacit/components · document web · Finished loading Progress · @pacit/components. · Page has 3 landmarks, 11 headings, 22 visited links, 14 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/skeleton`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Skeleton · @pacit/components. · Page has 3 landmarks, 9 headings, 23 visited links, 13 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Chips · @pacit/components · document web · Finished loading Chips · @pacit/components. · Page has 3 landmarks, 8 headings, 24 visited links, 12 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/avatar`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Avatar · @pacit/components. · Page has 3 landmarks, 9 headings, 25 visited links, 11 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Badge · @pacit/components · document web · Finished loading Badge · @pacit/components. · Page has 3 landmarks, 9 headings, 26 visited links, 10 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/breadcrumb`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Breadcrumb · @pacit/components. · Page has 6 landmarks, 7 headings, 27 visited links, 19 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Hero · @pacit/components · document web · Finished loading Hero · @pacit/components. · Page has 3 landmarks, 15 headings, 30 visited links, 8 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/stepper`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Stepper · @pacit/components. · Page has 3 landmarks, 6 headings, 29 visited links, 7 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · Tree · @pacit/components · document web · Browse mode · Finished loading Tree · @pacit/components. · Page has 3 landmarks, 5 headings, 30 visited links, 6 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/layout`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Layout · @pacit/components. · Page has 3 landmarks, 9 headings, 31 visited links, 5 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Size · @pacit/components · document web · Finished loading Size · @pacit/components. · Page has 3 landmarks, 7 headings, 32 visited links, 4 unvisited links.
enter   input[control]                                       (silence)
tab 1   input                                                (silence)
tab 2   input[control]                                       (silence)
```

### `/density`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Density · @pacit/components. · Page has 4 landmarks, 8 headings, 33 visited links, 3 unvisited links.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · States · @pacit/components · document web · Browse mode · Finished loading States · @pacit/components. · Page has 3 landmarks, 10 headings, 34 visited links, 2 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
```

### `/announce`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Live regions · @pacit/components. · Page has 3 landmarks, 5 headings, 35 visited links, 1 unvisited link.
enter   input[control]                                       leaving panel. · main content · Theme · panel · light · selected radio button.
tab 1   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Announce politely"                           leaving panel. · Announce politely · button.
tab 4   button "Interrupt"                                   Interrupt · button.
tab 5   button "Interrupt"                                   Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  —                                                    Loading.  Please wait. · Everything at once · @pacit/components · document web · Browse mode · Finished loading Everything at once · @pacit/components. · Page has 3 landmarks, 9 headings, 36 visited links.
enter   button "Solid"                                       (silence)
tab 1   button "Outline"                                     (silence)
tab 2   input[control]                                       (silence)
```
