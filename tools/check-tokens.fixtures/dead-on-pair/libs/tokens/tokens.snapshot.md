# Token name snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-tokens.mjs --write`. The `check-tokens` gate rejects a drift.

A token's name is the theme's public API exactly as an input's name is a component's
public API — with the difference that changing it gives not one red test, because the
library renames both sides at once: the token and the stylesheet using it. The consumer
is left with an override pointing nowhere.

This file is the list a change is measured against. A drift does not mean "an error" —
it means "a change of public API that is to be visible in review".

Columns: the custom property name · `$type` from DTCG · the tier · whether it is in
the public `PctCssVar` union (see `private.prefixes` in
[`src/names.policy.json`](src/names.policy.json)).

```
--pct-blue-600 color primitive private
--pct-blue-700 color primitive private
--pct-button-bg color component public
--pct-button-bg-hover color component public
--pct-button-fg color component public
--pct-button-label-fg color component public
--pct-button-padding-x dimension component public
--pct-button-padding-x-sm dimension component public
--pct-drawer-z-index number component public
--pct-motion-transition-duration duration primitive public
--pct-on-primary color semantic public
--pct-on-surface color semantic public
--pct-primary color semantic public
--pct-primary-hover color semantic public
--pct-slate-0 color primitive private
--pct-slate-500 color primitive private
--pct-slate-900 color primitive private
--pct-space-3 dimension primitive public
--pct-space-4 dimension primitive public
--pct-surface color semantic public
--pct-text color semantic public
--pct-text-muted color semantic public
--pct-toast-z-index number component public
```
