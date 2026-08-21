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
libs/components/core/src/announce.ts 94.44 34(0) 2 0 0
libs/components/core/src/config.ts 100.00 8(0) 0 0 0
libs/components/core/src/field.ts 96.97 32(0) 1 0 0
libs/components/core/src/focus.ts 100.00 1(0) 0 0 0
libs/components/core/src/id.ts 100.00 5(0) 0 0 0
libs/components/core/src/list.ts 98.78 81(0) 1 0 0
libs/components/core/src/modal.ts 80.85 38(0) 5 4 0
libs/components/core/src/motion.ts 91.38 53(4) 5 0 0
libs/components/core/src/overlay.ts 100.00 14(0) 0 0 2
libs/components/core/src/placement.ts 98.46 64(7) 1 0 0
libs/components/core/src/template.ts 96.00 24(1) 1 0 0
libs/components/core/src/texts.ts 100.00 18(1) 0 0 0
libs/components/dialog/src/dialog.ts 73.73 87(1) 31 0 3
libs/components/field/src/number.ts 80.35 184(0) 43 2 11
libs/components/icon/src/icon.ts 92.11 35(0) 3 0 2
libs/components/menu/src/menu.ts 78.57 209(0) 51 5 2
libs/components/popover/src/popover.ts 65.61 124(0) 55 10 2
libs/components/select/src/multi-select.ts 97.14 34(0) 0 0 0
libs/components/select/src/select.base.ts 89.17 321(1) 35 4 6
libs/components/select/src/select.ts 88.89 32(0) 3 0 0
libs/components/tooltip/src/tooltip.ts 70.54 182(0) 71 5 8
TOTAL 82.25 1580/1921
```
