# Components

Level 3 of the documentation. One file per component, **filled in per
[`_template.md`](_template.md)** — not prose.

The reason this is a form and not a description: the quality of every component so far comes
from the same person having built it in the same mode of attention. That scales neither to
a second person nor to a twentieth component. A form with an empty row is a gap visible to
a machine; prose with a missing paragraph is not.

| component                     | entrypoint                   | role                                |
| ----------------------------- | ---------------------------- | ----------------------------------- |
| [`PctButton`](button.md)      | `@pacit/components/button`   | button                              |
| [`PctField`](field.md)        | `@pacit/components/field`    | form control wrapper                |
| [`PctText`](text.md)          | `@pacit/components/field`    | text field on a native `<input>`    |
| [`PctNumber`](number.md)      | `@pacit/components/field`    | number field                        |
| [`PctCheckbox`](checkbox.md)  | `@pacit/components/checkbox` | checkbox                            |
| [`PctRadioGroup`](radio.md)   | `@pacit/components/radio`    | group of mutually exclusive options |
| [`PctSelect`](select.md)      | `@pacit/components/select`   | choice list with a panel of its own |
| [`PctMultiSelect`](select.md) | `@pacit/components/select`   | the same list, holding many answers |
| [`PctDialog`](dialog.md)      | `@pacit/components/dialog`   | modal dialog                        |
| [`PctTooltip`](tooltip.md)    | `@pacit/components/tooltip`  | a sentence about a control          |
| [`PctPopover`](popover.md)    | `@pacit/components/popover`  | a panel of content on a live page   |
| [`PctMenu`](menu.md)          | `@pacit/components/menu`     | a list of commands to choose from   |

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
4. **Completing the select family** — **done, all eight items.** The option template closed at D5 and
   **groups** are built: a heading is a shape in the option array, drawn as the one wrapper ARIA
   lets stand between a listbox and its options, with the rows numbered across it so the walk
   stays one walk. A projected `<pct-option>` is **not** coming — measured, not declined: it
   types nothing (two elements of one template are two instantiations) and it hands the row
   count to the consumer's loop, which is where virtualisation would have had to live
   ([0033](../decisions/0033-an-option-is-a-row-of-data.md)). **Many-choice selection** is built
   as well, and as a second **tag**: a `multiple` input is a value at runtime, so it cannot
   decide what `value` is — written as one component the type accepts an array nobody asked for
   and breaks the single-choice consumer's own handler, which the measurement shows in fifteen
   bindings ([0034](../decisions/0034-multiplicity-is-a-tag.md)). One template, one stylesheet,
   one base. **Filtering** is an input on both tags and by the same rule read the other way — a
   question narrows the panel and never the value, and it does not outlive the panel it was
   asked in ([0035](../decisions/0035-a-filter-is-a-question-not-a-value.md)); **clearing** is a
   cross that takes back what the trigger is showing, standing beside the trigger because a
   `<button>` may hold no interactive content
   ([0036](../decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)); **async** is a fact
   about the list rather than about the control, and `aria-busy` is what makes an empty listbox
   legal ([0037](../decisions/0037-loading-is-a-fact-about-the-list.md)); and **virtualisation**
   is a window whose spacer is not an element and whose row height is measured rather than
   declared — five thousand options are eleven elements and 15 ms instead of five thousand and
   626 ([0038](../decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)).
5. **Switch, Textarea, Slider, Date picker.**
6. **Table / DataGrid** — has to stand on a **headless core** separated from rendering.

Before item 1 the **behaviour layer in `core`** has to exist: list navigation (private methods
in `PctSelect` today), the overlay, focus, the live announcer, templates
([`req-api-templates`](../requirements/api.md#req-api-templates)) and icons
([`req-api-icons`](../requirements/api.md#req-api-icons)).

The list machinery (typeahead, `enabledIndexes`, `moveActive`, `activeIndex`) sits today as
private methods in `PctSelect`. Autocomplete, multiselect, menu, combobox and a command
palette all need the same — **extract it into `core` before the second consumer, not after**,
or [`lesson-21`](../lessons.md#lesson-21) repeats itself on a much bigger piece.
