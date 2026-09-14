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
- Firefox 151.0 (the Playwright build), driven on Xvfb at 1280×900, no window manager
- 250 steps over 36 views, at most 12 tab stops each

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the load, `enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 92 of 250 here. 10 view(s) hit the cap, and each says so.

**This reading is incomplete, and here is where.** 19 of the 36 views
produced no speech at all: `/button`, `/textarea`, `/date`, `/radio`, `/slider`, `/dialog`, `/popover`, `/drawer`, `/tabs`, `/pagination`, `/skeleton`, `/avatar`, `/breadcrumb`, `/stepper`, `/layout`, `/size`, `/density`, `/states`, `/all`. The cause is
in the harness and not in the library — the reader loses the accessible document on some
navigations (`WEB: Could not get document for event source` in its own log) and the page's
focus does not hold on a virtual display with no window manager running. Those views are
**unread**, which is a different thing from read and found silent, and nothing below should
be quoted as evidence about them.

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
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/field`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Field · @pacit/components. · Page has 3 landmarks, 9 headings, 3 visited links, 33 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
tab 3   input                                                (silence)
tab 4   —                                                    main content · alert. · The e-mail address is required
```

### `/text`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Text · @pacit/components. · Page has 3 landmarks, 7 headings, 4 visited links, 32 unvisited links.
enter   input[control]                                       main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Textarea · @pacit/components · document web · Finished loading Textarea · @pacit/components. · Page has 3 landmarks, 8 headings, 5 visited links, 31 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/number`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Number · @pacit/components. · Page has 3 landmarks, 6 headings, 6 visited links, 30 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
tab 3   input                                                (silence)
tab 4   button[field-suffix-item] "Clear the price"          (silence)
tab 5   input[control]                                       (silence)
tab 6   input[control]                                       (silence)
tab 7   input[control]                                       (silence)
tab 8   input                                                (silence)
tab 9   input                                                Firefox View · toggle button not pressed. · View recent browsing across windows and devices.
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  —                                                    Loading.  Please wait. · Date · @pacit/components · document web · Browse mode · Finished loading Date · @pacit/components. · Page has 3 landmarks, 9 headings, 1 table, 7 visited links, 29 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/checkbox`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Checkbox · @pacit/components. · Page has 3 landmarks, 6 headings, 8 visited links, 28 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       main content · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Consents · check box not checked required. · invalid entry. · Required to open an account.
tab 4   —                                                    Theme · panel · light · selected radio button. · alert. · You have to accept the terms
```

### `/radio`

```
arrive  —                                                    Loading.  Please wait. · Radio · @pacit/components · document web · Finished loading Radio · @pacit/components. · Page has 3 landmarks, 6 headings, 9 visited links, 27 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/slider`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Slider · @pacit/components. · Page has 3 landmarks, 7 headings, 10 visited links, 26 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
tab 3   input[control]                                       (silence)
tab 4   input[control]                                       (silence)
tab 5   input[control]                                       (silence)
tab 6   input[control]                                       (silence)
tab 7   input[control]                                       (silence)
tab 8   input[control]                                       (silence)
tab 9   input[control]                                       (silence)
tab 10  input[control]                                       (silence)
tab 11  input[control]                                       (silence)
tab 12  input[control]                                       (silence)
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/switch`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Switch · @pacit/components. · Page has 3 landmarks, 6 headings, 11 visited links, 25 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       (silence)
tab 3   input[control]                                       (silence)
tab 4   —                                                    alert. · Backups have to stay on
```

