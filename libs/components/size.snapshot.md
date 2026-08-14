# Entrypoint size and isolation snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-bundle.mjs --write`. The `check-bundle` gate rejects a drift.

„Components are imported through secondary entrypoints, which forces tree-shaking"
is a sales promise ([`req-project-tree-shaking`](../../docs/requirements/project.md#req-project-tree-shaking))
— the one somebody picks this library for. Breaking it gives not one red test: an
import from a neighbouring entrypoint compiles, passes the tests and adds tens of
kilobytes for the consumer, who will learn about them from their own bundle report,
if they have one.

This file is the list a change is measured against. A drift does not mean „an error" —
it means „the consumer started paying for something other than yesterday, and that is
to be visible in review".

Columns: entrypoint · size in bytes · other entrypoints brought in · external
dependencies. The size is the raw size of the minified bundle of an application that
imports **only** this one entrypoint, with Angular as an external dependency — so it
measures the contribution of **this library**, not the weight of somebody else's
framework. Budget: ±5% or ±256 B, whichever is larger.

```
. 1183 ./core @angular/core
./button 7888 ./core @angular/core
./checkbox 16105 ./core @angular/core
./core 1705 - @angular/core
./field 38848 ./core @angular/core,@angular/forms,@angular/forms/signals
./radio 18439 ./core @angular/core
./select 30598 ./core @angular/cdk/overlay,@angular/core
```
