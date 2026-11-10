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
- 856 steps over 63 views, at most 12 stops of a view's own

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
at — 85 of 856 here. 17 view(s) hit the cap, and each says so.

**A phrase repeated at one stop is written once.** This reader's log handed back 611862
phrases, and 3358 of them are distinct within their own stop; the rest are the same
sequence read again, cycled rather than repeated, which is the poller and not the reader. The
cost of the rule is stated rather than hidden: a reader that truly said one thing twice at one
stop is recorded here saying it once.

**Every view spoke.** No view of the 63 went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
17 view(s) have more stops than the 12 taken, and each says so where it bit.

### `/`

```
arrive  a "Start"                                            out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button[toggle] "Name"                                (silence)
tab 1   button[toggle] "Address"                             column 2, Address, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   pct-table-frame "Registers"                          Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger
tab 9   pct-table-frame "Registers"                          Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/button`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button "Solid"                                       (silence)
tab 1   button "Outline"                                     Outline, button
tab 2   button "Ghost"                                       Ghost, button
tab 3   button "Soft"                                        Soft, button
tab 4   button "Hero"                                        Hero, button
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   button "danger"                                      danger, button
tab 9   button "danger"                                      danger, button
tab 10  button "danger"                                      danger, button
tab 11  button "danger"                                      danger, button
tab 12  button "warning"                                     warning, button
tab 13  button "warning"                                     warning, button
tab 14  button "warning"                                     warning, button
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/field`

```
arrive  input                                                out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank
enter   input                                                (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   button[field-label-aux-item] "The description appears on your profile" The description appears on your profile, button
tab 5   input                                                A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   input                                                Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90
tab 10  button[field-suffix-item] "Clear the price"          Clear the price, button
tab 11  input                                                Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank
tab 12  button[field-suffix-item] "Search"                   Search, button
tab 13  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 14  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 15  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 16  button[trigger] "Sélectionner…"                      Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list
tab 17  input                                                Read-only, edit, read only, selected preview only
tab 18  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 19  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 20  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 21  input                                                Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000
tab 22  input                                                Phone, edit, has auto complete, Optional — the form would rather have it, blank
tab 23  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 24  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
```

24 presses reached, 11 of them this view's own.

### `/text`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank
enter   input                                                (silence)
tab 1   input                                                E-mail, edit, has auto complete, john at example dot com, blank
tab 2   input                                                Password, edit, protected, blank
tab 3   input                                                Search, edit, has auto complete, Search..., blank
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   input                                                Read-only, edit, read only, selected preview only
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  input                                                Reactive forms ( form Control ), edit, has auto complete, selected Ada
tab 12  input                                                Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace
tab 13  input                                                Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/textarea`

```
arrive  textarea                                             out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   textarea                                             (silence)
tab 1   textarea                                             A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   textarea                                             Note, edit, multi line, asks for.
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   textarea                                             Comment, edit, multi line, Grows to four lines, then scrolls., blank
tab 10  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 11  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 12  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 13  textarea                                             Old forms, edit, multi line, blank
tab 14  button "patchValue three lines"                      patch Value three lines, button
tab 15  button "patchValue empty"                            patch Value empty, button
tab 16  button "patchValue empty"                            Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/number`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input                                                (silence)
tab 1   button[field-suffix-item] "Clear the price"          Clear the price, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input                                                Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1
tab 6   input                                                Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/date`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026
tab 6   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 7   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 8   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 9   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 10  input[control]                                       Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026
tab 11  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 12  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 13  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 14  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 15  input[control]                                       Polish, edit, selected 27.08.2026
tab 16  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 17  input[control]                                       Japanese, edit, selected 2026 slash 08 slash 27
tab 18  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 19  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 20  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 21  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 22  button[nav] "Mois précédent"                         Mois précédent, button
tab 23  button[nav] "Mois suivant"                           Mois suivant, button
reach   button[toggle] "Choisir une date"                    (silence)
open    td[day] "jeudi 27 août 2026"                         Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4
close   input[control]                                       main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026
```

the act: `Enter` on `[data-testid="date-standalone"] [data-pct-part="toggle"]`, to open a month grid (the gesture belongs to `apps/sandbox-e2e/src/date.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/time`

```
arrive  button[toggle] "Choisir une heure"                   out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026
enter   input[control]                                       (silence)
tab 1   button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05
tab 6   button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
tab 7   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 8   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 9   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 10  input[control]                                       American English, edit, selected 1:05 PM
tab 11  button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
tab 12  input[control]                                       Polish, edit, selected 13:05
tab 13  button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
tab 14  input[control]                                       Korean, edit, selected 오후 1:05
tab 15  button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
tab 16  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 17  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 18  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 19  input[control]                                       Quarter hours, edit, selected 13:15
tab 20  button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
reach   button[toggle] "Choisir une heure"                   (silence)
open    div[column] "Heures"                                 Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24
close   div[column] "Heures"                                 (silence)
```

the act: `Enter` on `[data-testid="time-standalone"] [data-pct-part="toggle"]`, to open columns of a time (the gesture belongs to `apps/sandbox-e2e/src/time.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datetime`

```
arrive  input[time-control]                                  out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected
enter   input[date-control]                                  (silence)
tab 1   input[time-control]                                  Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30
tab 2   button[toggle] "Choisir une date et une heure"       Choisir une date et une heure, button, collapsed, opens dialog
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   input[date-control]                                  Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026
tab 7   input[time-control]                                  Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05
tab 8   button[toggle] "Choisir une date et une heure"       Choisir une date et une heure, button, collapsed, opens dialog
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 11  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 12  input[date-control]                                  American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026
tab 13  input[time-control]                                  American English Heure, edit, selected 1:05 PM
tab 14  button[toggle] "Choisir une date et une heure"       Choisir une date et une heure, button, collapsed, opens dialog
tab 15  input[date-control]                                  Polish, grouping. Polish Jour, edit, selected 01.12.2026
tab 16  input[time-control]                                  Polish Heure, edit, selected 13:05
tab 17  button[toggle] "Choisir une date et une heure"       Choisir une date et une heure, button, collapsed, opens dialog
reach   button[toggle] "Choisir une date et une heure"       (silence)
open    td[day] "mardi 1 décembre 2026"                      Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2
close   input[date-control]                                  main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026
```

the act: `Enter` on `[data-testid="datetime-standalone"] [data-pct-part="toggle"]`, to open a calendar and the columns of a time (the gesture belongs to `apps/sandbox-e2e/src/datetime.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/checkbox`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected · Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30 · Choisir une date et une heure, button, collapsed, opens dialog · Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026 · Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026 · American English Heure, edit, selected 1:05 PM · Polish, grouping. Polish Jour, edit, selected 01.12.2026 · Polish Heure, edit, selected 13:05 · Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2 · main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2. alert, You have to accept the terms
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       The indeterminate state, read as mixed, check box, half checked
tab 5   input[control]                                       Read-only — focusable, but not changeable, check box, checked
tab 6   input[control]                                       Browser tabs, tool bar. tab control. Checkbox at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/radio`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected · Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30 · Choisir une date et une heure, button, collapsed, opens dialog · Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026 · Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026 · American English Heure, edit, selected 1:05 PM · Polish, grouping. Polish Jour, edit, selected 01.12.2026 · Polish Heure, edit, selected 13:05 · Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2 · main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026 · Theme, grouping. light, radio button, checked, 1 of 2. alert, You have to accept the terms · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Browser tabs, tool bar. tab control. Checkbox at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a plan
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Horizontal layout, grouping. Option A, radio button, checked, 1 of 2
tab 5   input[control]                                       Browser tabs, tool bar. tab control. Radio at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/slider`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected · Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30 · Choisir une date et une heure, button, collapsed, opens dialog · Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026 · Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026 · American English Heure, edit, selected 1:05 PM · Polish, grouping. Polish Jour, edit, selected 01.12.2026 · Polish Heure, edit, selected 13:05 · Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2 · main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026 · Theme, grouping. light, radio button, checked, 1 of 2. alert, You have to accept the terms · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Browser tabs, tool bar. tab control. Checkbox at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a plan · Horizontal layout, grouping. Option A, radio button, checked, 1 of 2 · Browser tabs, tool bar. tab control. Radio at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Volume, slider, 30, Nothing is formatted, so nothing is written
tab 5   input[control]                                       Discount, slider, 15 percent
tab 6   input[control]                                       Size, slider, Medium
tab 7   input[control]                                       Read-only — focusable, but not movable, slider, 70
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  input[control]                                       Gain, slider, 60
tab 12  input[control]                                       Browser tabs, tool bar. tab control. Slider at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/wheel`

```
arrive  button "Write Friday"                                out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected · Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30 · Choisir une date et une heure, button, collapsed, opens dialog · Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026 · Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026 · American English Heure, edit, selected 1:05 PM · Polish, grouping. Polish Jour, edit, selected 01.12.2026 · Polish Heure, edit, selected 13:05 · Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2 · main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026 · Theme, grouping. light, radio button, checked, 1 of 2. alert, You have to accept the terms · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Browser tabs, tool bar. tab control. Checkbox at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a plan · Horizontal layout, grouping. Option A, radio button, checked, 1 of 2 · Browser tabs, tool bar. tab control. Radio at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Volume, slider, 30, Nothing is formatted, so nothing is written · Discount, slider, 15 percent · Size, slider, Medium · Read-only — focusable, but not movable, slider, 70 · Gain, slider, 60 · Browser tabs, tool bar. tab control. Slider at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   div[list] "Monday"                                   (silence)
tab 1   div[list] "Monday"                                   No value yet, list, The line holds the first row, and nothing is chosen. Monday, not selected, 1 of 7
tab 2   button "Write Friday"                                Write Friday, button
tab 3   button "Write Monday"                                Write Monday, button
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   div[list] "Hour"                                     Hour, list. 09, 10 of 24
tab 8   div[list] "Minute"                                   Minute, list. 30, 31 of 60
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 11  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 12  div[list] "Monday"                                   Delivery day, list, required. Monday, not selected, 1 of 7
tab 13  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a day
tab 14  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 15  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 16  div[list] "Monday"                                   Delivery day, list, Drawn by the wrapper. Tuesday, 2 of 7
tab 17  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 18  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 19  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 20  div[list] "00"                                       Small, three rows, list. 15, 2 of 4
tab 21  div[list] "00"                                       Medium, list. 15, 2 of 4
tab 22  div[list] "00"                                       Large, seven rows, list. 12, 13 of 24
tab 23  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 24  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
```

24 presses reached, 11 of them this view's own.

### `/wheel#demo-list`

```
enter   div[list] "Monday"                                   (silence)
down    div[list] "Monday"                                   thu. Thursday, 4 of 7
down    div[list] "Monday"                                   fri. Friday, 5 of 7
end     div[list] "Monday"                                   sun. Sunday, 7 of 7
tab 1   div[list] "Monday"                                   No value yet, list, The line holds the first row, and nothing is chosen. Monday, not selected, 1 of 7
tab 2   button "Write Friday"                                Write Friday, button
tab 3   button "Write Monday"                                Write Monday, button
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowDown`, `ArrowDown`, `End` in `demo-list`, to read the row a key brings to the line (the keys belong to `wheel.spec.ts › a key moves the line, the row becomes the value, and the scroll follows`).

### `/wheel#demo-ring`

```
enter   div[list] "Hour"                                     (silence)
home    div[list] "Hour"                                     0:30. 00, 1 of 24
up      div[list] "Hour"                                     23:30. 23, 24 of 24
tab 1   div[list] "Minute"                                   Minute, list. 30, 31 of 60
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `Home`, `ArrowUp` in `demo-ring`, to read a ring coming round at its ends (the keys belong to `wheel.spec.ts › the keys come round at the ends, and the scroll is put back on the middle turn`).

### `/switch`

```
arrive  input[control]                                       out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · column 2, Address, button · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Registers, region, Registers, table, with 3 rows and 5 columns, caption, Registers, out of caption, row 1, column 1, Address, column 2, Name, column 3, Value, column 4, Unit, column 5, Note, row 2, Address, column 1, 4096, Name, column 2, Supply temperature, Value, column 3, 21.5, Unit, column 4, degrees C, Note, column 5, after the exchanger, row 3, Address, column 1, 4097, Name, column 2, Exhaust temperature, Value, column 3, 23.0, Unit, column 4, degrees C, Note, column 5, before the exchanger · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Outline, button · Ghost, button · Soft, button · Hero, button · danger, button · warning, button · blank · Theme, grouping. light, radio button, checked, 1 of 2. alert, The e-mail address is required · The description appears on your profile, button · A short description, edit, has auto complete, Briefly — write at least 10 characters, A few words about yourself, blank · Price, spin button, editable, The unit tile is a surface of its own; the clear button sits in the border padding, selected 1 499,90 · Clear the price, button · Search the catalogue, edit, has auto complete, The icon belongs to the surface of the field; the button is welded into the corner of the border, a name or a symbol, blank · Search, button · Country, combo box, Sélectionner..., collapsed, opens list, A click in the padding opens the list · Read-only, edit, read only, selected preview only · Amount, spin button, editable, Transfers above 10 000 are reviewed by hand, selected 25 000 · Phone, edit, has auto complete, Optional — the form would rather have it, blank · E-mail, edit, has auto complete, john at example dot com, blank · Password, edit, protected, blank · Search, edit, has auto complete, Search..., blank · Reactive forms ( form Control ), edit, has auto complete, selected Ada · Template-driven ( (ng Model) ), edit, has auto complete, selected Lovelace · Browser tabs, tool bar. tab control. Text at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of edit, banner landmark, heading, level 1, at pacit slash components — sandbox · A plain textarea, for comparison, edit, multi line, This one keeps its two lines and scrolls., blank · Note, edit, multi line, asks for. · Comment, edit, multi line, Grows to four lines, then scrolls., blank · Old forms, edit, multi line, blank · patch Value three lines, button · patch Value empty, button · Browser tabs, tool bar. tab control. Textarea at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Number of seats, spin button, required, editable, The range is 1–500; a fraction is rounded on commit, selected 1 · Browser tabs, tool bar. tab control. Number at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Choisir une date, button, collapsed, opens dialog · Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, selected 27 slash 08 slash 2026 · Within August 2026, weekdays only, edit, selected 27 slash 08 slash 2026 · Polish, edit, selected 27.08.2026 · Japanese, edit, selected 2026 slash 08 slash 27 · Mois précédent, button · Mois suivant, button · Choisir une date, dialog. août 2026, table. Choisir une date, dialog. août 2026, table. jeudi 27 août 2026, row 6, jeudi, column 4 · main landmark. Day, edit, The sandbox runs under fr-FR, so the format hint reads jj slash mm slash aaaa, 27 slash 08 slash 2026 · Choisir une heure, button, collapsed, opens dialog · Time, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, edit, selected 1:05 PM · Polish, edit, selected 13:05 · Korean, edit, selected 오후 1:05 · Quarter hours, edit, selected 13:15 · Choisir une heure, dialog. Heures, list. Choisir une heure, dialog. Heures, list. 13, 14 of 24 · 13:05. 13:05 unselected · Starts Heure, edit, required, Type it, or pick it in the panel, selected 09:30 · Choisir une date et une heure, button, collapsed, opens dialog · Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 01 slash 12 slash 2026 · Starts Heure, edit, The sandbox runs under fr-FR, so the clock counts to 24, selected 13:05 · American English, grouping. American English Jour, edit, selected 12 slash 01 slash 2026 · American English Heure, edit, selected 1:05 PM · Polish, grouping. Polish Jour, edit, selected 01.12.2026 · Polish Heure, edit, selected 13:05 · Choisir une date et une heure, dialog. décembre 2026, table. Choisir une date et une heure, dialog. décembre 2026, table. mardi 1 décembre 2026, row 2, mardi, column 2 · main landmark. Starts, grouping. Starts Jour, edit, The sandbox runs under fr-FR, so the clock counts to 24, 01 slash 12 slash 2026 · Theme, grouping. light, radio button, checked, 1 of 2. alert, You have to accept the terms · The indeterminate state, read as mixed, check box, half checked · Read-only — focusable, but not changeable, check box, checked · Browser tabs, tool bar. tab control. Checkbox at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a plan · Horizontal layout, grouping. Option A, radio button, checked, 1 of 2 · Browser tabs, tool bar. tab control. Radio at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Volume, slider, 30, Nothing is formatted, so nothing is written · Discount, slider, 15 percent · Size, slider, Medium · Read-only — focusable, but not movable, slider, 70 · Gain, slider, 60 · Browser tabs, tool bar. tab control. Slider at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · No value yet, list, The line holds the first row, and nothing is chosen. Monday, not selected, 1 of 7 · Write Friday, button · Write Monday, button · Hour, list. 09, 10 of 24 · Minute, list. 30, 31 of 60 · Delivery day, list, required. Monday, not selected, 1 of 7 · Theme, grouping. light, radio button, checked, 1 of 2. alert, Pick a day · Delivery day, list, Drawn by the wrapper. Tuesday, 2 of 7 · Small, three rows, list. 15, 2 of 4 · Medium, list. 15, 2 of 4 · Large, seven rows, list. 12, 13 of 24 · thu. Thursday, 4 of 7 · fri. Friday, 5 of 7 · sun. Sunday, 7 of 7 · 0:30. 00, 1 of 24 · 23:30. 23, 24 of 24
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2. alert, Backups have to stay on
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Wi-Fi, switch, on, Turns off when you leave the house
tab 5   input[control]                                       Read-only — focusable, but not changeable, switch, on
tab 6   input[control]                                       Browser tabs, tool bar. tab control. Switch at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/select`

```
arrive  input[control]                                       (silence)
enter   button[trigger] "Sélectionner…"                      (silence)
tab 1   button[trigger] "Polish"                             field (the default), combo box, Polish, collapsed, opens list
tab 2   button[trigger] "Polish"                             auto — out to the longest option, combo box, Polish, collapsed, opens list
tab 3   button[trigger] "Polish"                             320px, aligned to the end, combo box, Polish, collapsed, opens list
tab 4   button[trigger] "Sélectionner…"                      Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
tab 9   button[trigger] "Sélectionner…"                      Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list
tab 10  button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
tab 11  button[trigger] "Poland, Slovakia"                   Countries, combo box, Poland, Slovakia, collapsed, opens list
tab 12  input[trigger]                                       Country, combo box, collapsed, has auto complete, editable, selected Lithuania
tab 13  input[trigger]                                       Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia
tab 14  button[trigger] "Poland"                             Country, combo box, Poland, collapsed, opens list
reach   button[trigger] "Sélectionner…"                      (silence)
open    button[trigger] "Sélectionner…"                      list. Poland, not selected, 1 of 6
close   button[trigger] "Sélectionner…"                      main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay)
```

the act: `Enter` on `[data-testid="select-country"] [data-pct-part="trigger"]`, to open a listbox (the gesture belongs to `apps/sandbox-e2e/src/select.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/dialog`

```
arrive  button "Delete the project"                          field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay)
enter   button "Open the dialog"                             (silence)
tab 1   button "Delete the project"                          Delete the project, button
tab 2   button "Open the insistent one"                      Open the insistent one, button
tab 3   button "Open a form dialog"                          Open a form dialog, button
tab 4   button "Open a long one"                             Open a long one, button
tab 5   button "Open a long one"                             Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   button "Open the dialog"                             (silence)
open    button[close] "Close"                                Project settings, dialog. Close, button. Project settings, dialog. button, Close
close   button "Open the dialog"                             main landmark. Open the dialog, button
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="open-basic"]`, to open a modal dialog (the gesture belongs to `apps/sandbox-e2e/src/dialog.spec.ts`).

### `/tooltip`

```
arrive  button "start"                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button
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
tab 11  button "Take it away"                                Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/popover`

```
arrive  button "bottom"                                      field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button "Filters"                                     (silence)
tab 1   button "start"                                       start, button, collapsed, opens dialog
tab 2   button "top"                                         top, button, collapsed, opens dialog
tab 3   button "bottom"                                      bottom, button, collapsed, opens dialog
tab 4   button "end"                                         end, button, collapsed, opens dialog
tab 5   button "Open the panel"                              Open the panel, button, collapsed, opens dialog
tab 6   button "Count up"                                    Count up, button
tab 7   button "Count up"                                    Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   button "Filters"                                     (silence)
open    div[panel] "Filters"                                 Filters, dialog. heading, level 2, Filters
close   button "Filters"                                     main landmark. Filters, button, collapsed, opens dialog
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="panel-trigger"]`, to open a non-modal dialog (the gesture belongs to `apps/sandbox-e2e/src/popover.spec.ts`).

### `/menu`

```
arrive  button "File"                                        field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog
enter   button "Actions"                                     (silence)
tab 1   button "Count up"                                    Count up, button
tab 2   button "File"                                        File, button, collapsed, sub Menu
tab 3   button "Language"                                    Language, button, collapsed, sub Menu
tab 4   button "Language"                                    Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   button "Actions"                                     (silence)
open    button[item] "Rename"                                Rename, 1 of 4
close   button "Actions"                                     main landmark. Actions, button, collapsed, sub Menu
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="actions-trigger"]`, to open a menu (the gesture belongs to `apps/sandbox-e2e/src/menu.spec.ts`).

### `/drawer`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu
enter   button "Sections"                                    (silence)
tab 1   button "Sections, from further down"                 Sections, from further down, button, collapsed
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   button "From the end edge"                           From the end edge, button, collapsed
tab 6   button "From the bottom"                             From the bottom, button, collapsed
tab 7   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 8   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 9   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 10  button "Open the bare one"                           Open the bare one, button, collapsed
tab 11  button "Open the bare one"                           Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   button "Sections"                                    (silence)
open    button "Sections"                                    expanded
close   button "Sections"                                    (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="trigger-nav"]`, to open a named region beside the page (the gesture belongs to `apps/sandbox-e2e/src/drawer.spec.ts`).

