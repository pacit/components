# Part inventory snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-parts.mjs --write`. The `check-parts` gate rejects a drift.

The `data-pct-part` attribute is the public styling API — the one route this library
leaves into a component ([decision 0013](../../docs/decisions/0013-no-headless-split.md)).
Changing it gives not one red test, because the template and the sheet change together;
it breaks only for somebody who wrote that name down on their side.

This file is the list a change is measured against. A drift does not mean "an error" —
it means "a change of public API that is to be visible in review".

Columns: entrypoint · the class exposing the part · the part name. The list comes
from the **built package** (`ɵcmp.consts` and `ɵdir.hostAttrs` after linking), that is
from what the browser really gets.

```
./accordion PctAccordionItem heading
./accordion PctAccordionItem item
./accordion PctAccordionItem marker
./accordion PctAccordionItem panel
./button PctButton label
./button PctButton spinner
./checkbox PctCheckbox box
./checkbox PctCheckbox control
./checkbox PctCheckbox error
./checkbox PctCheckbox hint
./checkbox PctCheckbox label
./checkbox PctCheckbox mark
./date PctCalendar caption
./date PctCalendar day
./date PctCalendar grid
./date PctCalendar nav
./date PctCalendar week
./date PctCalendar weekday
./date PctDate control
./date PctDate error
./date PctDate hint
./date PctDate label
./date PctDate panel
./date PctDate toggle
./dialog PctDialog backdrop
./dialog PctDialog close
./dialog PctDialog content
./dialog PctDialog header
./dialog PctDialog heading
./dialog PctDialog panel
./drawer PctDrawer close
./drawer PctDrawer content
./drawer PctDrawer header
./drawer PctDrawer heading
./field PctField field-control
./field PctField field-error
./field PctField field-footer
./field PctField field-header
./field PctField field-hint
./field PctField field-label
./field PctField field-label-aux
./field PctField field-message-aux
./field PctField field-prefix
./field PctField field-row
./field PctField field-suffix
./field PctLabelAux field-label-aux-item
./field PctMessageAux field-message-aux-item
./field PctPrefix field-prefix-item
./field PctSuffix field-suffix-item
./menu PctMenu panel
./menu PctMenuItem item
./pagination PctPagination ellipsis
./pagination PctPagination list
./pagination PctPagination next
./pagination PctPagination page
./pagination PctPagination previous
./popover PctPopover content
./popover PctPopover heading
./popover PctPopover panel
./progress PctProgress fill
./progress PctProgress track
./radio PctRadio circle
./radio PctRadio control
./radio PctRadio dot
./radio PctRadio label
./radio PctRadioGroup group-error
./radio PctRadioGroup group-hint
./radio PctRadioGroup group-label
./radio PctRadioGroup group-options
./select PctMultiSelect arrow
./select PctMultiSelect clear
./select PctMultiSelect empty
./select PctMultiSelect error
./select PctMultiSelect group
./select PctMultiSelect group-label
./select PctMultiSelect hint
./select PctMultiSelect label
./select PctMultiSelect option
./select PctMultiSelect option-check
./select PctMultiSelect panel
./select PctMultiSelect placeholder
./select PctMultiSelect trigger
./select PctMultiSelect value
./select PctSelect arrow
./select PctSelect clear
./select PctSelect empty
./select PctSelect error
./select PctSelect group
./select PctSelect group-label
./select PctSelect hint
./select PctSelect label
./select PctSelect option
./select PctSelect option-check
./select PctSelect panel
./select PctSelect placeholder
./select PctSelect trigger
./select PctSelect value
./slider PctSlider bubble
./slider PctSlider control
./slider PctSlider error
./slider PctSlider fill
./slider PctSlider hint
./slider PctSlider label
./slider PctSlider mark
./slider PctSlider thumb
./slider PctSlider track
./switch PctSwitch control
./switch PctSwitch error
./switch PctSwitch hint
./switch PctSwitch label
./switch PctSwitch thumb
./switch PctSwitch track
./tabs PctTab panel
./tabs PctTabs list
./tabs PctTabs tab
./toast PctToastViewport action
./toast PctToastViewport close
./toast PctToastViewport item
./toast PctToastViewport message
./tooltip PctTooltipPanel panel
```
