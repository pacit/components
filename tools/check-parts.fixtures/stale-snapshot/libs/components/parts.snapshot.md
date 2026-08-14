# Part inventory snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-parts.mjs --write`. The `check-parts` gate rejects a drift.

The `data-pct-part` attribute is the public styling API — the one route this library
leaves into a component ([decision 0013](../../docs/decisions/0013-no-headless-split.md)).
Changing it gives not one red test, because the template and the sheet change together;
it breaks only for somebody who wrote that name down on their side.

This file is the list a change is measured against. A drift does not mean „an error" —
it means „a change of public API that is to be visible in review".

Columns: entrypoint · the class exposing the part · the part name. The list comes
from the **built package** (`ɵcmp.consts` and `ɵdir.hostAttrs` after linking), that is
from what the browser really gets.

```
./widget PctMarker widget-marker
./widget PctWidget label
```
