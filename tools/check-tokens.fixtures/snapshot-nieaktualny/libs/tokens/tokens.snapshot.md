# Token name snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-tokens.mjs --write`. The `check-tokens` gate rejects a drift.

A token's name is the theme's public API exactly as an input's name is a component's
public API — with the difference that changing it gives not one red test, because the
library renames both sides at once: the token and the stylesheet using it. The consumer
is left with an override pointing nowhere.

This file is the list a change is measured against. A drift does not mean „an error" —
it means „a change of public API that is to be visible in review".

Kolumny: nazwa custom property · `$type` z DTCG · warstwa · czy jest w publicznej
unii `PctCssVar` (patrz `prywatne.prefiksy` w
[`src/names.policy.json`](src/names.policy.json)).

```
--pct-blue-600 color prymitywny prywatny
--pct-motion-transition-duration duration prymitywny publiczny
--pct-on-primary color semantyczny publiczny
--pct-primary color semantyczny publiczny
--pct-przycisk-bg color komponentowy publiczny
--pct-przycisk-hover-bg color komponentowy publiczny
--pct-przycisk-fg color komponentowy publiczny
--pct-przycisk-label-fg color komponentowy publiczny
--pct-przycisk-padding-x dimension komponentowy publiczny
--pct-przycisk-padding-x-sm dimension komponentowy publiczny
--pct-slate-0 color prymitywny prywatny
--pct-slate-500 color prymitywny prywatny
--pct-slate-900 color prymitywny prywatny
--pct-space-3 dimension prymitywny publiczny
--pct-space-4 dimension prymitywny publiczny
--pct-surface color semantyczny publiczny
--pct-text color semantyczny publiczny
--pct-text-muted color semantyczny publiczny
```
