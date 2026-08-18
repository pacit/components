# Entrypoint size and isolation snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-bundle.mjs --write`. The `check-bundle` gate rejects a drift.

"Components are imported through secondary entrypoints, which forces tree-shaking"
is a sales promise ([`req-project-tree-shaking`](../../docs/requirements/project.md#req-project-tree-shaking))
— the one somebody picks this library for. Breaking it gives not one red test: an
import from a neighbouring entrypoint compiles, passes the tests and adds tens of
kilobytes for the consumer, who will learn about them from their own bundle report,
if they have one.

This file is the list a change is measured against. A drift does not mean "an error" —
it means "the consumer started paying for something other than yesterday, and that is
to be visible in review".

Columns: entrypoint · size in bytes · other entrypoints brought in · external
dependencies. The size is the raw size of a **production** bundle of an application
that imports **only** this one entrypoint: Angular external, so it measures the
contribution of **this library** and not the weight of somebody else's framework —
and built the way a consumer builds, with the Angular linker run over the package and
`ngDevMode` folded away. That is what the number is: **what an application carries**,
not what the tarball weighs. The package holds more — a template travels in it as text
and the class metadata carries the decorator a second time, and both are compiled away
before an application ships them.

Budget: ±5% or ±256 B, whichever is larger.

```
. 992 ./core @angular/core
./button 4481 ./core @angular/core
./checkbox 10507 ./core @angular/core
./core 2248 - @angular/core
./field 22316 ./core @angular/core,@angular/forms,@angular/forms/signals
./radio 12885 ./core @angular/core
./select 19570 ./core @angular/cdk/overlay,@angular/core
```
