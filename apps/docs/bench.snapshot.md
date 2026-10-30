# Cost snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-bench.mjs --write`. The `check-bench` gate rejects a drift.

What a component page's preview costs to render — measured on the demo the page shows
(`src/app/demos/<id>.demo.ts`), in jsdom, by `bench/previews.bench.ts`. Four readings
are counts, and the gate holds them exactly and in both directions: a wrapper added, a
listener leaked or a second render pass is a change of what a consumer pays, and it is
to be visible in review — the rule the size record follows
([0023](../../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).

Columns: the scene · elements in the document, the host excluded · depth, the longest
path from the host downwards · listeners registered and not taken back once the scene
is stable, on elements, the document and the window alike · renders before the scene
held still.

```
accordion 25 7 8 1
avatar 6 2 0 1
badge 3 1 0 1
breadcrumb 17 6 0 1
button 13 2 0 1
calendar 84 6 46 1
chart 48 6 2 1
checkbox 17 6 7 1
chips 22 6 6 1
columns 79 3 78 1
container 2 2 0 1
datatable 34 10 12 1
date 10 6 4 1
datetime 13 6 8 1
dialog 3 2 3 1
drawer 14 6 4 1
field 14 4 4 1
grid 7 2 0 1
hero 3 1 0 1
icon 27 4 0 1
menu 4 2 8 1
number 13 4 5 1
pagination 27 7 8 1
popover 3 2 1 1
progress 13 3 2 1
radio 18 5 10 1
select 8 6 4 1
skeleton 10 4 1 1
slider 20 5 3 1
stack 4 2 0 1
stepper 22 6 2 1
switch 7 4 4 1
table 20 4 0 1
tabs 12 4 12 1
text 13 4 4 1
textarea 13 4 4 1
theme 4 3 0 1
time 10 6 4 1
toast 5 2 7 1
tooltip 2 2 7 1
tree 21 7 10 1
```

## The clock

Measured 2026-10-30 on Intel(R) Core(TM) i7-3612QM CPU @ 2.10GHz (8 cores), node v24.18.0, jsdom 22.1.0.

Microseconds from creation to stable, the median of fifteen rounds after three warm-ups.
A clock wobbles with the machine and the load, so this section is published, dated and
compared by nobody: the gate requires a reading for every scene and holds none of the
values — a tolerance is for a measurement that wobbles, and a band on a record is a
record that ages (0023). Rewritten with every `--write`, so the numbers are of the same
day as the counts beside them. jsdom lays nothing out, so this is the library's own
work — templates, signals, listeners — and not a browser's.

```
accordion 10588
avatar 4039
badge 2280
breadcrumb 5601
button 4624
calendar 19918
chart 27051
checkbox 5502
chips 5741
columns 19812
container 1196
datatable 18452
date 4884
datetime 7519
dialog 3744
drawer 5244
field 6265
grid 1486
hero 2176
icon 12614
menu 5669
number 6363
pagination 6379
popover 3433
progress 4316
radio 4822
select 5775
skeleton 3575
slider 5138
stack 1135
stepper 6456
switch 2719
table 7353
tabs 4380
text 3904
textarea 11682
theme 2538
time 4722
toast 2633
tooltip 2497
tree 6792
```
