# NVDA with Firefox on Windows — assistive-technology log

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

- NVDA with Firefox on Windows
- 523 steps over 36 views, at most 12 stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. `arrive` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
`enter` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves `main`. `(silence)` is a stop the reader said nothing
at — 38 of 523 here. 10 view(s) hit the cap, and each says so.

**A phrase repeated at one stop is written once.** This reader's log handed back 311906
phrases, and 1864 of them are distinct within their own stop; the rest are the same
sequence read again, cycled rather than repeated, which is the poller and not the reader. The
cost of the rule is stated rather than hidden: a reader that truly said one thing twice at one
stop is recorded here saying it once.

**Every view spoke.** No view of the 36 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
10 view(s) have more stops than the 12 taken, and each says so where it bit.

### `/`

```
arrive  a "Start"                                            out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   a "Home"                                             (silence)
tab 1   a "Library"                                          Library, link
tab 2   a "Data"                                             Data, link, current page
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   a "Reports"                                          Reports trail, navigation landmark, list, with 3 items, Reports, link
tab 7   a "Finance"                                          Finance, link
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  a "Organisation"                                     Deep trail, navigation landmark, list, with 5 items, Organisation, link
tab 12  a "Departments"                                      Departments, link
tab 13  a "Engineering"                                      Engineering, link
tab 14  a "Platform"                                         Platform, link
tab 15  a "Observability"                                    Observability, link, current page
tab 16  a "Observability"                                    Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/button`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button "Solid"                                       (silence)
tab 1   button "Outline"                                     Outline, button
tab 2   button "Ghost"                                       Ghost, button
tab 3   button "Soft"                                        Soft, button
tab 4   button "Hero"                                        Hero, button
tab 5   input[control]                                       Theme, grouping
tab 6   button "Small"                                       Small, button
tab 7   button "Medium"                                      Medium, button
tab 8   button "Large"                                       Large, button
tab 9   input[control]                                       Theme, grouping
tab 10  input[control]                                       Size, grouping
tab 11  input[control]                                       Direction, grouping
tab 12  input[control]                                       Theme, grouping
tab 13  input[control]                                       Size, grouping
tab 14  input[control]                                       Direction, grouping
tab 15  a "Get started"                                      Get started, link
tab 16  a "Hero link"                                        Hero link, link
tab 17  a "Disabled link"                                    Disabled link, unavailable, link
tab 18  button "Get started"                                 Get started, button
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/field`

```
arrive  input                                                out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank
enter   input                                                (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   button[field-label-aux-item] "The description appears on your profile" The description appears on your profile, button
tab 5   input                                                A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank
tab 6   input[control]                                       Theme, grouping
tab 7   input[control]                                       Size, grouping
tab 8   input[control]                                       Direction, grouping
tab 9   input                                                Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90
tab 10  button[field-suffix-item] "Clear the price"          Clear the price, button
tab 11  input                                                Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank
tab 12  button[field-suffix-item] "Search"                   Search, button
tab 13  input[control]                                       Theme, grouping
tab 14  input[control]                                       Size, grouping
tab 15  input[control]                                       Direction, grouping
tab 16  button[trigger] "Sélectionner…"                      Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list
tab 17  input                                                Read-only, edit, read only, selected preview only
tab 18  input[control]                                       Theme, grouping
tab 19  input[control]                                       Size, grouping
tab 20  input[control]                                       Direction, grouping
tab 21  input[control]                                       Consents, check box, not checked, Required to open an account
tab 22  input[control]                                       Plan, grouping
tab 23  input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/text`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping
enter   input                                                (silence)
tab 1   input                                                E-mail, edit, has auto complete, john at example dot com, blank
tab 2   input                                                Password, edit, protected, blank
tab 3   input                                                Search, edit, has auto complete, Search..., blank
tab 4   input[control]                                       Theme, grouping
tab 5   input[control]                                       Size, grouping
tab 6   input[control]                                       Direction, grouping
tab 7   input                                                Read-only, edit, read only, selected preview only
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  input                                                Reactive forms ( form Control ), edit, has auto complete, selected Ada
tab 12  input                                                Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace
tab 13  input                                                Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/textarea`

```
arrive  textarea                                             out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace
enter   textarea                                             (silence)
tab 1   textarea                                             A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   textarea                                             Note, edit, multi line, asks for.
tab 6   input[control]                                       Theme, grouping
tab 7   input[control]                                       Size, grouping
tab 8   input[control]                                       Direction, grouping
tab 9   textarea                                             Comment, edit, multi line, Grows to four lines, then scrolls., blank
tab 10  input[control]                                       Theme, grouping
tab 11  input[control]                                       Size, grouping
tab 12  input[control]                                       Direction, grouping
tab 13  textarea                                             Old forms, edit, multi line, blank
tab 14  button "patchValue three lines"                      patch Value three lines, button
tab 15  button "patchValue empty"                            patch Value empty, button
tab 16  button "patchValue empty"                            Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/number`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button
enter   input                                                (silence)
tab 1   button[field-suffix-item] "Clear the price"          Clear the price, button
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   input                                                Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1
tab 6   input                                                Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1
enter   input[control]                                       (silence)
tab 1   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   input[control]                                       Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026
tab 6   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 7   input[control]                                       Theme, grouping
tab 8   input[control]                                       Size, grouping
tab 9   input[control]                                       Direction, grouping
tab 10  input[control]                                       Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026
tab 11  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 12  input[control]                                       Theme, grouping
tab 13  input[control]                                       Size, grouping
tab 14  input[control]                                       Direction, grouping
tab 15  input[control]                                       Polish, edit, selected 27.08.2026
tab 16  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 17  input[control]                                       Japanese, edit, selected 2026 slash 08 slash 27
tab 18  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 19  input[control]                                       Theme, grouping
tab 20  input[control]                                       Size, grouping
tab 21  input[control]                                       Direction, grouping
tab 22  button[nav] "Mois précédent"                         Mois précédent, button
tab 23  button[nav] "Mois suivant"                           Mois suivant, button
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/checkbox`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       The indeterminate state, read as mixed, check box, half checked
tab 5   input[control]                                       Read-only — focusable, but not changeable, check box, checked
tab 6   input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/radio`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       Horizontal layout, grouping
tab 5   input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/slider`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Horizontal layout, grouping
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       Volume, slider, 30, Nothing is formatted, so nothing is written
tab 5   input[control]                                       Discount, slider, 15 percent
tab 6   input[control]                                       Size, slider, Medium
tab 7   input[control]                                       Read-only — focusable, but not movable, slider, 70
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  input[control]                                       Gain, slider, 60
tab 12  input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/switch`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Horizontal layout, grouping · Volume, slider, 30, Nothing is formatted, so nothing is written · Discount, slider, 15 percent · Size, slider, Medium · Read-only — focusable, but not movable, slider, 70 · Gain, slider, 60
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       Wi-Fi, switch, on, Turns off when you leave the house
tab 5   input[control]                                       Read-only — focusable, but not changeable, switch, on
tab 6   input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/select`

```
arrive  button[trigger] "Polish"                             out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Horizontal layout, grouping · Volume, slider, 30, Nothing is formatted, so nothing is written · Discount, slider, 15 percent · Size, slider, Medium · Read-only — focusable, but not movable, slider, 70 · Gain, slider, 60 · Wi-Fi, switch, on, Turns off when you leave the house · Read-only — focusable, but not changeable, switch, on
enter   button[trigger] "Sélectionner…"                      (silence)
tab 1   button[trigger] "Polish"                             field (the default), combo box, Polish, collapsed, opens list
tab 2   button[trigger] "Polish"                             auto — out to the longest option, combo box, Polish, collapsed, opens list
tab 3   button[trigger] "Polish"                             320px, aligned to the end, combo box, Polish, collapsed, opens list
tab 4   button[trigger] "Sélectionner…"                      Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list
tab 5   input[control]                                       Theme, grouping
tab 6   input[control]                                       Size, grouping
tab 7   input[control]                                       Direction, grouping
tab 8   button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
tab 9   button[trigger] "Sélectionner…"                      Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list
tab 10  button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
tab 11  button[trigger] "Poland, Slovakia"                   Countries, combo box, Poland, Slovakia, collapsed, opens list
tab 12  input[trigger]                                       Country, combo box, collapsed, has auto complete, editable, selected Lithuania
tab 13  input[trigger]                                       Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia
tab 14  button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/dialog`

```
arrive  button "Open the insistent one"                      out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Library, link · Data, link, current page · Theme, grouping · Size, grouping · Direction, grouping · Reports trail, navigation landmark, list, with 3 items, Reports, link · Finance, link · Deep trail, navigation landmark, list, with 5 items, Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Outline, button · Ghost, button · Soft, button · Hero, button · Small, button · Medium, button · Large, button · Get started, link · Hero link, link · Disabled link, unavailable, link · Get started, button · blank · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Consents, check box, not checked, Required to open an account · Plan, grouping · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Horizontal layout, grouping · Volume, slider, 30, Nothing is formatted, so nothing is written · Discount, slider, 15 percent · Size, slider, Medium · Read-only — focusable, but not movable, slider, 70 · Gain, slider, 60 · Wi-Fi, switch, on, Turns off when you leave the house · Read-only — focusable, but not changeable, switch, on · field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia
enter   button "Open the dialog"                             (silence)
tab 1   button "Delete the project"                          Delete the project, button
tab 2   button "Open the insistent one"                      Open the insistent one, button
tab 3   button "Open a form dialog"                          Open a form dialog, button
tab 4   button "Open a long one"                             Open a long one, button
tab 5   button "Open a long one"                             Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/tooltip`

```
arrive  button "Approve the release"                         (silence)
enter   button "Delete the project"                          (silence)
tab 1   button "Publish"                                     Publish, button, Runs every check before publishing
tab 2   button "Approve the release"                         Approve the release, button
tab 3   button "Close the panel"                             Close the panel, button
tab 4   button "start"                                       start, button, On the starting side
tab 5   button "top"                                         top, button, Above the control
tab 6   button "bottom"                                      bottom, button, Below the control
tab 7   button "end"                                         end, button, On the ending side
tab 8   input                                                Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank
tab 9   button "Hover me"                                    Hover me, button, This one can be taken away
tab 10  button "Take it away"                                Take it away, button
tab 11  button "Take it away"                                Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/popover`

```
arrive  button "start"                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar
enter   button "Filters"                                     (silence)
tab 1   button "start"                                       start, button, collapsed, opens dialog
tab 2   button "top"                                         top, button, collapsed, opens dialog
tab 3   button "bottom"                                      bottom, button, collapsed, opens dialog
tab 4   button "end"                                         end, button, collapsed, opens dialog
tab 5   button "Open the panel"                              Open the panel, button, collapsed, opens dialog
tab 6   button "Count up"                                    Count up, button
tab 7   button "Count up"                                    Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/menu`

```
arrive  button "File"                                        Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button
enter   button "Actions"                                     (silence)
tab 1   button "Count up"                                    Count up, button
tab 2   button "File"                                        File, button, collapsed, sub Menu
tab 3   button "Language"                                    Language, button, collapsed, sub Menu
tab 4   button "Language"                                    Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/drawer`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button "Sections"                                    (silence)
tab 1   button "Sections, from further down"                 Sections, from further down, button, collapsed
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   button "From the end edge"                           From the end edge, button, collapsed
tab 6   button "From the bottom"                             From the bottom, button, collapsed
tab 7   input[control]                                       Theme, grouping
tab 8   input[control]                                       Size, grouping
tab 9   input[control]                                       Direction, grouping
tab 10  button "Open the bare one"                           Open the bare one, button, collapsed
tab 11  button "Open the bare one"                           Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/accordion`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed
enter   summary[heading] "Shipping"                          (silence)
tab 1   summary[heading] "Payment"                           Payment, heading, level 3, button, collapsed
tab 2   summary[heading] "Returns"                           Returns, heading, level 3, button, collapsed
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   summary[heading] "First"                             First, heading, level 3, button, collapsed
tab 7   summary[heading] "Second"                            Second, heading, level 3, button, collapsed
tab 8   summary[heading] "Third"                             Third, heading, level 3, button, expanded
tab 9   input[control]                                       Theme, grouping
tab 10  input[control]                                       Size, grouping
tab 11  input[control]                                       Direction, grouping
tab 12  summary[heading] "Open to anyone"                    Open to anyone, heading, level 3, button, collapsed
tab 13  summary[heading] "Not yours to open"                 Not yours to open, heading, level 3, button, unavailable, collapsed
tab 14  input[control]                                       Theme, grouping
tab 15  input[control]                                       Size, grouping
tab 16  input[control]                                       Direction, grouping
tab 17  summary[heading] "An h4 section"                     An h 4 section, heading, level 4, button, collapsed
tab 18  input[control]                                       Theme, grouping
tab 19  input[control]                                       Size, grouping
tab 20  input[control]                                       Direction, grouping
tab 21  summary[heading] "More about this"                   More about this, heading, level 3, button, collapsed
tab 22  summary[heading] "More about this"                   Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/tabs`

```
arrive  pct-tab[panel]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button[tab] "General"                                (silence)
tab 1   pct-tab[panel] "The general settings, and a word that…" General, property page, The general settings, and a word that lives nowhere else on this page: marmalade.
tab 2   pct-tab[panel]                                       Network, property page
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   button[tab] "Overview"                               Report, tab control
tab 7   pct-tab[panel] "A summary nobody had to fetch."      Overview, property page, A summary nobody had to fetch.
tab 8   pct-tab[panel]                                       Details, property page
tab 9   input[control]                                       Theme, grouping
tab 10  input[control]                                       Size, grouping
tab 11  input[control]                                       Direction, grouping
tab 12  button[tab] "Profile"                                Profile, tab control
tab 13  pct-tab[panel] "Who you are."                        Profile, property page, Who you are.
tab 14  pct-tab[panel]                                       Keys, property page
tab 15  input[control]                                       Theme, grouping
tab 16  input[control]                                       Size, grouping
tab 17  input[control]                                       Direction, grouping
tab 18  button[tab] "Week"                                   Period, tab control
tab 19  pct-tab[panel]                                       Day, property page
tab 20  pct-tab[panel] "Seven days side by side."            Week, property page, Seven days side by side.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/toast`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side.
enter   button "Save the draft"                              (silence)
tab 1   button "Copy (a shorter clock)"                      Copy (a shorter clock), button
tab 2   button "Report something that waits"                 Report something that waits, button
tab 3   button "Clear the stack"                             Clear the stack, button
tab 4   input[control]                                       Theme, grouping
tab 5   input[control]                                       Size, grouping
tab 6   input[control]                                       Direction, grouping
tab 7   button "Fail to save"                                Fail to save, button
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  button "Success"                                     Success, button
tab 12  button "Warning"                                     Warning, button
tab 13  button "Danger"                                      Danger, button
tab 14  button "Info"                                        Info, button
tab 15  input[control]                                       Theme, grouping
tab 16  input[control]                                       Size, grouping
tab 17  input[control]                                       Direction, grouping
tab 18  button "Delete the message"                          Delete the message, button
tab 19  input[control]                                       Theme, grouping
tab 20  input[control]                                       Size, grouping
tab 21  input[control]                                       Direction, grouping
tab 22  button "Open the settings"                           Open the settings, button
tab 23  button "Open the settings"                           Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/pagination`

```
arrive  button[page] "1"                                     Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button
enter   button[page] "1"                                     (silence)
tab 1   button[page] "2"                                     2, button
tab 2   button[page] "3"                                     3, button
tab 3   button[next] "Next page"                             Next page, button
tab 4   input[control]                                       Theme, grouping
tab 5   input[control]                                       Size, grouping
tab 6   input[control]                                       Direction, grouping
tab 7   button[previous] "Previous page"                     Pagination, navigation landmark
tab 8   button[page] "1"                                     1, button
tab 9   button[page] "6"                                     6, button
tab 10  button[page] "7"                                     7, button, current page
tab 11  button[page] "8"                                     8, button
tab 12  button[page] "20"                                    20, button
tab 13  button[next] "Next page"                             Next page, button
tab 14  input[control]                                       Theme, grouping
tab 15  input[control]                                       Size, grouping
tab 16  input[control]                                       Direction, grouping
tab 17  button[page] "1"                                     Rows, navigation landmark
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/progress`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark
enter   button "−10"                                         (silence)
tab 1   button "+10"                                         plus 10, button
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   input[control]                                       Theme, grouping
tab 6   input[control]                                       Size, grouping
tab 7   input[control]                                       Direction, grouping
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  button "A number arrives"                            A number arrives, button
tab 12  input[control]                                       Theme, grouping
tab 13  input[control]                                       Size, grouping
tab 14  input[control]                                       Direction, grouping
tab 15  input[control]                                       Theme, grouping
tab 16  input[control]                                       Size, grouping
tab 17  input[control]                                       Direction, grouping
tab 18  input[control]                                       Theme, grouping
tab 19  input[control]                                       Size, grouping
tab 20  input[control]                                       Direction, grouping
tab 21  input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark · plus 10, button · A number arrives, button
enter   button "The content arrives"                         (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       Theme, grouping
tab 5   input[control]                                       Size, grouping
tab 6   input[control]                                       Direction, grouping
tab 7   input[control]                                       Theme, grouping
tab 8   input[control]                                       Size, grouping
tab 9   input[control]                                       Direction, grouping
tab 10  input[control]                                       Theme, grouping
tab 11  input[control]                                       Size, grouping
tab 12  input[control]                                       Direction, grouping
tab 13  button "Stop the sheen"                              Stop the sheen, button
tab 14  button "Stop the sheen"                              Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/chips`

```
arrive  button[remove] "Remove"                              Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark · plus 10, button · A number arrives, button · Stop the sheen, button
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove Under 50, button
tab 2   button[remove] "Remove"                              Remove Free shipping, button
tab 3   button[remove] "Remove"                              Remove New, button
tab 4   button[remove] "Remove"                              Remove Local, button
tab 5   button "Restore everything"                          Restore everything, button
tab 6   input[control]                                       Theme, grouping
tab 7   input[control]                                       Size, grouping
tab 8   input[control]                                       Direction, grouping
tab 9   button[remove] "Remove"                              Statuses, list
tab 10  button[remove] "Remove"                              Remove archived, button
tab 11  input[control]                                       Theme, grouping
tab 12  input[control]                                       Size, grouping
tab 13  input[control]                                       Direction, grouping
tab 14  button[remove] "Remove"                              People, list
tab 15  button[remove] "Remove"                              Remove Grace, button
tab 16  button[remove] "Remove"                              Remove Edsger, button
tab 17  input[control]                                       Theme, grouping
tab 18  input[control]                                       Size, grouping
tab 19  input[control]                                       Direction, grouping
tab 20  button[remove] "Remove"                              Small, list
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/avatar`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark · plus 10, button · A number arrives, button · Stop the sheen, button · Remove Under 50, button · Remove Free shipping, button · Remove New, button · Remove Local, button · Restore everything, button · Statuses, list · Remove archived, button · People, list · Remove Grace, button · Remove Edsger, button · Small, list
enter   button "Swap the source"                             (silence)
tab 1   input[control]                                       Theme, grouping
tab 2   input[control]                                       Size, grouping
tab 3   input[control]                                       Direction, grouping
tab 4   input[control]                                       Theme, grouping
tab 5   input[control]                                       Size, grouping
tab 6   input[control]                                       Direction, grouping
tab 7   button "A control of the same size"                  A control of the same size, button
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  button "Account: Ada Lovelace"                       Account: Ada Lovelace, button
tab 12  button "Account: Ada Lovelace"                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark · plus 10, button · A number arrives, button · Stop the sheen, button · Remove Under 50, button · Remove Free shipping, button · Remove New, button · Remove Local, button · Restore everything, button · Statuses, list · Remove archived, button · People, list · Remove Grace, button · Remove Edsger, button · Small, list · A control of the same size, button · Account: Ada Lovelace, button
enter   input[control]                                       (silence)
tab 1   input[control]                                       Size, grouping
tab 2   input[control]                                       Direction, grouping
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   input[control]                                       Theme, grouping
tab 7   input[control]                                       Size, grouping
tab 8   input[control]                                       Direction, grouping
tab 9   input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  input[control]                                       Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Sections, from further down, button, collapsed · Theme, grouping · Size, grouping · Direction, grouping · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control · Profile, property page, Who you are. · Keys, property page · Period, tab control · Day, property page · Week, property page, Seven days side by side. · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · 2, button · 3, button · Next page, button · Pagination, navigation landmark · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark · plus 10, button · A number arrives, button · Stop the sheen, button · Remove Under 50, button · Remove Free shipping, button · Remove New, button · Remove Local, button · Restore everything, button · Statuses, list · Remove archived, button · People, list · Remove Grace, button · Remove Edsger, button · Small, list · A control of the same size, button · Account: Ada Lovelace, button
enter   a "Home"                                             (silence)
tab 1   a "Library"                                          Library, link
tab 2   a "Data"                                             Data, link, current page
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   a "Reports"                                          Reports trail, navigation landmark, list, with 3 items, Reports, link
tab 7   a "Finance"                                          Finance, link
tab 8   input[control]                                       Theme, grouping
tab 9   input[control]                                       Size, grouping
tab 10  input[control]                                       Direction, grouping
tab 11  a "Organisation"                                     Deep trail, navigation landmark, list, with 5 items, Organisation, link
tab 12  a "Departments"                                      Departments, link
tab 13  a "Engineering"                                      Engineering, link
tab 14  a "Platform"                                         Platform, link
tab 15  a "Observability"                                    Observability, link, current page
tab 16  a "Observability"                                    Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/hero`

```
arrive  input[control]                                       (silence)
enter   a "Under attention"                                  (silence)
tab 1   a "Read the case"                                    Read the case, visited, same page, link
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   input[control]                                       Theme, grouping
tab 6   input[control]                                       Size, grouping
tab 7   input[control]                                       Direction, grouping
tab 8   button "Stop the sweep"                              Stop the sweep, button
tab 9   button "Stop the sweep"                              Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/stepper`

```
arrive  input[control]                                       Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button "Back"                                        (silence)
tab 1   button "Next"                                        Next, button
tab 2   input[control]                                       Theme, grouping
tab 3   input[control]                                       Size, grouping
tab 4   input[control]                                       Direction, grouping
tab 5   input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/tree`

```
arrive  a "Tree"                                             Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   pct-tree-item "README.md"                            (silence)
tab 1   pct-tree-item "README.md"                            Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/layout`

```
arrive  input[control]                                       Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       Size, grouping
tab 2   input[control]                                       Direction, grouping
tab 3   input[control]                                       Theme, grouping
tab 4   input[control]                                       Size, grouping
tab 5   input[control]                                       Direction, grouping
tab 6   input[control]                                       Theme, grouping
tab 7   input[control]                                       Size, grouping
tab 8   input[control]                                       Direction, grouping
tab 9   input[control]                                       Theme, grouping
tab 10  input[control]                                       Size, grouping
tab 11  input[control]                                       Direction, grouping
tab 12  input[control]                                       Theme, grouping
tab 13  input[control]                                       Size, grouping
tab 14  input[control]                                       Direction, grouping
tab 15  input[control]                                       Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/size`

```
arrive  button[toggle] "Choisir une date"                    Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   input                                                (silence)
tab 1   button "Button sm"                                   Button sm, button
tab 2   button[trigger] "Poland"                             List sm, combo box, Poland, collapsed, opens list
tab 3   input                                                Field md, edit, has auto complete, selected Text md
tab 4   button "Button md"                                   Button md, button
tab 5   button[trigger] "Poland"                             List md, combo box, Poland, collapsed, opens list
tab 6   input                                                Field lg, edit, has auto complete, selected Text lg
tab 7   button "Button lg"                                   Button lg, button
tab 8   button[trigger] "Poland"                             List lg, combo box, Poland, collapsed, opens list
tab 9   input[control]                                       Theme, grouping
tab 10  input                                                Number sm, spin button, editable, selected 1 499,9
tab 11  input[control]                                       Date sm, edit, selected 27 slash 08 slash 2026
tab 12  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/density`

```
arrive  button[trigger] "Poland"                             Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Number sm, spin button, editable, selected 1 499,9 · Date sm, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog
enter   input                                                (silence)
tab 1   button "Button sm"                                   Button sm, button
tab 2   button[trigger] "Poland"                             List sm, combo box, Poland, collapsed, opens list
tab 3   input                                                Field md, edit, has auto complete, selected Text md
tab 4   button "Button md"                                   Button md, button
tab 5   button[trigger] "Poland"                             List md, combo box, Poland, collapsed, opens list
tab 6   input                                                Field lg, edit, has auto complete, selected Text lg
tab 7   button "Button lg"                                   Button lg, button
tab 8   button[trigger] "Poland"                             List lg, combo box, Poland, collapsed, opens list
tab 9   input                                                Field sm, edit, has auto complete, selected Text sm
tab 10  button "Button sm"                                   Button sm, button
tab 11  button[trigger] "Poland"                             List sm, combo box, Poland, collapsed, opens list
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/states`

```
arrive  button[trigger] "Poland"                             Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Number sm, spin button, editable, selected 1 499,9 · Date sm, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog · Field sm, edit, has auto complete, selected Text sm
enter   input                                                (silence)
tab 1   input                                                Number, spin button, editable, selected 1 499,9
tab 2   button[trigger] "Poland"                             List, combo box, Poland, collapsed, opens list
tab 3   input[control]                                       Consent, check box, checked
tab 4   input[control]                                       Plan, grouping
tab 5   input[control]                                       Backups, switch, on
tab 6   input[control]                                       Budget, slider, 40
tab 7   input[control]                                       Starts on, edit, selected 27 slash 08 slash 2026
tab 8   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 9   button "Button"                                      Button, button
tab 10  input[control]                                       Theme, grouping
tab 11  input[control]                                       Size, grouping
tab 12  input[control]                                       Theme, grouping
tab 13  input[control]                                       Size, grouping
tab 14  input                                                Text, edit, read only, selected Text
tab 15  input                                                Number, spin button, editable, selected 1 499,9
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/announce`

```
arrive  input[control]                                       Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Number sm, spin button, editable, selected 1 499,9 · Date sm, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog · Field sm, edit, has auto complete, selected Text sm · Number, spin button, editable, selected 1 499,9 · List, combo box, Poland, collapsed, opens list · Consent, check box, checked · Plan, grouping · Backups, switch, on · Budget, slider, 40 · Starts on, edit, selected 27 slash 08 slash 2026 · Button, button · Text, edit, read only, selected Text · out of grouping, heading, level 1, at pacit slash components — sandbox
enter   button "Announce politely"                           (silence)
tab 1   button "Interrupt"                                   Interrupt, button
tab 2   button "Interrupt"                                   Browser tabs, tool bar
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  input                                                Read the case, visited, same page, link · Theme, grouping · Size, grouping · Direction, grouping · Stop the sweep, button · Browser tabs, tool bar · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Next, button · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Number sm, spin button, editable, selected 1 499,9 · Date sm, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog · Field sm, edit, has auto complete, selected Text sm · Number, spin button, editable, selected 1 499,9 · List, combo box, Poland, collapsed, opens list · Consent, check box, checked · Plan, grouping · Backups, switch, on · Budget, slider, 40 · Starts on, edit, selected 27 slash 08 slash 2026 · Button, button · Text, edit, read only, selected Text · out of grouping, heading, level 1, at pacit slash components — sandbox · Interrupt, button · 1
enter   button "Solid"                                       (silence)
tab 1   button "Outline"                                     Outline, button
tab 2   button "Small"                                       Small, button
tab 3   button "Medium"                                      Medium, button
tab 4   button "Large"                                       Large, button
tab 5   input                                                Field sm, edit, has auto complete, selected Text sm
tab 6   button "Button sm"                                   Button sm, button
tab 7   button[trigger] "Poland"                             List sm, combo box, Poland, collapsed, opens list
tab 8   input                                                Field md, edit, has auto complete, selected Text md
tab 9   button "Button md"                                   Button md, button
tab 10  button[trigger] "Poland"                             List md, combo box, Poland, collapsed, opens list
tab 11  input                                                Field lg, edit, has auto complete, selected Text lg
```

The cap bit here: 12 stops of this view's own were read, and it has more.