### `/select`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Select · @pacit/components. · Page has 3 landmarks, 17 headings, 12 visited links, 24 unvisited links.
enter   input[control]                                       main content · Theme · panel · light · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · Dialog · @pacit/components · document web · Browse mode · Finished loading Dialog · @pacit/components. · Page has 3 landmarks, 9 headings, 13 visited links, 23 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/tooltip`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Tooltip · @pacit/components. · Page has 3 landmarks, 9 headings, 14 visited links, 22 unvisited links.
enter   button "Delete the project"                          (silence)
tab 1   button "Publish"                                     main content · A name · heading 3 · Publish · button. · Runs every check before publishing.
tab 2   button "Approve the release"                         Approve the release · button.
tab 3   button "Close the panel"                             Close the panel · button.
tab 4   button "start"                                       start · button. · On the starting side.
tab 5   button "top"                                         top · button. · Above the control.
tab 6   button "bottom"                                      bottom · button. · Below the control.
tab 7   button "end"                                         end · button. · On the ending side.
tab 8   input                                                Release note · entry. · Shown in the changelog Markdown is allowed here. · Focus mode
tab 9   button "Hover me"                                    Hover me · button. · This one can be taken away. · Browse mode
tab 10  button "Take it away"                                Take it away · button.
tab 11  button "Take it away"                                Browser tabs · tool bar.
```

Tab moved nothing — focus had left the page.

### `/popover`

```
arrive  —                                                    Popover · @pacit/components · document web · Browse mode · Finished loading Popover · @pacit/components. · Page has 3 landmarks, 7 headings, 15 visited links, 21 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/menu`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Menu · @pacit/components. · Page has 3 landmarks, 7 headings, 16 visited links, 20 unvisited links.
enter   button "Actions"                                     (silence)
tab 1   button "Count up"                                    main content · Count: 0. · Count up · button.
tab 2   button "File"                                        File · collapsed button. · opens menu · Focus mode
tab 3   button "Language"                                    Language · collapsed button. · opens menu
tab 4   button "Language"                                    (silence)
```

Tab moved nothing — focus had left the page.

### `/drawer`

```
arrive  —                                                    Loading.  Please wait. · Drawer · @pacit/components · document web · Browse mode · Finished loading Drawer · @pacit/components. · Page has 7 landmarks, 7 headings, 17 visited links, 19 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/accordion`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Accordion · @pacit/components. · Page has 3 landmarks, 19 headings, 18 visited links, 18 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       main content · Direction · panel · ltr · selected radio button.
tab 3   summary[heading] "Shipping"                          leaving panel. · Shipping · expanded button. · Focus mode
tab 4   summary[heading] "Payment"                           Payment · collapsed button.
```

Tab moved nothing — focus had left the page.

### `/tabs`

```
arrive  —                                                    Loading.  Please wait. · Tabs · @pacit/components · document web · Browse mode · Finished loading Tabs · @pacit/components. · Page has 3 landmarks, 10 headings, 19 visited links, 17 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/toast`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Toast · @pacit/components. · Page has 3 landmarks, 9 headings, 20 visited links, 16 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       main content · Direction · panel · ltr · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Pagination · @pacit/components · document web · Finished loading Pagination · @pacit/components. · Page has 12 landmarks, 10 headings, 21 visited links, 15 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/progress`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Progress · @pacit/components. · Page has 3 landmarks, 11 headings, 22 visited links, 14 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       main content · Direction · panel · ltr · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Skeleton · @pacit/components · document web · Finished loading Skeleton · @pacit/components. · Page has 3 landmarks, 9 headings, 23 visited links, 13 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/chips`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Chips · @pacit/components. · Page has 3 landmarks, 8 headings, 24 visited links, 12 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       (silence)
tab 2   input[control]                                       main content · Direction · panel · ltr · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving list. · Avatar · @pacit/components · document web · Finished loading Avatar · @pacit/components. · Page has 3 landmarks, 9 headings, 25 visited links, 11 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/badge`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Badge · @pacit/components. · Page has 3 landmarks, 9 headings, 26 visited links, 10 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       main content · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 4   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 5   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 6   input[control]                                       leaving panel. · Theme · panel · light · selected radio button.
tab 7   input[control]                                       leaving panel. · Size · panel · md · selected radio button.
tab 8   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 9   input[control]                                       (silence)
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  —                                                    Loading.  Please wait. · leaving panel. · Breadcrumb · @pacit/components · document web · Finished loading Breadcrumb · @pacit/components. · Page has 6 landmarks, 7 headings, 27 visited links, 19 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/hero`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Hero · @pacit/components. · Page has 3 landmarks, 15 headings, 30 visited links, 8 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       main content · Size · panel · md · selected radio button.
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
arrive  —                                                    Loading.  Please wait. · leaving panel. · Stepper · @pacit/components · document web · Finished loading Stepper · @pacit/components. · Page has 3 landmarks, 6 headings, 29 visited links, 7 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/tree`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Tree · @pacit/components. · Page has 3 landmarks, 5 headings, 30 visited links, 6 unvisited links.
enter   input[control]                                       (silence)
tab 1   input[control]                                       main content · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   pct-tree-item "README.md"                            leaving panel. · README.md. · tree level 1 · Focus mode
tab 4   pct-tree-item "README.md"                            (silence)
```

