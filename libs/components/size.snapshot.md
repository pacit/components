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
. 5179 ./core @angular/core,@angular/forms/signals
./accordion 16848 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./avatar 13931 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./badge 2357 - @angular/core
./breadcrumb 14508 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./button 16926 ./core @angular/core,@angular/forms/signals
./chart 103907 ./button,./core,./icon,./skeleton,./table @angular/common,@angular/core,@angular/forms/signals
./checkbox 22429 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./chips 16660 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./container 725 - @angular/core
./core 13205 - @angular/core,@angular/forms/signals
./date 48297 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms/signals
./datetime 80590 ./core,./date,./icon,./time @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms/signals
./dialog 21738 ./core,./icon @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core,@angular/forms/signals
./drawer 20945 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./field 37923 ./core,./icon @angular/common,@angular/core,@angular/forms,@angular/forms/signals
./grid 681 - @angular/core
./hero 6005 - @angular/core
./icon 8832 - @angular/common,@angular/core
./menu 21959 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core,@angular/forms/signals
./pagination 19105 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./popover 16243 ./core @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core,@angular/forms/signals
./progress 17027 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./radio 24961 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./regions 6962 ./core @angular/core,@angular/forms/signals
./select 79469 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms/signals
./skeleton 3730 - @angular/core
./slider 26896 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./stack 891 - @angular/core
./stepper 16028 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./svg-icon 6119 - @angular/core
./switch 21909 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./table 84542 ./core,./icon,./skeleton @angular/common,@angular/core,@angular/forms/signals
./tabs 17842 ./core @angular/core,@angular/forms/signals
./testing 12066 - @angular/cdk/testing
./theme 518 - @angular/core
./time 51750 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms/signals
./toast 25412 ./core,./icon @angular/common,@angular/core,@angular/forms/signals
./tooltip 15122 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/core,@angular/forms/signals
./tree 12928 ./icon @angular/common,@angular/core
```

And the second reading, for the entrypoints that carry more than one tag. The rows
are: entrypoint · the class a probe imported ALONE · how many tags the entrypoint has ·
the bytes of that one class · the bytes of a probe importing EVERY tag of it.
It answers the question everybody answers with "of course, ESM": whether importing one
tag of an entrypoint sheds the rest of it. The two numbers side by side are the whole
reading — where they are equal, nothing was shed and the entrypoint is the unit a
consumer pays in; where they differ, that difference is what the other tags cost.

It is measured in bytes and NOT by looking for the other tags in the text, and that
is a measurement rather than a preference: searched for on 2026-09-07
([`lesson-171`](../../docs/lessons.md#lesson-171)), `pct-select` was in a bundle that
imported `PctMultiSelect` alone — inside the shared base's own
`get tag() { return this.multiple ? 'pct-multi-select' : 'pct-select' }` — and
`pct-tree-item` was in one that imported `PctTree` alone, as its content-projection
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
2. **Something reaches it.** The tag imported names it — a child injecting the parent
   CLASS as its token, `inject(PctStepper)`, `inject(PctRadioGroup)`, or a parent listing
   the child in its `imports`, as `PctTime` lists `PctTimeColumns` — which is a reference
   like any other. Where the channel is a token declared beside the class instead
   (`PCT_ACCORDION`, `PCT_TABS`), there is no reference and this half does not apply.

The reading is DIRECTIONAL, because the probe imports one class: the first by the name
its declaration gives it, under whichever key it is exported. A tag is a class, so a
second name it is exported under is neither a second tag nor a way to move the probe:
`PctSelect` is shed or not shed by a bundle that asked for `PctMultiSelect`, and the
other direction can differ — an entrypoint whose group declares providers pins the group
when a consumer imports only the child.

`./select` used to be the row neither half explained, and the answer was the first half
after all: the orphan-slot report stood in each tag's `providers`, so a consumer who
imported one carried the other, 24458 B for a `console.warn` their production build
cannot print. The report now reads the content query that finds it instead of an
injector — the query IS the claim — and no component in this package declares
`providers` for a message any more
([`lesson-176`](../../docs/lessons.md#lesson-176)). Its row below is what that repair
is worth today, the gap between the two numbers, and on 2026-09-07 it was the largest
single number this file had ever moved.

```
./accordion PctAccordion 2 5700 16676
./breadcrumb PctBreadcrumb 3 5800 14346
./chart PctChart 4 88113 102519
./chips PctChip 2 16518 16521
./date PctCalendar 2 28114 47252
./field PctField 3 25202 34932
./menu PctMenu 2 20746 20749
./radio PctRadio 2 24791 24793
./select PctMultiSelect 2 53056 79243
./stepper PctStep 2 15885 15887
./table PctDataTable 6 79360 79370
./tabs PctTab 2 17673 17676
./time PctTime 2 49010 49011
./tree PctTree 2 12783 12786
```
