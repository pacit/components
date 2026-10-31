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
datatable 34 10 11 1
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

Measured 2026-10-31 on Intel(R) Core(TM) i7-3612QM CPU @ 2.10GHz (8 cores), node v24.18.0, jsdom 22.1.0.

Microseconds from creation to stable, the median of fifteen rounds after three warm-ups.
A clock wobbles with the machine and the load, so this section is published, dated and
compared by nobody: the gate requires a reading for every scene and holds none of the
values — a tolerance is for a measurement that wobbles, and a band on a record is a
record that ages (0023). Rewritten with every `--write`, so the numbers are of the same
day as the counts beside them. jsdom lays nothing out, so this is the library's own
work — templates, signals, listeners — and not a browser's.

```
accordion 11647
avatar 4586
badge 2546
breadcrumb 7303
button 5828
calendar 24841
chart 36127
checkbox 8205
chips 7174
columns 31538
container 1538
datatable 28773
date 6352
datetime 8586
dialog 4440
drawer 6690
field 7844
grid 2051
hero 3431
icon 18005
menu 6253
number 7634
pagination 7324
popover 4111
progress 5452
radio 5795
select 9900
skeleton 7317
slider 8351
stack 1375
stepper 8775
switch 3681
table 11698
tabs 6426
text 5155
textarea 14256
theme 2704
time 5599
toast 3996
tooltip 2623
tree 8226
```
