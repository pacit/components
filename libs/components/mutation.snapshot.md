# Mutation run snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-mutation.mjs --write`. The `check-mutation` gate rejects a drift.

A full set of green tests is no proof that the tests catch anything — that is the only
question a mutation run answers
([`req-quality-unit`](../../docs/requirements/quality.md#req-quality-unit)).
Stryker breaks the code in a thousand small ways and asks how many of them the test
suite notices. A **surviving** mutant is a change of behaviour after which CI still
shines green.

This file is the list a change is measured against. `thresholds.break` in
`stryker.config.json` is a FLOOR on its own and says nothing about a file that fell
twenty points while the rest make up for it. The snapshot watches every file separately
and watches it **both ways**: downwards, because that is what a deleted assertion looks
like, upwards, because a floor ten points below the measurement stops measuring.

Columns: file · score · killed (of that, by the clock) · surviving · not covered ·
ignored. Tolerance: ±2 of a percentage point.

```
libs/components/button/src/button.ts 100.00 7(0) 0 0 2
libs/components/checkbox/src/checkbox.ts 89.83 53(0) 6 0 6
libs/components/core/src/announce.ts 94.44 34(0) 2 0 0
libs/components/core/src/config.ts 100.00 8(0) 0 0 0
libs/components/core/src/field.ts 96.97 32(0) 1 0 0
libs/components/core/src/focus.ts 100.00 1(0) 0 0 0
libs/components/core/src/id.ts 100.00 5(0) 0 0 0
libs/components/core/src/list.ts 99.07 107(0) 1 0 0
libs/components/core/src/modal.ts 80.00 48(1) 8 4 0
libs/components/core/src/motion.ts 91.38 53(3) 5 0 0
libs/components/core/src/overlay.ts 100.00 15(0) 0 0 2
libs/components/core/src/placement.ts 98.46 64(7) 1 0 0
libs/components/core/src/template.ts 96.00 24(0) 1 0 0
libs/components/core/src/texts.ts 96.30 26(0) 1 0 0
libs/components/date/src/calendar.ts 73.60 131(0) 45 2 4
libs/components/date/src/date.ts 66.18 135(0) 67 2 8
libs/components/date/src/day.ts 95.83 138(2) 6 0 0
libs/components/date/src/locale.ts 80.49 132(2) 27 5 0
libs/components/dialog/src/dialog.ts 73.73 87(1) 31 0 3
libs/components/field/src/autosize.ts 75.34 55(0) 17 1 2
libs/components/field/src/field.ts 71.56 78(0) 27 2 1
libs/components/field/src/number.ts 80.35 184(0) 43 2 11
libs/components/field/src/text.ts 86.05 37(0) 6 0 5
libs/components/icon/src/icon.ts 92.11 35(0) 3 0 2
libs/components/menu/src/menu-item.ts 75.86 22(0) 4 1 1
libs/components/menu/src/menu-trigger.ts 79.31 23(0) 6 0 2
libs/components/menu/src/menu.ts 78.57 209(0) 51 5 2
libs/components/popover/src/popover.ts 65.61 124(0) 55 10 2
libs/components/radio/src/radio-group.ts 90.63 87(1) 9 0 5
libs/components/radio/src/radio.ts 90.24 37(0) 3 1 1
libs/components/select/src/multi-select.ts 97.14 34(0) 0 0 0
libs/components/select/src/select.base.ts 84.97 571(1) 99 2 9
libs/components/select/src/select.template.ts 50.00 2(0) 0 2 2
libs/components/select/src/select.ts 88.89 32(0) 3 0 0
libs/components/slider/src/slider.ts 79.44 143(0) 36 1 9
libs/components/switch/src/switch.ts 96.30 52(0) 2 0 5
libs/components/tabs/src/tab.ts 91.43 32(0) 2 0 1
libs/components/tabs/src/tabs.ts 93.55 116(0) 7 0 2
libs/components/toast/src/toast-viewport.ts 95.00 19(0) 1 0 0
libs/components/toast/src/toast.ts 80.00 8(0) 2 0 0
libs/components/toast/src/toaster.ts 71.71 109(0) 42 1 0
libs/components/tooltip/src/tooltip.ts 70.54 182(0) 71 5 8
TOTAL 81.52 3291/4037
```
