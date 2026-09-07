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
. 3647 ./core @angular/core
./accordion 11505 ./core,./icon @angular/common,@angular/core
./avatar 8609 ./core,./icon @angular/common,@angular/core
./badge 1706 - @angular/core
./breadcrumb 9202 ./core,./icon @angular/common,@angular/core
./button 9669 ./core @angular/core
./checkbox 14964 ./core,./icon @angular/common,@angular/core
./chips 10708 ./core,./icon @angular/common,@angular/core
./container 717 - @angular/core
./core 8430 - @angular/core
./date 39385 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms,@angular/forms/signals
./dialog 16368 ./core,./icon @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./drawer 15561 ./core,./icon @angular/common,@angular/core
./field 27788 ./core @angular/core,@angular/forms,@angular/forms/signals
./grid 673 - @angular/core
./hero 5594 - @angular/core
./icon 2552 - @angular/common,@angular/core
./menu 20344 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./pagination 13709 ./core,./icon @angular/common,@angular/core
./popover 14656 ./core @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./progress 7237 ./core @angular/core
./radio 15529 ./core @angular/core
./select 70136 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core
./skeleton 3480 - @angular/core
./slider 17483 ./core @angular/core
./stack 879 - @angular/core
./stepper 10686 ./core,./icon @angular/common,@angular/core
./switch 12503 ./core @angular/core
./tabs 16173 ./core @angular/core
./testing 8116 - @angular/cdk/testing
./theme 518 - @angular/core
./toast 15901 ./core,./icon @angular/common,@angular/core
./tooltip 13274 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/core
./tree 9158 ./icon @angular/common,@angular/core
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
every row below (plan 4.42). Two things keep a tag nobody imported:

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
imports only the child. `./select` is the row that neither half of the usual answer
explains: the two classes share a base and nothing else, no source of the entrypoint
names one from the other, and it is the orphan-slot report in each one's `providers`
that costs a consumer importing one tag 24458 B — the whole of the other one.

```
./accordion PctAccordion 2 4162 11333
./breadcrumb PctBreadcrumb 3 4256 9043
./chips PctChip 2 10567 10569
./date PctCalendar 2 22123 38901
./field PctField 3 16059 24895
./menu PctMenu 2 19134 19136
./radio PctRadio 2 15359 15361
./select PctMultiSelect 2 69904 69907
./stepper PctStep 2 10543 10545
./tabs PctTab 2 16005 16007
./tree PctTree 2 9020 9022
```