### `/accordion`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   summary[heading] "Shipping"                          (silence)
tab 1   summary[heading] "Payment"                           Payment, heading, level 3, button, collapsed
tab 2   summary[heading] "Returns"                           Returns, heading, level 3, button, collapsed
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   summary[heading] "First"                             First, heading, level 3, button, collapsed
tab 7   summary[heading] "Second"                            Second, heading, level 3, button, collapsed
tab 8   summary[heading] "Third"                             Third, heading, level 3, button, expanded
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 11  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 12  summary[heading] "Open to anyone"                    Open to anyone, heading, level 3, button, collapsed
tab 13  summary[heading] "Not yours to open"                 Not yours to open, heading, level 3, button, unavailable, collapsed
tab 14  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 15  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 16  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 17  summary[heading] "An h4 section"                     An h 4 section, heading, level 4, button, collapsed
tab 18  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 19  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 20  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 21  summary[heading] "More about this"                   More about this, heading, level 3, button, collapsed
tab 22  summary[heading] "More about this"                   Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   summary[heading] "Payment"                           (silence)
open    summary[heading] "Payment"                           expanded
close   summary[heading] "Payment"                           (silence)
```

the pointer's way to the nav stood under `pct-drawer (drawer-nav)` when this view was asked for, and the link was reached through its own click event.

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="item-payment"] [data-pct-part="heading"]`, to open a revealed section (the gesture belongs to `apps/sandbox-e2e/src/accordion.spec.ts`).

