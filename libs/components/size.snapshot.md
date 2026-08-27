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
. 3408 ./core @angular/core
./button 6897 ./core @angular/core
./checkbox 14781 ./core,./icon @angular/common,@angular/core
./core 8137 - @angular/core
./date 39012 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core,@angular/forms,@angular/forms/signals
./dialog 15240 ./core,./icon @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/common,@angular/core
./field 27092 ./core @angular/core,@angular/forms,@angular/forms/signals
./icon 2552 - @angular/common,@angular/core
./menu 18255 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/core
./popover 13526 ./core @angular/cdk/a11y,@angular/cdk/overlay,@angular/cdk/portal,@angular/core
./radio 15236 ./core @angular/core
./select 68855 ./core,./icon @angular/cdk/overlay,@angular/common,@angular/core
./slider 17190 ./core @angular/core
./switch 12190 ./core @angular/core
./toast 15311 ./core,./icon @angular/common,@angular/core
./tooltip 13035 ./core @angular/cdk/overlay,@angular/cdk/portal,@angular/core
```