Tab moved nothing — focus had left the page.

### `/layout`

```
arrive  —                                                    Loading.  Please wait. · Layout · @pacit/components · document web · Browse mode · Finished loading Layout · @pacit/components. · Page has 3 landmarks, 9 headings, 31 visited links, 5 unvisited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/size`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Size · @pacit/components. · Page has 3 landmarks, 7 headings, 32 visited links, 4 unvisited links.
enter   input[control]                                       (silence)
tab 1   input                                                (silence)
tab 2   button "Button sm"                                   (silence)
tab 3   button[trigger] "Poland"                             (silence)
tab 4   input                                                (silence)
tab 5   button "Button md"                                   (silence)
tab 6   button[trigger] "Poland"                             (silence)
tab 7   input                                                (silence)
tab 8   button "Button lg"                                   (silence)
tab 9   button[trigger] "Poland"                             (silence)
tab 10  input[control]                                       (silence)
tab 11  input                                                (silence)
tab 12  input[control]                                       (silence)
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/density`

```
arrive  —                                                    Loading.  Please wait. · Finished loading Density · @pacit/components. · Page has 4 landmarks, 8 headings, 33 visited links, 3 unvisited links.
enter   input[control]                                       (silence)
tab 1   input                                                (silence)
tab 2   button "Button sm"                                   (silence)
tab 3   button[trigger] "Poland"                             (silence)
tab 4   input                                                (silence)
tab 5   button "Button md"                                   (silence)
tab 6   button[trigger] "Poland"                             (silence)
tab 7   input                                                (silence)
tab 8   button "Button lg"                                   (silence)
tab 9   button[trigger] "Poland"                             (silence)
tab 10  input                                                (silence)
tab 11  button "Button sm"                                   (silence)
tab 12  button[trigger] "Poland"                             (silence)
```

The cap bit here: 12 stops read inside `main`, and the view has more.

### `/states`

```
arrive  —                                                    Loading.  Please wait. · Finished loading States · @pacit/components. · Page has 3 landmarks, 10 headings, 34 visited links, 2 unvisited links. · Browse mode
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.

### `/announce`

```
arrive  —                                                    Finished loading Live regions · @pacit/components. · Page has 3 landmarks, 5 headings, 35 visited links, 1 unvisited link.
enter   input[control]                                       (silence)
tab 1   input[control]                                       main content · Size · panel · md · selected radio button.
tab 2   input[control]                                       leaving panel. · Direction · panel · ltr · selected radio button.
tab 3   button "Announce politely"                           leaving panel. · Announce politely · button.
tab 4   button "Interrupt"                                   Interrupt · button.
tab 5   button "Interrupt"                                   (silence)
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  —                                                    Loading.  Please wait. · Everything at once · @pacit/components · document web · Finished loading Everything at once · @pacit/components. · Page has 3 landmarks, 9 headings, 36 visited links.
enter   —                                                    (silence)
```

no stop of its own inside `main` — nothing to walk here.
