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
libs/components/core/src/config.ts 100.00 8(0) 0 0 0
libs/components/core/src/field.ts 96.43 27(0) 1 0 0
libs/components/core/src/id.ts 100.00 5(0) 0 0 0
libs/components/core/src/list.ts 98.59 70(0) 1 0 0
libs/components/core/src/texts.ts 100.00 15(0) 0 0 0
libs/components/field/src/number.ts 80.43 185(0) 43 2 11
libs/components/select/src/select.ts 83.47 207(1) 38 3 5
TOTAL 85.45 517/605
```
