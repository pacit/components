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

An **errored** mutant is one after which the test worker DIED rather than a test failing —
`if (row === null) return;` removed, and the next line dereferences `null` inside a DOM
listener. It counts towards the denominator here, which is stricter than Stryker's own
score: a mutant that took the run down with it stated nothing about the tests. It has a
column because without one the arithmetic of a row that has any does not work, and a reader
checking it finds a mistake that is not one.

**What a score is a true statement about.** This file measures `.ts`, and only `.ts`. A
component that borrows more from the platform than it writes has most of itself in a template
and a stylesheet, where no mutant is ever thrown: `accordion-item.ts` and `accordion.ts` are
74 lines between them, 20 mutants, and the exclusive group, the disclosure state, the keyboard
and the searchability of a closed section are all outside the two files this run reads. A green
95% there is true about a small thing and reads like a statement about a component. What
answers for the other half is a **recorded disarming** — every mechanism taken out by hand and
the case that turned red written into the card, the way `docs/components/accordion.md` does it
(plan 4.19). A mutator over templates was refused: it is machinery this repository would then
own, and the disarming is a measurement anybody can repeat with an editor.

Columns: file · score · killed (of that, by the clock) · surviving · errored · not covered ·
ignored. The score follows from them — `killed / (killed + surviving + errored + not
covered)` — and the gate checks that it does. Tolerance: ±2 of a percentage point.

```
libs/components/accordion/src/accordion-item.ts 100.00 16(0) 0 0 0 1
libs/components/accordion/src/accordion.ts 75.00 3(0) 1 0 0 1
libs/components/avatar/src/avatar.ts 87.50 28(0) 3 0 1 0
libs/components/badge/src/badge.ts 83.33 10(0) 2 0 0 0
libs/components/breadcrumb/src/breadcrumb.ts 92.00 23(0) 2 0 0 0
libs/components/button/src/button.ts 81.25 26(0) 6 0 0 2
libs/components/checkbox/src/checkbox.ts 92.73 51(0) 4 0 0 6
libs/components/chips/src/chips.ts 90.74 49(0) 5 0 0 2
libs/components/core/src/announce.ts 94.44 34(0) 2 0 0 0
libs/components/core/src/config.ts 100.00 8(0) 0 0 0 0
libs/components/core/src/field.ts 97.73 43(0) 1 0 0 0
libs/components/core/src/focus.ts 100.00 1(0) 0 0 0 0
libs/components/core/src/id.ts 100.00 5(0) 0 0 0 0
libs/components/core/src/list.ts 99.07 107(0) 1 0 0 0
libs/components/core/src/modal.ts 80.00 48(0) 8 0 4 0
libs/components/core/src/motion.ts 86.21 50(0) 8 0 0 0
libs/components/core/src/overlay.ts 100.00 15(0) 0 0 0 2
libs/components/core/src/placement.ts 89.23 58(0) 7 0 0 0
libs/components/core/src/regions.ts 50.00 2(0) 2 0 0 0
libs/components/core/src/template.ts 93.33 14(0) 1 0 0 0
libs/components/core/src/texts.ts 97.30 36(0) 1 0 0 0
libs/components/date/src/calendar.ts 73.03 130(0) 46 0 2 4
libs/components/date/src/date.ts 66.83 139(0) 67 0 2 8
libs/components/date/src/day.ts 95.83 138(2) 6 0 0 0
libs/components/date/src/locale.ts 80.49 132(2) 27 0 5 0
libs/components/dialog/src/dialog.ts 79.03 98(1) 26 0 0 4
libs/components/drawer/src/drawer-trigger.ts 100.00 6(0) 0 0 0 2
libs/components/drawer/src/drawer.ts 79.19 118(0) 30 1 0 2
libs/components/field/src/autosize.ts 75.34 55(0) 17 0 1 2
libs/components/field/src/field.ts 72.81 83(0) 27 2 2 1
libs/components/field/src/number.ts 80.08 209(0) 50 0 2 11
libs/components/field/src/text.ts 86.05 37(0) 6 0 0 5
libs/components/hero/src/hero.ts 100.00 2(0) 0 0 0 1
libs/components/icon/src/icon.ts 92.11 35(0) 3 0 0 2
libs/components/menu/src/menu-item.ts 78.79 26(0) 4 2 1 1
libs/components/menu/src/menu-trigger.ts 79.31 23(0) 6 0 0 2
libs/components/menu/src/menu.ts 81.16 280(0) 56 1 8 3
libs/components/pagination/src/pagination.ts 96.43 108(0) 4 0 0 4
libs/components/popover/src/popover.ts 70.45 155(0) 50 2 13 3
libs/components/progress/src/progress.ts 92.31 48(0) 4 0 0 2
libs/components/radio/src/radio-group.ts 90.63 87(1) 9 0 0 5
libs/components/radio/src/radio.ts 90.24 37(0) 3 0 1 1
libs/components/regions/src/regions.ts 96.88 62(0) 2 0 0 2
libs/components/select/src/multi-select.ts 97.14 34(0) 0 1 0 0
libs/components/select/src/select.base.ts 84.91 574(1) 100 0 2 9
libs/components/select/src/select.template.ts 33.33 1(0) 0 0 2 2
libs/components/select/src/select.ts 88.89 32(0) 3 1 0 0
libs/components/skeleton/src/skeleton.ts 92.59 25(0) 2 0 0 2
libs/components/slider/src/slider.ts 79.44 143(0) 36 0 1 9
libs/components/stack/src/stack.ts 100.00 1(0) 0 0 0 0
libs/components/stepper/src/stepper.ts 89.80 44(0) 5 0 0 2
libs/components/switch/src/switch.ts 96.30 52(0) 2 0 0 5
libs/components/tabs/src/tab.ts 91.43 32(0) 2 1 0 1
libs/components/tabs/src/tabs.ts 93.50 115(0) 7 1 0 2
libs/components/toast/src/toast-viewport.ts 91.30 42(0) 3 1 0 0
libs/components/toast/src/toast.ts 80.00 8(0) 2 0 0 0
libs/components/toast/src/toaster.ts 65.91 116(0) 49 0 11 0
libs/components/tooltip/src/tooltip.ts 70.54 182(0) 71 0 5 8
libs/components/tree/src/tree.ts 93.28 111(0) 7 0 1 4
TOTAL 82.77 4147/5010
```
