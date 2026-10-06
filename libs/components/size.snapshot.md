# Entrypoint size and isolation snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-bundle.mjs --write`. The `check-bundle` gate rejects a drift.

"Components are imported through secondary entrypoints, which forces tree-shaking"
is a sales promise ([`req-project-tree-shaking`](../../docs/requirements/project.md#req-project-tree-shaking))
— the one somebody picks this library for. Breaking it gives not one red test: an
import from a neighbouring entrypoint compiles, passes the tests and adds tens of
kilobytes for the consumer, who will learn about them from their own bundle report,
if they have one.

This file is the list a change is measured against, and it is written down to the
byte. A drift does not mean "an error" — it means "the consumer started paying for
something other than yesterday, and that is to be visible in review". So every byte
lands here, in both directions, and it lands in the diff of the change that moved it:
`node tools/check-bundle.mjs --write`. There is no tolerance, because a tolerance
decides two things and is argued about one — when the gate fails, and when this file
is written ([0023](../../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).

**Taken with**, and the list is part of the measurement rather than trivia about it:
a promise that the same sources give the same bytes is only ever true of ONE toolchain,
and the day one of these moves, the bytes move in the same diff as the reason. It is
the answer to a drift of 35 bytes that cost an evening and was never explained, because
nothing here recorded what the numbers had been produced BY
([`lesson-179`](../../docs/lessons.md#lesson-179)).

- @angular/core 22.2.1
- @angular/compiler-cli 22.2.1
- @babel/core 8.0.6
- @angular/build 22.2.1
- ng-packagr 22.2.4
- esbuild 0.28.2

Columns: entrypoint · size in bytes · other entrypoints brought in · external
dependencies. The size is the raw size of a **production** bundle of an application
that imports **only** this one entrypoint: Angular external, so it measures the
contribution of **this library** and not the weight of somebody else's framework —
and built the way a consumer builds, with the Angular linker run over the package and
`ngDevMode` folded away. That is what the number is: **what an application carries**,
not what the tarball weighs. The package holds more — a template travels in it as text
and the class metadata carries the decorator a second time, and both are compiled away
before an application ships them.

```
. 3706 ./core @angular/core
./accordion 15370 ./core,./icon @angular/common,@angular/core
./avatar 12453 ./core,./icon @angular/common,@angular/core
./badge 2357 - @angular/core
./breadcrumb 13030 ./core,./icon @angular/common,@angular/core
./button 15436 ./core @angular/core
./checkbox 18867 ./core,./icon @angular/common,@angular/core
./chips 15182 ./core,./icon @angular/common,@angular/core
./container 725 - @angular/core
./core 8989 - @angular/core
./date 44013 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms,@angular/forms/signals
./dialog 20260 ./core,./icon @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./drawer 19480 ./core,./icon @angular/common,@angular/core
./field 28587 ./core @angular/core,@angular/forms,@angular/forms/signals
./grid 681 - @angular/core
./hero 6005 - @angular/core
./icon 8270 - @angular/common,@angular/core
./menu 20499 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./pagination 17627 ./core,./icon @angular/common,@angular/core
./popover 14783 ./core @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./progress 15549 ./core,./icon @angular/common,@angular/core
./radio 15724 ./core @angular/core
./regions 5482 ./core @angular/core
./select 74374 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core
./skeleton 3730 - @angular/core
./slider 17754 ./core @angular/core
./stack 891 - @angular/core
./stepper 14550 ./core,./icon @angular/common,@angular/core
./svg-icon 6097 - @angular/core
./switch 12726 ./core @angular/core
./tabs 16364 ./core @angular/core
./testing 8218 - @angular/cdk/testing
./theme 518 - @angular/core
./time 9636 ./core @angular/core
./toast 23932 ./core,./icon @angular/common,@angular/core
./tooltip 13662 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/core
./tree 12928 ./icon @angular/common,@angular/core
```

And the second reading, for the entrypoints that carry more than one tag. The rows
are: entrypoint · the class a probe imported BY NAME · how many tags the entrypoint
has · the bytes of that one class · the bytes of a probe importing EVERY tag of it.
It answers the question everybody answers with "of course, ESM": whether importing one
tag of an entrypoint sheds the rest of it. The two numbers side by side are the whole
reading — where they are equal, nothing was shed and the entrypoint is the unit a
consumer pays in; where they differ, that difference is what the other tags cost.

It is measured in bytes and NOT by looking for the other tags in the text, and that
is a measurement rather than a preference: searched for, `pct-select` is in a bundle
that imported `PctMultiSelect` alone — inside the shared base's own
`get tag() { return this.multiple ? 'pct-multi-select' : 'pct-select' }` — and
`pct-tree-item` is in one that imported `PctTree` alone, as its content-projection
selector. Two false positives in seven rows, both of them a string that equals a
selector without being a component.

WHY a row sheds or does not, measured one doctored declaration at a time and true of
every row below ([`lesson-173`](../../docs/lessons.md#lesson-173)). Two things keep a
tag nobody imported:

1. **It declares `providers`.** Angular compiles them into
   `features: [ɵɵProvidersFeature([…])]` — a call to an EXTERNAL function, standing in
   the static `ɵcmp` initialiser of the class itself. A bundler cannot know that call is
   pure, so the statement that defines the class has a side effect and the class stays,
   with its template and its stylesheet. `sideEffects: false` on the package does not
   reach inside a module that something else in it is imported from.
2. **Something reaches it.** The child injects the parent CLASS as its token —
   `inject(PctStepper)`, `inject(PctRadioGroup)` — which is a reference like any other.
   Where the channel is a token declared beside the class instead (`PCT_ACCORDION`,
   `PCT_TABS`), there is no reference and this half does not apply.

The reading is DIRECTIONAL, because the probe imports the first export name: `PctSelect`
is shed or not shed by a bundle that asked for `PctMultiSelect`, and the other direction
can differ — an entrypoint whose group declares providers pins the group when a consumer
imports only the child.

`./select` used to be the row neither half explained, and the answer was the first half
after all: the orphan-slot report stood in each tag's `providers`, so a consumer who
imported one carried the other, 24458 B for a `console.warn` their production build
cannot print. The report now reads the content query that finds it instead of an
injector — the query IS the claim — and no component in this package declares
`providers` for a message any more
([`lesson-176`](../../docs/lessons.md#lesson-176)). The row below is what that repair
is worth, and it is the largest single number this file has ever moved.

```
./accordion PctAccordion 2 4225 15198
./breadcrumb PctBreadcrumb 3 4327 12868
./chips PctChip 2 15040 15043
./date PctCalendar 2 26582 43566
./field PctField 3 16337 25599
./menu PctMenu 2 19286 19289
./radio PctRadio 2 15554 15556
./select PctMultiSelect 2 49380 74148
./stepper PctStep 2 14407 14409
./tabs PctTab 2 16195 16198
./tree PctTree 2 12783 12786
```
