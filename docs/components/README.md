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

## The order of the components to come

The logic: **first build the machine that makes components correct by construction, then
produce components fast.** The reverse order is why large libraries have 90 components and
a11y problems in half of them.

The order follows **architectural debt**, not popularity:

1. ~~**Dialog**~~ — **built.** It forced the focus trap, the scroll lock, `inert`, the focus
   restore, the Escape stack and SSR safety; of those, three came from the dependency, one from
   the platform and two were written here
   ([0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)).
2. **Tooltip + Popover** — the tooltip is **built**; the popover is what is left of this item.
   The tooltip forced all three: the "describes vs names" distinction — settled as _a name is an
   attribute, a description is a reference_
   ([0030](../decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md)) — the
   hover/focus/touch parity, and the first real enter/leave in the library, which is where
   `0.01ms` rather than `0s` in the reduced-motion tokens stopped being a note and became the
   reason a panel is ever detached.
3. **Menu** — roving focus, submenus, reuse of the typeahead.
4. **Completing the select family** — projected `pct-option`, an option template, groups,
   multiple selection, filtering, clearing, async, virtualisation. Deliberately **after** the
   behaviour layer, or we build it twice.
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
