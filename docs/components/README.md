# Components

Level 3 of the documentation. One file per component, **filled in per
[`_template.md`](_template.md)** — not prose.

The reason this is a form and not a description: the quality of every component so far comes
from the same person having built it in the same mode of attention. That scales neither to
a second person nor to a twentieth component. A form with an empty row is a gap visible to
a machine; prose with a missing paragraph is not.

| component                    | entrypoint                   | role                                |
| ---------------------------- | ---------------------------- | ----------------------------------- |
| [`PctButton`](button.md)     | `@pacit/components/button`   | button                              |
| [`PctField`](field.md)       | `@pacit/components/field`    | form control wrapper                |
| [`PctText`](text.md)         | `@pacit/components/field`    | text field on a native `<input>`    |
| [`PctNumber`](number.md)     | `@pacit/components/field`    | number field                        |
| [`PctCheckbox`](checkbox.md) | `@pacit/components/checkbox` | checkbox                            |
| [`PctRadioGroup`](radio.md)  | `@pacit/components/radio`    | group of mutually exclusive options |
| [`PctSelect`](select.md)     | `@pacit/components/select`   | choice list with a panel of its own |
| [`PctDialog`](dialog.md)     | `@pacit/components/dialog`   | modal dialog                        |
| [`PctTooltip`](tooltip.md)   | `@pacit/components/tooltip`  | a sentence about a control          |
| [`PctPopover`](popover.md)   | `@pacit/components/popover`  | a panel of content on a live page   |
| [`PctMenu`](menu.md)         | `@pacit/components/menu`     | a list of commands to choose from   |

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
4. **Completing the select family** — **started.** The option template closed at D5 and
   **groups** are built: a heading is a shape in the option array, drawn as the one wrapper ARIA
   lets stand between a listbox and its options, with the rows numbered across it so the walk
   stays one walk. A projected `<pct-option>` is **not** coming — measured, not declined: it
   types nothing (two elements of one template are two instantiations) and it hands the row
   count to the consumer's loop, which is where virtualisation would have had to live
   ([0033](../decisions/0033-an-option-is-a-row-of-data.md)). Left: multiple selection,
   filtering, clearing, async, virtualisation. Deliberately **after** the behaviour layer, or we
   build it twice.
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
