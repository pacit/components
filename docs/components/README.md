# Components

Level 3 of the documentation. One file per component, **filled in per
[`_template.md`](_template.md)** — not prose.

The reason this is a form and not a description: the quality of every component so far comes
from the same person having built it in the same mode of attention. That scales neither to
a second person nor to a twentieth component. A form with an empty row is a gap visible to
a machine; prose with a missing paragraph is not.

| component                        | entrypoint                     | role                                      |
| -------------------------------- | ------------------------------ | ----------------------------------------- |
| [`PctButton`](button.md)         | `@pacit/components/button`     | button, or a link wearing its face        |
| [`PctField`](field.md)           | `@pacit/components/field`      | form control wrapper                      |
| [`PctText`](text.md)             | `@pacit/components/field`      | text field on a native `<input>`          |
| [`PctAutosize`](textarea.md)     | `@pacit/components/field`      | a textarea as tall as its text            |
| [`PctNumber`](number.md)         | `@pacit/components/field`      | number field                              |
| [`PctCheckbox`](checkbox.md)     | `@pacit/components/checkbox`   | checkbox                                  |
| [`PctRadioGroup`](radio.md)      | `@pacit/components/radio`      | group of mutually exclusive options       |
| [`PctSwitch`](switch.md)         | `@pacit/components/switch`     | a setting that takes effect at once       |
| [`PctSlider`](slider.md)         | `@pacit/components/slider`     | a position on a numeric continuum         |
| [`PctDate`](date.md)             | `@pacit/components/date`       | a calendar day, typed or picked           |
| [`PctCalendar`](calendar.md)     | `@pacit/components/date`       | one month of days as a grid               |
| [`PctSelect`](select.md)         | `@pacit/components/select`     | choice list with a panel of its own       |
| [`PctMultiSelect`](select.md)    | `@pacit/components/select`     | the same list, holding many answers       |
| [`PctDialog`](dialog.md)         | `@pacit/components/dialog`     | modal dialog                              |
| [`PctTooltip`](tooltip.md)       | `@pacit/components/tooltip`    | a sentence about a control                |
| [`PctPopover`](popover.md)       | `@pacit/components/popover`    | a panel of content on a live page         |
| [`PctMenu`](menu.md)             | `@pacit/components/menu`       | a list of commands to choose from         |
| [`PctTabs`](tabs.md)             | `@pacit/components/tabs`       | one section of a page at a time           |
| [`PctToaster`](toast.md)         | `@pacit/components/toast`      | a message on top of the page              |
| [`PctAccordion`](accordion.md)   | `@pacit/components/accordion`  | a stack of sections, opened and closed    |
| [`PctPagination`](pagination.md) | `@pacit/components/pagination` | a control that owns the current page      |
| [`PctProgress`](progress.md)     | `@pacit/components/progress`   | how far along a task is                   |
| [`PctSkeleton`](skeleton.md)     | `@pacit/components/skeleton`   | the shape of content still coming         |
| [`PctChips`](chips.md)           | `@pacit/components/chips`      | chosen values the user can take back      |
| [`PctAvatar`](avatar.md)         | `@pacit/components/avatar`     | the picture beside a name                 |
| [`PctBadge`](badge.md)           | `@pacit/components/badge`      | a word wearing a tone                     |
| [`PctBreadcrumb`](breadcrumb.md) | `@pacit/components/breadcrumb` | the way here, told in links               |
| [`PctStepper`](stepper.md)       | `@pacit/components/stepper`    | a map of a journey the application steers |
| [`PctTree`](tree.md)             | `@pacit/components/tree`       | a walk the platform does not have         |
| [`PctContainer`](container.md)   | `@pacit/components/container`  | a reading column capped by a token        |
| [`PctStack`](stack.md)           | `@pacit/components/stack`      | the space between blocks, from the scale  |
| [`PctGrid`](grid.md)             | `@pacit/components/grid`       | a grid that finds its own column count    |
| [`PctHero`](hero.md)             | `@pacit/components/hero`       | the brand gradient as equipment           |
| [`PctTheme`](theme.md)           | `@pacit/components/theme`      | the theme, spelled from a template        |

## The order of the components to come

The logic: **first build the machine that makes components correct by construction, then
produce components fast.** The reverse order is why large libraries have 90 components and
a11y problems in half of them.

The order follows **architectural debt**, not popularity:

1. ~~**Dialog**~~ — **built.** It forced the focus trap, the scroll lock, `inert`, the focus
   restore, the Escape stack and SSR safety; of those, three came from the dependency, one from
   the platform and two were written here
   ([0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)).
