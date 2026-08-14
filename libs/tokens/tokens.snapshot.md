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
--pct-blue-200 color prymitywny prywatny
--pct-blue-300 color prymitywny prywatny
--pct-blue-400 color prymitywny prywatny
--pct-blue-50 color prymitywny prywatny
--pct-blue-500 color prymitywny prywatny
--pct-blue-600 color prymitywny prywatny
--pct-blue-700 color prymitywny prywatny
--pct-blue-800 color prymitywny prywatny
--pct-border color semantyczny publiczny
--pct-border-strong color semantyczny publiczny
--pct-button-bg color komponentowy publiczny
--pct-button-bg-active color komponentowy publiczny
--pct-button-bg-disabled color komponentowy publiczny
--pct-button-bg-hover color komponentowy publiczny
--pct-button-border color komponentowy publiczny
--pct-button-border-disabled color komponentowy publiczny
--pct-button-fg color komponentowy publiczny
--pct-button-fg-disabled color komponentowy publiczny
--pct-button-font-size dimension komponentowy publiczny
--pct-button-font-size-lg dimension komponentowy publiczny
--pct-button-font-size-sm dimension komponentowy publiczny
--pct-button-font-weight fontWeight komponentowy publiczny
--pct-button-height dimension komponentowy publiczny
--pct-button-height-lg dimension komponentowy publiczny
--pct-button-height-sm dimension komponentowy publiczny
--pct-button-padding-x dimension komponentowy publiczny
--pct-button-padding-x-lg dimension komponentowy publiczny
--pct-button-padding-x-sm dimension komponentowy publiczny
--pct-button-radius dimension komponentowy publiczny
--pct-checkbox-bg color komponentowy publiczny
--pct-checkbox-bg-checked color komponentowy publiczny
--pct-checkbox-bg-disabled color komponentowy publiczny
--pct-checkbox-border color komponentowy publiczny
--pct-checkbox-border-checked color komponentowy publiczny
--pct-checkbox-border-disabled color komponentowy publiczny
--pct-checkbox-border-hover color komponentowy publiczny
--pct-checkbox-border-invalid color komponentowy publiczny
--pct-checkbox-fg-checked color komponentowy publiczny
--pct-checkbox-fg-disabled color komponentowy publiczny
--pct-checkbox-fg-invalid color komponentowy publiczny
--pct-checkbox-gap dimension komponentowy publiczny
--pct-checkbox-hint-fg color komponentowy publiczny
--pct-checkbox-label-fg color komponentowy publiczny
--pct-checkbox-radius dimension komponentowy publiczny
--pct-checkbox-size dimension komponentowy publiczny
--pct-checkbox-target-min dimension komponentowy publiczny
--pct-control-height-lg dimension prymitywny publiczny
--pct-control-height-md dimension prymitywny publiczny
--pct-control-height-sm dimension prymitywny publiczny
--pct-danger color semantyczny publiczny
--pct-field-affix-fg color komponentowy publiczny
--pct-field-bg color komponentowy publiczny
--pct-field-bg-disabled color komponentowy publiczny
--pct-field-border color komponentowy publiczny
--pct-field-border-disabled color komponentowy publiczny
--pct-field-border-focus color komponentowy publiczny
--pct-field-border-hover color komponentowy publiczny
--pct-field-border-invalid color komponentowy publiczny
--pct-field-fg color komponentowy publiczny
--pct-field-fg-disabled color komponentowy publiczny
--pct-field-fg-invalid color komponentowy publiczny
--pct-field-font-size dimension komponentowy publiczny
--pct-field-font-size-lg dimension komponentowy publiczny
--pct-field-font-size-sm dimension komponentowy publiczny
--pct-field-gap dimension komponentowy publiczny
--pct-field-height dimension komponentowy publiczny
--pct-field-height-lg dimension komponentowy publiczny
--pct-field-height-sm dimension komponentowy publiczny
--pct-field-hint-fg color komponentowy publiczny
--pct-field-label-fg color komponentowy publiczny
--pct-field-label-gap dimension komponentowy publiczny
--pct-field-padding-x dimension komponentowy publiczny
--pct-field-padding-x-lg dimension komponentowy publiczny
--pct-field-padding-x-sm dimension komponentowy publiczny
--pct-field-placeholder-fg color komponentowy publiczny
--pct-field-radius dimension komponentowy publiczny
--pct-focus-ring color semantyczny publiczny
--pct-font-size-lg dimension prymitywny publiczny
--pct-font-size-md dimension prymitywny publiczny
--pct-font-size-sm dimension prymitywny publiczny
--pct-font-weight-medium fontWeight prymitywny publiczny
--pct-motion-loop-duration duration prymitywny publiczny
--pct-motion-transition-duration duration prymitywny publiczny
--pct-motion-transition-easing cubicBezier prymitywny publiczny
--pct-on-primary color semantyczny publiczny
--pct-primary color semantyczny publiczny
--pct-primary-active color semantyczny publiczny
--pct-primary-hover color semantyczny publiczny
--pct-radio-bg color komponentowy publiczny
--pct-radio-bg-disabled color komponentowy publiczny
--pct-radio-border color komponentowy publiczny
--pct-radio-border-checked color komponentowy publiczny
--pct-radio-border-disabled color komponentowy publiczny
--pct-radio-border-hover color komponentowy publiczny
--pct-radio-border-invalid color komponentowy publiczny
--pct-radio-dot-bg color komponentowy publiczny
--pct-radio-dot-size dimension komponentowy publiczny
--pct-radio-fg-disabled color komponentowy publiczny
--pct-radio-fg-invalid color komponentowy publiczny
--pct-radio-gap dimension komponentowy publiczny
--pct-radio-group-label-fg color komponentowy publiczny
--pct-radio-hint-fg color komponentowy publiczny
--pct-radio-label-fg color komponentowy publiczny
--pct-radio-option-gap dimension komponentowy publiczny
--pct-radio-size dimension komponentowy publiczny
--pct-radio-target-min dimension komponentowy publiczny
--pct-radius-md dimension prymitywny publiczny
--pct-red-400 color prymitywny publiczny
--pct-red-600 color prymitywny publiczny
--pct-red-700 color prymitywny publiczny
--pct-select-arrow-fg color komponentowy publiczny
--pct-select-bg color komponentowy publiczny
--pct-select-bg-disabled color komponentowy publiczny
--pct-select-border color komponentowy publiczny
--pct-select-border-disabled color komponentowy publiczny
--pct-select-border-focus color komponentowy publiczny
--pct-select-border-hover color komponentowy publiczny
--pct-select-border-invalid color komponentowy publiczny
--pct-select-fg color komponentowy publiczny
--pct-select-fg-disabled color komponentowy publiczny
--pct-select-fg-invalid color komponentowy publiczny
--pct-select-font-size dimension komponentowy publiczny
--pct-select-hint-fg color komponentowy publiczny
--pct-select-label-fg color komponentowy publiczny
--pct-select-option-bg color komponentowy publiczny
--pct-select-option-bg-active color komponentowy publiczny
--pct-select-option-bg-selected color komponentowy publiczny
--pct-select-option-fg color komponentowy publiczny
--pct-select-option-fg-active color komponentowy publiczny
--pct-select-option-fg-disabled color komponentowy publiczny
--pct-select-option-fg-selected color komponentowy publiczny
--pct-select-option-padding-x dimension komponentowy publiczny
--pct-select-option-padding-y dimension komponentowy publiczny
--pct-select-padding-x dimension komponentowy publiczny
--pct-select-padding-y dimension komponentowy publiczny
--pct-select-panel-bg color komponentowy publiczny
--pct-select-panel-border color komponentowy publiczny
--pct-select-panel-max-height dimension komponentowy publiczny
--pct-select-panel-radius dimension komponentowy publiczny
--pct-select-panel-shadow shadow komponentowy publiczny
--pct-select-placeholder-fg color komponentowy publiczny
--pct-select-radius dimension komponentowy publiczny
--pct-shadow-panel shadow semantyczny publiczny
--pct-slate-0 color prymitywny prywatny
--pct-slate-100 color prymitywny prywatny
--pct-slate-200 color prymitywny prywatny
--pct-slate-500 color prymitywny prywatny
--pct-slate-700 color prymitywny prywatny
--pct-slate-800 color prymitywny prywatny
--pct-slate-900 color prymitywny prywatny
--pct-space-2 dimension prymitywny publiczny
--pct-space-3 dimension prymitywny publiczny
--pct-space-4 dimension prymitywny publiczny
--pct-space-5 dimension prymitywny publiczny
--pct-surface color semantyczny publiczny
--pct-surface-100 color semantyczny publiczny
--pct-surface-disabled color semantyczny publiczny
--pct-target-min dimension prymitywny publiczny
--pct-text color semantyczny publiczny
--pct-text-disabled color semantyczny publiczny
--pct-text-muted color semantyczny publiczny
```