### `/tabs`

```
arrive  pct-tab[panel]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button[tab] "General"                                (silence)
tab 1   pct-tab[panel] "The general settings, and a word that…" General, property page, The general settings, and a word that lives nowhere else on this page: marmalade.
tab 2   pct-tab[panel]                                       Network, property page
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   button[tab] "Overview"                               Report, tab control. Overview, tab, selected, 1 of 2
tab 7   pct-tab[panel] "A summary nobody had to fetch."      Overview, property page, A summary nobody had to fetch.
tab 8   pct-tab[panel]                                       Details, property page
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 11  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 12  button[tab] "Profile"                                Profile, tab control. Profile, tab, selected, 1 of 2
tab 13  pct-tab[panel] "Who you are."                        Profile, property page, Who you are.
tab 14  pct-tab[panel]                                       Keys, property page
tab 15  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 16  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 17  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 18  button[tab] "Week"                                   Period, tab control. Week, tab, selected, 2 of 3
tab 19  pct-tab[panel]                                       Day, property page
tab 20  pct-tab[panel] "Seven days side by side."            Week, property page, Seven days side by side.
reach   button[tab] "General"                                (silence)
open    button[tab] "Network"                                Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3
close   button[tab] "Network"                                (silence)
```

the act: `ArrowRight` on `[data-testid="tabs-basic"] [data-pct-part="tab"][aria-selected="true"]`, to open the panel behind the next tab (the gesture belongs to `apps/sandbox-e2e/src/tabs.spec.ts`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/toast`

```
arrive  button "Clear the stack"                             field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3
enter   button "Save the draft"                              (silence)
tab 1   button "Copy (a shorter clock)"                      Copy (a shorter clock), button
tab 2   button "Report something that waits"                 Report something that waits, button
tab 3   button "Clear the stack"                             Clear the stack, button
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   button "Fail to save"                                Fail to save, button
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  button "Success"                                     Success, button
tab 12  button "Warning"                                     Warning, button
tab 13  button "Danger"                                      Danger, button
tab 14  button "Info"                                        Info, button
tab 15  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 16  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 17  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 18  button "Delete the message"                          Delete the message, button
tab 19  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 20  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 21  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 22  button "Open the settings"                           Open the settings, button
tab 23  button "Open the settings"                           Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
reach   button "Copy (a shorter clock)"                      (silence)
open    button "Copy (a shorter clock)"                      Copied to the clipboard. Dismiss
close   button "Copy (a shorter clock)"                      (silence)
```

Tab moved nothing — focus had left the page.

the walk had Tabbed out of the page into the browser's own chrome, so a pointer click on the view's title gave the document the window's focus back before the control was focused — a reader's key follows the window, not the page.

the act: `Enter` on `[data-testid="raise-brief"]`, to open a message in a live region (the gesture belongs to `apps/sandbox-e2e/src/toast.spec.ts`).

### `/pagination`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3 · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Copied to the clipboard. Dismiss
enter   button[page] "1"                                     (silence)
tab 1   button[page] "2"                                     2, button
tab 2   button[page] "3"                                     3, button
tab 3   button[next] "Next page"                             Next page, button
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   button[previous] "Previous page"                     Pagination, navigation landmark. list. Previous page, button
tab 8   button[page] "1"                                     1, button
tab 9   button[page] "6"                                     6, button
tab 10  button[page] "7"                                     7, button, current page
tab 11  button[page] "8"                                     8, button
tab 12  button[page] "20"                                    20, button
tab 13  button[next] "Next page"                             Next page, button
tab 14  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 15  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 16  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 17  button[page] "1"                                     Rows, navigation landmark. list. 1, button, current page
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/progress`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3 · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Copied to the clipboard. Dismiss · 2, button · 3, button · Next page, button · Pagination, navigation landmark. list. Previous page, button · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark. list. 1, button, current page
enter   button "−10"                                         (silence)
tab 1   button "+10"                                         plus 10, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  button "A number arrives"                            A number arrives, button
tab 12  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 13  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 14  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 15  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 16  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 17  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 18  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 19  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 20  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 21  input[control]                                       Browser tabs, tool bar. tab control. Progress at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/sparkline`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3 · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Copied to the clipboard. Dismiss · 2, button · 3, button · Next page, button · Pagination, navigation landmark. list. Previous page, button · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark. list. 1, button, current page · plus 10, button · A number arrives, button · Browser tabs, tool bar. tab control. Progress at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button "Next hour"                                   (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Browser tabs, tool bar. tab control. Sparkline at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/skeleton`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3 · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Copied to the clipboard. Dismiss · 2, button · 3, button · Next page, button · Pagination, navigation landmark. list. Previous page, button · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark. list. 1, button, current page · plus 10, button · A number arrives, button · Browser tabs, tool bar. tab control. Progress at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Sparkline at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button "The content arrives"                         (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 8   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 9   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 10  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 11  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 12  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 13  button "Stop the sheen"                              Stop the sheen, button
tab 14  button "Stop the sheen"                              Browser tabs, tool bar. tab control. Skeleton at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/chips`

```
arrive  input[control]                                       field (the default), combo box, Polish, collapsed, opens list · auto — out to the longest option, combo box, Polish, collapsed, opens list · 320px, aligned to the end, combo box, Polish, collapsed, opens list · Country (in the dark theme), combo box, Sélectionner..., collapsed, opens list · Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · Country, combo box, Poland, collapsed, opens list · Country (nothing to pick), combo box, Sélectionner..., collapsed, opens list · Countries, combo box, Poland, Slovakia, collapsed, opens list · Country, combo box, collapsed, has auto complete, editable, selected Lithuania · Countries, combo box, collapsed, has auto complete, editable, selected Poland, Slovakia · list. Poland, not selected, 1 of 6 · main landmark. Country, combo box, Sélectionner..., collapsed, opens list, A list with a panel of its own (CDK Overlay) · Delete the project, button · Open the insistent one, button · Open a form dialog, button · Open a long one, button · Browser tabs, tool bar. tab control. Dialog at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Project settings, dialog. Close, button. Project settings, dialog. button, Close · main landmark. Open the dialog, button · Publish, button, Runs every check before publishing · Approve the release, button · Close the panel, button · start, button, On the starting side · top, button, Above the control · bottom, button, Below the control · end, button, On the ending side · Release note, edit, has auto complete, Shown in the changelog Markdown is allowed here, blank · Hover me, button, This one can be taken away · Take it away, button · Browser tabs, tool bar. tab control. Tooltip at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · start, button, collapsed, opens dialog · top, button, collapsed, opens dialog · bottom, button, collapsed, opens dialog · end, button, collapsed, opens dialog · Open the panel, button, collapsed, opens dialog · Count up, button · Browser tabs, tool bar. tab control. Popover at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Filters, dialog. heading, level 2, Filters · main landmark. Filters, button, collapsed, opens dialog · File, button, collapsed, sub Menu · Language, button, collapsed, sub Menu · Browser tabs, tool bar. tab control. Menu at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Rename, 1 of 4 · main landmark. Actions, button, collapsed, sub Menu · Sections, from further down, button, collapsed · From the end edge, button, collapsed · From the bottom, button, collapsed · Open the bare one, button, collapsed · Browser tabs, tool bar. tab control. Drawer at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · expanded · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Payment, heading, level 3, button, collapsed · Returns, heading, level 3, button, collapsed · First, heading, level 3, button, collapsed · Second, heading, level 3, button, collapsed · Third, heading, level 3, button, expanded · Open to anyone, heading, level 3, button, collapsed · Not yours to open, heading, level 3, button, unavailable, collapsed · An h 4 section, heading, level 4, button, collapsed · More about this, heading, level 3, button, collapsed · Browser tabs, tool bar. tab control. Accordion at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · banner landmark, heading, level 1, at pacit slash components — sandbox · General, property page, The general settings, and a word that lives nowhere else on this page: marmalade. · Network, property page · Report, tab control. Overview, tab, selected, 1 of 2 · Overview, property page, A summary nobody had to fetch. · Details, property page · Profile, tab control. Profile, tab, selected, 1 of 2 · Profile, property page, Who you are. · Keys, property page · Period, tab control. Week, tab, selected, 2 of 3 · Day, property page · Week, property page, Seven days side by side. · Network, tab, selected, 2 of 3. Network, tab, selected, 2 of 3 · Copy (a shorter clock), button · Report something that waits, button · Clear the stack, button · Fail to save, button · Success, button · Warning, button · Danger, button · Info, button · Delete the message, button · Open the settings, button · Browser tabs, tool bar. tab control. Toast at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Copied to the clipboard. Dismiss · 2, button · 3, button · Next page, button · Pagination, navigation landmark. list. Previous page, button · 1, button · 6, button · 7, button, current page · 8, button · 20, button · Rows, navigation landmark. list. 1, button, current page · plus 10, button · A number arrives, button · Browser tabs, tool bar. tab control. Progress at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Sparkline at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Stop the sheen, button · Browser tabs, tool bar. tab control. Skeleton at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button[remove] "Remove"                              (silence)
tab 1   button[remove] "Remove"                              Remove Under 50, button
tab 2   button[remove] "Remove"                              Remove Free shipping, button
tab 3   button[remove] "Remove"                              Remove New, button
tab 4   button[remove] "Remove"                              Remove Local, button
tab 5   button "Restore everything"                          Restore everything, button
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   button[remove] "Remove"                              Statuses, list. Remove draft, button
tab 10  button[remove] "Remove"                              Remove archived, button
tab 11  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 12  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 13  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 14  button[remove] "Remove"                              People, list. Remove Ada, button
tab 15  button[remove] "Remove"                              Remove Grace, button
tab 16  button[remove] "Remove"                              Remove Edsger, button
tab 17  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 18  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 19  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 20  button[remove] "Remove"                              Small, list. Remove removable, button
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/avatar`

```
arrive  input[control]                                       (silence)
enter   button "Swap the source"                             (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 5   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 6   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 7   button "A control of the same size"                  A control of the same size, button
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  button "Account: Ada Lovelace"                       Account: Ada Lovelace, button
tab 12  button "Account: Ada Lovelace"                       Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/badge`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 2   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   input[control]                                       Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/icon`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   input[control]                                       Done, check box, checked
tab 2   input[control]                                       Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/breadcrumb`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   a "Home"                                             (silence)
tab 1   a "Library"                                          Library, link
tab 2   a "Data"                                             Data, link, current page
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   a "Reports"                                          Reports trail, navigation landmark. list. Reports, link
tab 7   a "Finance"                                          Finance, link
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 9   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 10  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 11  a "Organisation"                                     Deep trail, navigation landmark. list. Organisation, link
tab 12  a "Departments"                                      Departments, link
tab 13  a "Engineering"                                      Engineering, link
tab 14  a "Platform"                                         Platform, link
tab 15  a "Observability"                                    Observability, link, current page
tab 16  a "Observability"                                    Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/chart`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[range] "Heat recovery on 25 October 2026"      (silence)
tab 1   button[zoom] "Zoom in"                               Zoom, tool bar. Zoom in, button
tab 2   button[toggle] "Supply air"                          Series, list. Supply air degrees C, toggle button, pressed
tab 3   button[toggle] "Fan power"                           Fan power W, toggle button, pressed
tab 4   button[toggle] "Heater"                              Heater boolean, toggle button, pressed
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   input[range] "Supply air and fan power, the cursor…" Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor.
tab 9   button[zoom] "Zoom in"                               Zoom, tool bar. Zoom in, button
tab 10  button "Put the cursor at 10:00"                     Put the cursor at 10:00, button
tab 11  button "Clear it"                                    Clear it, button
tab 12  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 13  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 14  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 15  input[range] "Fan power on 25 October 2026"          Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor.
tab 16  button[zoom] "Zoom in"                               Zoom, tool bar. Zoom in, button
tab 17  input[range] "Heater on 25 October 2026"             Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor.
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/chart#demo-pattern`

```
enter   input[range] "Heat recovery on 25 October 2026"      (silence)
right   input[range] "Heat recovery on 25 October 2026"      25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off
right   input[range] "Heat recovery on 25 October 2026"      25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off
end     input[range] "Heat recovery on 25 October 2026"      26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off
tab 1   button[zoom] "Zoom in"                               Zoom, tool bar. Zoom in, button
tab 2   button[toggle] "Supply air"                          Series, list. Supply air degrees C, toggle button, pressed
tab 3   button[toggle] "Fan power"                           Fan power W, toggle button, pressed
tab 4   button[toggle] "Heater"                              Heater boolean, toggle button, pressed
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `ArrowRight`, `End` in `demo-pattern`, to read the cursor moved by the arrows (the keys belong to `chart.spec.ts › the arrows walk the cursor from reading to reading, Home and End go to the ends`).

### `/chart#demo-bars`

```
enter   input[range] "Heat pump energy by day, March 2026"   (silence)
right   input[range] "Heat pump energy by day, March 2026"   Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent
right   input[range] "Heat pump energy by day, March 2026"   Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent
Enter   input[range] "Heat pump energy by day, March 2026"   Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected
tab 1   button[zoom] "Zoom in"                               Zoom, tool bar. Zoom in, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `ArrowRight`, `Enter` in `demo-bars`, to read a bar's band picked at the cursor (the keys belong to `chart.spec.ts › a press selects a bar's band, and Enter at the cursor does the same`).

### `/chart#demo-pie`

```
enter   input[range] "Energy by use, October 2026"           (silence)
right   input[range] "Energy by use, October 2026"           Heat pump: 412 k Wh, 46 percent , selected
end     input[range] "Energy by use, October 2026"           Others: 55 k Wh, 6 percent
tab 1   button[toggle] "Heat pump"                           Series, list. Heat pump, toggle button, pressed
tab 2   button[toggle] "Hot water"                           Hot water, toggle button, pressed
tab 3   button[toggle] "Ventilation"                         Ventilation, toggle button, pressed
tab 4   button[toggle] "Lighting"                            Lighting, toggle button, pressed
tab 5   button[toggle] "Kitchen"                             Kitchen, toggle button, pressed
tab 6   button[toggle] "Laundry"                             Laundry, toggle button, pressed
tab 7   button[toggle] "Others"                              Others, toggle button, pressed
tab 8   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `End` in `demo-pie`, to read the slices of a pie (the keys belong to `chart.spec.ts › the range is the one stop: the arrow keys walk the slices and read each, the legend hides one and the turn is shared among the rest`).

### `/chart#demo-brush`

```
enter   input[handle] "Start of the selection"               (silence)
right   input[handle] "Start of the selection"               25 Oct 2026, 00:15
PageDown input[handle] "Start of the selection"               25 Oct 2026, 00:00
tab 1   input[handle] "End of the selection"                 End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it.
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `PageDown` in `demo-brush`, to read an edge of a navigator's selection (the keys belong to `chart.spec.ts › the keys move an edge of the navigator, and the window above follows`).

### `/chart#demo-live`

```
enter   button "Add a minute"                                (silence)
act     button "Add a minute"                                (silence)
tab 1   button "Recount"                                     Recount, button
tab 2   button "Recount"                                     Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

the section: `activate` in `demo-live`, to read a reading added to a live chart (the keys belong to `chart.spec.ts › a reading added at the end is drawn, and the window follows the meter`).

### `/card`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   input[control]                                       (silence)
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 2   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 3   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 4   a "Heat pump"                                        Heat pump, same page, link, heading, level 3
tab 5   input[control]                                       Enabled, switch, on
tab 6   button "Rename"                                      Rename, button
tab 7   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 8   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 9   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 10  button "Arrive"                                      Arrive, button
tab 11  input[control]                                       Enabled, switch, on
tab 12  input[control]                                       Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/frame`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox
enter   button "Sign out"                                    (silence)
tab 1   a "Rooms"                                            Screens, navigation landmark, list, with 4 items, Rooms, same page, link
tab 2   a "Devices"                                          Devices, same page, link, current page
tab 3   a "Energy"                                           Energy, same page, link
tab 4   a "Settings"                                         Settings, same page, link
tab 5   input[control]                                       list, with 7 items, Heating, switch, on
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   button "Edit"                                        Edit, button
tab 10  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 11  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 12  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 13  input[control]                                       Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/table`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button[toggle] "Name"                                (silence)
tab 1   button[toggle] "Address"                             Address, column header, row 1, column 2. Address, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   pct-table-frame "Registers"                          Registers, region
tab 9   pct-table-frame "Registers"                          Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/datatable`

```
arrive  button[toggle] "Energy"                              Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input                                                (silence)
tab 1   pct-table-frame "Polling rules"                      Polling rules, region
tab 2   button[toggle] "Name"                                Polling rules, table. Name, column header, row 1, column 1. Name, button
tab 3   button[toggle] "Room"                                Room, column header, row 1, column 2. Room, button
tab 4   button[toggle] "Address"                             Address, column header, row 1, column 3. Address, button
tab 5   button[toggle] "Energy"                              Energy, column header, row 1, column 4. Energy, button
tab 6   button[toggle] "Next run"                            Next run, column header, row 1, column 5. Next run, button
tab 7   input[control] "Enabled: Supply fan"                 Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on
tab 8   input[control] "Enabled: Heater"                     Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off
tab 9   input[control] "Enabled: Bypass"                     Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on
tab 10  input[control] "Enabled: Exhaust fan"                Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on
tab 11  input[control] "Enabled: Boiler"                     Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-filters`

```
enter   button[filter] "Filter Name"                         (silence)
act     div[panel] "Filter Name"                             Filter Name, dialog. heading, level 2, Filter Name
escape  button[filter] "Filter Name"                         main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog
tab 1   button[toggle] "Room"                                Room, column header, row 1, column 2. Room, button
tab 2   button[filter] "Filter Room"                         Filter Room, button, collapsed, opens dialog
tab 3   button[toggle] "Address"                             Address, column header, row 1, column 3. Address, button
tab 4   button[filter] "Filter Address"                      Filter Address, button, collapsed, opens dialog
tab 5   button[toggle] "Energy"                              Energy, column header, row 1, column 4. Energy, button
tab 6   button[filter] "Filter Energy"                       Filter Energy, button, collapsed, opens dialog
tab 7   button[toggle] "Next run"                            Next run, column header, row 1, column 5. Next run, button
tab 8   button[filter] "Filter Next run"                     Filter Next run, button, collapsed, opens dialog
tab 9   button[toggle] "Enabled"                             Enabled, column header, row 1, column 6. Enabled, button
tab 10  button[filter] "Filter Enabled"                      Filter Enabled, button, collapsed, opens dialog
tab 11  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
enter   input[control]                                       (silence)
space   input[control]                                       on
tab 1   pct-table-frame "Rules"                              Rules, region
tab 2   button[toggle] "Name"                                Rules, table. Name, column header, row 1, column 1. Name, button
tab 3   button[filter] "Filter Name"                         Filter Name, button, collapsed, opens dialog
tab 4   button[toggle] "Room"                                Room, column header, row 1, column 2. Room, button
tab 5   button[filter] "Filter Room"                         Filter Room, button, collapsed, opens dialog
tab 6   button[toggle] "Address"                             Address, column header, row 1, column 3. Address, button
tab 7   button[filter] "Filter Address"                      Filter Address, button, collapsed, opens dialog
tab 8   button[toggle] "Energy"                              Energy, column header, row 1, column 4. Energy, button
tab 9   button[filter] "Filter Energy"                       Filter Energy, button, collapsed, opens dialog
tab 10  button[toggle] "Next run"                            Next run, column header, row 1, column 5. Next run, button
tab 11  button[filter] "Filter Next run"                     Filter Next run, button, collapsed, opens dialog
tab 12  button[toggle] "Enabled"                             Enabled, column header, row 1, column 6. Enabled, button
enter   input "Filter Name"                                  (silence)
tab 1   button[trigger] "Filter Room"                        Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list
tab 2   button "Below 4128"                                  Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed
tab 3   button "From 4128"                                   From 4128, toggle button, not pressed
tab 4   input "Energy from"                                  Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank
tab 5   input "Energy to"                                    Energy to, spin button, editable, blank
tab 6   input[control] "Next run from"                       Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank
tab 7   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 8   input[control] "Next run to"                         Next run to, edit, jj slash mm slash aaaa, blank
tab 9   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 10  button[trigger] "Filter Enabled"                     Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list
tab 11  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `activate`, `Escape` in `demo-filters`, to read a column's filter (the keys belong to `datatable.spec.ts › a header’s button opens its filter, a text keeps the rows it is found in, and Escape goes back to the button`).

the section: `Space` in `demo-filters`, to read the switch that draws the row of filters (the keys belong to `datatable.spec.ts › a row of filters under the headers, each control named by its column`).

the section: in `demo-filters`, to read the row of filters (the keys belong to `datatable.spec.ts › a row of filters under the headers, each control named by its column`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-layout`

```
enter   div[separator] "Resize Name"                         (silence)
right   div[separator] "Resize Name"                         208
back    button[options] "Options for Name"                   Options for Name, button, collapsed, sub Menu
tab 1   div[separator] "Resize Name"                         Resize Name, separator, 208
tab 2   button[toggle] "Room"                                Room, column header, row 1, column 4. Room, button
tab 3   button[options] "Options for Room"                   Options for Room, button, collapsed, sub Menu
tab 4   div[separator] "Resize Room"                         Resize Room, separator, 150
tab 5   button[toggle] "Address"                             Address, column header, row 1, column 5. Address, button
tab 6   button[options] "Options for Address"                Options for Address, button, collapsed, sub Menu
tab 7   div[separator] "Resize Address"                      Resize Address, separator, 150
tab 8   button[toggle] "Energy"                              Energy, column header, row 1, column 6. Energy, button
tab 9   button[options] "Options for Energy"                 Options for Energy, button, collapsed, sub Menu
tab 10  div[separator] "Resize Energy"                       Resize Energy, separator, 140
tab 11  button[toggle] "Next run"                            Next run, column header, row 1, column 7. Next run, button
tab 12  button[options] "Options for Next run"               Options for Next run, button, collapsed, sub Menu
```

the section: `ArrowRight`, `Shift+Tab` in `demo-layout`, to read a column's separator and its menu (the keys belong to `datatable.spec.ts › a separator widens its column by the arrows, by 32 with Shift, and stops at its narrowest`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-grid`

```
enter   input[select]                                        (silence)
right   button[disclosure] "Show details"                    Show details, not selected, row 2, Details, column 2. Show details, button, collapsed
down    button[disclosure] "Show details"                    Show details, not selected, row 3, Details, column 2. Show details, button, collapsed
end     input[control] "Enabled: Heater"                     Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `ArrowDown`, `End` in `demo-grid`, to read the grid (the keys belong to `datatable.spec.ts › the arrows move cell to cell, Home and End along the row, Ctrl with them to the ends`).

### `/datatable#demo-editing`

```
enter   td "Supply fan"                                      (silence)
Enter   input "Edit Name"                                    Edit Name, edit, has auto complete, Supply fan
escape  td "Supply fan"                                      Supply fan, not selected
down    td "Heater"                                          Heater, not selected, row 3, Name, column 1
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `Enter`, `Escape`, `ArrowDown` in `demo-editing`, to read a cell's editor (the keys belong to `datatable.spec.ts › opens a cell on Enter, commits on Enter and goes a row down, and the page applies it`).

### `/datatable#demo-tree`

```
enter   button[disclosure] "Collapse Ground floor"           (silence)
down    button[disclosure] "Expand Kitchen"                  Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed
right   button[disclosure] "Collapse Kitchen"                expanded. expanded. Collapse Kitchen
down    td "Kettle"                                          Kettle, row 4, Name, column 1
left    button[disclosure] "Collapse Kitchen"                Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowDown`, `ArrowRight`, `ArrowDown`, `ArrowLeft` in `demo-tree`, to read the treegrid (the keys belong to `datatable.spec.ts › on a first cell the arrow out of the line closes a branch or goes to the parent, the arrow into it opens one`).

### `/datatable#demo-remote-tree`

```
enter   button[disclosure] "Expand Meter 1"                  (silence)
right   button[disclosure] "Collapse Meter 1"                expanded. Collapse Meter 1
down    button[disclosure] "Expand 2017"                     Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed
right   button[disclosure] "Collapse 2017"                   expanded. Collapse 2017
down    td "January"                                         January, row 4, Period, column 1
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `ArrowDown`, `ArrowRight`, `ArrowDown` in `demo-remote-tree`, to read a tree the server holds (the keys belong to `datatable.spec.ts › a branch asks the server for its children when it opens, a placeholder standing in for them`).

### `/datatable#demo-remote-groups`

```
enter   button[disclosure] "Meter 1 (120)"                   (silence)
act     button[disclosure] "Meter 1 (120)"                   collapsed
tab 1   button[disclosure] "Meter 2 (120)"                   Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `activate` in `demo-remote-groups`, to read the groups a server made (the keys belong to `datatable.spec.ts › a collapsed group asks nothing, and shows its readings when it opens`).

### `/datatable#demo-row-menu`

```
enter   button[actions]                                      (silence)
act     button[item] "Duplicate"                             Duplicate, 1 of 2
down    button[item] "Remove"                                Remove, 2 of 2
escape  button[actions]                                      main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu
tab 1   input[select]                                        Select Heater, row 3, Select, column 1. Select Heater, check box, not checked
tab 2   button[actions]                                      Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu
tab 3   input[select]                                        Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked
tab 4   button[actions]                                      Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu
tab 5   input[select]                                        Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked
tab 6   button[actions]                                      Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu
tab 7   input[select]                                        Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked
tab 8   button[actions]                                      Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu
tab 9   input[select]                                        Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked
tab 10  button[actions]                                      Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu
tab 11  input[select]                                        Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked
tab 12  button[actions]                                      Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu
```

the section: `activate`, `ArrowDown`, `Escape` in `demo-row-menu`, to read a row's menu (the keys belong to `datatable.spec.ts › Shift+F10 opens a row’s menu at its first item, and Escape gives the focus back to the row’s button`).

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/datatable#demo-tree-picks`

```
enter   input[select]                                        (silence)
space   input[select]                                        checked
back    button[disclosure] "Collapse Kitchen"                Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded
back    input[select]                                        Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked
tab 1   button[disclosure] "Collapse Kitchen"                Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded
tab 2   input[select]                                        Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked
tab 3   input[select]                                        Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked
tab 4   input[select]                                        Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked
tab 5   input[select]                                        Select Hall, row 7, Select, column 1. Select Hall, check box, not checked
tab 6   button[disclosure] "Expand Hall"                     Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed
tab 7   input[select]                                        Select Garage, row 8, Select, column 1. Select Garage, check box, not checked
tab 8   input[select]                                        Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked
tab 9   button[disclosure] "Expand Upstairs"                 Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed
tab 10  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `Space`, `Shift+Tab`, `Shift+Tab` in `demo-tree-picks`, to read a branch's mixed checkbox (the keys belong to `datatable.spec.ts › a device half picks its room and floor, a room picks its devices, and a floor all it holds`).

### `/datatable#demo-col-span`

```
enter   td "Kitchen"                                         (silence)
right   td "Fine"                                            Fine, not selected, row 2, State, column 2
right   td "21.5 °C"                                         21.5 degrees C, not selected, row 2, Temperature, column 3
down    td "No sensor fitted"                                No sensor fitted, not selected, row 3, State, column 2, through 4
down    td "23.0 °C"                                         23.0 degrees C, not selected, row 4, Temperature, column 3
tab 1   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
```

the section: `ArrowRight`, `ArrowRight`, `ArrowDown`, `ArrowDown` in `demo-col-span`, to read a cell over its neighbours (the keys belong to `datatable.spec.ts › the arrows step over the cell as one, and come back to the column they left`).

### `/hero`

```
arrive  button "Stop the sweep"                              Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Polling rules, region · Polling rules, table. Name, column header, row 1, column 1. Name, button · Room, column header, row 1, column 2. Room, button · Address, column header, row 1, column 3. Address, button · Energy, column header, row 1, column 4. Energy, button · Next run, column header, row 1, column 5. Next run, button · Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on · Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off · Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on · Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on · Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off · Filter Name, dialog. heading, level 2, Filter Name · main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog · Filter Room, button, collapsed, opens dialog · Filter Address, button, collapsed, opens dialog · Filter Energy, button, collapsed, opens dialog · Filter Next run, button, collapsed, opens dialog · Enabled, column header, row 1, column 6. Enabled, button · Filter Enabled, button, collapsed, opens dialog · on · Rules, region · Rules, table. Name, column header, row 1, column 1. Name, button · Filter Name, button, collapsed, opens dialog · Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list · Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed · From 4128, toggle button, not pressed · Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank · Energy to, spin button, editable, blank · Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank · Choisir une date, button, collapsed, opens dialog · Next run to, edit, jj slash mm slash aaaa, blank · Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list · 208 · Options for Name, button, collapsed, sub Menu · Resize Name, separator, 208 · Room, column header, row 1, column 4. Room, button · Options for Room, button, collapsed, sub Menu · Resize Room, separator, 150 · Address, column header, row 1, column 5. Address, button · Options for Address, button, collapsed, sub Menu · Resize Address, separator, 150 · Energy, column header, row 1, column 6. Energy, button · Options for Energy, button, collapsed, sub Menu · Resize Energy, separator, 140 · Next run, column header, row 1, column 7. Next run, button · Options for Next run, button, collapsed, sub Menu · Show details, not selected, row 2, Details, column 2. Show details, button, collapsed · Show details, not selected, row 3, Details, column 2. Show details, button, collapsed · Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off · Edit Name, edit, has auto complete, Supply fan · Supply fan, not selected · Heater, not selected, row 3, Name, column 1 · Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed · expanded. expanded. Collapse Kitchen · Kettle, row 4, Name, column 1 · Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded · expanded. Collapse Meter 1 · Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed · expanded. Collapse 2017 · January, row 4, Period, column 1 · collapsed · Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded · Duplicate, 1 of 2 · Remove, 2 of 2 · main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu · Select Heater, row 3, Select, column 1. Select Heater, check box, not checked · Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu · Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked · Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu · Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked · Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu · Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked · Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu · Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked · Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu · Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked · Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu · checked · Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded · Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked · Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked · Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked · Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked · Select Hall, row 7, Select, column 1. Select Hall, check box, not checked · Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed · Select Garage, row 8, Select, column 1. Select Garage, check box, not checked · Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked · Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed · Fine, not selected, row 2, State, column 2 · 21.5 degrees C, not selected, row 2, Temperature, column 3 · No sensor fitted, not selected, row 3, State, column 2, through 4 · 23.0 degrees C, not selected, row 4, Temperature, column 3
enter   a "Under attention"                                  (silence)
tab 1   a "Read the case"                                    Read the case, link, visited, same page
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 6   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 7   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 8   button "Stop the sweep"                              Stop the sweep, button
tab 9   button "Stop the sweep"                              Browser tabs, tool bar. tab control. Hero at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/stepper`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Polling rules, region · Polling rules, table. Name, column header, row 1, column 1. Name, button · Room, column header, row 1, column 2. Room, button · Address, column header, row 1, column 3. Address, button · Energy, column header, row 1, column 4. Energy, button · Next run, column header, row 1, column 5. Next run, button · Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on · Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off · Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on · Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on · Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off · Filter Name, dialog. heading, level 2, Filter Name · main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog · Filter Room, button, collapsed, opens dialog · Filter Address, button, collapsed, opens dialog · Filter Energy, button, collapsed, opens dialog · Filter Next run, button, collapsed, opens dialog · Enabled, column header, row 1, column 6. Enabled, button · Filter Enabled, button, collapsed, opens dialog · on · Rules, region · Rules, table. Name, column header, row 1, column 1. Name, button · Filter Name, button, collapsed, opens dialog · Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list · Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed · From 4128, toggle button, not pressed · Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank · Energy to, spin button, editable, blank · Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank · Choisir une date, button, collapsed, opens dialog · Next run to, edit, jj slash mm slash aaaa, blank · Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list · 208 · Options for Name, button, collapsed, sub Menu · Resize Name, separator, 208 · Room, column header, row 1, column 4. Room, button · Options for Room, button, collapsed, sub Menu · Resize Room, separator, 150 · Address, column header, row 1, column 5. Address, button · Options for Address, button, collapsed, sub Menu · Resize Address, separator, 150 · Energy, column header, row 1, column 6. Energy, button · Options for Energy, button, collapsed, sub Menu · Resize Energy, separator, 140 · Next run, column header, row 1, column 7. Next run, button · Options for Next run, button, collapsed, sub Menu · Show details, not selected, row 2, Details, column 2. Show details, button, collapsed · Show details, not selected, row 3, Details, column 2. Show details, button, collapsed · Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off · Edit Name, edit, has auto complete, Supply fan · Supply fan, not selected · Heater, not selected, row 3, Name, column 1 · Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed · expanded. expanded. Collapse Kitchen · Kettle, row 4, Name, column 1 · Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded · expanded. Collapse Meter 1 · Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed · expanded. Collapse 2017 · January, row 4, Period, column 1 · collapsed · Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded · Duplicate, 1 of 2 · Remove, 2 of 2 · main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu · Select Heater, row 3, Select, column 1. Select Heater, check box, not checked · Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu · Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked · Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu · Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked · Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu · Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked · Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu · Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked · Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu · Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked · Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu · checked · Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded · Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked · Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked · Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked · Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked · Select Hall, row 7, Select, column 1. Select Hall, check box, not checked · Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed · Select Garage, row 8, Select, column 1. Select Garage, check box, not checked · Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked · Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed · Fine, not selected, row 2, State, column 2 · 21.5 degrees C, not selected, row 2, Temperature, column 3 · No sensor fitted, not selected, row 3, State, column 2, through 4 · 23.0 degrees C, not selected, row 4, Temperature, column 3 · Read the case, link, visited, same page · Stop the sweep, button · Browser tabs, tool bar. tab control. Hero at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   button "Back"                                        (silence)
tab 1   button "Next"                                        Next, button
tab 2   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 3   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 4   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 5   input[control]                                       Browser tabs, tool bar. tab control. Stepper at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/tree`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Polling rules, region · Polling rules, table. Name, column header, row 1, column 1. Name, button · Room, column header, row 1, column 2. Room, button · Address, column header, row 1, column 3. Address, button · Energy, column header, row 1, column 4. Energy, button · Next run, column header, row 1, column 5. Next run, button · Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on · Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off · Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on · Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on · Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off · Filter Name, dialog. heading, level 2, Filter Name · main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog · Filter Room, button, collapsed, opens dialog · Filter Address, button, collapsed, opens dialog · Filter Energy, button, collapsed, opens dialog · Filter Next run, button, collapsed, opens dialog · Enabled, column header, row 1, column 6. Enabled, button · Filter Enabled, button, collapsed, opens dialog · on · Rules, region · Rules, table. Name, column header, row 1, column 1. Name, button · Filter Name, button, collapsed, opens dialog · Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list · Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed · From 4128, toggle button, not pressed · Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank · Energy to, spin button, editable, blank · Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank · Choisir une date, button, collapsed, opens dialog · Next run to, edit, jj slash mm slash aaaa, blank · Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list · 208 · Options for Name, button, collapsed, sub Menu · Resize Name, separator, 208 · Room, column header, row 1, column 4. Room, button · Options for Room, button, collapsed, sub Menu · Resize Room, separator, 150 · Address, column header, row 1, column 5. Address, button · Options for Address, button, collapsed, sub Menu · Resize Address, separator, 150 · Energy, column header, row 1, column 6. Energy, button · Options for Energy, button, collapsed, sub Menu · Resize Energy, separator, 140 · Next run, column header, row 1, column 7. Next run, button · Options for Next run, button, collapsed, sub Menu · Show details, not selected, row 2, Details, column 2. Show details, button, collapsed · Show details, not selected, row 3, Details, column 2. Show details, button, collapsed · Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off · Edit Name, edit, has auto complete, Supply fan · Supply fan, not selected · Heater, not selected, row 3, Name, column 1 · Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed · expanded. expanded. Collapse Kitchen · Kettle, row 4, Name, column 1 · Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded · expanded. Collapse Meter 1 · Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed · expanded. Collapse 2017 · January, row 4, Period, column 1 · collapsed · Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded · Duplicate, 1 of 2 · Remove, 2 of 2 · main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu · Select Heater, row 3, Select, column 1. Select Heater, check box, not checked · Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu · Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked · Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu · Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked · Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu · Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked · Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu · Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked · Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu · Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked · Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu · checked · Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded · Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked · Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked · Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked · Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked · Select Hall, row 7, Select, column 1. Select Hall, check box, not checked · Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed · Select Garage, row 8, Select, column 1. Select Garage, check box, not checked · Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked · Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed · Fine, not selected, row 2, State, column 2 · 21.5 degrees C, not selected, row 2, Temperature, column 3 · No sensor fitted, not selected, row 3, State, column 2, through 4 · 23.0 degrees C, not selected, row 4, Temperature, column 3 · Read the case, link, visited, same page · Stop the sweep, button · Browser tabs, tool bar. tab control. Hero at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Next, button · Browser tabs, tool bar. tab control. Stepper at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   pct-tree-item "README.md"                            (silence)
tab 1   pct-tree-item "README.md"                            Browser tabs, tool bar. tab control. Tree at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/layout`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Polling rules, region · Polling rules, table. Name, column header, row 1, column 1. Name, button · Room, column header, row 1, column 2. Room, button · Address, column header, row 1, column 3. Address, button · Energy, column header, row 1, column 4. Energy, button · Next run, column header, row 1, column 5. Next run, button · Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on · Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off · Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on · Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on · Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off · Filter Name, dialog. heading, level 2, Filter Name · main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog · Filter Room, button, collapsed, opens dialog · Filter Address, button, collapsed, opens dialog · Filter Energy, button, collapsed, opens dialog · Filter Next run, button, collapsed, opens dialog · Enabled, column header, row 1, column 6. Enabled, button · Filter Enabled, button, collapsed, opens dialog · on · Rules, region · Rules, table. Name, column header, row 1, column 1. Name, button · Filter Name, button, collapsed, opens dialog · Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list · Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed · From 4128, toggle button, not pressed · Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank · Energy to, spin button, editable, blank · Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank · Choisir une date, button, collapsed, opens dialog · Next run to, edit, jj slash mm slash aaaa, blank · Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list · 208 · Options for Name, button, collapsed, sub Menu · Resize Name, separator, 208 · Room, column header, row 1, column 4. Room, button · Options for Room, button, collapsed, sub Menu · Resize Room, separator, 150 · Address, column header, row 1, column 5. Address, button · Options for Address, button, collapsed, sub Menu · Resize Address, separator, 150 · Energy, column header, row 1, column 6. Energy, button · Options for Energy, button, collapsed, sub Menu · Resize Energy, separator, 140 · Next run, column header, row 1, column 7. Next run, button · Options for Next run, button, collapsed, sub Menu · Show details, not selected, row 2, Details, column 2. Show details, button, collapsed · Show details, not selected, row 3, Details, column 2. Show details, button, collapsed · Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off · Edit Name, edit, has auto complete, Supply fan · Supply fan, not selected · Heater, not selected, row 3, Name, column 1 · Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed · expanded. expanded. Collapse Kitchen · Kettle, row 4, Name, column 1 · Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded · expanded. Collapse Meter 1 · Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed · expanded. Collapse 2017 · January, row 4, Period, column 1 · collapsed · Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded · Duplicate, 1 of 2 · Remove, 2 of 2 · main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu · Select Heater, row 3, Select, column 1. Select Heater, check box, not checked · Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu · Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked · Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu · Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked · Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu · Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked · Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu · Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked · Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu · Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked · Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu · checked · Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded · Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked · Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked · Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked · Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked · Select Hall, row 7, Select, column 1. Select Hall, check box, not checked · Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed · Select Garage, row 8, Select, column 1. Select Garage, check box, not checked · Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked · Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed · Fine, not selected, row 2, State, column 2 · 21.5 degrees C, not selected, row 2, Temperature, column 3 · No sensor fitted, not selected, row 3, State, column 2, through 4 · 23.0 degrees C, not selected, row 4, Temperature, column 3 · Read the case, link, visited, same page · Stop the sweep, button · Browser tabs, tool bar. tab control. Hero at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Next, button · Browser tabs, tool bar. tab control. Stepper at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Tree at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input[control]                                       (silence)
tab 1   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 2   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 3   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 4   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 5   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 6   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 7   input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 8   input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 11  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 12  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 13  input[control]                                       Size, grouping. md, radio button, checked, 2 of 3
tab 14  input[control]                                       Direction, grouping. ltr, radio button, checked, 1 of 2
tab 15  input[control]                                       Browser tabs, tool bar. tab control. Layout at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/size`

```
arrive  input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2 · Size, grouping. md, radio button, checked, 2 of 3 · Direction, grouping. ltr, radio button, checked, 1 of 2 · A control of the same size, button · Account: Ada Lovelace, button · Browser tabs, tool bar. tab control. Avatar at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Badge at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Done, check box, checked · Browser tabs, tool bar. tab control. Icon at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Library, link · Data, link, current page · Reports trail, navigation landmark. list. Reports, link · Finance, link · Deep trail, navigation landmark. list. Organisation, link · Departments, link · Engineering, link · Platform, link · Observability, link, current page · Browser tabs, tool bar. tab control. Breadcrumb at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Zoom, tool bar. Zoom in, button · Series, list. Supply air degrees C, toggle button, pressed · Fan power W, toggle button, pressed · Heater boolean, toggle button, pressed · Supply air and fan power, the cursor shared, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Put the cursor at 10:00, button · Clear it, button · Fan power on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · Heater on 25 October 2026, slider, No reading selected, Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Enter selects the bar under the cursor; Escape clears the cursor. · 25 Oct 2026, 00:00: Supply air 17.7 degrees C, Fan power 380 W, Heater Off · 25 Oct 2026, 00:10: Supply air 17.8 degrees C, Fan power 380 W, Heater Off · 26 Oct 2026, 00:00: Supply air 18 degrees C, Fan power 380 W, Heater Off · Sun 1: March 14.7 k Wh, February 12.3 k Wh, Difference plus 19.5 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent · Mon 2: March 16.4 k Wh, February 15.1 k Wh, Difference plus 8.6 percent , selected · Heat pump: 412 k Wh, 46 percent , selected · Others: 55 k Wh, 6 percent · Series, list. Heat pump, toggle button, pressed · Hot water, toggle button, pressed · Ventilation, toggle button, pressed · Lighting, toggle button, pressed · Kitchen, toggle button, pressed · Laundry, toggle button, pressed · Others, toggle button, pressed · 25 Oct 2026, 00:15 · 25 Oct 2026, 00:00 · End of the selection, slider, 26 Oct 2026, 00:00, Arrow keys move this edge by a hundredth of the view, Page Up and Page Down by a tenth, Home and End to the ends of the view; Enter shows the selection; Escape clears it. · Recount, button · Browser tabs, tool bar. tab control. Chart at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of grouping, banner landmark, heading, level 1, at pacit slash components — sandbox · Heat pump, same page, link, heading, level 3 · Enabled, switch, on · Rename, button · Arrive, button · Browser tabs, tool bar. tab control. Card at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · out of list, banner landmark, heading, level 1, at pacit slash components — sandbox · Screens, navigation landmark, list, with 4 items, Rooms, same page, link · Devices, same page, link, current page · Energy, same page, link · Settings, same page, link · list, with 7 items, Heating, switch, on · Edit, button · Browser tabs, tool bar. tab control. Frame at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Address, column header, row 1, column 2. Address, button · Registers, region · Browser tabs, tool bar. tab control. Table at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Polling rules, region · Polling rules, table. Name, column header, row 1, column 1. Name, button · Room, column header, row 1, column 2. Room, button · Address, column header, row 1, column 3. Address, button · Energy, column header, row 1, column 4. Energy, button · Next run, column header, row 1, column 5. Next run, button · Enabled: Supply fan, row 2, Enabled, column 6. Enabled: Supply fan, switch, on · Enabled: Heater, row 3, Enabled, column 6. Enabled: Heater, switch, off · Enabled: Bypass, row 4, Enabled, column 6. Enabled: Bypass, switch, on · Enabled: Exhaust fan, row 5, Enabled, column 6. Enabled: Exhaust fan, switch, on · Enabled: Boiler, row 6, Enabled, column 6. Enabled: Boiler, switch, off · Filter Name, dialog. heading, level 2, Filter Name · main landmark. Rules, table. Name, column header. Filter Name, button, collapsed, opens dialog · Filter Room, button, collapsed, opens dialog · Filter Address, button, collapsed, opens dialog · Filter Energy, button, collapsed, opens dialog · Filter Next run, button, collapsed, opens dialog · Enabled, column header, row 1, column 6. Enabled, button · Filter Enabled, button, collapsed, opens dialog · on · Rules, region · Rules, table. Name, column header, row 1, column 1. Name, button · Filter Name, button, collapsed, opens dialog · Sélectionner..., row 2, Room, column 2. Filter Room, combo box, Sélectionner..., collapsed, opens list · Address, row 2, Address, column 3. Address, grouping. Below 4128, toggle button, not pressed · From 4128, toggle button, not pressed · Energy from Energy to, row 2, Energy, column 4. Energy from, spin button, editable, blank · Energy to, spin button, editable, blank · Next run from Choisir une date Next run to Choisir une date, row 2, Next run, column 5. Next run from, edit, jj slash mm slash aaaa, blank · Choisir une date, button, collapsed, opens dialog · Next run to, edit, jj slash mm slash aaaa, blank · Sélectionner..., row 2, Enabled, column 6. Filter Enabled, combo box, Sélectionner..., collapsed, opens list · 208 · Options for Name, button, collapsed, sub Menu · Resize Name, separator, 208 · Room, column header, row 1, column 4. Room, button · Options for Room, button, collapsed, sub Menu · Resize Room, separator, 150 · Address, column header, row 1, column 5. Address, button · Options for Address, button, collapsed, sub Menu · Resize Address, separator, 150 · Energy, column header, row 1, column 6. Energy, button · Options for Energy, button, collapsed, sub Menu · Resize Energy, separator, 140 · Next run, column header, row 1, column 7. Next run, button · Options for Next run, button, collapsed, sub Menu · Show details, not selected, row 2, Details, column 2. Show details, button, collapsed · Show details, not selected, row 3, Details, column 2. Show details, button, collapsed · Enabled: Heater, not selected, row 3, Enabled, column 9. Enabled: Heater, switch, off · Edit Name, edit, has auto complete, Supply fan · Supply fan, not selected · Heater, not selected, row 3, Name, column 1 · Expand Kitchen Kitchen, row 3, Name, column 1. Expand Kitchen, button, collapsed · expanded. expanded. Collapse Kitchen · Kettle, row 4, Name, column 1 · Collapse Kitchen Kitchen, row 3, Name, column 1. Collapse Kitchen, button, expanded · expanded. Collapse Meter 1 · Expand 2017 2017, row 3, Period, column 1. Expand 2017, button, collapsed · expanded. Collapse 2017 · January, row 4, Period, column 1 · collapsed · Meter 2 (120), row header, row 3, Meter, column 1. Meter 2 (120), button, expanded · Duplicate, 1 of 2 · Remove, 2 of 2 · main landmark. Rules with actions, table. Actions Supply fan, row 2, Actions, column 8. Actions Supply fan, button, collapsed, sub Menu · Select Heater, row 3, Select, column 1. Select Heater, check box, not checked · Actions Heater, row 3, Actions, column 8. Actions Heater, button, collapsed, sub Menu · Select Bypass, row 4, Select, column 1. Select Bypass, check box, not checked · Actions Bypass, row 4, Actions, column 8. Actions Bypass, button, collapsed, sub Menu · Select Exhaust fan, row 5, Select, column 1. Select Exhaust fan, check box, not checked · Actions Exhaust fan, row 5, Actions, column 8. Actions Exhaust fan, button, collapsed, sub Menu · Select Boiler, row 6, Select, column 1. Select Boiler, check box, not checked · Actions Boiler, row 6, Actions, column 8. Actions Boiler, button, collapsed, sub Menu · Select Floor heating, row 7, Select, column 1. Select Floor heating, check box, not checked · Actions Floor heating, row 7, Actions, column 8. Actions Floor heating, button, collapsed, sub Menu · Select Lamp, row 8, Select, column 1. Select Lamp, check box, not checked · Actions Lamp, row 8, Actions, column 8. Actions Lamp, button, collapsed, sub Menu · checked · Collapse Kitchen Kitchen, row 3, Name, column 2. Collapse Kitchen, button, expanded · Select Kitchen, row 3, Select, column 1. Select Kitchen, check box, half checked · Select Kettle, row 4, Select, column 1. Select Kettle, check box, checked · Select Fridge, row 5, Select, column 1. Select Fridge, check box, not checked · Select Lamp, row 6, Select, column 1. Select Lamp, check box, not checked · Select Hall, row 7, Select, column 1. Select Hall, check box, not checked · Expand Hall Hall, row 7, Name, column 2. Expand Hall, button, collapsed · Select Garage, row 8, Select, column 1. Select Garage, check box, not checked · Select Upstairs, row 9, Select, column 1. Select Upstairs, check box, not checked · Expand Upstairs Upstairs, row 9, Name, column 2. Expand Upstairs, button, collapsed · Fine, not selected, row 2, State, column 2 · 21.5 degrees C, not selected, row 2, Temperature, column 3 · No sensor fitted, not selected, row 3, State, column 2, through 4 · 23.0 degrees C, not selected, row 4, Temperature, column 3 · Read the case, link, visited, same page · Stop the sweep, button · Browser tabs, tool bar. tab control. Hero at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Next, button · Browser tabs, tool bar. tab control. Stepper at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Tree at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · Browser tabs, tool bar. tab control. Layout at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
enter   input                                                (silence)
tab 1   button "Button sm"                                   Button sm, button
tab 2   button[trigger] "Poland"                             List sm, combo box, Poland, collapsed, opens list
tab 3   input                                                Field md, edit, has auto complete, selected Text md
tab 4   button "Button md"                                   Button md, button
tab 5   button[trigger] "Poland"                             List md, combo box, Poland, collapsed, opens list
tab 6   input                                                Field lg, edit, has auto complete, selected Text lg
tab 7   button "Button lg"                                   Button lg, button
tab 8   button[trigger] "Poland"                             List lg, combo box, Poland, collapsed, opens list
tab 9   input[control]                                       Theme, grouping. light, radio button, checked, 1 of 2
tab 10  input                                                Number sm, spin button, editable, selected 1 499,9
tab 11  input[control]                                       Date sm, edit, selected 27 slash 08 slash 2026
tab 12  button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/density`

```
arrive  input                                                (silence)
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
arrive  input[control]                                       Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Field sm, edit, has auto complete, selected Text sm
enter   input                                                (silence)
tab 1   input                                                Number, spin button, editable, selected 1 499,9
tab 2   button[trigger] "Poland"                             List, combo box, Poland, collapsed, opens list
tab 3   input[control]                                       Consent, check box, checked
tab 4   input[control]                                       Plan, grouping. A, radio button, checked, 1 of 2
tab 5   input[control]                                       Backups, switch, on
tab 6   input[control]                                       Budget, slider, 40
tab 7   div[list] "Monday"                                   Weekday, list. Tuesday, 2 of 5
tab 8   input[control]                                       Starts on, edit, selected 27 slash 08 slash 2026
tab 9   button[toggle] "Choisir une date"                    Choisir une date, button, collapsed, opens dialog
tab 10  input[control]                                       Starts at, edit, selected 13:05
tab 11  button[toggle] "Choisir une heure"                   Choisir une heure, button, collapsed, opens dialog
```

The cap bit here: 12 stops of this view's own were read, and it has more.

### `/announce`

```
arrive  input[control]                                       Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Field sm, edit, has auto complete, selected Text sm · Number, spin button, editable, selected 1 499,9 · List, combo box, Poland, collapsed, opens list · Consent, check box, checked · Plan, grouping. A, radio button, checked, 1 of 2 · Backups, switch, on · Budget, slider, 40 · Weekday, list. Tuesday, 2 of 5 · Starts on, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog · Starts at, edit, selected 13:05 · Choisir une heure, button, collapsed, opens dialog
enter   button "Announce politely"                           (silence)
tab 1   button "Interrupt"                                   Interrupt, button
tab 2   button "Interrupt"                                   Browser tabs, tool bar. tab control. Live regions at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1
```

Tab moved nothing — focus had left the page.

### `/all`

```
arrive  input                                                Button sm, button · List sm, combo box, Poland, collapsed, opens list · Field md, edit, has auto complete, selected Text md · Button md, button · List md, combo box, Poland, collapsed, opens list · Field lg, edit, has auto complete, selected Text lg · Button lg, button · List lg, combo box, Poland, collapsed, opens list · Field sm, edit, has auto complete, selected Text sm · Number, spin button, editable, selected 1 499,9 · List, combo box, Poland, collapsed, opens list · Consent, check box, checked · Plan, grouping. A, radio button, checked, 1 of 2 · Backups, switch, on · Budget, slider, 40 · Weekday, list. Tuesday, 2 of 5 · Starts on, edit, selected 27 slash 08 slash 2026 · Choisir une date, button, collapsed, opens dialog · Starts at, edit, selected 13:05 · Choisir une heure, button, collapsed, opens dialog · Interrupt, button · Browser tabs, tool bar. tab control. Live regions at pacit slash components, tab, selected, JUGGLER <window>, 1 of 1, level 1 · 1
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