2. ~~**Tooltip + Popover**~~ — **built.** The tooltip forced all three the item was named for:
   the "describes vs names" distinction — settled as _a name is an attribute, a description is a
   reference_ ([0030](../decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md))
   — the hover/focus/touch parity, and the first real enter/leave in the library, which is where
   `0.01ms` rather than `0s` in the reduced-motion tokens stopped being a note and became the
   reason a panel is ever detached. The popover then asked the question the tooltip could not,
   having no content and taking no focus: **where does Tab go when the panel is not modal?** An
   overlay is a child of `body`, so the answer the DOM gives is "out of the page" — the panel's
   order is spliced back onto its trigger
   ([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
3. ~~**Menu**~~ — **built.** Roving focus, submenus and the typeahead reused from `core`, which
   learned one line for it: a menu comes round at the ends and a listbox stops there, so the edge
   became a parameter of the shared walk rather than a second copy of it. Why focus moves here
   and points in the select is written down beside it
   ([0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)).
4. **Completing the select family** — **done, all eight items.** The option template closed with
   the slot directive and **groups** are built: a heading is a shape in the option array, drawn as
   the one wrapper ARIA lets stand between a listbox and its options, with the rows numbered across
   it so the walk stays one walk. A projected `<pct-option>` is **not** coming — measured, not
   declined: it types nothing (two elements of one template are two instantiations) and it hands the
   row count to the consumer's loop, which is where virtualisation would have had to live
   ([0033](../decisions/0033-an-option-is-a-row-of-data.md)). **Many-choice selection** is built as
   well, and as a second **tag**: a `multiple` input is a value at runtime, so it cannot decide what
   `value` is — written as one component the type accepts an array nobody asked for and breaks the
   single-choice consumer's own handler, which the measurement shows in fifteen bindings
   ([0034](../decisions/0034-multiplicity-is-a-tag.md)). One template, one stylesheet, one base.
   **Filtering** is an input on both tags and by the same rule read the other way — a question
   narrows the panel and never the value, and it does not outlive the panel it was asked in
   ([0035](../decisions/0035-a-filter-is-a-question-not-a-value.md)); **clearing** is a cross that
   takes back what the trigger is showing, standing beside the trigger because a `<button>` may hold
   no interactive content ([0036](../decisions/0036-a-clear-takes-back-what-the-trigger-shows.md));
   **async** is a fact about the list rather than about the control, and `aria-busy` is what makes
   an empty listbox legal ([0037](../decisions/0037-loading-is-a-fact-about-the-list.md)); and
   **virtualisation** is a window whose spacer is not an element and whose row height is measured
   rather than declared — five thousand options are eleven elements and 15 ms instead of five
   thousand and 626
   ([0038](../decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)).
5. **Switch, Textarea, Slider, Date picker.** The **switch** is built, and what it settled is
   wider than the component: a role put on a native element does not take that element's states
   with it, so `aria-checked` over an `<input type="checkbox">` is **inert** and the component
   writes none — while the same role on a `<button>` is a critical `aria-required-attr` in
   three engines, which is what decides the element
   ([0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
   [`lesson-112`](../lessons.md#lesson-112)). ARIA gives the role no third state and no audit
   says so, so the missing `indeterminate` input is the gate. The **textarea** is built too,
   and its content was a height rather than a component: `field-sizing: content` is in two of
   the three engines here and the third does not degrade, so the platform lays the box out
   where it can and a measurement fills in where it cannot — the two made to agree to within
   the pixel `scrollHeight` rounds away
   ([0041](../decisions/0041-a-height-the-platform-computes.md)). What the fallback has to be
   TOLD is the part worth keeping: a value written with no event, and a width that rewrapped
   the text ([`lesson-114`](../lessons.md#lesson-114),
   [`lesson-115`](../lessons.md#lesson-115)). The **slider** is built as well, and it read 0039
   twice more: `aria-orientation` is derived by the engine from the writing mode and IGNORED
   when it disagrees, and `aria-required` never reaches a range's accessibility node at all,
   so the component writes neither
   ([0042](../decisions/0042-a-slider-is-the-platforms-range.md)). What it did not settle the
   way the decision expected is the drawing: a range carries generated content in **one**
   engine of three, so the fill and the ticks are drawn boxes under a transparent input
   rather than pseudo-elements — which is what buys RTL and the vertical axis with no rule
   reading the direction ([`lesson-118`](../lessons.md#lesson-118)). The **date picker** closes
   the item, and it is the one where the platform's own control was refused on three
   measurements rather than one: `<input type="date">` takes the order it shows a date in from
   `lang` in chromium, from the browser's locale in webkit and from neither in firefox — three
   engines, three sources, one of them settable — a half-typed date reads `value === ''` in all
   three with `validity.badInput` false in webkit, and one such control is four tab stops in
   two engines and one in the third. So the field is text the library formats, and the value
   is a calendar DAY: `new Date(2026, 7, 27).toISOString()` is the 26th in Warsaw, and
   `Temporal.PlainDate` — which is exactly the right type — is absent from webkit
   ([0043](../decisions/0043-a-day-is-not-an-instant.md)). Two things it found that nobody
   asks about until a user does: `Intl` resolves `th-TH` to the **buddhist** calendar in all
   three engines, so a field and its grid would disagree about the year unless the calendar is
   pinned; and `getWeekInfo()` is absent from firefox, so the first day of the week is a table
   of 80 regions with the platform's own CLDR as its gate.
6. **The rest** — toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
   avatar, badge, breadcrumb, stepper, tree. The **toast** is built, and it is the one that had
   to be argued down from the reflex twice: `role="status"` on the region publishes
   `atomic=true`, which re-reads every message on the screen each time one arrives, so the
   region is a `role="log"` and writes no ARIA of its own; and a `z-index` cannot put the stack
   above a modal, because the CDK renders its overlays in the top layer and nothing outside it
   can be above it whatever the number says ([`lesson-122`](../lessons.md#lesson-122)). The
   region is opened **empty** by a render — a live region arriving with its text is one nobody
   registered — and the whole surface is a service, because a message about something that has
   just happened is raised by the code that made it happen
   ([0044](../decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)).
   The **tabs** are built, and they asked a question no component here had had to answer: what
   is text a user cannot currently see? The panels stay where the consumer wrote them — a
   `<pct-tab>` **is** the panel — and one nobody chose is `hidden="until-found"`, so the
   browser's own find-in-page searches it, reveals it and fires `beforematch`, which the panel
   answers by choosing its tab. A **disabled** panel is hidden outright, because find-in-page
   is a promise of a way in and a disabled tab has none
   ([0045](../decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
   The **accordion** is built, and it is the smallest component in the library because almost
   none of it is code: a section is a `<details>` with a `<summary>`, so the press, the
   `expanded` state, `Enter` and `Space`, the tab order and the browser's find-in-page are the
   platform's, and `exclusive` is one shared `name` attribute that makes the browser close the
   others — measured in three engines. What was left over is a real `<h2>`…`<h6>` inside the
   summary, which survives because a `<summary>` is not a button
   ([`lesson-127`](../lessons.md#lesson-127)); `preventDefault()` as the only way to refuse a
   press ([`lesson-128`](../lessons.md#lesson-128)); and an `open` model written from `toggle`
   ([0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
   The **drawer** is built, and it is the first component here that is not an overlay at all:
   the panel is drawn where the consumer wrote it and fixed to an edge of the window, so the
   tab order, the theme, the writing direction and the stacking context are the page's own —
   which is exactly the shape 0031 refused a popover and handed on. What had to be written is
   the ARIA Disclosure pattern (`aria-expanded` on the consumer's own `<button>`,
   `aria-controls` at the panel), and that is the residue of 0046 rather than a preference: the
   platform's own disclosure needs its button **inside** the thing it opens, and a drawer's
   never is. A shut drawer is `hidden="until-found"`, which is 0045's mechanism transplanted
   whole — the evidence it was a rule and not the tabs' accident
   ([0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)).
   The **pagination** is in progress as the model-owning pager: `page` is its value and
   `count` is a number of pages, so a press emits rather than navigates. The one thing it
   computes is the folding — an `'ellipsis'` per run of two or more hidden pages, the ends
   pinned — and everything else is a row of native `<button>` elements. A links pager on
   `<a href>` is a different component, and the future table's pager is most likely this one
   wired to the grid's paging signals
   ([0048](../decisions/0048-a-pagination-owns-its-page-number.md)).
   The **progress** bar is built, and it is the sharpest case yet of the difference between
   "the platform does it" and "the platform draws it". The bar IS a `<progress>`, because the
   element publishes something no hand-written `role="progressbar"` can: an indeterminate bar
   arrives in the accessibility tree with **no value at all**, where an author has to invent a
   number. But painting it needs `appearance: none`, and that switch takes the engine's own
   indeterminate animation away and leaves the three engines disagreeing — an empty groove in
   Chromium and WebKit, a FULL one in Firefox — so the fill is a sibling drawn over the
   element, the checkbox's shape one component over
   ([0049](../decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md),
   [`lesson-133`](../lessons.md#lesson-133)). The travelling band is an element and not a
   gradient for a measured reason: a forced-colours mode drops gradients outright
   ([`lesson-134`](../lessons.md#lesson-134)).
   The **skeleton** is built, and it is the first component here that is nothing but a picture:
   `aria-hidden` outright, no text, no slot, no role. What it answers instead is where the wait
   lives — `aria-busy` on the REGION, which is the consumer's own element — and how big a
   placeholder is: a line is `1lh` and the bar inside it `1cap`, so it holds exactly the space
   the text will take and the page does not move when the content lands
   ([0050](../decisions/0050-a-skeleton-is-a-picture-of-a-wait.md),
   [`lesson-136`](../lessons.md#lesson-136)). Its sheen is the progress bar's band at its
   second component, which is what turns that mechanism into a rule.
   The **chips** are built, and the first question was which of the four things wearing the
   name this is: the static label is the badge's, the selectable chip is a checkbox in
   different clothes, the input chip is the select family's road — what nothing rendered was
   a row of CHOSEN values the user can take back
   ([0051](../decisions/0051-chips-are-a-list-the-user-shortens.md)). The row is the
   platform's `list`/`listitem` and every cross a real `<button>`; the one thing added is
   where focus goes when the button under it disappears (measured: onto `<body>`, in all
   three engines), so the row repairs it and Enter, Enter, Enter empties it with no Tab
   between. Removal itself is an announcement, never an act — the collection stays the
   application's, one notch past the pagination's ownership split.
   The **avatar** is built, and it is decoration all the way down: `aria-hidden` outright —
   the third hidden component — because where an avatar stands the name is already text a
   reader says ([0052](../decisions/0052-an-avatar-is-a-picture-beside-a-name.md)). What it
   owns is the fallback chain (image, initials, silhouette — exactly one standing, the
   dead-image link measured over a real 404) and initials that are graphemes off the
   platform's segmenter, so an emoji family, a flag or a matra never comes back as half a
   character.
   The **badge** is built, and it is a word wearing a tone — no role, no ARIA, no string,
   no size, no parts ([0053](../decisions/0053-a-badge-is-a-word-wearing-a-tone.md)). Four
   tones and the absence of one, and the four are not this component's list: `danger` paints
   the error colour's first background with the `on-danger` pair the semantic tier had
   promised back for exactly this component, and `success` / `warning` / `info` waited for
   ramps the skin did not have. Those landed with
   [0082](../decisions/0082-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md),
   and the union of its own was spent rather than widened — `tone` now takes `PctTone | null`
   ([0076](../decisions/0076-a-tone-is-two-channels-and-four-names.md)), with `null` painting
   what `'neutral'` painted. The tone never speaks alone: an empty badge is a dev-mode
   warning, and forced colours make the argument visible by dropping every tone to one
   palette.
   The **breadcrumb** is built, and the split is ownership again: every anchor is the
   consumer's own `<a href>` (the router writes `aria-current`, never this component), and
   the structure is the library's — a named `navigation` landmark, a `list` a reader
   counts, a chevron nobody hears
   ([0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)). The probe
   measured the wrapper's reason for existing (links loose in a `role="list"` are a
   critical violation in all three engines), and the axe audit measured the target floor
   into the design: 2.5.8's inline exception covers sentences, not bars
   ([`lesson-139`](../lessons.md#lesson-139)).
   The **stepper** is built, and it is the pagination's ownership split walked one
   component further: the application owns the journey and hands the map ONE number; the
   component computes every state from it and stamps `aria-current="step"` where the
   breadcrumb refused to write `aria-current="page"` — the same rule underneath, the
   attribute belonging to whoever holds the truth
   ([0055](../decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)).
   A done step is audible: the check is a drawing, so `texts().stepDone` rides after the
   label — content, not name, because a `listitem` computes none
   ([`lesson-140`](../lessons.md#lesson-140)).
   The **tree** is built, and it is the component the eleven before it existed to make
   honest: the first that could not refuse the keys, because the APG Tree View is one tab
   stop with a roving focus and the platform has no element that walks it
   ([0056](../decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md)). The markup
   is the hierarchy, each branch owns its `expanded`, the tree owns one `selected` — and
   a folded branch is `hidden="until-found"`, the tabs' answer, so found text is landed
   in. Two lessons came out of its measurements: an until-found subtree's role-visibility
   differs by engine, and Playwright's visibility is not the platform's
   `checkVisibility()` ([`lesson-141`](../lessons.md#lesson-141)).
7. **Table / DataGrid** — has to stand on a **headless core** separated from rendering.

Before item 1 the **behaviour layer in `core`** has to exist: list navigation (private methods
in `PctSelect` today), the overlay, focus, the live announcer, templates
([`req-api-templates`](../requirements/api.md#req-api-templates)) and icons
([`req-api-icons`](../requirements/api.md#req-api-icons)).

The list machinery (typeahead, `enabledIndexes`, `moveActive`, `activeIndex`) sits today as
private methods in `PctSelect`. Autocomplete, multiselect, menu, combobox and a command
palette all need the same — **extract it into `core` before the second consumer, not after**,
or [`lesson-21`](../lessons.md#lesson-21) repeats itself on a much bigger piece.
