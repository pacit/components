# Snapshot nazw tokenów

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> `node tools/check-tokens.mjs --write`. Bramka `check-tokens` odrzuca rozjazd.

Nazwa tokenu jest publicznym API motywu tak samo jak nazwa inputu jest publicznym
API komponentu — z tą różnicą, że jej zmiana nie daje ani jednego czerwonego testu,
bo biblioteka przemianowuje obie strony naraz: token i arkusz, który go używa.
Konsumentowi zostaje nadpisanie wskazujące donikąd.

Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —
znaczy „zmiana publicznego API, która ma być widoczna w review".

Kolumny: nazwa custom property · `$type` z DTCG · warstwa · czy jest w publicznej
unii `PctCssVar` (patrz `prywatne.prefiksy` w
[`src/nazwy.policy.json`](src/nazwy.policy.json)).

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
